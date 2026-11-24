import {
  FieldValue,
  getFirestore,
  Timestamp,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
  type Query,
} from "firebase-admin/firestore";
import firebaseApp from "../config/firebase";
import { logAdminAction } from "../services/admin-log.service";
import { parseCsv, toCsv, unguardCell } from "../utils/csv";
import { toIsbn13 } from "../utils/isbn";
import {
  adminRoute,
  cursorParam,
  filterParam,
  httpsUrl,
  optionalText,
  param,
  queryText,
} from "../utils/admin-handler";
import { AdminError, fetchPage, nextCursor } from "../utils/admin-query";
import { int, iso, num, str, strList } from "../utils/firestore-values";

interface LibraryRow {
  id: string;
  name: string;
  access: string;
  adminLocked: boolean;
  handle: string | null;
  ownerId: string;
  ownerUsername: string | null;
  bookCount: number;
  uniqueCount: number;
  memberCount: number;
  createdAt: string | null;
}

interface LibraryMember {
  uid: string;
  username: string | null;
  name: string | null;
  role: "owner" | "editor" | "member";
}

interface LibraryDetail extends LibraryRow {
  description: string | null;
  updatedAt: string | null;
  members: LibraryMember[];
}

interface BookRow {
  id: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  isbn: string | null;
  coverUrl: string | null;
  categories: string[];
  visibility: string;
  noOfCopies: number;
  lentCount: number;
  source: string | null;
  addedAt: string | null;
}

interface BookEdit {
  title: string;
  subtitle: string | null;
  authors: string[];
  isbn: string | null;
  coverUrl: string | null;
  categories: string[];
}

/** One row of an imported CSV, checked and ready to save. */
interface ImportBook extends BookEdit {
  description: string | null;
  publisher: string | null;
  publishedDate: string | null;
  pageCount: number | null;
  language: string | null;
  acquisition: string | null;
  visibility: "public" | "private";
  copies: number;
}

/** The field the app matches a book on in a library, and its value. */
interface BookMatch {
  field: "readingKey" | "isbn" | "title";
  value: string;
}

interface LoanRow {
  id: string;
  status: string;
  bookTitle: string;
  coverUrl: string | null;
  bookId: string;
  libraryId: string;
  libraryName: string;
  borrowerId: string;
  borrowerName: string;
  requestedOn: string | null;
  lentOn: string | null;
  dueOn: string | null;
  returnedOn: string | null;
}

interface FriendshipRow {
  id: string;
  status: string;
  fromUid: string;
  fromUsername: string;
  toUid: string;
  toUsername: string;
  createdAt: string | null;
  respondedAt: string | null;
}

interface ReportRow {
  id: string;
  libraryId: string;
  libraryName: string;
  libraryAccess: string | null;
  libraryLocked: boolean;
  libraryHandle: string | null;
  reporterId: string;
  reporterUsername: string | null;
  reason: string;
  note: string | null;
  createdAt: string | null;
}

interface ReviewRow {
  id: string; // the doc path, users/{uid}/ratings/{readingKey}
  uid: string;
  username: string | null;
  readingKey: string;
  title: string | null;
  authors: string[];
  rating: number | null;
  review: string | null;
  updatedAt: string | null;
}

type LoanOutcome = "returned" | "cancelled" | "lost";

type CsvColumn = (typeof CSV_COLUMNS)[number];

const LIBRARY_ACCESS = ["public", "unlisted", "private"] as const;
const LOAN_STATUSES = [
  "requested",
  "approved",
  "rejected",
  "cancelled",
  "lent",
  "returned",
  "lost",
] as const;
const FRIENDSHIP_STATUSES = ["pending", "accepted"] as const;
const LOAN_OUTCOMES: readonly LoanOutcome[] = ["returned", "cancelled", "lost"];

const PAGE_SIZE = 20;
const BOOK_PAGE_SIZE = 25;

// Same placeholder and token limits as BookModel in the app
const UNKNOWN_TITLE = "Unknown Title";
const TOKEN_MIN = 2;
const TOKEN_MAX = 15;

// Which loan states each forced outcome can come from
const OUTCOME_FROM: Record<LoanOutcome, string[]> = {
  returned: ["lent"],
  lost: ["lent"],
  cancelled: ["requested", "approved", "lent"],
};

const REVIEW_PATH = /^users\/[^/]+\/ratings\/[^/]+$/;

// Book CSV columns, in export order. Authors and genres hold several values
// split by semicolons, since author names can have commas in them.
const CSV_COLUMNS = [
  "title",
  "subtitle",
  "authors",
  "isbn",
  "genres",
  "publisher",
  "publishedDate",
  "pageCount",
  "language",
  "description",
  "coverUrl",
  "copies",
  "visibility",
  "acquisition",
] as const;
// Export only, so a download shows the whole book; import skips them
const CSV_EXPORT_EXTRAS = ["lent", "addedAt", "id"];
// Header names, lowercased with spaces and punctuation dropped, to columns
const CSV_HEADERS: Record<string, CsvColumn> = {
  ...Object.fromEntries(CSV_COLUMNS.map((c) => [c.toLowerCase(), c])),
  author: "authors",
  genre: "genres",
  category: "genres",
  categories: "genres",
  isbn13: "isbn",
  isbn10: "isbn",
  published: "publishedDate",
  pages: "pageCount",
  cover: "coverUrl",
  noofcopies: "copies",
};

