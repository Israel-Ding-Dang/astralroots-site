// The Pinterest pin design (Belmont, 14 Oct 2026), shared by the local
// renderer (site/pins/render.mjs, batches 1 and 2) and the daily job, which
// draws the dated event pins itself (sky/pins-draw.mjs, 20 Nov 2026). 1000 by
// 1500, the midnight sky and starfield, the gold, Playfair Display for the
// title, DM Sans for the rest, the page's own art at the top, the title
// block and a gold pill with the call to action sharing the rest of the frame
// evenly, and astralroots.app small at the foot.
//
// Batch 1's kinds are drawn exactly as before; batch 2 and the event pins add
// planets in signs, planets in houses, the sign and house pages, and the
// season pins. Every path in a pin is resolved by the caller's file().
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const DASHES = new RegExp("[" + String.fromCharCode(0x2014, 0x2013) + "]");

const css = (fonts, starfield) => `
@font-face { font-family: "Playfair Display"; font-weight: 400; src: url(${pathToFileURL(join(fonts, "playfair-400.woff2")).href}) format("woff2"); }
@font-face { font-family: "DM Sans"; font-weight: 400; src: url(${pathToFileURL(join(fonts, "dmsans-400.woff2")).href}) format("woff2"); }
@font-face { font-family: "DM Sans"; font-weight: 500; src: url(${pathToFileURL(join(fonts, "dmsans-500.woff2")).href}) format("woff2"); }
@font-face { font-family: "DM Sans"; font-weight: 700; src: url(${pathToFileURL(join(fonts, "dmsans-700.woff2")).href}) format("woff2"); }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1000px; height: 1500px; overflow: hidden; }
body { position: relative; background: linear-gradient(180deg, #1C1633 0%, #18122A 24%, #16111E 46%, #120D19 100%); font-family: "DM Sans", sans-serif; color: #D9D2E3; }
.stars { position: absolute; inset: 0; background: url(${starfield}) center / cover no-repeat; opacity: .35; }
.glow { position: absolute; left: 150px; width: 700px; height: 700px; border-radius: 50%; background: radial-gradient(circle, rgba(233, 200, 126, .16) 0%, rgba(233, 200, 126, 0) 65%); }
.art { position: absolute; left: 0; top: 0; width: 1000px; display: flex; align-items: center; justify-content: center; }
.banner { position: absolute; left: 0; top: 0; width: 1000px; object-fit: cover; }
.fade { position: absolute; left: 0; width: 1000px; height: 200px; background: linear-gradient(180deg, rgba(24, 18, 42, 0), #18122A 92%); }
.disc { position: absolute; left: 405px; width: 190px; height: 190px; border-radius: 50%; box-shadow: 0 0 70px rgba(233, 200, 126, .3); }
.pair { display: flex; align-items: center; gap: 44px; }
.pair img { width: 280px; height: 280px; border-radius: 50%; box-shadow: 0 0 60px rgba(233, 200, 126, .22); }
.pair .plus { font: 400 90px/1 "Playfair Display", serif; color: #E9C87E; }
.moon { filter: drop-shadow(0 0 50px rgba(233, 200, 126, .22)); }
.wheel svg { display: block; width: 100%; height: 100%; }
.stack { position: absolute; left: 50px; right: 50px; bottom: 116px; display: flex; flex-direction: column; justify-content: space-evenly; align-items: center; text-align: center; }
.tb { display: flex; flex-direction: column; align-items: center; }
.eyebrow { font: 700 26px/1 "DM Sans"; letter-spacing: .14em; text-transform: uppercase; color: #E9C87E; margin-bottom: 24px; }
h1 { font: 400 108px/1.08 "Playfair Display", serif; color: #fff; }
h1.long { font-size: 92px; }
h1.question { font-size: 128px; line-height: 1.04; }
.date { margin-top: 20px; font: 500 46px/1.2 "DM Sans"; color: #E9C87E; }
.rule { width: 120px; height: 2px; margin-top: 30px; background: #E9C87E; opacity: .8; }
.line { margin-top: 28px; max-width: 880px; font: 500 69px/1.26 "DM Sans"; color: #D9D2E3; }
.pill { padding: 24px 46px; border-radius: 999px; background: linear-gradient(180deg, #F0D190, #E9C57C); box-shadow: 0 14px 40px rgba(233, 197, 124, .28), inset 0 1px 0 rgba(255, 255, 255, .45); font: 700 36px/1.1 "DM Sans"; color: #1E1428; white-space: nowrap; }
.url { position: absolute; left: 0; right: 0; bottom: 52px; text-align: center; font: 500 32px/1 "DM Sans"; color: #E9C87E; letter-spacing: .04em; }
`;
// Rules only batch 2's art uses, added for those pins alone, so batch 1's
// pages are byte for byte what they were.
const EXTRA_CSS = {
  house: `.glyph { color: #E9C87E; filter: drop-shadow(0 0 40px rgba(233, 200, 126, .35)); }
.glyph svg { display: block; width: 100%; height: 100%; }
`,
  gdisc: `.gdisc { position: absolute; left: 405px; width: 190px; height: 190px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #1E1729; border: 2px solid rgba(233, 200, 126, .6); box-shadow: 0 0 70px rgba(233, 200, 126, .3); color: #E9C87E; }
.gdisc svg { display: block; width: 112px; height: 112px; }
`,
  househub: `.ring { display: flex; align-items: center; justify-content: center; width: 400px; height: 400px; border-radius: 50%; border: 3px solid rgba(233, 200, 126, .7); box-shadow: 0 0 80px rgba(233, 200, 126, .18), inset 0 0 60px rgba(233, 200, 126, .08); font: 400 170px/1 "Playfair Display", serif; color: #E9C87E; }
`,
};

