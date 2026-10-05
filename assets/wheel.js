// The chart wheel in SVG (docs/10, phase 1), drawn to the geometry and
// colours of app/lib/core/widgets/chart_wheel.dart: the Ascendant at 9
// o'clock, the zodiac running counter-clockwise, three gold rings, the sign
// dividers and upright sign names outside the rim, house cusps, a tick per
// planet, the glyphs, and the aspect lines.
//
// wheelSvg() is a pure function from chart data to markup, so the generator
// draws the wheel into the page at build time (it is there with no script)
// and phase 3's calculator can call the same function in the browser. Every
// element that moves carries its own delay and duration; site.css turns
// them into the app's build: rings stroke on from the Ascendant, dividers
// and cusps grow outward, glyphs fade in one after another, aspect lines
// draw last, 900 ms in all.

/** The app's build: 900 ms, rings 0 to 45%, dividers 35 to 65%, aspects
 * 65 to 100%, glyphs 25 ms apart from 60%, 150 ms each. */
const BUILD_MS = 900;

const GOLD = "#E9C87E";
const GOLD_BUTTON = "#ECCA84";
const MUTED = "#8E84A0";
const FAINT = "#8E84A0";

const SIGNS = [
  "ARIES", "TAURUS", "GEMINI", "CANCER", "LEO", "VIRGO",
  "LIBRA", "SCORPIO", "SAGITTARIUS", "CAPRICORN", "AQUARIUS", "PISCES",
];

const ASPECT_ALPHA = {
  conjunction: 0.5, sextile: 0.5, trine: 0.5, square: 0.35, opposition: 0.35,
};

/** Two decimals: small markup, and the same output every run. */
const n = (x) => Math.round(x * 100) / 100;

/** "delay and duration" as CSS custom properties, in milliseconds. */
const timing = (from, to) =>
  `--d:${Math.round(from * BUILD_MS)}ms;--t:${Math.round((to - from) * BUILD_MS)}ms`;

function geometry(size, ascendant) {
  const c = size / 2;
  const outer = size / 2 - 1 - 18;
  const signInner = outer - 26;
  const planet = signInner - 20;
  return {
    c,
    outer,
    labelR: size / 2 - 8,
    signInner,
    signR: outer - 13,
    planet,
    tick: signInner,
    aspect: planet - 24,
    point(lon, r) {
      const phi = Math.PI + ((lon - ascendant) * Math.PI) / 180;
      return [c + r * Math.cos(phi), c - r * Math.sin(phi)];
    },
  };
}

/** Planets within 7 degrees of the one before are nudged along, so glyphs
 * never overlap. Returns [planet, drawn longitude] in zodiac order. */
function spread(planets) {
  const sorted = [...planets].sort((a, b) => a.longitude - b.longitude);
  let last = null;
  return sorted.map((p) => {
    let lon = p.longitude;
    if (last !== null && lon - last < 7) lon = last + 7;
    last = lon;
    return [p, lon];
  });
}

function line(g, lonA, rA, lonB, rB, attrs) {
  const [x1, y1] = g.point(lonA, rA);
  const [x2, y2] = g.point(lonB, rB);
  return `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" pathLength="1" ${attrs}/>`;
}

/**
 * The wheel as SVG markup.
 *
 * chart: { planets: [{ body, longitude, retrograde }], houses: [{ longitude }]
 * | null, aspects: [{ body_a, body_b, aspect }] }, as natal_charts stores it.
 * glyphs: { body: inner SVG markup on the 24 px grid } for every body drawn.
 * label: the accessible name.
 */
