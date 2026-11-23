import { randomBytes } from "crypto";
import { Request, Response } from "express";
import { renderAbout } from "../views/about.view";
import { setPageHeaders } from "./catalog.controller";

// What ShelfSnap is, for people who land here from a shared catalog:
// GET /. Static, so the CDN keeps it for an hour.
export function getAboutPage(_req: Request, res: Response) {
  const nonce = randomBytes(16).toString("base64");
  setPageHeaders(res, nonce, "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400");
  res.send(renderAbout(nonce));
}
