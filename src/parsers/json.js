/** JSON schema import — accepts DB Easy Builder exports and generic {tables:[...]} shapes. */
import { logicalType } from "./sql.js";

export function parseJson(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error("Invalid JSON: " + e.message);
  }

  if (Array.isArray(data)) data = { tables: data };
  if (!data || !Array.isArray(data.tables) && !Array.isArray(data.Tables)) {
    throw new Error("JSON must contain a \"tables\" array");
  }

  const rawTables = data.tables || data.Tables || [];
  const tables = [];
  for (const t of rawTables) {
    const table = {
      name: String(t.name || t.table || t.collection || "").trim(),
      note: t.note || t.description || "",
      x: typeof t.x === "number" ? t.x : 0,
      y: typeof t.y === "number" ? t.y : 0,
      columns: [],
    };
    const rawCols = t.columns || t.fields || t.attributes || t.properties || [];
    for (const c of rawCols) {
      if (typeof c === "string") {
        table.columns.push({ name: c, type: "string" });
        continue;
      }
      const rawType = String(c.type || "").trim();
      const type = isLogical(rawType) ? rawType.toLowerCase() : logicalType(rawType);
      table.columns.push({
        name: String(c.name || c.field || c.attribute || ""),
        type,
        length: c.length != null ? String(c.length) : "",
        required: !!(c.required ?? c.notNull),
        primaryKey: !!(c.primaryKey ?? c.isPrimaryKey ?? c.key),
        unique: !!c.unique,
        autoIncrement: !!(c.autoIncrement ?? c.identity),
        defaultValue: c.defaultValue ?? c.default ?? "",
        enumValues: Array.isArray(c.enumValues) ? c.enumValues : c.enum || [],
        note: c.note || c.description || "",
        flag: c.flag || undefined,
      });
    }
    tables.push(table);
  }

  const rawRels = data.relations || data.relationships || data.references || [];
  const relations = [];
  for (const r of rawRels) {
    const from = r.from || r.source || {};
    const to = r.to || r.target || {};
    if (typeof from === "string" || typeof to === "string") continue;
    relations.push({
      sourceTable: from.table || from.collection || "",
      sourceColumn: from.column || from.field || "",
      targetTable: to.table || to.collection || "",
      targetColumn: to.column || to.field || "",
      type: r.type || "1-n",
      onDelete: r.onDelete || "NO ACTION",
      onUpdate: r.onUpdate || "NO ACTION",
    });
  }

  const name = data.database?.name || data.name || data.project || "";
  const engine = data.database?.engine || data.engine || "";

  return { name, engineHint: engine || "generic", tables, relations };
}

function isLogical(t) {
  return ["string", "text", "integer", "bigint", "float", "decimal", "boolean", "date", "time", "datetime", "json", "uuid", "blob", "enum", "objectId", "object", "array", "hash", "list", "set", "sortedSet", "stream", "counter", "number", "timestamp", "reference", "geopoint", "map", "stringSet", "numberSet", "binarySet", "timeuuid", "point"].includes(String(t).toLowerCase());
}
