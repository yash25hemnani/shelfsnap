import {
  APK_URL,
  AUTHOR_GITHUB,
  AUTHOR_LINKEDIN,
  AUTHOR_NAME,
  APP_REPO_URL,
} from "../constants/catalog.constants";

// Screenshots from the Android app, served from public/site/about/
const SHOT = (name: string) => `/site/about/${name}.webp`;
// Real counts, updated by hand; screen readers hear when they were taken
const STATS = [
  { value: "17", label: "readers", icon: "reader" },
  { value: "8", label: "libraries", icon: "library" },
  { value: "1,000+", label: "books", icon: "stack" },
];
const STATS_AS_OF = "November 2026";

const SHOT_W = 720;
const SHOT_H = 1419;

const ICONS: Record<string, string> = {
  download: `<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>`,
  github: `<path fill="currentColor" stroke="none" d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"/>`,
  linkedin: `<path fill="currentColor" stroke="none" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"/>`,
  check: `<path d="M20 6 9 17l-5-5"/>`,
  tag: `<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r="1.5"/>`,
  code: `<path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/>`,
  phone: `<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M11 18h2"/>`,
  reader: `<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>`,
  library: `<path d="M4 3v18"/><path d="M9 3v18"/><path d="m14 4 4.5 16.5"/><path d="M3 21h18"/>`,
  stack: `<path d="m12 3 9 4.5-9 4.5-9-4.5z"/><path d="m3 12 9 4.5 9-4.5"/><path d="m3 16.5 9 4.5 9-4.5"/>`,
};

function icon(name: string): string {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}

function phone(name: string, alt: string, lazy = true): string {
  return `<figure class="phone"><img src="${SHOT(name)}" width="${SHOT_W}" height="${SHOT_H}" alt="${alt}"${lazy ? ' loading="lazy"' : ""}></figure>`;
}

// Who the page is selling to. Each one gets a tab with its own screenshot.
const AUDIENCES = [
  {
    id: "family",
    tab: "A family",
    title: "One shelf for the whole house",
    body: "Everyone in the house adds the books they own to one shared library. Before you buy a book, search the library and see if someone at home already has it.",
    points: [
      "Invite family with a link or a QR code",
      "Owners and editors decide who can add books",
      "Covers, authors and page counts fill in on their own",
    ],
    shot: "library-books",
    alt: "A shared library called Hemnani House with 6 members, 134 books and a grid of covers",
  },
  {
    id: "club",
    tab: "A book club",
    title: "Lend a copy and know where it went",
    body: "Pool the club's books into one library. Mark a copy as lent and the library shows who has it, so it comes back after the meeting.",
    points: [
      "A Lent out filter shows every copy that's away",
      "Each copy keeps its own status",
      "Search the club's whole shelf by title or author",
    ],
    shot: "book",
    alt: "A book page for Odysseus: The Oath with reading progress and a card for this copy",
  },
  {
    id: "reader",
    tab: "A reader",
    title: "See your reading year add up",
    body: "Log the page you're on and ShelfSnap keeps the count: books finished, pages read and a chart of each month.",
    points: [
      "Update your page straight from Home",
      "Books finished and pages read, month by month",
      "Browse what you own by genre",
    ],
    shot: "stats",
    alt: "Reading stats with books finished, pages read and a monthly chart",
  },
  {
    id: "venue",
    tab: "A café, office or school",
    title: "Put your shelf online for visitors",
    body: "Make a library public and it gets its own web page. Print the QR code next to the shelf, and visitors can browse every book in their browser without installing anything.",
    points: [
      "A public web catalog with search for each library",
      "Visitors ask to join, and you approve them",
      "Keep a library private or unlisted when you'd rather not share it",
    ],
    shot: "public",
    alt: "The Public libraries tab with a library of 550 books",
  },
];

