import { randomBytes } from "crypto";
import { Request, Response } from "express";
import {
  BOOK_ID_PATTERN,
  CATALOG_CACHE_SECONDS,
  CATALOG_STALE_SECONDS,
  HANDLE_PATTERN,
} from "../constants/catalog.constants";
import { getCatalog, searchCatalog } from "../services/catalog.service";
import {
  renderBookItems,
  renderCatalog,
  renderError,
  renderNotFound,
} from "../views/catalog.view";
import { logger } from "../utils/logger";

// Book data is escaped, and the CSP only runs the page's own script
export function setPageHeaders(res: Response, nonce: string, cache: string) {
  res.set({
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": cache,
    "Content-Security-Policy": [
      "default-src 'none'",
      "img-src 'self' https:",
      "style-src 'unsafe-inline' https://fonts.googleapis.com",
      "font-src https://fonts.gstatic.com",
      `script-src 'nonce-${nonce}'`,
      // The search box calls /lib/:handle/search on this site
      "connect-src 'self'",
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'none'",
    ].join("; "),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  });
}

// Web catalog for a public or unlisted library: GET /lib/:handle?after=<bookId>.
// No login. Vercel's CDN caches each page, so busy pages stay cheap.
export async function getCatalogPage(req: Request, res: Response) {
  const nonce = randomBytes(16).toString("base64");
  const raw = String(req.params.handle ?? "");
  const handle = raw.toLowerCase();
  const after = typeof req.query.after === "string" ? req.query.after : null;

  // Handles are lowercase; send mixed-case links to the one real address
  if (raw !== handle && HANDLE_PATTERN.test(handle)) {
    return res.redirect(301, `/lib/${handle}`);
  }

  const shortCache = "public, max-age=0, s-maxage=60";
  if (!HANDLE_PATTERN.test(handle) || (after && !BOOK_ID_PATTERN.test(after))) {
    setPageHeaders(res, nonce, shortCache);
    return res.status(404).send(renderNotFound(nonce));
  }

  try {
    const catalog = await getCatalog(handle, after);
    if (!catalog) {
      setPageHeaders(res, nonce, shortCache);
      return res.status(404).send(renderNotFound(nonce));
    }

    setPageHeaders(
      res,
      nonce,
      `public, max-age=0, s-maxage=${CATALOG_CACHE_SECONDS}, stale-while-revalidate=${CATALOG_STALE_SECONDS}`,
    );
    // Same as the meta tag, for crawlers that only read headers
    if (catalog.library.unlisted) res.set("X-Robots-Tag", "noindex");
    res.send(renderCatalog(catalog, nonce));
  } catch (err) {
    logger.error({ err, handle }, "catalog failed");
    setPageHeaders(res, nonce, "no-store");
    res.status(500).send(renderError(nonce));
  }
}

// Whole-library search for the catalog's search box:
// GET /lib/:handle/search?q=<words>. Returns the matching books as grid
// items, built and escaped by the same view as the page. The CDN caches each
// query, and the page sends the words cleaned up so repeats share a cache entry.
export async function getCatalogSearch(req: Request, res: Response) {
  const handle = String(req.params.handle ?? "").toLowerCase();
  const query = typeof req.query.q === "string" ? req.query.q : "";
  res.set({ "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex" });

  if (!HANDLE_PATTERN.test(handle)) {
    res.set("Cache-Control", "public, max-age=0, s-maxage=60");
    return res.status(404).json({ error: "not_found" });
  }

  try {
    const found = await searchCatalog(handle, query);
    if (!found) {
      res.set("Cache-Control", "public, max-age=0, s-maxage=60");
      return res.status(404).json({ error: "not_found" });
    }

    res.set(
      "Cache-Control",
      `public, max-age=0, s-maxage=${CATALOG_CACHE_SECONDS}, stale-while-revalidate=${CATALOG_STALE_SECONDS}`,
    );
    res.json({
      html: renderBookItems(found.books),
      count: found.books.length,
      capped: found.capped,
    });
  } catch (err) {
    logger.error({ err, handle }, "catalog search failed");
    res.set("Cache-Control", "no-store");
    res.status(500).json({ error: "search_failed" });
  }
}
