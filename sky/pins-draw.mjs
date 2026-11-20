// Draws the event pins due within the next week (Belmont, 20 Nov 2026): the
// new and full moon pins and the Sun season pins listed in pins/events.json
// by sky/build.mjs, in the batches' own design (sky/pin-design.mjs), into
// pins/events/<slug>.jpg. A pin already drawn is left alone, so each is drawn
// once, days before its release; the feeds take a pin only once its image is
// here. Run by the daily job on GitHub Actions after sky/build.mjs, with the
// runner's Chrome; locally with any Chrome:
//
//   PUPPETEER_DIR=<folder holding puppeteer-core> CHROME=<chrome> node sky/pins-draw.mjs [YYYY-MM-DD] [--check]
//
// --check (the job's manual runs): draws the next event pin to come into a
// temporary folder, whatever its day, and keeps nothing, to prove the drawing
// works on the runner.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { drawPin } from "./pin-design.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const site = join(here, "..");
const day = process.argv.slice(2).find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a)) ?? new Date().toISOString().slice(0, 10);
const check = process.argv.includes("--check");
const AHEAD = 7;
const until = new Date(new Date(`${day}T00:00:00Z`).getTime() + AHEAD * 86400_000).toISOString().slice(0, 10);
let events = JSON.parse(readFileSync(join(site, "pins", "events.json"), "utf8"));
const tmp = join(tmpdir(), "astralroots-pins");
mkdirSync(tmp, { recursive: true });
if (check) {
  const engine = await import(pathToFileURL(join(site, "assets", "engine.js")).href);
  const { eventPins } = await import(pathToFileURL(join(here, "pin-events.mjs")).href);
  const later = new Date(new Date(`${day}T00:00:00Z`).getTime() + 60 * 86400_000).toISOString().slice(0, 10);
  events = eventPins({
    engine, rituals: JSON.parse(readFileSync(join(here, "rituals.json"), "utf8")), until: later,
    scheduled: JSON.parse(readFileSync(join(site, "feeds", "schedule.json"), "utf8")).items,
    readPage: (path) => readFileSync(join(site, `${path}.html`), "utf8"),
  }).filter((e) => e.release > day).slice(0, 1);
  if (!events.length) { console.log("event pins check: no event pin in the next 60 days to draw"); process.exit(1); }
}
const outDir = check ? tmp : join(site, "pins", "events");
mkdirSync(outDir, { recursive: true });
const due = check ? events : events.filter((e) => e.release <= until && !existsSync(join(outDir, `${e.slug}.jpg`)));
if (!due.length) { console.log(`event pins: nothing to draw (${events.length} listed, every one due by ${until} drawn)`); process.exit(0); }

const require = createRequire(join(process.env.PUPPETEER_DIR ?? join(here, "node_modules", "puppeteer-core"), "package.json"));
const puppeteer = require("puppeteer-core");
const executablePath = process.env.CHROME ?? "/usr/bin/google-chrome";
const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--no-sandbox"] });
const tab = await browser.newPage();
await tab.setViewport({ width: 1000, height: 1500, deviceScaleFactor: 1 });
const file = (rel) => pathToFileURL(join(site, rel)).href;
const opts = { file, fonts: join(site, "assets", "fonts"), starfield: file("pins/art/starfield.webp") };
let failed = 0;
for (const pin of due) {
  try {
    const { buf } = await drawPin(tab, pin, opts, tmp);
    writeFileSync(join(outDir, `${pin.slug}.jpg`), buf);
    const w = buf.readUInt16BE(buf.indexOf(Buffer.from([0xff, 0xc0])) + 7), h = buf.readUInt16BE(buf.indexOf(Buffer.from([0xff, 0xc0])) + 5);
    console.log(`event pins${check ? " check" : ""}: drew ${pin.slug} (${Math.round(buf.length / 1024)} KB, ${w} by ${h}), released ${pin.release}${check ? "; kept nowhere" : ""}`);
  } catch (e) {
    failed++;
    console.error(`event pins: could not draw ${pin.slug}: ${e.message}`);
  }
}
await browser.close();
if (failed) process.exit(1);
