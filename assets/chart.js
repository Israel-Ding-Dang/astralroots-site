// The birth chart calculator (docs/10, phase 3). The form, the place
// search over the two places files, the time zone through tz.js, the chart
// through the app's own engine (assets/engine.js), and the result: the
// wheel, the Big Three, the placements, the planets, the aspects, and a
// share link that carries the inputs in the address. Nothing typed here
// leaves the browser. Every sentence is in the approved template list or
// the content files; the data the page needs is inlined by the generator.
import { formatOffset, utcOffsetMinutes } from "./tz.js";
import { wheelSvg, wheelSummary } from "./wheel.js";

const d = document;
const data = JSON.parse(d.getElementById("chart-data").textContent);
const $ = (id) => d.getElementById(id);
const form = $("chart-form");
const dateEl = $("birth-date"), timeEl = $("birth-time"), unknownEl = $("time-unknown");
const placeEl = $("birth-place"), resultsEl = $("place-results"), zoneEl = $("zone-line");
const adjustBtn = $("adjust-zone"), adjustSel = $("zone-select"), errorEl = $("chart-error");
const result = $("chart-result");
const count = (name) => window.astral && window.astral.count(name, "birth-chart");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const SIGNS = data.signs; // ["aries", ...]
const signOf = (lon) => SIGNS[Math.floor((((lon % 360) + 360) % 360) / 30)];

// ---- places: the 3,000 largest first, then all of them behind -----------

let places = null, allLoaded = false, loading = null;
function decode(file) {
  const names = file.n.split("\n");
  return names.map((name, i) => ({
    name, country: file.rg[file.r[i]][0], region: file.rg[file.r[i]][1],
    lat: file.la[i] / 100000, lng: file.lo[i] / 100000, tz: file.tz[file.t[i]],
  }));
}
function loadPlaces() {
  if (loading) return loading;
  resultsEl.innerHTML = `<li class="muted">${esc(data.words.loading)}</li>`;
  loading = fetch("/assets/places-top.json").then((r) => r.json()).then((top) => {
    places = decode(top);
    search();
    fetch("/assets/places.json").then((r) => r.json()).then((all) => {
      places = decode(all);
      allLoaded = true;
      search();
    }).catch(() => {});
  }).catch(() => { resultsEl.innerHTML = ""; });
  return loading;
}
let chosen = null, manualOffset = null;
function label(p) {
  return p.region && p.region !== p.name ? `${p.name}, ${p.region}, ${p.country}` : `${p.name}, ${p.country}`;
}
function search() {
  if (!places) return;
  const q = placeEl.value.trim().toLowerCase();
  if (q.length < 2) { resultsEl.innerHTML = ""; return; }
  const starts = [], contains = [];
  for (const p of places) {
    const n = p.name.toLowerCase();
    if (n.startsWith(q)) starts.push(p);
    else if (n.includes(q) || label(p).toLowerCase().includes(q)) contains.push(p);
    if (starts.length >= 8) break;
  }
  const hits = starts.concat(contains).slice(0, 8);
  resultsEl.innerHTML = hits.map((p, i) =>
    `<li><button type="button" data-i="${i}">${esc(label(p))}</button></li>`).join("");
  resultsEl.querySelectorAll("button").forEach((b, i) => {
    b.addEventListener("click", () => choose(hits[i]));
  });
}
placeEl.addEventListener("focus", loadPlaces, { once: true });
placeEl.addEventListener("input", () => { chosen = null; zoneEl.hidden = true; loadPlaces(); search(); });

// ---- the time zone ---------------------------------------------------------

function birthParts() {
  const [y, m, day] = (dateEl.value || "").split("-").map(Number);
  const known = !unknownEl.checked && /^\d{2}:\d{2}/.test(timeEl.value);
  const [hh, mm] = known ? timeEl.value.split(":").map(Number) : [12, 0];
  return { y, m, day, hh, mm, known };
}
function autoOffset() {
  if (!chosen || !dateEl.value) return null;
  const b = birthParts();
  return utcOffsetMinutes(chosen.tz, b.y, b.m, b.day, b.hh, b.mm);
}
function showZone() {
  if (!chosen) { zoneEl.hidden = true; return; }
  const auto = autoOffset();
  const offset = manualOffset ?? auto;
  zoneEl.hidden = false;
  $("zone-value").textContent = offset === null ? chosen.tz : `${chosen.tz} · ${formatOffset(offset)}`;
  $("zone-note").hidden = !(dateEl.value && Number(dateEl.value.slice(0, 4)) < 1970);
  adjustSel.value = String(offset ?? 0);
}
function choose(p) {
  chosen = p; manualOffset = null;
  placeEl.value = label(p);
  resultsEl.innerHTML = "";
  showZone();
}
for (let m = -12 * 60; m <= 14 * 60; m += 30) {
  const o = d.createElement("option");
  o.value = String(m); o.textContent = formatOffset(m);
  adjustSel.appendChild(o);
}
adjustBtn.addEventListener("click", () => { adjustSel.hidden = false; adjustSel.focus(); });
adjustSel.addEventListener("change", () => { manualOffset = Number(adjustSel.value); showZone(); });
dateEl.addEventListener("change", showZone);
timeEl.addEventListener("change", showZone);
unknownEl.addEventListener("change", () => {
  timeEl.disabled = unknownEl.checked;
  $("noon-note").hidden = !unknownEl.checked;
  showZone();
});