// One Firestore batch (500 writes) holds every row plus the library's
// counts, so an import lands whole or not at all
const IMPORT_MAX_ROWS = 400;
const IMPORT_MAX_CHARS = 2_000_000;
const IMPORT_MAX_COPIES = 99;
// Problem rows listed back to the page; past this they're only counted
const IMPORT_MAX_ERRORS = 20;
// Firestore "in" filters take up to 30 values
const IN_LIMIT = 30;

const db = getFirestore(firebaseApp);

/** username by uid for the given uids, one batched read. */
async function usernames(uids: string[]) {
  const unique = [...new Set(uids.filter(Boolean))];
  if (!unique.length) return new Map<string, DocumentData | undefined>();
  const snaps = await db.getAll(
    ...unique.map((uid) => db.collection("users").doc(uid)),
  );
  return new Map(snaps.map((snap) => [snap.id, snap.data()]));
}

async function cursorDoc(collection: string, after: string | null) {
  return after ? db.collection(collection).doc(after).get() : null;
}

// ---------- Search tokens, mirroring BookModel ----------

function stripMarks(text: string) {
  return text.normalize("NFD").replace(/\p{M}/gu, "");
}

function sanitizeWords(text: string) {
  return stripMarks(text.toLowerCase())
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .filter((w) => w.length >= TOKEN_MIN)
    .map((w) => (w.length > TOKEN_MAX ? w.slice(0, TOKEN_MAX) : w));
}

function searchTokens(book: BookEdit) {
  const text = [
    book.title === UNKNOWN_TITLE ? null : book.title,
    book.subtitle,
    ...book.authors,
  ]
    .filter(Boolean)
    .join(" ");
  const tokens = new Set<string>();
  for (const word of sanitizeWords(text)) {
    for (let i = TOKEN_MIN; i <= word.length; i++) tokens.add(word.slice(0, i));
  }
  return [...tokens];
}

function normalizeKeyPart(text: string) {
  return stripMarks(text.toLowerCase())
    .replace(/\(.*?\)|（.*?）/g, "")
    .trim()
    .replace(/^(the|a|an)\s+/, "")
    .replace(/[^\p{L}\p{M}\p{N}]/gu, "");
}

function readingKey(title: string, authors: string[]) {
  if (title === UNKNOWN_TITLE || !authors.length) return null;
  const titlePart = normalizeKeyPart(title);
  const authorPart = normalizeKeyPart(authors[0]);
  return titlePart && authorPart ? `${titlePart}_${authorPart}` : null;
}

// ---------- Libraries ----------

function toLibraryRow(
  id: string,
  data: DocumentData,
  owners: Map<string, DocumentData | undefined>,
): LibraryRow {
  const ownerId = str(data.ownerId) ?? "";
  return {
    id,
    name: str(data.name) ?? "Untitled",
    // Libraries made before access existed are private in the app
    access: str(data.access) ?? "private",
    adminLocked: data.adminLocked === true,
    handle: str(data.handle),
    ownerId,
    ownerUsername: str(owners.get(ownerId)?.username),
    bookCount: num(data.bookCount),
    uniqueCount: num(data.uniqueCount),
    memberCount: strList(data.members).length,
    createdAt: iso(data.createdAt),
  };
}

/** Newest first. Filtering by access needs the (access, createdAt) index. */
async function listLibraries(access: string | null, after: string | null) {
  let query: Query = db.collection("libraries");
  if (access) query = query.where("access", "==", access);
  query = query.orderBy("createdAt", "desc");

  const page = await fetchPage(query, PAGE_SIZE, await cursorDoc("libraries", after));
  const owners = await usernames(page.docs.map((doc) => str(doc.get("ownerId")) ?? ""));
  return {
    libraries: page.docs.map((doc) => toLibraryRow(doc.id, doc.data(), owners)),
    nextCursor: nextCursor(page),
  };
}

async function getLibrary(id: string): Promise<LibraryDetail> {
  const snap = await db.collection("libraries").doc(id).get();
  const data = snap.data();
  if (!data) throw new AdminError(404, "No library with that id");

  const ownerId = str(data.ownerId) ?? "";
  const memberIds = strList(data.members);
  // Old libraries have no editors list; the owner always counts
  const editors = new Set([ownerId, ...strList(data.editors)]);
  const profiles = await usernames([ownerId, ...memberIds]);

  const role = (uid: string): LibraryMember["role"] =>
    uid === ownerId ? "owner" : editors.has(uid) ? "editor" : "member";
  const order = { owner: 0, editor: 1, member: 2 };

  return {
    ...toLibraryRow(id, data, profiles),
    description: str(data.description),
    updatedAt: iso(data.updatedAt),
    members: memberIds
      .map((uid) => ({
        uid,
        username: str(profiles.get(uid)?.username),
        name: str(profiles.get(uid)?.name),
        role: role(uid),
      }))
      .sort((a, b) => order[a.role] - order[b.role]
        || (a.username ?? "").localeCompare(b.username ?? "")),
  };
}

