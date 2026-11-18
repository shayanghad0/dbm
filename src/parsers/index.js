import { parseSql } from "./sql.js";
import { parseJson } from "./json.js";
import { parsePrisma } from "./prisma.js";

/** Detect import format from filename extension, then content sniffing. */
export function detectFormat(text, filename = "") {
  const ext = (filename.split(".").pop() || "").toLowerCase();
  if (ext === "sql") return "sql";
  if (ext === "json") return "json";
  if (ext === "prisma") return "prisma";

  const t = text.trimStart();
  if (/^model\s+\w+\s*\{/m.test(t) || /datasource\s+\w+\s*\{/.test(t)) return "prisma";
  if (t.startsWith("{") || t.startsWith("[")) {
    try {
      JSON.parse(t);
      return "json";
    } catch {
      /* fallthrough */
    }
  }
  if (/\bCREATE\s+TABLE\b/i.test(t)) return "sql";
  return null;
}

/** Parse content → { name, engineHint, tables, relations } (logical types, name-based) */
export function parseFile(text, format) {
  switch (format) {
    case "sql":
      return parseSql(text);
    case "json":
      return parseJson(text);
    case "prisma":
      return parsePrisma(text);
    default:
      throw new Error("Unsupported format");
  }
}

/** Summarize a parse result for UI */
export function summarize(parsed) {
  const tables = parsed.tables || [];
  const columns = tables.reduce((n, t) => n + (t.columns?.length || 0), 0);
  const relations = parsed.relations || [];
  return { tables: tables.length, columns, relations: relations.length };
}

export const FORMAT_LABELS = {
  sql: "SQL file",
  json: "JSON schema",
  prisma: "Prisma schema",
};