const extraCss = (pin) =>
  pin.kind === "planet" && pin.art.glyph ? EXTRA_CSS.gdisc
    : pin.kind === "planetpage" ? EXTRA_CSS.house
      : EXTRA_CSS[pin.kind] ?? "";

const EYEBROW = { sun: "Sun sign", moon: "Moon sign", rising: "Rising sign", pair: "Sign compatibility", ritual: "Moon ritual", calculator: "Free, in your browser" };

/** The art at the top, and where the text stack begins below it. */
function art(pin, file) {
  switch (pin.kind) {
    case "sun": case "moon": case "planet": case "season":
      // Chiron and the North Node, which have no photograph, carry their gold
      // glyph in a disc of the same size.
      return { top: 520, html: `<div class="art" style="height:520px"><img class="banner" style="height:440px" src="${file(pin.art.banner)}" alt=""><div class="fade" style="top:260px"></div>${pin.art.glyph ? `<div class="gdisc" style="top:325px">${pin.art.glyph}</div>` : `<img class="disc" style="top:325px" src="${file(pin.art.disc)}" alt="">`}</div>` };
    case "rising": case "sign":
      return { top: 470, html: `<div class="art" style="height:470px"><img class="banner" style="height:470px" src="${file(pin.art.banner)}" alt=""><div class="fade" style="top:280px"></div></div>` };
    case "pair":
      return { top: 410, html: `<div class="glow" style="top:-80px"></div><div class="art" style="height:420px;padding-top:40px"><div class="pair"><img src="${file(pin.art.discA)}" alt=""><span class="plus">+</span><img src="${file(pin.art.discB)}" alt=""></div></div>` };
    case "ritual":
      return { top: 480, html: `<div class="glow" style="top:-110px"></div><div class="art" style="height:500px;padding-top:30px"><img class="moon" style="width:420px;height:420px" src="${file(pin.art.moon)}" alt=""></div>` };
    case "house": case "planetpage":
      // The planet's own photograph as the ritual pins carry the Moon; the
      // North Node and Chiron, which have none, their gold glyph from the page.
      return pin.art.photo
        ? { top: 480, html: `<div class="glow" style="top:-110px"></div><div class="art" style="height:500px;padding-top:30px"><img class="moon" style="width:400px;height:400px;border-radius:50%" src="${file(pin.art.photo)}" alt=""></div>` }
        : { top: 480, html: `<div class="glow" style="top:-110px"></div><div class="art" style="height:500px;padding-top:30px"><div class="glyph" style="width:300px;height:300px">${pin.art.glyph}</div></div>` };
    case "househub":
      return { top: 480, html: `<div class="glow" style="top:-110px"></div><div class="art" style="height:500px;padding-top:30px"><div class="ring">${esc(pin.art.number)}</div></div>` };
    case "calculator":
      return pin.design === 1
        ? { top: 450, html: `<div class="glow" style="top:-120px"></div><div class="art" style="height:470px;padding-top:30px"><div class="wheel" style="width:410px;height:410px">${pin.art.wheel}</div></div>` }
        : { top: 70, html: "" };
  }
  throw new Error(`${pin.slug}: no art for the kind ${pin.kind}`);
}