/**
 * Locking makes a library private and sets adminLocked, which firestore.rules
 * checks so the owner can't open it up again. Unlocking only clears the flag:
 * the library stays private until its owner changes that. The handle stays
 * reserved, since the web catalog never shows private libraries.
 */
async function setLibraryLock(adminUid: string, id: string, locked: boolean) {
  const ref = db.collection("libraries").doc(id);
  const snap = await ref.get();
  const data = snap.data();
  if (!data) throw new AdminError(404, "No library with that id");

  const before = {
    access: str(data.access) ?? "private",
    adminLocked: data.adminLocked === true,
  };
  const after = { access: locked ? "private" : before.access, adminLocked: locked };
  if (before.access === after.access && before.adminLocked === after.adminLocked) {
    return after;
  }

  await ref.update({ ...after, updatedAt: FieldValue.serverTimestamp() });
  await logAdminAction(
    adminUid,
    locked ? "library.lock" : "library.unlock",
    { type: "library", id },
    before,
    after,
  );
  return after;
}

// ---------- Books ----------

function toBookRow(id: string, data: DocumentData): BookRow {
  return {
    id,
    title: str(data.title) ?? UNKNOWN_TITLE,
    subtitle: str(data.subtitle),
    authors: strList(data.authors),
    isbn: str(data.isbn),
    coverUrl: str(data.coverUrl),
    categories: strList(data.categories),
    // Books saved before visibility existed are public
    visibility: str(data.visibility) ?? "public",
    noOfCopies: int(data.noOfCopies, 1),
    lentCount: int(data.lentCount, 0),
    source: str(data.source),
    addedAt: iso(data.addedAt),
  };
}

/** Every book whatever its visibility, newest first. */
async function listBooks(libraryId: string, after: string | null) {
  const books = db.collection("libraries").doc(libraryId).collection("books");
  const cursor = after ? await books.doc(after).get() : null;
  const page = await fetchPage(books.orderBy("addedAt", "desc"), BOOK_PAGE_SIZE, cursor);
  return {
    books: page.docs.map((doc) => toBookRow(doc.id, doc.data())),
    nextCursor: nextCursor(page),
  };
}

function cleanList(value: unknown, max: number, label: string) {
  if (!Array.isArray(value)) throw new AdminError(400, `${label} must be a list`);
  const items = value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
  if (items.length > max) throw new AdminError(400, `At most ${max} ${label.toLowerCase()}`);
  if (items.some((v) => v.length > 200)) {
    throw new AdminError(400, `${label} must be under 200 characters each`);
  }
  return [...new Set(items)];
}


function parseBookEdit(body: unknown): BookEdit {
  const input = (body ?? {}) as Record<string, unknown>;
  const title = optionalText(input.title, 300, "Title");
  if (!title) throw new AdminError(400, "Title is required");

  const isbnRaw = optionalText(input.isbn, 20, "ISBN");
  const isbn = isbnRaw ? isbnRaw.replace(/[\s-]/g, "") : null;
  // The app stores ISBN-13 only
  if (isbn && !/^\d{13}$/.test(isbn)) {
    throw new AdminError(400, "ISBN must be 13 digits");
  }

  return {
    title,
    subtitle: optionalText(input.subtitle, 300, "Subtitle"),
    authors: cleanList(input.authors ?? [], 20, "Authors"),
    isbn,
    coverUrl: httpsUrl(input.coverUrl, "Cover link"),
    categories: cleanList(input.categories ?? [], 10, "Genres"),
  };
}

/**
 * Fixes a book's details and rebuilds its search tokens. The readingKey only
 * changes when the title or first author does, so reading logs keep their
 * link to the book otherwise.
 */
async function editBook(
  adminUid: string,
  libraryId: string,
  bookId: string,
  edit: BookEdit,
) {
  const ref = db.collection("libraries").doc(libraryId).collection("books").doc(bookId);
  const snap = await ref.get();
  const data = snap.data();
  if (!data) throw new AdminError(404, "This book isn't in the library any more");

  const before = toBookRow(bookId, data);
  const keyChanged =
    before.title !== edit.title || before.authors[0] !== edit.authors[0];

  await ref.update({
    ...edit,
    searchTokens: searchTokens(edit),
    ...(keyChanged && { readingKey: readingKey(edit.title, edit.authors) }),
  });

  const { title, subtitle, authors, isbn, coverUrl, categories } = before;
  await logAdminAction(
    adminUid,
    "book.edit",
    { type: "book", id: `${libraryId}/${bookId}` },
    { title, subtitle, authors, isbn, coverUrl, categories },
    edit,
  );
  return toBookRow(bookId, { ...data, ...edit });
}

