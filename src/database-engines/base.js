/**
 * Engine definition base helpers.
 * An engine = { id, family, label, desc, descFa, color, ext, terms, supports,
 *               types, aliases, defaultType, dialect?, validate(schema), generate?(schema) }
 * Adding a new engine = create one file exporting makeEngine({...}) and register it in index.js.
 */

export const IDENTIFIER_SQL = /^[A-Za-z_][A-Za-z0-9_]*$/;
export const IDENTIFIER_SOFT = /^[A-Za-z0-9_$.\-]+$/;

const SQL_RESERVED = [
  "order", "group", "select", "table", "index", "key", "primary", "check",
  "foreign", "references", "default", "constraint", "create", "drop", "alter",
  "unique", "values", "column", "database",
];

/** Build a type entry: T('string', 'VARCHAR', { length:'chars', group:'text' }) */
export function T(id, native, opts = {}) {
  return {
    id,
    native,
    length: opts.length || false, // 'chars' | 'precision' | false
    group: opts.group || "text",
    defaultLength: opts.defaultLength || "",
  };
}

export const TYPE_GROUPS = {
  text: "Text",
  numbers: "Numbers",
  boolean: "Boolean",
  datetime: "Date & Time",
  other: "Other",
};

export function makeEngine(def) {
  const engine = {
    family: "sql",
    supports: { sql: def.family === "sql", prisma: false, native: !!def.generate, json: true },
    defaultType: "string",
    aliases: {},
    ...def,
    types: def.types || [],
  };
  engine.typeIndex = Object.fromEntries(engine.types.map((t) => [t.id, t]));
  engine.lengthCapable = (typeId) => {
    const t = engine.typeIndex[typeId];
    return !!(t && t.length);
  };
  return engine;
}

/** Shared schema validation used by every engine (levels: error | warning) */
export function baseValidate(schema, engine, opts = {}) {
  const issues = [];
  const { sqlish = engine.family === "sql", identifier = IDENTIFIER_SQL, reserved = SQL_RESERVED } = opts;
  const terms = engine.terms || { table: "Table", column: "Column" };

  if (!schema) return issues;

  const seenTables = new Map();
  for (const t of schema.tables || []) {
    const name = (t.name || "").trim();
    if (!name) {
      issues.push({ level: "error", code: "NAME_REQUIRED", tableId: t.id, message: `A ${terms.table.toLowerCase()} has no name.` });
    } else {
      if (seenTables.has(name.toLowerCase())) {
        issues.push({ level: "error", code: "DUPLICATE_TABLE", tableId: t.id, params: { name }, message: `Duplicate ${terms.table.toLowerCase()} name "${name}".` });
      }
      seenTables.set(name.toLowerCase(), t);
      if (!identifier.test(name)) {
        issues.push({ level: "error", code: "INVALID_NAME", tableId: t.id, params: { name, engine: engine.label }, message: `"${name}" is not a valid ${terms.table.toLowerCase()} name for ${engine.label}.` });
      }
      if (reserved.includes(name.toLowerCase())) {
        issues.push({ level: "warning", code: "RESERVED_WORD", tableId: t.id, params: { name, engine: engine.label }, message: `"${name}" is a reserved keyword in ${engine.label}.` });
      }
    }

    if (!t.columns?.length) {
      issues.push({ level: "warning", code: "NO_COLUMNS", tableId: t.id, message: `${terms.table} "${name}" has no ${terms.column.toLowerCase()}s yet.` });
    }

    const seenCols = new Map();
    for (const c of t.columns || []) {
      const cname = (c.name || "").trim();
      if (!cname) {
        issues.push({ level: "error", code: "NAME_REQUIRED", tableId: t.id, columnId: c.id, message: `A ${terms.column.toLowerCase()} in "${name}" has no name.` });
      } else {
        if (seenCols.has(cname.toLowerCase())) {
          issues.push({ level: "error", code: "DUPLICATE_COLUMN", tableId: t.id, columnId: c.id, params: { name: cname, table: name }, message: `Duplicate ${terms.column.toLowerCase()} "${cname}" in "${name}".` });
        }
        seenCols.set(cname.toLowerCase(), c);
        if (!identifier.test(cname)) {
          issues.push({ level: "error", code: "INVALID_NAME", tableId: t.id, columnId: c.id, params: { name: cname, engine: engine.label }, message: `"${cname}" is not a valid ${terms.column.toLowerCase()} name for ${engine.label}.` });
        }
        if (reserved.includes(cname.toLowerCase())) {
          issues.push({ level: "warning", code: "RESERVED_WORD", tableId: t.id, columnId: c.id, params: { name: cname, engine: engine.label }, message: `"${cname}" is a reserved keyword in ${engine.label}.` });
        }
      }
      if (!engine.typeIndex[c.type]) {
        issues.push({ level: "error", code: "UNSUPPORTED_TYPE", tableId: t.id, columnId: c.id, params: { type: c.type, engine: engine.label }, message: `Type "${c.type}" is not supported by ${engine.label}.` });
      }
    }

    if (sqlish && t.columns?.length && !t.columns.some((c) => c.primaryKey)) {
      issues.push({ level: "warning", code: "NO_PRIMARY_KEY", tableId: t.id, message: `${terms.table} "${name}" has no ${terms.pk}.` });
    }
  }

  for (const r of schema.relations || []) {
    const st = schema.tables?.find((t) => t.id === r.sourceTable);
    const tt = schema.tables?.find((t) => t.id === r.targetTable);
    if (!st || !tt) continue;
    const sc = st.columns?.find((c) => c.id === r.sourceColumn);
    const tc = tt.columns?.find((c) => c.id === r.targetColumn);
    if (!tc) continue;
    if (sqlish && !tc.primaryKey) {
      issues.push({ level: "warning", code: "FK_TARGET_NOT_KEY", relationId: r.id, params: { column: tc.name, table: tt.name }, message: `Target ${terms.column.toLowerCase()} "${tc.name}" in "${tt.name}" should be a ${terms.pk}.` });
    }
    if (sqlish && !sc) {
      issues.push({ level: "error", code: "FK_SOURCE_MISSING", relationId: r.id, params: { source: st.name, target: tt.name }, message: `Relation "${st.name}" → "${tt.name}" has no source ${terms.column.toLowerCase()}.` });
    }
  }

  return issues;
}

/** Quote helper factories */
export const quotes = {
  backtick: (id) => "`" + id + "`",
  double: (id) => '"' + id + '"',
  bracket: (id) => "[" + id + "]",
};
