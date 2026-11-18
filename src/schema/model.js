import { uid } from "../lib/utils.js";

/**
 * Canonical in-memory schema model shared by builder, diagram, engines,
 * generators, parsers and templates.
 *
 * schema = {
 *   id, name, engine,
 *   tables: [{ id, name, note, x, y, columns: [{ id, name, type, length, required,
 *              primaryKey, unique, autoIncrement, defaultValue, enumValues, note }] }],
 *   relations: [{ id, sourceTable, sourceColumn, targetTable, targetColumn,
 *                 type: '1-1'|'1-n'|'n-1'|'n-m', onDelete, onUpdate }]
 * }
 */

export function createColumn(engine, patch = {}) {
  const def = engine?.defaultType || "string";
  return {
    id: uid("col_"),
    name: "",
    type: def,
    length: "",
    required: false,
    primaryKey: false,
    unique: false,
    autoIncrement: false,
    defaultValue: "",
    enumValues: [],
    note: "",
    ...patch,
  };
}

export function createTable(patch = {}) {
  return {
    id: uid("tbl_"),
    name: "",
    note: "",
    x: 0,
    y: 0,
    columns: [],
    ...patch,
  };
}

export function createRelation(patch = {}) {
  return {
    id: uid("rel_"),
    sourceTable: "",
    sourceColumn: "",
    targetTable: "",
    targetColumn: "",
    type: "1-n",
    onDelete: "NO ACTION",
    onUpdate: "NO ACTION",
    ...patch,
  };
}

export function createEmptySchema(engineId, name = "") {
  return {
    id: uid("db_"),
    name,
    engine: engineId,
    tables: [],
    relations: [],
  };
}

/** Ensure ids exist and structural fields are present (used after import/template apply) */
export function normalizeSchema(schema, engine, { autoLayout = false } = {}) {
  const next = {
    id: schema.id || uid("db_"),
    name: schema.name || "",
    engine: schema.engine || engine?.id,
    tables: [],
    relations: [],
  };

  (schema.tables || []).forEach((t, ti) => {
    const table = {
      id: t.id || uid("tbl_"),
      name: t.name || "",
      note: t.note || "",
      x: autoLayout || typeof t.x !== "number" ? 0 : t.x,
      y: autoLayout || typeof t.y !== "number" ? 0 : t.y,
      columns: [],
    };
    (t.columns || []).forEach((c) => {
      const col = {
        ...createColumn(engine),
        ...c,
        id: c.id || uid("col_"),
        type: resolveType(engine, c),
      };
      table.columns.push(col);
    });
    next.tables.push(table);
  });

  if (autoLayout) {
    next.tables.forEach((t, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      t.x = 60 + col * 320;
      t.y = 60 + row * 380;
    });
  }

  const byName = Object.fromEntries(next.tables.map((t) => [t.name.toLowerCase(), t]));

  (schema.relations || []).forEach((r) => {
    const st = byName[String(r.sourceTable || "").toLowerCase()] || next.tables.find((t) => t.id === r.sourceTable);
    const tt = byName[String(r.targetTable || "").toLowerCase()] || next.tables.find((t) => t.id === r.targetTable);
    if (!st || !tt) return;
    const sc = findColumn(st, r.sourceColumn);
    const tc = findColumn(tt, r.targetColumn) || tt.columns.find((c) => c.primaryKey) || tt.columns[0];
    if (!sc || !tc) return;
    next.relations.push({
      ...createRelation(),
      ...r,
      id: r.id || uid("rel_"),
      sourceTable: st.id,
      sourceColumn: sc.id,
      targetTable: tt.id,
      targetColumn: tc.id,
    });
  });

  // Engine-specific adjustments (e.g. DynamoDB maps a plain PK to a partition key).
  if (typeof engine?.normalize === "function") engine.normalize(next);

  return next;
}

function findColumn(table, ref) {
  const idMatch = table.columns.find((c) => c.id === ref);
  if (idMatch) return idMatch;
  const nameMatch = table.columns.find((c) => c.name.toLowerCase() === String(ref || "").toLowerCase());
  return nameMatch || null;
}

function resolveType(engine, col) {
  const raw = String(col.type || "").toLowerCase();
  if (!engine) return raw || "string";
  const known = engine.types.some((t) => t.id === raw);
  if (known) return raw;
  const mapped = engine.aliases?.[raw];
  if (mapped) return mapped;
  return engine.defaultType;
}

/* ---------- immutable helpers (used by reducer/actions) ---------- */

export function updateTable(schema, tableId, fn) {
  return {
    ...schema,
    tables: schema.tables.map((t) => (t.id === tableId ? fn(t) : t)),
  };
}

export function updateColumn(schema, tableId, columnId, fn) {
  return updateTable(schema, tableId, (t) => ({
    ...t,
    columns: t.columns.map((c) => (c.id === columnId ? fn(c) : c)),
  }));
}

export function findTable(schema, tableId) {
  return schema?.tables?.find((t) => t.id === tableId) || null;
}

export function findRelation(schema, relationId) {
  return schema?.relations?.find((r) => r.id === relationId) || null;
}
