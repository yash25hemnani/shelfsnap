import {
  ANDROID_PACKAGE,
  APK_URL,
  APP_SCHEME,
  AUTHOR_GITHUB,
  AUTHOR_LINKEDIN,
  AUTHOR_NAME,
  BANNERS,
  SEARCH_TOKEN_MAX,
  SEARCH_TOKEN_MIN,
  APP_REPO_URL,
} from "../constants/catalog.constants";
import type { Catalog, CatalogBook } from "../types/catalog.types";

// Everything from Firestore goes through this before it reaches the page
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Inline SVG icons; brand marks are filled, the rest are 2px strokes
const ICON_PATHS: Record<string, string> = {
  github: `<path fill="currentColor" stroke="none" d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"/>`,
  linkedin: `<path fill="currentColor" stroke="none" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"/>`,
  book: `<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>`,
  join: `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6"/><path d="M22 11h-6"/>`,
  search: `<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>`,
  more: `<path d="m6 9 6 6 6-6"/>`,
  download: `<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>`,
  close: `<path d="M18 6 6 18"/><path d="m6 6 12 12"/>`,
};

function icon(name: string): string {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name]}</svg>`;
}

// Colours from the app's AppColors, so the page feels like ShelfSnap
const STYLES = `
:root {
  --primary: #2F6B4F; --primary-dark: #1F4A36;
  --bg: #FFFFFF; --muted: #F4F4F3; --text: #1B2B22; --text-2: #5F6F66;
  --hint: #9AA8A0; --border: #E4E6E5;
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--bg); color: var(--text);
  font: 16px/1.5 "DM Sans", system-ui, sans-serif;
  min-height: 100vh; display: flex; flex-direction: column;
}
body > main { flex: 1; width: 100%; }
a { color: var(--primary); }
a:focus-visible, input:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.wrap { max-width: 1040px; margin: 0 auto; padding: 0 16px; }
.hero {
  position: relative; min-height: 240px; display: flex; align-items: flex-end;
  background: var(--primary-dark) center / cover no-repeat;
}
.hero::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(27,43,34,.85), rgba(27,43,34,.15));
}
.hero .wrap { position: relative; z-index: 1; width: 100%; padding-bottom: 28px; color: #fff; }
.hero h1 { margin: 0; font-size: clamp(28px, 6vw, 44px); line-height: 1.1; letter-spacing: -0.01em; }
.hero p { margin: 8px 0 0; max-width: 60ch; color: rgba(255,255,255,.88); }
.hero .button { margin-top: 16px; background: #fff; color: var(--primary-dark); }
.bar {
  display: flex; flex-wrap: wrap; gap: 12px; align-items: center;
  justify-content: space-between; padding: 24px 0 8px;
}
.icon { width: 18px; height: 18px; flex: none; }
.search { position: relative; flex: 1 1 260px; max-width: 420px; display: flex; }
.search .icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--hint); pointer-events: none; }
.search input {
  width: 100%; padding: 12px 16px 12px 42px; font: inherit; color: var(--text);
  border: 1px solid var(--border); border-radius: 16px; background: var(--bg);
}
.bar .count { color: var(--text-2); font-size: 14px; }
.grid {
  list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 20px 16px;
  grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
}
.book { min-width: 0; }
.book-open {
  display: block; width: 100%; padding: 0; border: 0; background: none;
  font: inherit; color: inherit; text-align: left; cursor: pointer;
}
.book-open:focus-visible { outline: 2px solid var(--primary); outline-offset: 4px; border-radius: 12px; }
.book-open:hover .cover { border-color: var(--primary); }
.book-open:hover .title { color: var(--primary-dark); text-decoration: underline; text-underline-offset: 2px; }
.cover {
  aspect-ratio: 2 / 3; border-radius: 12px; overflow: hidden; background: var(--muted);
  border: 1px solid var(--border); display: flex; align-items: center; justify-content: center;
}
.cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
.cover span { padding: 12px; text-align: center; font-weight: 600; color: var(--primary-dark); font-size: 14px; }
.book .title { margin-top: 8px; font-size: 15px; line-height: 1.3; font-weight: 600; }
.book .meta { margin-top: 2px; font-size: 13px; color: var(--text-2); }
@media (max-width: 599px) {
  .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px 10px; }
  .book .cover { border-radius: 10px; }
  .book .cover span { padding: 6px; font-size: 12px; }
  .book .title { margin-top: 6px; font-size: 13px; }
  .book .meta { font-size: 12px; }
}
.panel {
  padding: 0; border: 0; border-radius: 20px; color: var(--text); background: var(--bg);
  width: min(680px, calc(100% - 32px)); max-width: none; max-height: min(86vh, 780px);
  box-shadow: 0 24px 64px rgba(27,43,34,.28);
}
.panel[open] { display: flex; flex-direction: column; }
.panel::backdrop { background: rgba(27,43,34,.55); }
.panel-inner { overflow-y: auto; padding: 28px; overscroll-behavior: contain; }
.panel-close {
  position: absolute; top: 12px; right: 12px; width: 40px; height: 40px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  border: 1px solid var(--border); background: var(--bg); color: var(--text);
}
.panel-close:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.detail { display: grid; grid-template-columns: 160px minmax(0, 1fr); gap: 20px 24px; align-items: start; }
.detail .cover { border-radius: 12px; }
.detail .cover span { font-size: 15px; }
.detail-head { padding-right: 40px; }
.detail-head h2 { margin: 0; font-size: 24px; line-height: 1.2; letter-spacing: -0.01em; }
.detail-head .subtitle { margin: 6px 0 0; font-size: 16px; color: var(--text-2); }
.detail-head .authors { margin: 10px 0 0; font-weight: 600; }
.detail-more { grid-column: 1 / -1; display: flex; flex-direction: column; gap: 20px; }
.facts {
  margin: 0; padding: 16px 18px; border: 1px solid var(--border); border-radius: 16px;
  display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 8px 20px; font-size: 15px;
}
.facts dt { color: var(--text-2); }
.facts dd { margin: 0; overflow-wrap: anywhere; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; list-style: none; }
.chips li { padding: 4px 12px; border: 1px solid var(--border); border-radius: 999px; font-size: 13px; color: var(--text-2); }
.blurb h3 { margin: 0 0 6px; font-size: 16px; }
.blurb p { margin: 0 0 12px; color: var(--text-2); max-width: 64ch; }
.blurb p:last-child { margin-bottom: 0; }
@media (min-width: 600px) {
  .detail .cover { grid-row: span 2; }
  .detail-more { grid-column: 2; }
}
@media (max-width: 599px) {
  .panel {
    width: 100%; max-height: 90vh; margin: auto 0 0; border-radius: 20px 20px 0 0;
  }
  .panel[open] { animation: rise .22s ease-out; }
  .panel-inner { padding: 24px 16px 32px; }
  .detail { grid-template-columns: 104px minmax(0, 1fr); gap: 16px; }
  .detail-head h2 { font-size: 20px; }
  .detail-head .subtitle { font-size: 15px; }
}
@keyframes rise { from { transform: translateY(24px); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .panel[open] { animation: none; } }
.empty { padding: 32px 0; color: var(--text-2); }
.shelf-empty {
  margin-top: 32px; padding: 40px 24px; text-align: center;
  border: 1px dashed #CDD3D0; border-radius: 20px;
}
.shelf-empty .icon { width: 36px; height: 36px; color: var(--primary); stroke-width: 1.5; }
.shelf-empty h2 { margin: 12px 0 0; font-size: 18px; font-weight: 600; color: var(--text); }
.shelf-empty p { margin: 6px auto 0; max-width: 44ch; color: var(--text-2); font-size: 15px; }
.more { display: flex; justify-content: center; padding: 32px 0 8px; }
.button {
  display: inline-flex; align-items: center; gap: 8px; padding: 12px 22px; border-radius: 16px; font-weight: 600;
  text-decoration: none; background: var(--primary); color: #fff;
}
.button.ghost { background: var(--bg); color: var(--primary); border: 1px solid var(--border); }
.about {
  margin: 40px 0 48px; padding: 24px; border: 1px solid var(--border); border-radius: 20px;
  display: flex; flex-wrap: wrap; gap: 16px 32px; align-items: center; justify-content: space-between;
}
.about p { margin: 0; flex: 1 1 320px; max-width: 60ch; color: var(--text-2); }
.about strong { color: var(--text); }
.about .links { display: flex; flex-wrap: wrap; gap: 10px; }
.about .links { max-width: 460px; }
.about .note { flex-basis: 100%; margin: 2px 0 0; font-size: 14px; }
.credit { border-top: 1px solid var(--border); background: var(--bg); }
.credit .wrap {
  display: flex; flex-wrap: wrap; gap: 8px 24px; align-items: center;
  justify-content: space-between; padding-top: 18px; padding-bottom: 18px;
  font-size: 14px; color: var(--text-2);
}
.credit strong { color: var(--text); font-weight: 600; }
.credit nav { display: flex; gap: 20px; }
.credit a { display: inline-flex; align-items: center; gap: 6px; color: var(--text-2); text-decoration: none; font-weight: 600; }
.credit a:hover { color: var(--primary); }
.clamp { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
[hidden] { display: none !important; }
`;

// noindex keeps unlisted libraries, and pages that aren't catalogs, out of
// search results
function layout(
  title: string,
  description: string,
  body: string,
  nonce: string,
  noindex = false,
) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta name="theme-color" content="#2F6B4F">
${noindex ? '<meta name="robots" content="noindex">' : ""}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700&display=swap">
<style>${STYLES}</style>
</head>
<body>
${body}
<footer class="credit">
  <div class="wrap">
    <span>Created by <strong>${AUTHOR_NAME}</strong></span>
    <nav aria-label="Creator links">
      <a href="${AUTHOR_GITHUB}" rel="me noopener" target="_blank">${icon("github")}GitHub</a>
      <a href="${AUTHOR_LINKEDIN}" rel="me noopener" target="_blank">${icon("linkedin")}LinkedIn</a>
    </nav>
  </div>
</footer>
</body>
</html>`;
}

function about(): string {
  const source = APP_REPO_URL
    ? `<a class="button ghost" href="${esc(APP_REPO_URL)}" target="_blank" rel="noopener">${icon("github")}Source on GitHub</a>`
    : "";
  return `<aside class="about">
  <p><strong>This catalog is kept in ShelfSnap</strong>, a free, open-source app for people who own physical books. Scan a shelf, share a library, lend a copy. <a href="/">See what it does</a></p>
  <div class="links">
    <a class="button" href="${APK_URL}">${icon("download")}Get the Android app</a>
    ${source}
    <p class="note">The Android app downloads as an APK file. Your phone asks once before installing apps from outside the Play Store.</p>
  </div>
</aside>`;
}

function cover(book: CatalogBook, lazy: boolean): string {
  return book.coverUrl
    ? `<img src="${esc(book.coverUrl)}" alt=""${lazy ? ' loading="lazy"' : ""} referrerpolicy="no-referrer">`
    : `<span>${esc(book.title)}</span>`;
}

// Lowercase and accent-free, so the on-page filter matches the way the
// whole-library search does
function searchable(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

// What the panel shows when a book is tapped. It sits in a <template>
// next to the book, so opening it costs no requests.
function bookDetail(book: CatalogBook): string {
  const facts: [string, string | null][] = [
    ["Published", book.publishedDate],
    ["Publisher", book.publisher],
    ["Pages", book.pageCount ? String(book.pageCount) : null],
    ["Language", book.language],
    ["ISBN", book.isbn],
  ];
  const shown = facts.filter((f): f is [string, string] => f[1] !== null);
  const factList = shown.length
    ? `<dl class="facts">${shown.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl>`
    : "";
  const chips = book.categories.length
    ? `<ul class="chips" aria-label="Categories">${book.categories.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>`
    : "";
  const blurb = book.description
    ? `<div class="blurb"><h3>About this book</h3>${book.description
        .split(/\n+/)
        .map((p) => `<p>${esc(p)}</p>`)
        .join("")}</div>`
    : "";

  return `<div class="detail">
  <div class="cover">${cover(book, false)}</div>
  <div class="detail-head">
    <h2 id="panel-title">${esc(book.title)}</h2>
    ${book.subtitle ? `<p class="subtitle">${esc(book.subtitle)}</p>` : ""}
    ${book.authors.length ? `<p class="authors">${esc(book.authors.join(", "))}</p>` : ""}
  </div>
  ${factList || chips || blurb ? `<div class="detail-more">${factList}${chips}${blurb}</div>` : ""}
</div>`;
}

function bookItem(book: CatalogBook): string {
  const authors = book.authors.join(", ");
  const year = book.publishedDate?.slice(0, 4);
  const search = searchable(`${book.title} ${book.subtitle ?? ""} ${authors}`);

  return `<li class="book" data-search="${esc(search)}">
  <button type="button" class="book-open" aria-haspopup="dialog">
    <span class="cover">${cover(book, true)}</span>
    <span class="title clamp">${esc(book.title)}</span>
    ${authors ? `<span class="meta clamp">${esc(authors)}${year ? ` · ${esc(year)}` : ""}</span>` : ""}
  </button>
  <template>${bookDetail(book)}</template>
</li>`;
}

// Grid items for the whole-library search; the page's script puts them in
// place of the loaded books
export function renderBookItems(books: CatalogBook[]): string {
  return books.map(bookItem).join("");
}

export function renderCatalog(catalog: Catalog, nonce: string): string {
  const { library, books, nextCursor, handle } = catalog;
  const banner = BANNERS[library.banner];
  const description =
    library.description ?? `Books in ${library.name}, shared with ShelfSnap.`;

  const list = books.length
    ? `<ul class="grid" id="books">${renderBookItems(books)}</ul>
<ul class="grid" id="results" hidden></ul>
<p class="empty" id="no-match" role="status" hidden></p>`
    : `<div class="shelf-empty">
  ${icon("book")}
  <h2>No public books here yet</h2>
  <p>Books the owner marks as public show up here. Join the library in ShelfSnap to see everything it holds.</p>
</div>`;

  const more = nextCursor
    ? `<div class="more" id="more"><a class="button ghost" href="/lib/${esc(handle)}?after=${esc(nextCursor)}">${icon("more")}More books</a></div>`
    : "";

  // Join opens the library in the app, where people ask to join. The app is
  // Android only, so the button shows only on Android: an intent link that
  // opens the installed app, or downloads it when it isn't installed.
  const androidJoin = `intent://lib/${handle}#Intent;scheme=${APP_SCHEME};package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(APK_URL)};end`;
  const joinScript = `<script nonce="${nonce}">
if (/Android/i.test(navigator.userAgent)) {
  const join = document.getElementById("join");
  join.href = ${JSON.stringify(androidJoin)};
  join.hidden = false;
}
</script>`;

  // The panel that opens when a book is tapped, filled from the book's
  // <template>; Esc, the close button and a tap outside it close it
  const panel = books.length
    ? `<dialog class="panel" id="book-panel" aria-labelledby="panel-title">
  <div class="panel-inner"></div>
  <button type="button" class="panel-close" aria-label="Close">${icon("close")}</button>
</dialog>`
    : "";

  // Typing filters the loaded books at once. A moment after typing stops,
  // the page asks /lib/:handle/search, which searches every public book the
  // way the app does, and shows those matches instead.
  const script = books.length
    ? `<script nonce="${nonce}">
(() => {
  const handle = ${JSON.stringify(handle)};
  const input = document.getElementById("search");
  const grid = document.getElementById("books");
  const results = document.getElementById("results");
  const more = document.getElementById("more");
  const count = document.getElementById("count");
  const status = document.getElementById("no-match");
  const pageCount = count.textContent;
  const items = [...grid.querySelectorAll(".book")];
  let timer = 0;
  let controller = null;

  const clean = (s) => s.toLowerCase().normalize("NFD").replace(/\\p{M}/gu, "");
  // Same word rules as the app's search tokens
  const searchWords = (s) => clean(s).split(/[^\\p{L}\\p{N}]+/u)
    .filter((w) => w.length >= ${SEARCH_TOKEN_MIN}).map((w) => w.slice(0, ${SEARCH_TOKEN_MAX}));

  const say = (text) => { status.textContent = text; status.hidden = !text; };

  function showPage() {
    results.hidden = true;
    results.replaceChildren();
    grid.hidden = false;
    if (more) more.hidden = false;
  }

  function filterPage(value) {
    const words = clean(value).split(/\\s+/).filter(Boolean);
    let shown = 0;
    for (const item of items) {
      const match = words.every((w) => item.dataset.search.includes(w));
      item.hidden = !match;
      if (match) shown++;
    }
    return shown;
  }

  async function searchLibrary(query, value, shown) {
    controller = new AbortController();
    try {
      const res = await fetch("/lib/" + handle + "/search?q=" + encodeURIComponent(query), {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (input.value !== value) return;
      // Built and escaped on the server, same as the books above
      results.innerHTML = data.html;
      grid.hidden = true;
      if (more) more.hidden = true;
      results.hidden = false;
      const n = data.count;
      count.textContent = n + (data.capped ? " newest matches" : n === 1 ? " match" : " matches");
      if (data.capped) say("Only the newest matches are shown. Add another word to narrow the search.");
      else say(n ? "" : "No books in this library match your search.");
    } catch (err) {
      if (err.name === "AbortError") return;
      count.textContent = shown + " on this page";
      say("Couldn't search the whole library, so only the books on this page are shown.");
    }
  }

  document.getElementById("search-box").hidden = false;
  input.addEventListener("input", () => {
    clearTimeout(timer);
    if (controller) controller.abort();
    showPage();
    const value = input.value;
    const shown = filterPage(value);
    if (!value.trim()) {
      count.textContent = pageCount;
      say("");
      return;
    }
    const words = searchWords(value);
    if (!words.length) {
      count.textContent = shown + " on this page";
      say(shown ? "" : "No books on this page match your search.");
      return;
    }
    count.textContent = "Searching all books…";
    say("");
    timer = setTimeout(() => searchLibrary(words.join(" "), value, shown), 350);
  });

  const dialog = document.getElementById("book-panel");
  const body = dialog.querySelector(".panel-inner");
  document.querySelector("main").addEventListener("click", (e) => {
    const button = e.target.closest(".book-open");
    if (!button) return;
    body.replaceChildren(button.parentElement.querySelector("template").content.cloneNode(true));
    dialog.showModal();
    body.scrollTop = 0;
  });
  dialog.querySelector(".panel-close").addEventListener("click", () => dialog.close());
  // The panel fills the dialog, so a click on the dialog itself is the backdrop
  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
})();
</script>`
    : "";

  const body = `<header class="hero" style="background-image:url('${banner}')">
  <div class="wrap">
    <h1>${esc(library.name)}</h1>
    ${library.description ? `<p>${esc(library.description)}</p>` : ""}
    <a class="button" id="join" href="${APK_URL}" hidden>${icon("join")}Join in ShelfSnap</a>
  </div>
</header>
<main class="wrap">
  ${
    books.length
      ? `<div class="bar">
    <label class="search" id="search-box" hidden>
      ${icon("search")}
      <input id="search" type="search" placeholder="Search by title or author" aria-label="Search all books by title or author" autocomplete="off">
    </label>
    <span class="count" id="count" aria-live="polite">${books.length} book${books.length === 1 ? "" : "s"}${nextCursor ? " on this page" : ""}</span>
  </div>`
      : ""
  }
  ${list}
  ${more}
  ${about()}
</main>
${panel}
${joinScript}
${script}`;

  return layout(
    `${library.name} · ShelfSnap`,
    description,
    body,
    nonce,
    library.unlisted,
  );
}

export function renderNotFound(nonce: string): string {
  const body = `<main class="wrap" style="padding-top:64px">
  <h1 style="margin:0;font-size:32px">No public library here</h1>
  <p style="color:var(--text-2);max-width:56ch">This address doesn't belong to a public library. It may have been changed, or the library may now be private.</p>
  ${about()}
</main>`;
  return layout("Library not found · ShelfSnap", "No public library at this address.", body, nonce, true);
}

export function renderError(nonce: string): string {
  const body = `<main class="wrap" style="padding-top:64px">
  <h1 style="margin:0;font-size:32px">This catalog didn't load</h1>
  <p style="color:var(--text-2);max-width:56ch">Something went wrong on our side. Refresh the page in a minute.</p>
</main>`;
  return layout("Catalog unavailable · ShelfSnap", "This catalog didn't load.", body, nonce, true);
}
