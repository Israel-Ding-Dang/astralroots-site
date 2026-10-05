(function () {
var d = document, html = d.documentElement;
html.classList.add("ready");
var motion = html.classList.contains("motion");
function meta(name) {
var m = d.querySelector('meta[name="' + name + '"]');
return m ? m.getAttribute("content") : "";
}
var api = meta("astral-api"), key = meta("astral-key");
function post(table, row) {
return fetch(api + "/" + table, {
method: "POST",
keepalive: true,
headers: {
apikey: key, Authorization: "Bearer " + key,
"Content-Type": "application/json", Prefer: "return=minimal",
},
body: JSON.stringify(row),
});
}
var nav = window.navigator || {};
var counting = location.hostname === meta("astral-host") &&
!nav.webdriver && nav.globalPrivacyControl !== true &&
!/bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|whatsapp/i
.test(nav.userAgent || "");
var phone = window.matchMedia && matchMedia("(max-width: 767px)").matches;
var from = "";
try {
if (d.referrer) {
from = new URL(d.referrer).hostname.toLowerCase().replace(/^www\./, "");
if (from === location.hostname.replace(/^www\./, "") || !/^[a-z0-9.-]{1,253}$/.test(from)) from = "";
}
} catch (e) { from = ""; }
function count(event, page) {
if (!counting) return;
try {
post("site_events", {
event: event, page: page || html.getAttribute("data-page") || "home",
phone: !!phone, ref_host: from,
}).catch(function () {});
} catch (e) { /* never in the way */ }
}
window.astral = { count: count };
count("page_view");
d.querySelectorAll(".stagger").forEach(function (group) {
Array.prototype.forEach.call(group.querySelectorAll(":scope > .rise"), function (el, i) {
el.style.setProperty("--stagger", i * 40 + "ms");
});
});
var targets = d.querySelectorAll(".rise, .wheel");
if (motion && "IntersectionObserver" in window) {
var io = new IntersectionObserver(function (entries) {
entries.forEach(function (e) {
if (!e.isIntersecting) return;
e.target.classList.add("in");
io.unobserve(e.target);
});
}, { rootMargin: "0px 0px -6% 0px" });
targets.forEach(function (el) { io.observe(el); });
} else {
targets.forEach(function (el) { el.classList.add("in"); });
}
var moon = d.querySelector(".hero-moon");
if (moon && motion) {
var queued = false;
window.addEventListener("scroll", function () {
if (queued) return;
queued = true;
requestAnimationFrame(function () {
queued = false;
var y = Math.min(window.scrollY * 0.05, 12);
moon.style.transform = "translate3d(0," + y.toFixed(1) + "px,0)";
});
}, { passive: true });
}
if (!d.getElementById("compat-data")) d.querySelectorAll("form.picker").forEach(function (f) {
f.addEventListener("submit", function (e) {
e.preventDefault();
var a = f.a, b = f.b, x = a.selectedIndex <= b.selectedIndex;
location.href = "/compatibility/" + (x ? a.value + "-and-" + b.value : b.value + "-and-" + a.value);
});
});
d.addEventListener("click", function (e) {
var a = e.target.closest && e.target.closest("a[data-play]");
if (a) count("play_click", a.getAttribute("data-play"));
});
var sheet = d.getElementById("waitlist");
if (!sheet || typeof sheet.showModal !== "function") return;
var form = sheet.querySelector("form");
var error = sheet.querySelector(".error");
var send = form.querySelector("button[type=submit]");
var slug = "home";
d.querySelectorAll("[data-waitlist]").forEach(function (b) {
b.addEventListener("click", function () {
slug = b.getAttribute("data-waitlist") || "home";
sheet.showModal();
});
});
sheet.querySelector(".close").addEventListener("click", function () { sheet.close(); });
sheet.addEventListener("click", function (e) { if (e.target === sheet) sheet.close(); });
function done(name) {
form.hidden = true;
var t = sheet.querySelector(".thanks");
t.textContent = t.getAttribute("data-text").replace("{name}", name);
t.hidden = false;
}
form.addEventListener("submit", function (e) {
e.preventDefault();
error.textContent = "";
var name = form.first_name.value.trim();
var email = form.email.value.trim();
if (form.website.value) { done(name); return; }
if (!name) { error.textContent = error.getAttribute("data-name"); form.first_name.focus(); return; }
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
error.textContent = error.getAttribute("data-email"); form.email.focus(); return;
}
send.disabled = true;
post("waitlist", { first_name: name.slice(0, 60), email: email, source: slug })
.then(function (r) {
if (r.status === 201 || r.status === 409) {
count("waitlist_submit", slug);
done(name);
} else {
throw new Error(String(r.status));
}
}).catch(function () {
error.textContent = error.getAttribute("data-failed");
send.disabled = false;
});
});
})();