// Calculator layouts: design 1 the wheel at the top; 2 the wheel large under
// the words; 3 the question with a smaller wheel. Batch 2's four new
// calculator pins (designs 4 to 7) reuse layouts 2 and 3.
const layoutOf = (pin) => pin.kind !== "calculator" ? null : pin.layout ?? pin.design;

function stack(pin, top) {
  const layout = layoutOf(pin);
  const titleCls = layout === 3 ? "question" : pin.title.length > 18 ? "long" : "";
  const eyebrowText = pin.eyebrow ?? EYEBROW[pin.kind];
  const eyebrow = layout === 3 || !eyebrowText ? "" : `<div class="eyebrow">${esc(eyebrowText)}</div>`;
  const date = pin.date ? `<div class="date">${esc(pin.date)}</div>` : "";
  const tb = `<div class="tb">${eyebrow}<h1 class="${titleCls}">${esc(pin.title)}</h1>${date}<div class="rule"></div><p class="line">${esc(pin.line)}</p></div>`;
  // Layouts two and three carry the wheel inside the stack, under the words:
  // large on two, smaller on three, which leads with the question.
  const wheel = pin.kind === "calculator" && layout !== 1
    ? `<div class="wheel" style="width:${layout === 2 ? 470 : 360}px;height:${layout === 2 ? 470 : 360}px">${pin.art.wheel}</div>`
    : "";
  return `<div class="stack" style="top:${top}px">${tb}${wheel}<div class="pill">${esc(pin.cta)}</div></div>`;
}

/** The whole page for one pin. file() turns an art path into a URL; fonts is
 * the folder holding the site's woff2 files; starfield is the sky's URL. */
export function pinPage(pin, { file, fonts, starfield }) {
  const a = art(pin, file);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${css(fonts, starfield)}${extraCss(pin)}</style></head><body><div class="stars"></div>${a.html}${stack(pin, a.top)}<div class="url">astralroots.app</div></body></html>`;
  if (DASHES.test(html)) throw new Error(`${pin.slug}: a long or short dash`);
  return html;
}

/** Draws one pin in an open puppeteer tab (1000 by 1500) and returns the JPEG
 * and how the words were fitted: a title at most two lines (three for the
 * question), then the whole stack inside its box, shrinking the line first
 * and the title second; the JPEG under 300 KB. */
export async function drawPin(tab, pin, opts, tmpDir) {
  const tmp = join(tmpDir, `${pin.slug}.html`);
  writeFileSync(tmp, pinPage(pin, opts));
  await tab.goto(pathToFileURL(tmp).href, { waitUntil: "load" });
  await tab.evaluate(() => document.fonts.ready);
  const fit = await tab.evaluate(() => {
    const h = document.querySelector("h1"), line = document.querySelector(".line"), stack = document.querySelector(".stack");
    const maxLines = h.classList.contains("question") ? 3.3 : 2.3;
    let hs = parseFloat(getComputedStyle(h).fontSize), ls = parseFloat(getComputedStyle(line).fontSize);
    while (h.scrollHeight > maxLines * hs && hs > 64) { hs -= 4; h.style.fontSize = hs + "px"; }
    while (stack.scrollHeight > stack.clientHeight + 1 && ls > 52) { ls -= 3; line.style.fontSize = ls + "px"; }
    while (stack.scrollHeight > stack.clientHeight + 1 && hs > 64) { hs -= 4; h.style.fontSize = hs + "px"; }
    const eb = document.querySelector(".eyebrow");
    // the eyebrow is one line of 26 px type, never wrapped
    return { hs, ls, over: stack.scrollHeight - stack.clientHeight, eyebrowOver: eb ? eb.offsetHeight - 40 : 0 };
  });
  if (fit.over > 1) throw new Error(`${pin.slug}: the words do not fit (${fit.over} px over)`);
  if (fit.eyebrowOver > 0) throw new Error(`${pin.slug}: the eyebrow runs to a second line`);
  let buf;
  for (let q = 84; q >= 50; q -= 6) {
    buf = await tab.screenshot({ type: "jpeg", quality: q });
    if (buf.length < 300 * 1024) break;
  }
  return { buf, fit };
}