/** Removes a book and takes its copies off the library counts in one go. */
async function deleteBook(adminUid: string, libraryId: string, bookId: string) {
  const libraryRef = db.collection("libraries").doc(libraryId);
  const bookRef = libraryRef.collection("books").doc(bookId);

  const before = await db.runTransaction(async (tx) => {
    const [bookSnap, librarySnap] = await Promise.all([tx.get(bookRef), tx.get(libraryRef)]);
    const data = bookSnap.data();
    if (!data) throw new AdminError(404, "This book isn't in the library any more");

    const book = toBookRow(bookId, data);
    if (book.lentCount > 0) {
      throw new AdminError(
        409,
        "A copy of this book is out on loan. Resolve the loan first, then remove the book.",
      );
    }

    tx.delete(bookRef);
    if (librarySnap.exists) {
      tx.update(libraryRef, {
        bookCount: Math.max(0, num(librarySnap.get("bookCount")) - book.noOfCopies),
        uniqueCount: Math.max(0, num(librarySnap.get("uniqueCount")) - 1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    return book;
  });

  await logAdminAction(
    adminUid,
    "book.delete",
    { type: "book", id: `${libraryId}/${bookId}` },
    before,
    null,
  );
}

// ---------- Book CSV import and export ----------

function splitList(value: string) {
  return value.split(";").map((s) => s.trim()).filter(Boolean);
}

/** A whole number from [min] to [max], or null when the cell is empty. */
function wholeNumber(value: string, min: number, max: number, label: string) {
  if (!value) return null;
  if (!/^\d+$/.test(value)) throw new AdminError(400, `${label} must be a whole number`);
  const n = Number(value);
  if (n < min || n > max) {
    throw new AdminError(400, `${label} must be from ${min} to ${max}`);
  }
  return n;
}

/** ISBN-10s become ISBN-13, which is all the app stores. */
function importIsbn(value: string) {
  const isbn = value.replace(/[\s-]/g, "").toUpperCase();
  if (!isbn) return null;
  if (/^\d{13}$/.test(isbn)) return isbn;
  if (/^\d{9}[\dX]$/.test(isbn)) return toIsbn13(isbn);
  throw new AdminError(400, "ISBN must be 10 or 13 digits");
}

function importDate(value: string) {
  if (!value) return null;
  if (!/^\d{4}(-\d{2}(-\d{2})?)?$/.test(value)) {
    throw new AdminError(400, "Published date must look like 2001, 2001-09 or 2001-09-14");
  }
  return value;
}

/** ISO 639 code, like "en", the same as the providers send. */
function importLanguage(value: string) {
  const code = value.toLowerCase();
  if (!code) return null;
  if (!/^[a-z]{2,3}$/.test(code)) throw new AdminError(400, "Language must be a code like en or hi");
  return code;
}

function importVisibility(value: string) {
  const visibility = value.toLowerCase() || "public";
  if (visibility !== "public" && visibility !== "private") {
    throw new AdminError(400, "Visibility must be public or private");
  }
  return visibility;
}

function parseImportRow(cell: (column: CsvColumn) => string): ImportBook {
  const title = optionalText(cell("title"), 300, "Title");
  if (!title) throw new AdminError(400, "Title is required");
  return {
    title,
    subtitle: optionalText(cell("subtitle"), 300, "Subtitle"),
    authors: cleanList(splitList(cell("authors")), 20, "Authors"),
    isbn: importIsbn(cell("isbn")),
    coverUrl: httpsUrl(cell("coverUrl"), "Cover link"),
    categories: cleanList(splitList(cell("genres")), 10, "Genres"),
    description: optionalText(cell("description"), 5000, "Description"),
    publisher: optionalText(cell("publisher"), 200, "Publisher"),
    publishedDate: importDate(cell("publishedDate")),
    pageCount: wholeNumber(cell("pageCount"), 1, 100_000, "Page count"),
    language: importLanguage(cell("language")),
    acquisition: optionalText(cell("acquisition"), 200, "Acquisition"),
    visibility: importVisibility(cell("visibility")),
    copies: wholeNumber(cell("copies"), 1, IMPORT_MAX_COPIES, "Copies") ?? 1,
  };
}

/**
 * Every row of the file as a book. Columns are found by their header, in
 * any order, and unknown ones are skipped. When any row is bad, nothing is
 * imported and the problems come back one line per row.
 */
function readImportFile(csv: string): ImportBook[] {
  const [header, ...rows] = parseCsv(csv);
  if (!header) throw new AdminError(400, "The file is empty");

  const index = new Map<CsvColumn, number>();
  header.forEach((name, i) => {
    const column = CSV_HEADERS[name.toLowerCase().replace(/[^a-z0-9]/g, "")];
    if (column && !index.has(column)) index.set(column, i);
  });
  if (!index.has("title")) {
    throw new AdminError(400, "The file needs a title column. Export a library to get the column layout.");
  }
  if (!rows.length) throw new AdminError(400, "The file has no books under its header row");
  if (rows.length > IMPORT_MAX_ROWS) {
    throw new AdminError(
      400,
      `At most ${IMPORT_MAX_ROWS} books per file. This one has ${rows.length}, so split it up.`,
    );
  }

  const books: ImportBook[] = [];
  const problems: string[] = [];
  rows.forEach((row, i) => {
    const cell = (column: CsvColumn) => {
      const at = index.get(column);
      return at === undefined ? "" : unguardCell((row[at] ?? "").trim());
    };
    try {
      books.push(parseImportRow(cell));
    } catch (err) {
      if (!(err instanceof AdminError)) throw err;
      // Row 1 is the header, as in a spreadsheet
      problems.push(`Row ${i + 2}: ${err.message}`);
    }
  });

  if (problems.length) {
    const shown = problems.slice(0, IMPORT_MAX_ERRORS);
    if (problems.length > shown.length) shown.push(`…and ${problems.length - shown.length} more`);
    throw new AdminError(
      400,
      `${problems.length === 1 ? "1 row has a problem" : `${problems.length} rows have problems`}. Nothing was imported.`,
      shown,
    );
  }
  return books;
}

/** Same order as the app's findBookInLibrary: reading key, ISBN, title. */
function matchOf(book: ImportBook): BookMatch | null {
  const key = readingKey(book.title, book.authors);
  if (key) return { field: "readingKey", value: key };
  if (book.isbn) return { field: "isbn", value: book.isbn };
  if (book.title !== UNKNOWN_TITLE) return { field: "title", value: book.title };
  return null;
}

const matchId = (match: BookMatch) => `${match.field}:${match.value}`;

/** The books already in the library for [matches], by matchId. */
async function findExisting(books: CollectionReference, matches: BookMatch[]) {
  const values = new Map<BookMatch["field"], Set<string>>();
  for (const { field, value } of matches) {
    values.set(field, (values.get(field) ?? new Set()).add(value));
  }

  const lookups: Promise<[string, DocumentReference][]>[] = [];
  for (const [field, set] of values) {
    const list = [...set];
    for (let i = 0; i < list.length; i += IN_LIMIT) {
      lookups.push(
        books
          .where(field, "in", list.slice(i, i + IN_LIMIT))
          .select(field)
          .get()
          .then((snap) => snap.docs.map((doc): [string, DocumentReference] => [
            matchId({ field, value: String(doc.get(field)) }),
            doc.ref,
          ])),
      );
    }
  }

  const found = new Map<string, DocumentReference>();
  for (const [id, ref] of (await Promise.all(lookups)).flat()) {
    if (!found.has(id)) found.set(id, ref);
  }
  return found;
}

/** The doc the app would save for a book typed in by hand. */
function newBookDoc(book: ImportBook, addedAt: Timestamp): DocumentData {
  const { copies, ...fields } = book;
  return {
    ...fields,
    addedAt,
    noOfCopies: copies,
    googleBooksId: null,
    workId: null,
    source: "manual",
    originalLanguage: null,
    searchTokens: searchTokens(book),
    readingKey: readingKey(book.title, book.authors),
  };
}

/**
 * Adds a CSV of books to a library the way the app's addBooks does: a book
 * already there, or repeated in the file, gets more copies instead of a
 * second entry. One batch, so it all lands or nothing does.
 */
async function importBooks(adminUid: string, libraryId: string, csv: unknown) {
  if (typeof csv !== "string" || !csv.trim()) throw new AdminError(400, "Choose a CSV file to import");
  if (csv.length > IMPORT_MAX_CHARS) {
    throw new AdminError(400, `The file is too big. Split it into files of up to ${IMPORT_MAX_ROWS} books.`);
  }
  const books = readImportFile(csv);

  const libraryRef = db.collection("libraries").doc(libraryId);
  if (!(await libraryRef.get()).exists) throw new AdminError(404, "No library with that id");
  const booksRef = libraryRef.collection("books");

  const matches = books.map(matchOf);
  const existing = await findExisting(
    booksRef,
    matches.filter((m): m is BookMatch => m !== null),
  );

  // New books in file order; repeats add copies to the first one
  const created: DocumentData[] = [];
  const createdById = new Map<string, DocumentData>();
  const extraCopies = new Map<string, { ref: DocumentReference; copies: number }>();
  // A millisecond apart, so the newest-first list keeps the file's order
  const now = Date.now();

  books.forEach((book, i) => {
    const match = matches[i];
    const id = match ? matchId(match) : null;
    const earlier = id ? createdById.get(id) : undefined;
    if (earlier) {
      earlier.noOfCopies += book.copies;
      return;
    }
    const ref = id ? existing.get(id) : undefined;
    if (ref) {
      const entry = extraCopies.get(ref.path) ?? { ref, copies: 0 };
      entry.copies += book.copies;
      extraCopies.set(ref.path, entry);
      return;
    }
    const doc = newBookDoc(book, Timestamp.fromMillis(now - i));
    created.push(doc);
    if (id) createdById.set(id, doc);
  });

  const totalCopies = books.reduce((sum, b) => sum + b.copies, 0);
  const batch = db.batch();
  for (const doc of created) batch.set(booksRef.doc(), doc);
  for (const { ref, copies } of extraCopies.values()) {
    batch.update(ref, { noOfCopies: FieldValue.increment(copies) });
  }
  batch.update(libraryRef, {
    bookCount: FieldValue.increment(totalCopies),
    uniqueCount: FieldValue.increment(created.length),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  const result = {
    rows: books.length,
    added: created.length,
    // Books that were already there and got more copies
    topped: extraCopies.size,
    copies: totalCopies,
  };
  await logAdminAction(adminUid, "book.import", { type: "library", id: libraryId }, null, result);
  return result;
}

function fileSlug(name: string) {
  return stripMarks(name.toLowerCase())
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "library";
}

/** Every book in the library as CSV, in the layout import reads. */
async function exportBooks(libraryId: string) {
  const libraryRef = db.collection("libraries").doc(libraryId);
  const library = (await libraryRef.get()).data();
  if (!library) throw new AdminError(404, "No library with that id");

  const snap = await libraryRef.collection("books").orderBy("addedAt", "desc").get();
  const rows = snap.docs.map((doc) => {
    const d = doc.data();
    return [
      str(d.title) ?? UNKNOWN_TITLE,
      str(d.subtitle),
      strList(d.authors).join("; "),
      str(d.isbn),
      strList(d.categories).join("; "),
      str(d.publisher),
      str(d.publishedDate),
      int(d.pageCount, 0) > 0 ? int(d.pageCount, 0) : null,
      str(d.language),
      str(d.description),
      str(d.coverUrl),
      int(d.noOfCopies, 1),
      str(d.visibility) ?? "public",
      str(d.acquisition),
      int(d.lentCount, 0),
      iso(d.addedAt),
      doc.id,
    ];
  });

  const date = new Date().toISOString().slice(0, 10);
  return {
    filename: `${fileSlug(str(library.name) ?? "")}-books-${date}.csv`,
    count: rows.length,
    csv: toCsv([...CSV_COLUMNS, ...CSV_EXPORT_EXTRAS], rows),
  };
}

// ---------- Loans ----------

function toLoanRow(id: string, data: DocumentData): LoanRow {
  return {
    id,
    status: str(data.status) ?? "requested",
    bookTitle: str(data.bookTitle) ?? UNKNOWN_TITLE,
    coverUrl: str(data.coverUrl),
    bookId: str(data.bookId) ?? "",
    libraryId: str(data.libraryId) ?? "",
    libraryName: str(data.libraryName) ?? "",
    borrowerId: str(data.borrowerId) ?? "",
    borrowerName: str(data.borrowerName) ?? "",
    requestedOn: iso(data.requestedOn),
    lentOn: iso(data.lentOn),
    dueOn: iso(data.dueOn),
    returnedOn: iso(data.returnedOn),
  };
}

/** Newest first. Filtering by status needs the (status, requestedOn) index. */
async function listLoans(status: string | null, after: string | null) {
  let query: Query = db.collection("loans");
  if (status) query = query.where("status", "==", status);
  query = query.orderBy("requestedOn", "desc");

  const page = await fetchPage(query, PAGE_SIZE, await cursorDoc("loans", after));
  return {
    loans: page.docs.map((doc) => toLoanRow(doc.id, doc.data())),
    nextCursor: nextCursor(page),
  };
}

/**
 * Ends a stuck loan the way the app would. A lent copy goes back on the
 * shelf (returned, cancelled) or leaves the library (lost: one copy fewer,
 * or the whole book when it was the last one). lentCount never goes below 0.
 */
async function resolveLoan(adminUid: string, loanId: string, outcome: LoanOutcome) {
  const loanRef = db.collection("loans").doc(loanId);

  const before = await db.runTransaction(async (tx) => {
    const loanSnap = await tx.get(loanRef);
    const loanData = loanSnap.data();
    if (!loanData) throw new AdminError(404, "No loan with that id");

    const loan = toLoanRow(loanId, loanData);
    if (!OUTCOME_FROM[outcome].includes(loan.status)) {
      throw new AdminError(409, `A ${loan.status} loan can't be marked ${outcome}`);
    }

    const libraryRef = db.collection("libraries").doc(loan.libraryId || "_");
    const bookRef = libraryRef.collection("books").doc(loan.bookId || "_");
    // All reads before any writes
    const [bookSnap, librarySnap]: DocumentSnapshot[] = loan.status === "lent"
      ? await Promise.all([tx.get(bookRef), tx.get(libraryRef)])
      : [];

    tx.update(loanRef, {
      status: outcome,
      ...(outcome !== "cancelled" && { returnedOn: FieldValue.serverTimestamp() }),
    });

    const book = bookSnap?.data();
    if (!book) return loan; // not lent, or the book is already gone

    const copies = int(book.noOfCopies, 1);
    const lent = Math.max(0, int(book.lentCount, 0) - 1);

    if (outcome !== "lost") {
      tx.update(bookRef, { lentCount: lent });
      return loan;
    }

    if (copies > 1) {
      tx.update(bookRef, { noOfCopies: copies - 1, lentCount: lent });
    } else {
      tx.delete(bookRef);
    }
    if (librarySnap?.exists) {
      tx.update(libraryRef, {
        bookCount: Math.max(0, num(librarySnap.get("bookCount")) - 1),
        ...(copies <= 1 && {
          uniqueCount: Math.max(0, num(librarySnap.get("uniqueCount")) - 1),
        }),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    return loan;
  });

  await logAdminAction(
    adminUid,
    "loan.resolve",
    { type: "loan", id: loanId },
    { status: before.status },
    { status: outcome },
  );
}

// ---------- Friendships ----------

function toFriendshipRow(id: string, data: DocumentData): FriendshipRow {
  return {
    id,
    status: str(data.status) ?? "pending",
    fromUid: str(data.fromUid) ?? "",
    fromUsername: str(data.fromUsername) ?? "",
    toUid: str(data.toUid) ?? "",
    toUsername: str(data.toUsername) ?? "",
    createdAt: iso(data.createdAt),
    respondedAt: iso(data.respondedAt),
  };
}

/** Newest first. Filtering by status needs the (status, createdAt) index. */
async function listFriendships(status: string | null, after: string | null) {
  let query: Query = db.collection("friendships");
  if (status) query = query.where("status", "==", status);
  query = query.orderBy("createdAt", "desc");

  const page = await fetchPage(query, PAGE_SIZE, await cursorDoc("friendships", after));
  return {
    friendships: page.docs.map((doc) => toFriendshipRow(doc.id, doc.data())),
    nextCursor: nextCursor(page),
  };
}

async function deleteFriendship(adminUid: string, id: string) {
  const ref = db.collection("friendships").doc(id);
  const snap = await ref.get();
  const data = snap.data();
  if (!data) throw new AdminError(404, "This friendship is already gone");

  await ref.delete();
  await logAdminAction(
    adminUid,
    "friendship.delete",
    { type: "friendship", id },
    toFriendshipRow(id, data),
    null,
  );
}

// ---------- Library reports ----------

async function listReports(after: string | null) {
  const query = db.collection("reports").orderBy("createdAt", "desc");
  const page = await fetchPage(query, PAGE_SIZE, await cursorDoc("reports", after));

  const libraryIds = [...new Set(page.docs.map((d) => str(d.get("libraryId")) ?? "_"))];
  const [reporters, librarySnaps] = await Promise.all([
    usernames(page.docs.map((d) => str(d.get("reporterId")) ?? "")),
    libraryIds.length
      ? db.getAll(...libraryIds.map((id) => db.collection("libraries").doc(id)))
      : Promise.resolve([] as DocumentSnapshot[]),
  ]);
  const libraries = new Map(librarySnaps.map((s) => [s.id, s.data()]));

  return {
    reports: page.docs.map((doc): ReportRow => {
      const data = doc.data();
      const libraryId = str(data.libraryId) ?? "";
      const reporterId = str(data.reporterId) ?? "";
      const library = libraries.get(libraryId);
      return {
        id: doc.id,
        libraryId,
        libraryName: str(library?.name) ?? str(data.libraryName) ?? "Deleted library",
        libraryAccess: library ? str(library.access) ?? "private" : null,
        libraryLocked: library?.adminLocked === true,
        libraryHandle: str(library?.handle),
        reporterId,
        reporterUsername: str(reporters.get(reporterId)?.username),
        reason: str(data.reason) ?? "other",
        note: str(data.note),
        createdAt: iso(data.createdAt),
      };
    }),
    nextCursor: nextCursor(page),
  };
}

async function dismissReport(adminUid: string, id: string) {
  const ref = db.collection("reports").doc(id);
  const snap = await ref.get();
  const data = snap.data();
  if (!data) throw new AdminError(404, "This report is already gone");

  await ref.delete();
  await logAdminAction(
    adminUid,
    "report.dismiss",
    { type: "library", id: str(data.libraryId) ?? id },
    { reason: str(data.reason), note: str(data.note), reporterId: str(data.reporterId) },
    null,
  );
}

// ---------- Ratings and reviews ----------

function isReviewPath(path: string) {
  return REVIEW_PATH.test(path);
}

/**
 * Ratings and reviews from every user, newest first. Needs a collection
 * group index on ratings.updatedAt; until it exists the page shows the link.
 */
async function listReviews(after: string | null) {
  const query = db.collectionGroup("ratings").orderBy("updatedAt", "desc");
  const cursor = after && isReviewPath(after) ? await db.doc(after).get() : null;
  const page = await fetchPage(query, PAGE_SIZE, cursor);

  const owners = page.docs.map((doc) => doc.ref.parent.parent!.id);
  const [profiles, logs] = await Promise.all([
    usernames(owners),
    // The book's title lives on the matching reading log
    page.docs.length
      ? db.getAll(
          ...page.docs.map((doc, i) =>
            db.collection("users").doc(owners[i]).collection("readingLogs").doc(doc.id)),
        )
      : Promise.resolve([] as DocumentSnapshot[]),
  ]);

  return {
    reviews: page.docs.map((doc, i): ReviewRow => {
      const data = doc.data();
      const log = logs[i]?.data();
      const rating = typeof data.rating === "number" ? Math.trunc(data.rating) : null;
      return {
        id: doc.ref.path,
        uid: owners[i],
        username: str(profiles.get(owners[i])?.username),
        readingKey: doc.id,
        title: str(log?.title),
        authors: strList(log?.authors),
        rating,
        review: str(data.review),
        updatedAt: iso(data.updatedAt),
      };
    }),
    nextCursor: nextCursor(page, (doc) => doc.ref.path),
  };
}

/** Deletes the review text and keeps the star rating, as the app does. */
async function removeReview(adminUid: string, path: string) {
  if (!isReviewPath(path)) throw new AdminError(400, "Invalid review id");
  const ref = db.doc(path);
  const snap = await ref.get();
  const review = str(snap.get("review"));
  if (!review) throw new AdminError(404, "This review is already gone");

  await ref.update({ review: FieldValue.delete() });
  await logAdminAction(
    adminUid,
    "review.remove",
    { type: "review", id: path },
    { review },
    null,
  );
}

// ---------- Routes ----------

export const getLibraries = adminRoute("Failed to load libraries", (req) =>
  listLibraries(
    filterParam(queryText(req, "access"), LIBRARY_ACCESS, "access"),
    cursorParam(req),
  ),
);

export const getLibraryDetail = adminRoute("Failed to load the library", (req) =>
  getLibrary(param(req, "id")),
);

export const putLibraryLock = adminRoute("Failed to change the library lock", (req) => {
  const locked = req.body?.locked;
  if (typeof locked !== "boolean") throw new AdminError(400, "locked must be true or false");
  return setLibraryLock(req.user!.uid, param(req, "id"), locked);
});

export const getLibraryBooks =adminRoute("Failed to load books", (req) =>
  listBooks(param(req, "id"), cursorParam(req)),
);

export const patchBook = adminRoute("Failed to save the book", (req) =>
  editBook(req.user!.uid, param(req, "id"), param(req, "bookId"), parseBookEdit(req.body)),
);

export const removeBook = adminRoute("Failed to remove the book", (req) =>
  deleteBook(req.user!.uid, param(req, "id"), param(req, "bookId")),
);

export const postBooksImport = adminRoute("Failed to import the books", (req) =>
  importBooks(req.user!.uid, param(req, "id"), req.body?.csv),
);

export const getBooksExport = adminRoute("Failed to export the books", (req) =>
  exportBooks(param(req, "id")),
);

export const getLoans = adminRoute("Failed to load loans", (req) =>
  listLoans(
    filterParam(queryText(req, "status"), LOAN_STATUSES, "status"),
    cursorParam(req),
  ),
);

export const postLoanResolve = adminRoute("Failed to resolve the loan", (req) => {
  const outcome = req.body?.outcome;
  if (!LOAN_OUTCOMES.includes(outcome)) {
    throw new AdminError(400, "outcome must be returned, cancelled or lost");
  }
  return resolveLoan(req.user!.uid, param(req, "id"), outcome as LoanOutcome);
});

export const getFriendships = adminRoute("Failed to load friendships", (req) =>
  listFriendships(
    filterParam(queryText(req, "status"), FRIENDSHIP_STATUSES, "status"),
    cursorParam(req),
  ),
);

export const removeFriendship = adminRoute("Failed to delete the friendship", (req) =>
  deleteFriendship(req.user!.uid, param(req, "id")),
);

export const getReports = adminRoute("Failed to load reports", (req) =>
  listReports(cursorParam(req)),
);

export const removeReport = adminRoute("Failed to dismiss the report", (req) =>
  dismissReport(req.user!.uid, param(req, "id")),
);

// Review cursors are doc paths, so they're checked here instead of cursorParam
export const getReviews = adminRoute("Failed to load reviews", (req) => {
  const after = queryText(req, "after");
  if (after && !isReviewPath(after)) throw new AdminError(400, "Invalid cursor");
  return listReviews(after || null);
});

export const removeReviewText = adminRoute("Failed to remove the review", (req) => {
  const path = typeof req.body?.path === "string" ? req.body.path : "";
  return removeReview(req.user!.uid, path);
});
