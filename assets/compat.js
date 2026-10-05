// The compatibility checker (docs/10, phase 3): the picker on /compatibility
// shows the chosen pair in place, from the same data the pair pages are
// built from, inlined by the generator. Without this script the picker
// still goes to the pair's page.
(function () {
  var d = document;
  var el = d.getElementById("compat-data");
  var form = d.querySelector("form.picker");
  var out = d.getElementById("compat-result");
  if (!el || !form || !out) return;
  var data = JSON.parse(el.textContent);
  var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };
  var cap = function (s) { return s[0].toUpperCase() + s.slice(1); };

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var a = form.a.value, b = form.b.value;
    var first = data.signs.indexOf(a) <= data.signs.indexOf(b);
    var x = first ? a : b, y = first ? b : a;
    var pair = data.pairs[x + "_" + y];
    if (!pair) return;
    var title = cap(x) + " and " + cap(y);
    var levels = data.categories.map(function (c) {
      var lvl = pair.levels[c], bars = data.bars[lvl];
      var i = "";
      for (var k = 1; k <= 3; k++) i += "<i" + (k <= bars ? ' class="on"' : "") + "></i>";
      return '<li><span class="cat">' + esc(c) + '</span><span class="bars" aria-hidden="true">' + i + '</span><span class="lvl">' + esc(lvl) + "</span></li>";
    }).join("");
    out.innerHTML = "<h2>" + esc(title) + "</h2>" +
      '<ul class="levels card">' + levels + "</ul>" +
      '<p class="body-text">' + esc(pair.text) + "</p>" +
      '<p class="footnote">' + esc(data.footnote) + "</p>" +
      '<p><a href="/compatibility/' + x + "-and-" + y + '">' + esc(data.readMore.replace("{A} and {B}", title)) + "</a></p>";
    out.hidden = false;
    out.scrollIntoView({ behavior: "smooth", block: "start" });
    if (window.astral) window.astral.count("compatibility_checked", "compatibility");
  });
})();
