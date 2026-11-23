import { Router } from "express";
import { getAboutPage } from "../controllers/about.controller";
import {
  getCatalogPage,
  getCatalogSearch,
} from "../controllers/catalog.controller";

// Public pages, no Firebase token. Mounted before the books router, whose
// token check would otherwise run for every path.
const router = Router();

// The About page is the site's home; /about stays for links already shared
router.get("/", getAboutPage);
router.get("/about", (_req, res) => res.redirect(301, "/"));
router.get("/lib/:handle", getCatalogPage);
router.get("/lib/:handle/search", getCatalogSearch);

export default router;