const STYLES = `
:root {
  --ink: #15291E; --green: #2F6B4F; --green-dark: #1F4A36; --paper: #FFFFFF;
  --text-2: #56665D; --line: #E2E5E3; --leaf-2: #C7DDCD;
  --bezel: #1A1F1C; --rim: #A9B2AD;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; background: var(--paper); color: var(--ink); font: 17px/1.6 "DM Sans", system-ui, sans-serif; }
img { display: block; max-width: 100%; height: auto; }
a { color: var(--green); }
a:focus-visible, button:focus-visible { outline: 2px solid var(--green); outline-offset: 3px; }
h1, h2, h3 { font-family: "Bricolage Grotesque", "DM Sans", sans-serif; font-weight: 700; margin: 0; }
.wrap { max-width: 1120px; margin: 0 auto; padding: 0 16px; }
.icon { width: 18px; height: 18px; flex: none; }

.top { display: flex; align-items: center; justify-content: space-between; padding-top: 20px; padding-bottom: 20px; }
.brand { font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; font-size: 22px; color: var(--ink); text-decoration: none; letter-spacing: -0.02em; }
.button {
  display: inline-flex; align-items: center; gap: 8px; padding: 13px 22px; border-radius: 16px;
  font-weight: 600; font-size: 16px; text-decoration: none; background: var(--green); color: #fff;
  border: 1px solid var(--green);
}
.button:hover { background: var(--green-dark); border-color: var(--green-dark); }
.button.ghost { background: var(--paper); color: var(--green); border-color: var(--line); }
.button.ghost:hover { border-color: var(--green); }
.top .button { padding: 9px 16px; font-size: 15px; }

.hero { padding: 40px 0 0; }
.hero h1 { font-size: clamp(40px, 7.4vw, 88px); line-height: .98; letter-spacing: -0.035em; max-width: 14ch; }
.hero .lede { margin: 24px 0 0; max-width: 54ch; font-size: clamp(17px, 2vw, 20px); color: var(--text-2); }
.actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
.note { margin: 12px 0 0; font-size: 14px; color: var(--text-2); max-width: 60ch; }

/* Five phones side by side, all straight and the same size. The row is
   wider than the text column so the screens stay readable. */
.showcase { margin-top: 56px; }
.showcase .wrap { max-width: 1360px; }
.shelf-row { display: flex; justify-content: center; gap: clamp(16px, 2vw, 28px); padding: 4px 4px 32px; }
.shelf-row .phone { flex: 1 1 0; min-width: 0; max-width: 252px; }
@media (min-width: 600px) {
  .shelf-row { align-items: flex-end; gap: clamp(10px, 1.3vw, 18px); }
  .shelf-row .phone:nth-child(3) { flex-grow: 1.17; max-width: 284px; }
  .shelf-row .phone:nth-child(2), .shelf-row .phone:nth-child(4) { flex-grow: 1.08; max-width: 262px; }
  .shelf-row .phone:nth-child(1), .shelf-row .phone:nth-child(5) { flex-grow: 1; max-width: 242px; }
}
.shelf-row:focus-visible { outline: 2px solid var(--green); outline-offset: 4px; border-radius: 8px; }

/* The counts sit in one white pill between two rules */
.tally { display: flex; align-items: center; gap: 24px; margin-top: 12px; }
.tally::before, .tally::after { content: ""; flex: 1; height: 1px; background: var(--leaf-2); }
.tally ul {
  list-style: none; margin: 0; padding: 14px 8px; display: flex; align-items: center;
  background: var(--paper); border: 1px solid var(--line); border-radius: 999px;
  box-shadow: 0 14px 30px -18px rgba(21,41,30,.35);
}
.tally li { display: flex; align-items: center; gap: 10px; padding: 0 24px; font-size: 17px; color: var(--ink); white-space: nowrap; }
.tally li + li { border-left: 1px solid var(--line); }
.tally .icon { width: 22px; height: 22px; color: var(--ink); }
.tally strong {
  font-family: "Bricolage Grotesque", sans-serif; font-size: 21px; letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums; margin-right: 2px;
}

/* A phone: dark bezel inside a thin metal rim */
.phone {
  margin: 0; padding: 7px; border-radius: 32px; background: var(--bezel);
  box-shadow: 0 0 0 1.5px var(--rim), 0 0 0 3px #E9ECEA,
    0 34px 44px -26px rgba(21,41,30,.5), 0 10px 18px -10px rgba(21,41,30,.3);
}
.phone img { border-radius: 25px; }

section { padding: 96px 0 0; }
.section-head h2 { font-size: clamp(30px, 4.4vw, 52px); line-height: 1.05; letter-spacing: -0.03em; max-width: 18ch; }
.section-head p { margin: 16px 0 0; color: var(--text-2); max-width: 56ch; }

.tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 32px; }
.tab {
  font: inherit; font-size: 16px; font-weight: 600; cursor: pointer; padding: 10px 18px;
  border-radius: 999px; border: 1px solid var(--line); background: var(--paper); color: var(--ink);
}
.tab:hover { border-color: var(--green); }
.tab[aria-selected="true"] { background: var(--ink); border-color: var(--ink); color: #fff; }
.case {
  margin-top: 28px; display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 48px;
  align-items: center; padding: 40px; border: 1px solid var(--line); border-radius: 28px;
}
.case h3 { font-size: clamp(26px, 3.2vw, 38px); line-height: 1.1; letter-spacing: -0.02em; }
.case > div > p { margin: 14px 0 0; color: var(--text-2); max-width: 50ch; }
.points { list-style: none; margin: 24px 0 0; padding: 0; display: grid; gap: 12px; }
.points li { display: flex; gap: 12px; align-items: flex-start; }
.points .icon { margin-top: 4px; color: var(--green); }
.case .phone { width: 100%; max-width: 300px; justify-self: center; }
.case[data-anim] { animation: swap .28s ease-out; }
@keyframes swap { from { opacity: 0; transform: translateY(8px); } }

.steps { list-style: none; margin: 44px 0 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 32px; counter-reset: step; }
.steps li { counter-increment: step; position: relative; display: flex; flex-direction: column; padding-top: 58px; }
.steps li::before {
  content: counter(step); position: absolute; top: 0; left: 0; z-index: 1;
  display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%;
  background: var(--green); color: #fff; box-shadow: 0 0 0 6px var(--paper);
  font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; font-size: 19px; line-height: 1;
}
.steps li:not(:last-child)::after {
  content: ""; position: absolute; top: 19px; left: 40px; right: -32px; height: 2px; background: var(--ink);
}
.steps h3 { font-size: 22px; letter-spacing: -0.01em; }
.steps p { flex: 1 0 auto; margin: 8px 0 0; color: var(--text-2); }
.steps .result {
  display: inline-flex; align-items: center; gap: 8px; align-self: flex-start; margin-top: 18px;
  padding: 7px 14px 7px 10px; border: 1px solid var(--line); border-radius: 999px;
  color: var(--green-dark); font-size: 15px; font-weight: 600;
}
.steps .result svg { flex: none; width: 16px; height: 16px; }

.pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 32px; margin-top: 40px; }
.feature { display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: 28px; align-items: center; }
.feature .phone { border-radius: 26px; padding: 6px; }
.feature .phone img { border-radius: 20px; }
.feature h3 { font-size: 24px; line-height: 1.15; letter-spacing: -0.01em; }
.feature p { margin: 10px 0 0; color: var(--text-2); }

.facts { margin: 40px 0 0; padding: 0; list-style: none; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-top: 1px solid var(--line); }
.facts { gap: 32px; padding-top: 32px; }
.facts li { display: grid; grid-template-columns: 44px 1fr; column-gap: 16px; align-content: start; }
.facts .mark { grid-row: span 3; margin: 0; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; border: 1.5px solid var(--green); color: var(--green); }
.facts .mark svg { width: 20px; height: 20px; }
.facts strong { font-family: "Bricolage Grotesque", sans-serif; font-size: 22px; line-height: 1.2; letter-spacing: -0.01em; }
.facts span { margin-top: 4px; color: var(--text-2); }
.facts a { justify-self: start; margin-top: 10px; color: var(--green-dark); font-weight: 600; text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 1px; }
.facts a:hover { text-decoration-thickness: 2px; }

.closing { margin: 96px 0 0; background: var(--ink); color: #fff; }
.closing .wrap { padding-top: 72px; padding-bottom: 72px; }
.closing h2 { font-size: clamp(32px, 5vw, 60px); line-height: 1.02; letter-spacing: -0.03em; max-width: 16ch; }
.closing p { color: rgba(255,255,255,.78); max-width: 52ch; margin: 16px 0 0; }
.closing .button { background: #fff; color: var(--ink); border-color: #fff; }
.closing .button.ghost { background: transparent; color: #fff; border-color: rgba(255,255,255,.35); }
.closing .button.ghost:hover { border-color: #fff; }
.closing .note { color: rgba(255,255,255,.66); }
.closing a:focus-visible { outline-color: #fff; }

.credit { background: var(--ink); color: rgba(255,255,255,.66); }
.credit .wrap {
  display: flex; flex-wrap: wrap; gap: 12px 24px; align-items: center; justify-content: space-between;
  padding-top: 0; padding-bottom: 28px; font-size: 14px;
}
.credit .wrap::before { content: ""; flex: 0 0 100%; height: 1px; margin-bottom: 12px; background: rgba(255,255,255,.14); }
.credit .brand { font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; font-size: 17px; color: #fff; margin-right: 14px; }
.credit p { margin: 0; }
.credit strong { color: #fff; font-weight: 600; }
.credit nav { display: flex; gap: 20px; }
.credit a { display: inline-flex; align-items: center; gap: 6px; color: rgba(255,255,255,.78); text-decoration: none; font-weight: 600; }
.credit a:hover { color: #fff; }
.credit a:focus-visible { outline-color: #fff; }

@media (max-width: 860px) {
  .case { grid-template-columns: 1fr; padding: 28px 20px; gap: 32px; }
  .case .phone { max-width: 240px; }
  .steps, .pair, .facts { grid-template-columns: 1fr; }
  .steps { gap: 36px; }
  .steps li { padding: 6px 0 0 60px; }
  .steps li:not(:last-child)::after { top: 40px; bottom: -36px; left: 19px; right: auto; width: 2px; height: auto; }
}
@media (max-width: 599px) {
  .hero { padding-top: 24px; }
  .showcase { margin-top: 36px; }
  /* Too narrow for five at a readable size, so the row swipes sideways and
     each phone snaps to the middle. The next one peeks in at the edge. */
  .shelf-row {
    justify-content: flex-start; gap: 14px; margin: 0 -16px; padding: 4px 16px 28px;
    overflow-x: auto; scroll-snap-type: x mandatory; scroll-padding: 0 16px; scrollbar-width: none;
  }
  .shelf-row::-webkit-scrollbar { display: none; }
  .shelf-row .phone { flex: 0 0 64vw; max-width: 280px; scroll-snap-align: center; }
  .shelf-row .phone:nth-child(3) { order: 1; }
  .shelf-row .phone:nth-child(2) { order: 2; }
  .shelf-row .phone:nth-child(1) { order: 3; }
  .shelf-row .phone:nth-child(4) { order: 4; }
  .shelf-row .phone:nth-child(5) { order: 5; }
  .phone { padding: 5px; border-radius: 24px; box-shadow: 0 0 0 1px var(--rim), 0 0 0 2px #E9ECEA, 0 22px 28px -18px rgba(21,41,30,.5); }
  .phone img { border-radius: 19px; }
  section { padding-top: 72px; }
  .tally { margin-top: 28px; gap: 0; }
  .tally::before, .tally::after { display: none; }
  .tally ul { margin: 0 auto; padding: 10px 2px; }
  .tally li { gap: 6px; padding: 0 10px; font-size: 13px; }
  .tally .icon { width: 16px; height: 16px; }
  .tally strong { font-size: 15px; }
  .hero h1 { font-size: 44px; }
  .actions .button { flex: 1 1 100%; justify-content: center; }
  .feature { grid-template-columns: 120px minmax(0, 1fr); gap: 20px; }
  /* Tabs stay on one swipeable line instead of wrapping to two */
  .tabs { flex-wrap: nowrap; overflow-x: auto; margin: 28px -16px 0; padding: 2px 16px; scrollbar-width: none; }
  .tabs::-webkit-scrollbar { display: none; }
  .tab { flex: none; font-size: 15px; padding: 9px 14px; }
  .case { padding: 24px 18px; }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .case[data-anim] { animation: none; }
}
[hidden] { display: none !important; }
`;

