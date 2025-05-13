const baseEl = document.querySelector("base");
export const BASE_PATH = baseEl
  ? baseEl.getAttribute("href")
  : "/";

const pages = [
  { url: '/', title: 'Interactive Vizualization'},
  { url: '/writeup/', title: 'Writeup'},
  { url: '/about/', title: 'About'}
];

let nav = document.createElement('nav');
document.body.prepend(nav);

pages.forEach(p => {
  let a = document.createElement("a");
  
  if (p.url.match(/^https?:\/\//)) {
    a.href = p.url;
  } else {
    
    a.href = p.url.startsWith(BASE_PATH)
      ? p.url
      : BASE_PATH.replace(/\/$/, "") + p.url;
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

