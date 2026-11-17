// The Play badge's clear space in the hero (Belmont, 17 Nov 2026): a quarter
// of the badge's height on every side, widened by the stars' drift (22 px
// left, 16 down), is cut out of the stars layer and filled with the blurred
// sky (site.css). Placed from the layout, which ignores the arrival
// animations, and placed again whenever the text reflows.
(function () {
  var h = document.querySelector(".hero"), s = h && h.querySelector(".hero-stars");
  var b = h && h.querySelector(".play-badge"), intro = h && h.querySelector(".hero-intro");
  if (!s || !b) return;
  function place() {
    var x = 0, y = 0, e = b, q = b.offsetHeight / 4, st = h.style;
    for (; e && e !== h; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; }
    st.setProperty("--hx", x - q - s.offsetLeft + "px");
    st.setProperty("--hy", y - q - 16 - s.offsetTop + "px");
    st.setProperty("--hw", b.offsetWidth + 2 * q + 22 + "px");
    st.setProperty("--hh", b.offsetHeight + 2 * q + 16 + "px");
    h.classList.add("placed");
  }
  place();
  if (window.ResizeObserver) { var ro = new ResizeObserver(place); ro.observe(h); if (intro) ro.observe(intro); }
  else addEventListener("resize", place);
})();

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
