export interface CatalogLibrary {
  name: string;
  description: string | null;
  banner: string;
  // Unlisted: reachable by link, kept out of search engines
  unlisted: boolean;
}

export interface CatalogBook {
  id: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  coverUrl: string | null;
  publishedDate: string | null;
  // Shown in the panel that opens when a book is tapped
  description: string | null;
  categories: string[];
  publisher: string | null;
  pageCount: number | null;
  // Language name, like "English", from the stored code
  language: string | null;
  isbn: string | null;
}

export interface Catalog {
  handle: string;
  library: CatalogLibrary;
  books: CatalogBook[];
  // ID of the last book shown when there are more; null on the last page
  nextCursor: string | null;
}

export interface CatalogSearch {
  books: CatalogBook[];
  // True when the search hit SEARCH_LIMIT, so older matches may be missing
  capped: boolean;
}
