// CSV in and out for spreadsheets. RFC 4180 quoting; reads files saved by
// Excel, Google Sheets and LibreOffice, including ones that use ; or tabs.

const DELIMITERS = [",", ";", "\t"] as const;

// Cells starting with these run as formulas when a spreadsheet opens the file
const FORMULA_START = /^[=+\-@\t\r]/;

/** The delimiter used most in the header line, outside quotes. */
function detectDelimiter(text: string) {
  const header = text.slice(0, text.search(/\r?\n|$/)).replace(/"[^"]*"/g, "");
  let best: string = ",";
  let bestCount = 0;
  for (const d of DELIMITERS) {
    const count = header.split(d).length - 1;
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Rows of cells. Quoted cells can hold the delimiter, quotes ("") and line
 * breaks. A leading byte-order mark is dropped, and so are blank lines.
 */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  const endRow = () => {
    row.push(cell);
    if (row.some((c) => c.trim())) rows.push(row);
    row = [];
    cell = "";
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch !== '"') cell += ch;
      else if (text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = false;
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      endRow();
    } else {
      cell += ch;
    }
  }
  if (cell || row.length) endRow();
  return rows;
}

/** Drops the apostrophe toCsv puts in front of formula-like cells. */
export function unguardCell(value: string) {
  return value.startsWith("'") && FORMULA_START.test(value.slice(1))
    ? value.slice(1)
    : value;
}

function csvCell(value: string | number | null) {
  let text = value === null ? "" : String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * A CSV file from a header and rows. Starts with a byte-order mark and uses
 * CRLF so Excel opens it as UTF-8. Cells that look like formulas get a
 * leading apostrophe, so a book title can't run as one.
 */
export function toCsv(header: string[], rows: (string | number | null)[][]) {
  const lines = [header, ...rows].map((r) => r.map(csvCell).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}
