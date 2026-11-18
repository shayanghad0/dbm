import { generateSql } from "./sql.js";
import { generateJson } from "./json.js";
import { generatePrisma } from "./prisma.js";
import { generateMarkdown } from "./markdown.js";

/**
 * Export dispatcher.
 * format: 'sql' | 'json' | 'prisma' | 'markdown' | 'engine'
 * 'engine' = the engine's own native generator (mongosh, CQL, Cypher, redis docs, ...)
 */
export function generateExport(schema, engine, format) {
  switch (format) {
    case "sql":
      return generateSql(schema, engine);
    case "json":
      return generateJson(schema);
    case "prisma":
      if (!engine.supports?.prisma) throw new Error(`Prisma export is not supported for ${engine.label}`);
      return generatePrisma(schema, engine);
    case "markdown":
      return generateMarkdown(schema, engine);
    case "engine":
      if (typeof engine.generate !== "function") throw new Error(`Engine "${engine.label}" has no native generator`);
      return engine.generate(schema);
    default:
      throw new Error(`Unknown export format: ${format}`);
  }
}

/** Formats available for an engine (for the Export page UI) */
export function formatsFor(engine) {
  const formats = [];
  if (engine.family === "sql") formats.push({ id: "sql", ext: "sql" });
  if (engine.supports?.native) formats.push({ id: "engine", ext: engine.ext || "txt" });
  formats.push({ id: "json", ext: "json" });
  if (engine.supports?.prisma) formats.push({ id: "prisma", ext: "prisma" });
  formats.push({ id: "markdown", ext: "md" });
  return formats;
}

export function mimeFor(format, engine) {
  switch (format) {
    case "json":
      return "application/json";
    case "markdown":
      return "text/markdown";
    default:
      return "text/plain";
  }
}
