import {
  getFirestore,
  type DocumentData,
  type DocumentReference,
} from "firebase-admin/firestore";
import firebaseApp from "../config/firebase";
import {
  BANNERS,
  CATALOG_PAGE_SIZE,
  DEFAULT_BANNER,
  SEARCH_LIMIT,
  SEARCH_QUERY_MAX,
  SEARCH_TOKEN_MAX,
  SEARCH_TOKEN_MIN,
} from "../constants/catalog.constants";
import type {
  Catalog,
  CatalogBook,
  CatalogSearch,
} from "../types/catalog.types";

const db = getFirestore(firebaseApp);

const languageNames = new Intl.DisplayNames(["en"], { type: "language" });

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function strList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(str).filter((v): v is string => v !== null)
    : [];
}

// Only https images; Google Books often stores http links that work as https
function safeImageUrl(value: unknown): string | null {
  const url = str(value)?.replace(/^http:\/\//i, "https://");
  return url && url.startsWith("https://") ? url : null;
}

// Google Books descriptions can carry <p>, <br> and <b> tags. Keep the
// paragraph breaks and drop the rest; the view escapes what's left.
function plainText(value: unknown): string | null {
  const text = str(value)
    ?.replace(/<br\s*\/?>|<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text || null;
}

// "en" → "English"; unknown codes show as they are
function languageName(value: unknown): string | null {
  const code = str(value);
  if (!code) return null;
  try {
    return languageNames.of(code) ?? code;
  } catch {
    return code;
  }
}

function toBook(id: string, data: DocumentData): CatalogBook {
  const pages = data.pageCount;
  return {
    id,
    title: str(data.title) ?? "Untitled",
    subtitle: str(data.subtitle),
    authors: strList(data.authors),
    coverUrl: safeImageUrl(data.coverUrl),
    publishedDate: str(data.publishedDate),
    description: plainText(data.description),
    categories: strList(data.categories),
    publisher: str(data.publisher),
    pageCount:
      typeof pages === "number" && Number.isFinite(pages) && pages > 0
        ? Math.round(pages)
        : null,
    language: languageName(data.language),
    isbn: str(data.isbn),
  };
}

// Same rule as the app's BookModel.sanitizeWords: lowercase, accents
// removed, split on anything that isn't a letter or digit, cut to 15
function searchWords(query: string): string[] {
  return query
    .slice(0, SEARCH_QUERY_MAX)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= SEARCH_TOKEN_MIN)
    .map((w) => w.slice(0, SEARCH_TOKEN_MAX));
}

// The library a handle points at, or null when there's no public or
// unlisted library there. The admin SDK skips firestore.rules, so these
// checks and the visibility filters below are what keep private data out.
async function openLibrary(
  handle: string,
): Promise<{ ref: DocumentReference; data: DocumentData } | null> {
  const handleDoc = await db.collection("libraryHandles").doc(handle).get();
  const libraryId = str(handleDoc.data()?.libraryId);
  if (!libraryId) return null;

  const ref = db.collection("libraries").doc(libraryId);
  const data = (await ref.get()).data();
  // The handle must still belong to this library, and it must be open to
  // people with the link; private libraries never get a page
  const open = data?.access === "public" || data?.access === "unlisted";
  if (!data || !open || data.handle !== handle) return null;

  return { ref, data };
}

// One page of a public or unlisted library's public books, or null when
// the handle doesn't point at one
export async function getCatalog(
  handle: string,
  after: string | null,
): Promise<Catalog | null> {
  const found = await openLibrary(handle);
  if (!found) return null;
  const { ref: libraryRef, data: library } = found;

  // Same query and index the app uses for non-members
  let query = libraryRef
    .collection("books")
    .where("visibility", "==", "public")
    .orderBy("addedAt", "desc")
    .limit(CATALOG_PAGE_SIZE + 1);

  if (after) {
    const cursor = await libraryRef.collection("books").doc(after).get();
    if (cursor.exists) query = query.startAfter(cursor);
  }

  const snapshot = await query.get();
  // The extra book only tells us whether there's another page
  const docs = snapshot.docs.slice(0, CATALOG_PAGE_SIZE);
  const hasMore = snapshot.docs.length > CATALOG_PAGE_SIZE;

  const banner =
    typeof library.banner === "string" && library.banner in BANNERS
      ? library.banner
      : DEFAULT_BANNER;

  return {
    handle,
    library: {
      name: str(library.name) ?? "Library",
      description: str(library.description),
      banner,
      unlisted: library.access === "unlisted",
    },
    books: docs.map((doc) => toBook(doc.id, doc.data())),
    nextCursor: hasMore ? docs[docs.length - 1].id : null,
  };
}

// Public books matching every word of the query, across the whole library,
// or null when the handle doesn't point at an open library. Same query and
// index as the app's search for non-members: the longest word goes to
// Firestore, the other words are checked against each book's tokens.
export async function searchCatalog(
  handle: string,
  query: string,
): Promise<CatalogSearch | null> {
  const found = await openLibrary(handle);
  if (!found) return null;

  const words = searchWords(query).sort((a, b) => b.length - a.length);
  if (!words.length) return { books: [], capped: false };

  const snapshot = await found.ref
    .collection("books")
    .where("visibility", "==", "public")
    .where("searchTokens", "array-contains", words[0])
    .orderBy("addedAt", "desc")
    .limit(SEARCH_LIMIT)
    .get();

  const books = snapshot.docs
    .filter((doc) => {
      const tokens = new Set(strList(doc.data().searchTokens));
      return words.every((w) => tokens.has(w));
    })
    .map((doc) => toBook(doc.id, doc.data()));

  return { books, capped: snapshot.docs.length === SEARCH_LIMIT };
}
