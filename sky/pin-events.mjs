// The event pins (Belmont, 20 Nov 2026): pins that never run out, made by the
// daily job from the engine's own dates, beside the scheduled batches.
//
// - Every new and full moon: a pin released 7 days before it, linking to that
//   moon's ritual page, with the ritual's own title and the first sentence of
//   its intro, and the moon's date as the page writes it. A moon that already
//   has a scheduled pin (the two December moons, posted by hand) is skipped.
// - Every Sun sign season: a pin released 5 days before the Sun enters the
//   sign, linking to the Sun in that sign page, with the season's dates and
//   the page's short line. A day belongs to the sign the Sun is in at noon UTC,
//   so a season runs from its first such day to its last (Sagittarius 2026:
//   22 November to 21 December, the Sun leaving at 20:50 UTC on the 21st).
//
// Event pins sit outside the four a day. Their words come from the built pages
// (readPage), every link carries utm_source=pinterest and utm_content=<slug>,
// and the image is drawn by the daily job (sky/pins-draw.mjs) into
// pins/events/<slug>.jpg.

/** Pins released before this day are never made: the scheduled batches cover
 * the time before the event pins began. */
export const EPOCH = "2026-11-21";
export const MOON_LEAD = 7;
export const SEASON_LEAD = 5;
const DAY = 86400_000;
const BASE = "https://astralroots.app";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (day, n) => iso(new Date(new Date(`${day}T00:00:00Z`).getTime() + n * DAY));
/** The ritual pages' own date format (sky/build.mjs longDate). */
export const longDate = (d) => `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const dayMonth = (day) => { const d = new Date(`${day}T00:00:00Z`); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };
/** "22 November to 21 December 2026", or with both years when it crosses one. */
export const seasonRange = (from, to) => from.slice(0, 4) === to.slice(0, 4)
  ? `${dayMonth(from)} to ${dayMonth(to)} ${to.slice(0, 4)}`
  : `${dayMonth(from)} ${from.slice(0, 4)} to ${dayMonth(to)} ${to.slice(0, 4)}`;

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const pick = (html, re) => { const m = html.match(re); if (!m) throw new Error(`no match for ${re}`); return decode(m[1]).trim(); };
const firstSentence = (s) => (s.match(/^.*?[.?!](?=\s|$)/) || [s])[0].trim();
const firstTwo = (s) => { const m = s.match(/^.*?[.?!](?=\s|$)\s+.*?[.?!](?=\s|$)/); return (m ? m[0] : firstSentence(s)).trim(); };
const tail = " Read more at astralroots.app";
const clip = (s, max) => s.length <= max ? s : s.slice(0, max - 1).replace(/\s+\S*$/, "") + ".";

/**
 * Every event pin released from EPOCH up to and including `until` (a day).
 * engine: { moonQuarterEvents, skyPlanetsAt, signFromLongitude };
 * rituals: sky/rituals.json (key -> { title, path });
 * readPage(path): the built page's HTML, path like "rituals/new-moon-in-capricorn";
 * scheduled: the schedule's items, so a moon already pinned is skipped.
 */
export function eventPins({ engine, rituals, readPage, until, scheduled = [] }) {
  const pins = [];
  const from = new Date(`${EPOCH}T00:00:00Z`);
  // The events themselves run up to a week past the last release day.
  const to = new Date(new Date(`${until}T00:00:00Z`).getTime() + (MOON_LEAD + 2) * DAY);

  // Moons.
  for (const e of engine.moonQuarterEvents(from, to)) {
    if (e.kind !== "new_moon" && e.kind !== "full_moon") continue;
    const r = rituals[e.ritual_key];
    if (!r) throw new Error(`no ritual page for ${e.ritual_key}`);
    const when = new Date(e.occurs_at), eventDay = iso(when), release = addDays(eventDay, -MOON_LEAD);
    if (release < EPOCH || release > until) continue;
    const covered = scheduled.some((s) => new URL(s.link).pathname === `/${r.path}` && s.release >= addDays(eventDay, -14) && s.release <= eventDay);
    if (covered) continue;
    const html = readPage(r.path);
    const intro = pick(html, /<p class="body-text">([^<]*)<\/p>/);
    const date = longDate(when);
    const slug = `${r.path.split("/").pop()}-${eventDay}`;
    pins.push({
      slug, kind: "ritual", event: eventDay, release, board: "Moon rituals",
      title: r.title, date, line: firstSentence(intro), cta: "The full ritual at astralroots.app",
      art: { moon: e.kind === "full_moon" ? "pins/art/moon_full.webp" : "pins/art/moon_new.webp" },
      searchTitle: `${r.title}, ${date}`,
      description: clip(`${firstTwo(intro)} ${rituals._nextLine.replace("{Ritual}", r.title).replace("{date}", date)}`, 500 - tail.length) + tail,
      link: `${BASE}/${r.path}?utm_source=pinterest&utm_content=${slug}`,
      image: `${BASE}/pins/events/${slug}.jpg`,
    });
  }

  // Seasons: the Sun's sign at noon UTC, day by day, from a week before the
  // epoch (to see a season already under way) to past the last release.
  const sunSign = (day) => engine.signFromLongitude(engine.skyPlanetsAt(new Date(`${day}T12:00:00Z`)).find((p) => p.body === "sun").longitude);
  const scanFrom = addDays(EPOCH, -40), scanTo = addDays(until, SEASON_LEAD + 40);
  const runs = [];
  for (let day = scanFrom, prev = null; day <= scanTo; day = addDays(day, 1)) {
    const sign = sunSign(day);
    if (sign !== prev) runs.push({ sign, first: day, last: day }); else runs[runs.length - 1].last = day;
    prev = sign;
  }
  // The first and last runs are cut by the scan's edges; only whole seasons count.
  for (const run of runs.slice(1, -1)) {
    const release = addDays(run.first, -SEASON_LEAD);
    if (release < EPOCH || release > until) continue;
    if (!SIGNS.includes(run.sign)) throw new Error(`not a sign: ${run.sign}`);
    const path = `placements/sun-in-${run.sign}`;
    const html = readPage(path);
    const definition = pick(html, /<p class="definition">([^<]*)<\/p>/);
    const verdict = pick(html, /<p class="answer">([^<]*)<\/p>/);
    const range = seasonRange(run.first, run.last);
    const slug = `sun-in-${run.sign}-${run.first}`;
    pins.push({
      slug, kind: "season", event: run.first, release, board: "Sun signs",
      title: `Sun in ${cap(run.sign)}`, date: range, line: verdict, cta: "Find yours free at astralroots.app", eyebrow: "Sun sign",
      art: { banner: `assets/img/zodiac/${run.sign}-wide.webp`, disc: "pins/art/sun.webp" },
      searchTitle: `Sun in ${cap(run.sign)}: ${range}`,
      description: clip(`The Sun is in ${cap(run.sign)} from ${range}. ${definition} ${verdict}`, 500 - tail.length) + tail,
      link: `${BASE}/${path}?utm_source=pinterest&utm_content=${slug}`,
      image: `${BASE}/pins/events/${slug}.jpg`,
    });
  }

  // The usual word rules.
  const DASHES = new RegExp("[" + String.fromCharCode(0x2014, 0x2013) + "]");
  for (const p of pins) {
    for (const s of [p.title, p.date, p.line, p.cta, p.searchTitle, p.description]) {
      if (DASHES.test(s)) throw new Error(`${p.slug}: a long or short dash`);
      if (/\bAI\b/.test(s)) throw new Error(`${p.slug}: the word AI`);
    }
    if (p.searchTitle.length >= 100 || p.description.length > 500) throw new Error(`${p.slug}: title or description too long`);
  }
  return pins.sort((a, b) => a.release.localeCompare(b.release) || a.slug.localeCompare(b.slug));
}