// ---- the chart --------------------------------------------------------------

let enginePromise = null;
const engine = () => enginePromise ??= import("/assets/engine.js");

function fail(msg, el) {
  errorEl.textContent = msg;
  if (el) el.focus();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";
  const b = birthParts();
  if (!dateEl.value) return fail(data.words.needDate, dateEl);
  const today = new Date().toISOString().slice(0, 10);
  if (b.y < 1900 || dateEl.value > today) return fail(data.words.badDate, dateEl);
  if (!chosen) return fail(data.words.needPlace, placeEl);
  const offset = manualOffset ?? autoOffset();
  if (offset === null) return fail(data.words.needPlace, placeEl);
  const utc = new Date(Date.UTC(b.y, b.m - 1, b.day, b.hh, b.mm) - offset * 60000);
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    const { natalChart } = await engine();
    const chart = natalChart(utc, chosen.lat, chosen.lng, b.known);
    render(chart, b, offset, false);
    count("calculator_computed");
  } finally {
    btn.disabled = false;
  }
});

function render(chart, b, offset, shared) {
  const W = data.words;
  const bodies = data.bodies; // { sun: "Sun", ... }
  const houseName = (h) => data.houses[String(h)];
  const sign = (body) => chart.planets.find((p) => p.body === body);
  const sun = sign("sun"), moon = sign("moon");
  const rising = chart.rising_sign;
  const parts = [];

  if (shared) {
    const dateText = `${b.day} ${data.months[b.m - 1]} ${b.y}`;
    const tm = `${String(b.hh).padStart(2, "0")}:${String(b.mm).padStart(2, "0")}`;
    parts.push(`<p class="meta-line">${esc(b.known
      ? W.sharedKnown.replace("{date}", dateText).replace("{time}", tm).replace("{place}", label(chosen))
      : W.sharedUnknown.replace("{date}", dateText).replace("{place}", label(chosen)))}</p>`);
  }

  // The wheel, with the app's glyphs, drawing itself as the page's does.
  const wheelChart = { planets: chart.planets, houses: chart.houses, aspects: chart.aspects };
  parts.push(`<div class="hero-wheel result-wheel">${
    wheelSvg(wheelChart, { glyphs: data.glyphs, id: "mine", label: `${W.wheelLabel} ${wheelSummary(wheelChart, { bodies, signs: SIGNS.map(cap) })}.` })
  }</div>`);

  // The Big Three, as the app's pills.
  const pill = (k, v) => `<div class="pill"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`;
  parts.push(`<div class="big-three">${pill("Sun", cap(sun.sign))}${pill("Moon", cap(moon.sign))}${
    pill("Rising", rising ? cap(rising) : "?")}</div>`);
  if (!b.known) parts.push(`<p class="meta-line">${esc(W.addTime)}</p>`);
  if (chart.houses) {
    parts.push(`<p class="meta-line">${esc(chart.house_system === "whole_sign" ? W.housesWhole : W.housesPlacidus)}</p>`);
    if (chart.house_system === "whole_sign") parts.push(`<p class="meta-line">${esc(W.polar)}</p>`);
  }

  // The Big Three: the short line as written and the link to the full page
  // (Belmont, 5 Oct 2026: not the body).
  const reading = (heading, entry, href, more) =>
    `<section class="rise"><h2>${esc(heading)}</h2><p class="answer">${esc(entry.short)}</p><p><a href="${href}">${esc(more)}</a></p></section>`;
  parts.push(reading(W.yourSun.replace("{Sign}", cap(sun.sign)), data.sun[sun.sign], `/placements/sun-in-${sun.sign}`, W.more.replace("{Placement}", `Sun in ${cap(sun.sign)}`)));
  parts.push(reading(W.yourMoon.replace("{Sign}", cap(moon.sign)), data.moon[moon.sign], `/placements/moon-in-${moon.sign}`, W.more.replace("{Placement}", `Moon in ${cap(moon.sign)}`)));
  if (rising) parts.push(reading(W.yourRising.replace("{Sign}", cap(rising)), data.rising[rising], `/placements/${rising}-rising`, W.more.replace("{Placement}", `${cap(rising)} rising`)));

  // Every planet, with its house when the chart has houses.
  parts.push(`<section class="rise"><h2>${esc(W.yourPlanets)}</h2><ul class="planet-list card">${
    chart.planets.map((p) => `<li><span>${esc(p.house
      ? W.planetHouse.replace("{Planet}", bodies[p.body]).replace("{Sign}", cap(p.sign)).replace("{label}", houseName(p.house))
      : W.planetSign.replace("{Planet}", bodies[p.body]).replace("{Sign}", cap(p.sign)))}</span>${
      p.retrograde ? `<span class="chip">${esc(W.retrograde)}</span>` : ""}</li>`).join("")
  }</ul></section>`);

  // The aspects, with the app's verbs and the content's sentence for the pair.
  const verbs = data.verbs;
  const aspects = chart.aspects.map((a) => {
    const pair = data.aspects[`${a.body_a}_${a.body_b}`] ?? data.aspects[`${a.body_b}_${a.body_a}`];
    return `<li><p><strong>${esc(`${bodies[a.body_a]} ${verbs[a.aspect]} your ${bodies[a.body_b]}`)}</strong> <span class="chip">${esc(data.aspectLabels[a.aspect])}</span></p>${
      pair ? `<p class="body-text">${esc(pair)}</p>` : ""}</li>`;
  });
  parts.push(`<section class="rise"><h2>${esc(W.yourAspects)}</h2>${
    aspects.length ? `<ul class="aspect-list">${aspects.join("")}</ul>` : `<p class="body-text">${esc(W.noAspects)}</p>`}</section>`);

  // Share, and the call to action.
  parts.push(`<div class="share-row"><button type="button" class="btn-quiet" id="share-chart">${esc(W.share)}</button><span id="share-note" class="muted" role="status"></span></div>`);
  parts.push(`<section class="cta-block raised rise"><p>${esc(W.thisIsYours)}</p><p>${esc(W.ctaApp)}</p>${data.button}</section>`);

  // The chart itself, for the page's own checks (site/build/chart_check.mjs).
  window.astralChart = { chart, utc: new Date(Date.UTC(b.y, b.m - 1, b.day, b.hh, b.mm) - offset * 60000).toISOString(), offset };
  result.innerHTML = parts.join("");
  result.hidden = false;
  result.querySelectorAll(".rise, .wheel").forEach((el) => el.classList.add("in"));
  result.scrollIntoView({ behavior: "smooth", block: "start" });

  $("share-chart").addEventListener("click", async () => {
    const q = new URLSearchParams({ d: dateEl.value, p: label(chosen), z: chosen.tz,
      la: String(chosen.lat), lo: String(chosen.lng), o: String(offset) });
    if (b.known) q.set("t", `${String(b.hh).padStart(2, "0")}:${String(b.mm).padStart(2, "0")}`);
    const link = `${location.origin}${location.pathname}#${q.toString()}`;
    history.replaceState(null, "", `#${q.toString()}`);
    const note = $("share-note");
    try {
      await navigator.clipboard.writeText(link);
      note.textContent = W.copied;
    } catch (e) {
      note.innerHTML = `${esc(W.copyThis)} <a href="${esc(link)}">${esc(link)}</a>`;
    }
    count("chart_shared");
  });
}

// A chart opened from a shared link: fill the form and show it.
(async function openShared() {
  if (!location.hash || location.hash.length < 2) return;
  const q = new URLSearchParams(location.hash.slice(1));
  const date = q.get("d"), tz = q.get("z"), la = Number(q.get("la")), lo = Number(q.get("lo"));
  const offset = Number(q.get("o")), place = q.get("p") || "";
  if (!date || !tz || !Number.isFinite(la) || !Number.isFinite(lo) || !Number.isFinite(offset)) return;
  const [name, ...rest] = place.split(", ");
  chosen = { name, region: rest.length > 1 ? rest[0] : "", country: rest[rest.length - 1] || "", lat: la, lng: lo, tz };
  dateEl.value = date;
  const t = q.get("t");
  if (t) { timeEl.value = t; } else { unknownEl.checked = true; timeEl.disabled = true; $("noon-note").hidden = false; }
  placeEl.value = label(chosen);
  manualOffset = offset;
  showZone();
  const b = birthParts();
  const utc = new Date(Date.UTC(b.y, b.m - 1, b.day, b.hh, b.mm) - offset * 60000);
  const { natalChart } = await engine();
  render(natalChart(utc, la, lo, b.known), b, offset, true);
})();