// Switches the use-case tabs. Without it every case shows, one under another.
const SCRIPT = `
(() => {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const panels = tabs.map((t) => document.getElementById(t.getAttribute("aria-controls")));
  function select(i, focus) {
    tabs.forEach((t, j) => {
      const on = i === j;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      panels[j].hidden = !on;
      if (on) {
        panels[j].removeAttribute("data-anim");
        void panels[j].offsetWidth;
        panels[j].setAttribute("data-anim", "");
      }
    });
    if (focus) tabs[i].focus();
  }
  document.getElementById("tablist").hidden = false;
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => select(i, false));
    t.addEventListener("keydown", (e) => {
      const n = tabs.length;
      if (e.key === "ArrowRight") select((i + 1) % n, true);
      else if (e.key === "ArrowLeft") select((i - 1 + n) % n, true);
      else if (e.key === "Home") select(0, true);
      else if (e.key === "End") select(n - 1, true);
      else return;
      e.preventDefault();
    });
  });
  select(0, false);
  panels.forEach((p) => p.removeAttribute("data-anim"));
})();
`;

function downloadButtons(): string {
  return `<a class="button" href="${APK_URL}">${icon("download")}Get the Android app</a>`;
}

const APK_NOTE =
  "The Android app downloads as an APK file. Your phone asks once before installing apps from outside the Play Store.";

