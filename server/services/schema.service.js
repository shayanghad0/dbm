import { getEngine } from "../../src/database-engines/index.js";
import { generateExport, formatsFor, mimeFor } from "../../src/generators/index.js";
import { detectFormat, parseFile, summarize } from "../../src/parsers/index.js";
import { normalizeSchema } from "../../src/schema/model.js";
import { slugify } from "../../src/lib/utils.js";

/** Throw an HTTP-aware error. */
export function fail(message, code = "BAD_REQUEST", status = 400) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  throw err;
}

export function requireEngine(id) {
  const engine = getEngine(id);
  if (!engine) fail(`Unknown engine "${id}"`, "UNKNOWN_ENGINE");
  return engine;
}

export function requireSchema(schema) {
  if (!schema || typeof schema !== "object" || !Array.isArray(schema.tables)) {
    fail("A schema object with a tables array is required", "INVALID_SCHEMA");
  }
  return schema;
}

/** Normalize a (possibly name-based) schema for an engine and attach stable ids. */
export function normalizeForEngine(raw, engine, { autoLayout = true } = {}) {
  const schema = normalizeSchema(raw, engine, { autoLayout });
  schema.engine = engine.id;
  if (!schema.name) schema.name = raw.name || "";
  return schema;
}

/** POST /api/export body: { schema, engine, format } */
export function runExport(body = {}) {
  const engine = requireEngine(body.engine || body.engineId || body.schema?.engine || "mysql");
  const raw = requireSchema(body.schema);
  const schema = normalizeForEngine(raw, engine, { autoLayout: !raw.tables.some((t) => typeof t.x === "number") });
  if (body.name) schema.name = body.name;

  const formats = formatsFor(engine);
  const format = body.format || formats[0]?.id;
  if (!formats.some((f) => f.id === format)) {
    fail(`Format "${format}" is not available for ${engine.label}`, "UNSUPPORTED_FORMAT");
  }

  let content;
  try {
    content = generateExport(schema, engine, format);
  } catch (err) {
    fail(err.message, "EXPORT_FAILED", 422);
  }

  const ext = formats.find((f) => f.id === format)?.ext || "txt";
  return {
    engine: engine.id,
    format,
    filename: `${slugify(schema.name || "database")}-schema.${ext}`,
    mime: mimeFor(format, engine),
    content,
    issues: engine.validate(schema),
  };
}

/** POST /api/import body: { content, format?, filename? } */
export function runImport(body = {}) {
  const content = String(body.content || "");
  if (!content.trim()) fail("Content is required", "EMPTY_CONTENT");

  const format = body.format || detectFormat(content, body.filename || "");
  if (!format) fail("Could not detect the schema format — send format=sql|json|prisma", "UNKNOWN_FORMAT");

  let parsed;
  try {
    parsed = parseFile(content, format);
  } catch (err) {
    fail(err.message || "Could not parse schema", "PARSE_FAILED", 422);
  }

  if (!parsed.tables?.length) fail("No tables were found in this schema", "NO_TABLES", 422);

  const engineHint = parsed.engineHint && getEngine(parsed.engineHint) ? parsed.engineHint : null;
  return {
    ...parsed,
    format,
    engineHint,
    summary: summarize(parsed),
  };
}
