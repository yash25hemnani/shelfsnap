import { Router } from "express";
import {
  getCatalogPage,
  getCatalogSearch,
} from "../controllers/catalog.controller";

// Public pages, no Firebase token. Mounted before the books router, whose
// token check would otherwise run for every path.
const router = Router();

router.get("/lib/:handle", getCatalogPage);
router.get("/lib/:handle/search", getCatalogSearch);

export default router;
