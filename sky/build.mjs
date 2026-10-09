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
const { moonPhaseForDay, skyPlanetsAt, signFromLongitude, moonQuarterEvents, moonIllumination } = engine;

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
// 500 days: far enough for every sign to get its next new and full moon.
const quarters = moonQuarterEvents(start, new Date(start.getTime() + 500 * 86400_000));
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

// The Moon's shading (Belmont, 9 Oct 2026): the lit side and the terminator,
// as a CSS overlay on the one moon image. The dark half covers the unlit
// side; an ellipse as wide as |cos(phase)| either extends the shadow into
// the lit half (crescent) or reveals the moon over the dark half (gibbous).
const illum = moonIllumination(noon);
const shade = {
  cls: `${illum.waxing ? "waxing" : "waning"} ${illum.fraction < 0.5 ? "crescent" : "gibbous"}`,
  term: Math.abs(Math.cos((illum.phaseAngle * Math.PI) / 180)).toFixed(3),
};

// The next new or full moon in each sign, carrying the lunation forward
// until the Moon's sign matches the page (Belmont, 9 Oct 2026): the first
// event on or after today with that page's ritual key.
const nextByKey = {};
for (const e of quarters) {
  if (e.ritual_key && !nextByKey[e.ritual_key] && new Date(e.occurs_at) >= start) nextByKey[e.ritual_key] = e;
}
const ritualKeys = Object.keys(rituals).filter((k) => !k.startsWith("_"));
const ritualDates = {};
for (const key of ritualKeys) {
  const e = nextByKey[key];
  if (!e) throw new Error(`no ${key} within 500 days`);
  const when = new Date(e.occurs_at);
  ritualDates[key] = {
    date: when.toISOString().slice(0, 10),
    line: rituals._nextLine.replace("{Ritual}", rituals[key].title).replace("{date}", longDate(when)),
  };
}

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
fill("moonClass", shade.cls);
fill("moonTerm", shade.term);
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
  day,
  moon: {
    name: phase.name, sign: cap(phase.sign), line: moonLine,
    phaseAngle: Math.round(illum.phaseAngle * 10) / 10, fraction: Math.round(illum.fraction * 1000) / 1000,
    waxing: illum.waxing, shade,
  },
  sun: cap(sunSign), retrograde: retro,
  rituals: ritualDates,
  next: {
    kind: nextMoon.kind, title: nextRitual.title, path: nextRitual.path, date: longDate(new Date(nextMoon.occurs_at)),
    line: `Next: ${nextRitual.title}, ${longDate(new Date(nextMoon.occurs_at))}`,
  },
}) + "\n");

// The ritual pages and the rituals index: the one next-date line each,
// inside its marked element; the Article dates and everything else stay.
if (!jsonOnly) {
  let changed = 0;
  for (const key of ritualKeys) {
    const file = join(here, "..", `${rituals[key].path}.html`);
    const before = readFileSync(file, "utf8");
    const re = new RegExp(`(<p class="answer" id="next-date" data-ritual="${key}">)[^<]*(</p>)`);
    if (!re.test(before)) throw new Error(`${rituals[key].path}: no marked next-date line`);
    const after = before.replace(re, `$1${esc(ritualDates[key].line)}$2`);
    if (after !== before) { writeFileSync(file, after); changed++; }
  }
  const indexFile = join(here, "..", "rituals", "index.html");
  const indexBefore = readFileSync(indexFile, "utf8");
  let seen = 0;
  const indexAfter = indexBefore.replace(/<ul class="ritual-list">([\s\S]*?)<\/ul>/g, (_m, inner) => {
    const items = inner.match(/<li>[\s\S]*?<\/li>/g) ?? [];
    const dated = items.map((item) => {
      const key = item.match(/data-ritual="([a-z_]+)"/)?.[1];
      if (!key || !ritualDates[key]) throw new Error("rituals index: an item without a known ritual key");
      seen++;
      const text = item.replace(new RegExp(`(<span data-ritual="${key}">)[^<]*(</span>)`), `$1${esc(ritualDates[key].line)}$2`);
      return { text, at: new Date(nextByKey[key].occurs_at).getTime() };
    });
    dated.sort((p, q) => p.at - q.at);
    return `<ul class="ritual-list">${dated.map((d) => d.text).join("")}</ul>`;
  });
  if (seen !== ritualKeys.length) throw new Error(`rituals index: ${seen} next-date lines, expected ${ritualKeys.length}`);
  if (indexAfter !== indexBefore) { writeFileSync(indexFile, indexAfter); changed++; }
  console.log(`ritual next dates: ${changed} files changed`);
}
console.log(`${jsonOnly ? "sky/today.json" : "sky/index.html"} for ${day}: ${moonLine} ${retroLine}; the Moon ${shade.cls}, terminator ${shade.term}`);
for (const key of ritualKeys) console.log(`  ${key}: ${ritualDates[key].date}`);