export function wheelSvg(chart, { glyphs, label, size = 340, id = "w" }) {
  const cusps = chart.houses && chart.houses.length === 12
    ? chart.houses.map((h) => h.longitude)
    : null;
  const g = geometry(size, cusps ? cusps[0] : 0);
  const out = [];

  out.push(
    `<svg class="wheel" viewBox="0 0 ${size} ${size}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">`,
    "<defs>",
    `<radialGradient id="${id}-disc"><stop offset="0" stop-color="#211733"/><stop offset=".72" stop-color="#150F1F"/><stop offset="1" stop-color="#100B18"/></radialGradient>`,
    `<filter id="${id}-halo" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4"/></filter>`,
  );
  const bodies = [...new Set(chart.planets.map((p) => p.body))].sort();
  for (const b of bodies) {
    if (!glyphs[b]) throw new Error(`no glyph for ${b}`);
    out.push(
      `<symbol id="${id}-${b}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${glyphs[b]}</symbol>`,
    );
  }
  out.push("</defs>");

  // The dark disc and its faint gold halo.
  out.push(
    `<circle cx="${g.c}" cy="${g.c}" r="${n(g.outer + 10)}" fill="url(#${id}-disc)"/>`,
    `<circle cx="${g.c}" cy="${g.c}" r="${n(g.outer + 6)}" fill="none" stroke="${GOLD}" stroke-opacity=".15" stroke-width="12" filter="url(#${id}-halo)"/>`,
  );

  // Rings, stroked on clockwise from the Ascendant.
  const ring = (r, width, alpha) =>
    `<circle class="w-draw" style="${timing(0, 0.45)}" cx="${g.c}" cy="${g.c}" r="${n(r)}" pathLength="1" transform="rotate(180 ${g.c} ${g.c})" fill="none" stroke="${GOLD}" stroke-opacity="${alpha}" stroke-width="${width}"/>`;
  out.push(ring(g.outer, 1.3, 0.9), ring(g.signInner, 0.9, 0.6), ring(g.aspect, 0.9, 0.6));

  // Sign dividers, growing outward.
  const div = timing(0.35, 0.65);
  for (let i = 0; i < 12; i++) {
    out.push(line(g, i * 30, g.signInner, i * 30, g.outer,
      `class="w-draw" style="${div}" stroke="${GOLD}" stroke-opacity=".55" stroke-width="1"`));
  }

  // House cusps, the angular four stronger.
  if (cusps) {
    cusps.forEach((lon, i) => {
      const angular = i % 3 === 0;
      out.push(line(g, lon, g.aspect, lon, g.signInner,
        `class="w-draw" style="${div}" stroke="${MUTED}" stroke-opacity="${angular ? 1 : 0.5}" stroke-width="${angular ? 1.5 : 1}"`));
    });
  }

  // Sign names outside the rim: upright, small caps, faint, anchored so
  // each hugs the rim along its own angle. textLength fixes the width the
  // anchoring assumed, whatever the font.
  for (let i = 0; i < 12; i++) {
    const [ax, ay] = g.point(i * 30 + 15, g.labelR);
    const w = SIGNS[i].length * 5.9;
    const h = 10;
    const ux = (ax - g.c) / g.labelR;
    const uy = (ay - g.c) / g.labelR;
    const left = Math.min(Math.max(ax - w / 2 + ux * (w / 2), 0), size - w);
    const top = Math.min(Math.max(ay - h / 2 + uy * (h / 2), 0), size - h);
    out.push(
      `<text class="w-fade" style="${div}" x="${n(left)}" y="${n(top + 8)}" textLength="${n(w)}" lengthAdjust="spacing" fill="${FAINT}" font-size="8" font-weight="600" font-family="DM Sans, sans-serif">${SIGNS[i]}</text>`,
    );
  }

  // A tick per planet on the inner edge of the sign ring.
  for (const p of chart.planets) {
    out.push(line(g, p.longitude, g.tick - 6, p.longitude, g.tick,
      `class="w-draw" style="${div}" stroke="${GOLD_BUTTON}" stroke-width="1.5"`));
  }

  // Aspect lines, drawn last; a conjunction is a short arc on the ring.
  const at = new Map(chart.planets.map((p) => [p.body, p.longitude]));
  const asp = timing(0.65, 1);
  for (const a of chart.aspects) {
    const la = at.get(a.body_a);
    const lb = at.get(a.body_b);
    const alpha = ASPECT_ALPHA[a.aspect];
    if (la === undefined || lb === undefined || alpha === undefined) continue;
    if (a.aspect === "conjunction") {
      const r = g.aspect - 3;
      const [x1, y1] = g.point(la, r);
      const [x2, y2] = g.point(lb, r);
      const delta = ((lb - la + 540) % 360) - 180;
      out.push(
        `<path class="w-draw" style="${asp}" d="M${n(x1)} ${n(y1)}A${n(r)} ${n(r)} 0 0 ${delta > 0 ? 0 : 1} ${n(x2)} ${n(y2)}" pathLength="1" fill="none" stroke="${GOLD}" stroke-opacity="${alpha}" stroke-width="2"/>`,
      );
    } else {
      out.push(line(g, la, g.aspect, lb, g.aspect,
        `class="w-draw" style="${asp}" stroke="${GOLD}" stroke-opacity="${alpha}" stroke-width="1"`));
    }
  }

  // The glyphs, gold, fading in one after another in zodiac order.
  const placed = spread(chart.planets);
  placed.forEach(([p, lon], i) => {
    const start = Math.min(Math.max(0.6 + (i * 25) / BUILD_MS, 0.6), 0.97);
    const end = Math.min(start + 150 / BUILD_MS, 1);
    const [x, y] = g.point(lon, g.planet);
    out.push(
      `<use class="w-fade" style="${timing(start, end)}" href="#${id}-${p.body}" x="${n(x - 9)}" y="${n(y - 9)}" width="18" height="18" color="${GOLD_BUTTON}"/>`,
    );
  });

  out.push("</svg>");
  return out.join("");
}

/** The screen reader's summary, as the app gives it: "Sun in Capricorn at
 * 10 degrees, ...". */
export function wheelSummary(chart, names) {
  return chart.planets.map((p) => {
    const sign = names.signs[Math.floor(p.longitude / 30)];
    return `${names.bodies[p.body]} in ${sign} at ${Math.floor(p.longitude % 30)} degrees`;
  }).join(", ");
}
