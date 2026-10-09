// The home page's sky strip (docs/10 pass 4, item 8): reads the day's sky
// from sky/today.json, written every morning by the daily job, and shows
// the Moon's phase and sign, the next new or full moon, and the Moon's
// shading, so the home page carries the day. Loaded on the home page only
// while Sky today is live.
(function () {
  var moon = document.getElementById("sky-moon"), next = document.getElementById("sky-next");
  var disc = document.querySelector("#sky-strip .moon");
  if (!moon || !next) return;
  fetch("/sky/today.json").then(function (r) { return r.ok ? r.json() : null; }).then(function (sky) {
    if (!sky) return;
    if (sky.moon && sky.moon.line) moon.textContent = sky.moon.line;
    if (sky.next && sky.next.line) next.textContent = sky.next.line;
    if (disc && sky.moon && sky.moon.shade) {
      disc.className = "moon " + sky.moon.shade.cls;
      disc.style.setProperty("--term", sky.moon.shade.term);
    }
  }).catch(function () {});
})();
