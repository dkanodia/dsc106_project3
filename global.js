// global.js

// Dynamically insert <base> tag only on GitHub Pages
if (location.hostname.includes("github.io")) {
  const base = document.createElement("base");
  base.href = "/dsc106_project3/";
  document.head.appendChild(base);
}

// Determine base path (from the base tag if it exists)
const baseEl = document.querySelector("base");
window.BASE_PATH = baseEl ? baseEl.getAttribute("href") : "/";

// Navigation setup
const pages = [
  { url: '/', title: 'Interactive Visualization' },
  { url: '/writeup/', title: 'Writeup' },
  // { url: '/about/', title: 'About' }
];

const nav = document.createElement('nav');
document.body.prepend(nav);

pages.forEach(p => {
  const a = document.createElement("a");

  if (p.url.match(/^https?:\/\//)) {
    a.href = p.url;
  } else {
    a.href = window.BASE_PATH.replace(/\/$/, "") + p.url;
  }

  a.textContent = p.title;

  if (
    location.pathname.replace(/\/$/, "") ===
    a.pathname.replace(/\/$/, "")
  ) {
    a.classList.add("current");
  }

  if (a.host !== location.host) a.target = "_blank";

  nav.append(a);
});