export function renderAbout(nonce: string): string {
  const tabs = AUDIENCES.map(
    (a) =>
      `<button class="tab" role="tab" id="tab-${a.id}" aria-controls="case-${a.id}" aria-selected="false">${a.tab}</button>`,
  ).join("");

  const cases = AUDIENCES.map(
    (a) => `<div class="case" role="tabpanel" id="case-${a.id}" aria-labelledby="tab-${a.id}">
      <div>
        <h3>${a.title}</h3>
        <p>${a.body}</p>
        <ul class="points">${a.points.map((p) => `<li>${icon("check")}<span>${p}</span></li>`).join("")}</ul>
      </div>
      ${phone(a.shot, a.alt)}
    </div>`,
  ).join("");

  const source = APP_REPO_URL
    ? `<a class="button ghost" href="${APP_REPO_URL}" target="_blank" rel="noopener">${icon("github")}Source on GitHub</a>`
    : "";

  const title = "ShelfSnap: catalogue the books you own";
  const description =
    "ShelfSnap reads a photo of your shelf and turns it into a library you can search, share and lend from. Free for homes, book clubs, readers, libraries, cafés, offices and schools.";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta name="theme-color" content="#15291E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700&family=DM+Sans:opsz,wght@9..40,400;9..40,600&display=swap">
<style>${STYLES}</style>
</head>
<body>
<header class="wrap top">
  <a class="brand" href="/">ShelfSnap</a>
  <a class="button" href="#get">Get the app</a>
</header>
<main>
  <div class="hero">
    <div class="wrap">
      <h1>Photograph a shelf. Get a library.</h1>
      <p class="lede">ShelfSnap reads the spines in a photo of your bookshelf and builds a catalogue you can search, share with people and lend from. It works for one reader, a whole family, or a library.</p>
      <div class="actions">${downloadButtons()}</div>
    </div>
    <div class="showcase">
      <div class="wrap">
        <div class="shelf-row" role="region" tabindex="0" aria-label="Screens from the ShelfSnap app">
          ${phone("library", "Your libraries, private and shared", false)}
          ${phone("home", "Home with this year's reading and the books you're reading now", false)}
          ${phone("library-books", "A shared library with its members and book covers", false)}
          ${phone("book", "A book's page with reading progress", false)}
          ${phone("stats", "Reading stats with a monthly chart", false)}
        </div>
        <div class="tally">
          <ul aria-label="ShelfSnap so far, as of ${STATS_AS_OF}">
            ${STATS.map((s) => `<li>${icon(s.icon)}<span><strong>${s.value}</strong> ${s.label}</span></li>`).join("")}
          </ul>
        </div>
      </div>
    </div>
  </div>

  <section id="who">
    <div class="wrap">
      <div class="section-head">
        <h2>Who keeps their books in ShelfSnap</h2>
        <p>The same app runs a bedside pile and a shelf shared by a hundred people. Pick the one that sounds like you.</p>
      </div>
      <div class="tabs" role="tablist" id="tablist" aria-label="Who it's for" hidden>${tabs}</div>
      ${cases}
    </div>
  </section>

  <section id="how">
    <div class="wrap">
      <div class="section-head">
        <h2>From shelf to catalogue in a few minutes</h2>
      </div>
      <ol class="steps">
        <li><h3>Scan the shelf</h3><p>Take a photo of a whole row, or scan one barcode at a time. ShelfSnap finds each book and fills in its cover, author and pages.</p><span class="result">${icon("check")}Books land in your library</span></li>
        <li><h3>Invite your people</h3><p>Share a link or a QR code. Members can browse the library, and editors can add books too.</p><span class="result">${icon("check")}Everyone sees the same shelf</span></li>
        <li><h3>Share the page</h3><p>Make the library public and anyone can browse it on the web, with no app and no account.</p><span class="result">${icon("check")}A link anyone can open</span></li>
      </ol>
    </div>
  </section>

  <section id="more">
    <div class="wrap">
      <div class="section-head">
        <h2>The rest of what you get</h2>
      </div>
      <div class="pair">
        <div class="feature">
          ${phone("search", "Search with genre tiles")}
          <div><h3>Find any book you own</h3><p>Search every library by title or author, or browse by genre when you want something to read next.</p></div>
        </div>
        <div class="feature">
          ${phone("home", "Home with the books you're reading now")}
          <div><h3>Pick up where you left off</h3><p>Home shows the books you're reading and the page you're on, and your year so far.</p></div>
        </div>
      </div>
      <ul class="facts">
        <li><span class="mark">${icon("tag")}</span><strong>Free</strong><span>No subscription and no ads.</span></li>
        <li><span class="mark">${icon("code")}</span><strong>Open source</strong><span>The code is public, so you can see what it does with your data.</span>${APP_REPO_URL ? `<a href="${APP_REPO_URL}" target="_blank" rel="noopener">See the code</a>` : ""}</li>
        <li><span class="mark">${icon("phone")}</span><strong>Android</strong><span>One APK file, no Play Store account needed.</span><a href="${APK_URL}">Download the APK</a></li>
      </ul>
    </div>
  </section>

  <div class="closing" id="get">
    <div class="wrap">
      <h2>Start with the shelf nearest to you.</h2>
      <p>Install ShelfSnap, photograph one shelf, and your library is ready to search and share.</p>
      <div class="actions">${downloadButtons()}${source}</div>
      <p class="note">${APK_NOTE}</p>
    </div>
  </div>
</main>
<footer class="credit">
  <div class="wrap">
    <p><span class="brand">ShelfSnap</span>Created by <strong>${AUTHOR_NAME}</strong></p>
    <nav aria-label="Creator links">
      <a href="${AUTHOR_GITHUB}" rel="me noopener" target="_blank">${icon("github")}GitHub</a>
      <a href="${AUTHOR_LINKEDIN}" rel="me noopener" target="_blank">${icon("linkedin")}LinkedIn</a>
    </nav>
  </div>
</footer>
<script nonce="${nonce}">${SCRIPT}</script>
</body>
</html>`;
}
