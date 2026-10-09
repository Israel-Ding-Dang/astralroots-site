// The sky today (docs/10, phase 3): fills sky/template.html for one UTC
// day and writes sky/index.html. Run by the site generator at build time
// and by the GitHub Actions cron on the site repository every morning,
// in Node, with the same engine bundle the calculator uses, so the page
// computes today's sky exactly as the app's daily sky does (Belmont, 5 Oct
// 2026): moonPhaseForDay for the day's phase and sign, skyPlanetsAt at
// noon UTC for the Sun's sign and the retrogrades, and the events
// builder's moon quarter search for the next new and full moon.
//
//   node sky/build.mjs [YYYY-MM-DD]      (defaults to today, UTC)
//
// Deterministic: the same date gives the same bytes.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const engine = await import(pathToFileURL(join(here, "..", "assets", "engine.js")).href);
const { moonPhaseForDay, skyPlanetsAt, signFromLongitude, moonQuarterEvents } = engine;

const day = process.argv[2] ?? new Date().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error(`not a date: ${day}`);
const noon = new Date(`${day}T12:00:00Z`);
const start = new Date(`${day}T00:00:00Z`);

const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const longDate = (d) => `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const hhmm = (d) => `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
const NAMES = { sun: "Sun", moon: "Moon", mercury: "Mercury", venus: "Venus", mars: "Mars",
  jupiter: "Jupiter", saturn: "Saturn", uranus: "Uranus", neptune: "Neptune", pluto: "Pluto",
  chiron: "Chiron", north_node: "North Node", south_node: "South Node" };
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// The app's own functions, with the app's own inputs.
const phase = moonPhaseForDay(day);
const sky = skyPlanetsAt(noon);
const sunSign = signFromLongitude(sky.find((p) => p.body === "sun").longitude);
const retro = sky.filter((p) => p.retrograde && p.body !== "north_node" && p.body !== "south_node")
  .map((p) => NAMES[p.body]);
const quarters = moonQuarterEvents(start, new Date(start.getTime() + 60 * 86400_000));
const nextOf = (kind) => quarters.find((e) => e.kind === kind && new Date(e.occurs_at) >= start);
const nextNew = nextOf("new_moon");
const nextFull = nextOf("full_moon");
if (!nextNew || !nextFull) throw new Error("no new or full moon in the next sixty days");

const rituals = JSON.parse(readFileSync(join(here, "rituals.json"), "utf8"));
const ritualLink = (e) => {
  const r = rituals[e.ritual_key];
  if (!r) throw new Error(`no ritual page for ${e.ritual_key}`);
  return `<a href="/${r.path}">${esc(r.title)}</a>, ${longDate(new Date(e.occurs_at))}`;
};

// The words are the approved templates (Claude outputs/site_phase3/template_sentences.md).
const dateLine = retro.length
  ? `${longDate(noon)} · ${retro.join(", ")} retrograde`
  : longDate(noon);
const moonLine = phase.exactAt
  ? `${phase.name} in ${cap(phase.sign)} today, exact at ${hhmm(new Date(phase.exactAt))} UTC.`
  : `The Moon is ${phase.name.toLowerCase()} in ${cap(phase.sign)}.`;
const retroLine = retro.length ? `Retrograde now: ${retro.join(", ")}` : "No planet is retrograde today.";

// --json-only: the site build runs this before the pages exist, for the
// home page's strip, and wants today.json alone.
const jsonOnly = process.argv.includes("--json-only");
let html = jsonOnly ? "" : readFileSync(join(here, "template.html"), "utf8");
const fill = (key, value) => {
  if (jsonOnly) return;
  if (!html.includes(`{{${key}}}`)) throw new Error(`template has no {{${key}}}`);
  html = html.split(`{{${key}}}`).join(value);
};
fill("dateLine", esc(dateLine));
fill("moonLine", esc(moonLine));
fill("sunLine", esc(`Sun in ${cap(sunSign)}`));
fill("nextNew", ritualLink(nextNew));
fill("nextFull", ritualLink(nextFull));
fill("retroLine", esc(retroLine));
if (!jsonOnly) {
  if (/\{\{\w+\}\}/.test(html)) throw new Error("a placeholder was left unfilled");
  if (new RegExp("[" + String.fromCharCode(0x2014, 0x2013) + "]").test(html)) throw new Error("a long or short dash crept in");
  writeFileSync(join(here, "index.html"), html);
}
// The day's sky as data, for the home page's sky strip (pass 4, item 8):
// the Moon's line and the next new or full moon, whichever comes first.
const nextMoon = new Date(nextNew.occurs_at) <= new Date(nextFull.occurs_at) ? nextNew : nextFull;
const nextRitual = rituals[nextMoon.ritual_key];
writeFileSync(join(here, "today.json"), JSON.stringify({
  day, moon: { name: phase.name, sign: cap(phase.sign), line: moonLine }, sun: cap(sunSign), retrograde: retro,
  next: {
    kind: nextMoon.kind, title: nextRitual.title, path: nextRitual.path, date: longDate(new Date(nextMoon.occurs_at)),
    line: `Next: ${nextRitual.title}, ${longDate(new Date(nextMoon.occurs_at))}`,
  },
}) + "\n");
console.log(`${jsonOnly ? "sky/today.json" : "sky/index.html"} for ${day}: ${moonLine} ${retroLine}`);
