(function () {
var d = document, html = d.documentElement;
html.classList.add("ready");
var motion = html.classList.contains("motion");
function track(name, params) {
if (typeof window.gtag === "function") window.gtag("event", name, params);
}
window.astral = { track: track };
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
d.addEventListener("click", function (e) {
var a = e.target.closest && e.target.closest("a[data-play]");
if (a) track("play_click", { page_slug: a.getAttribute("data-play") });
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
var key = sheet.getAttribute("data-key");
fetch(sheet.getAttribute("data-endpoint"), {
method: "POST",
headers: {
apikey: key, Authorization: "Bearer " + key,
"Content-Type": "application/json", Prefer: "return=minimal",
},
body: JSON.stringify({ first_name: name.slice(0, 60), email: email, source: slug }),
}).then(function (r) {
if (r.status === 201 || r.status === 409) {
track("waitlist_submit", { page_slug: slug });
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
