/**
 * Generic SQL import parser.
 * Understands common dialects: MySQL/MariaDB (backticks, AUTO_INCREMENT),
 * PostgreSQL (SERIAL, GENERATED AS IDENTITY), SQLite (AUTOINCREMENT),
 * SQL Server (brackets, IDENTITY), Oracle (VARCHAR2, CLOB).
 * Produces name-based { tables, relations } in logical types — the engine
 * registry maps them to native types when the schema is loaded.
 */

const MULTI_WORD = [
  "double precision",
  "character varying",
  "timestamp with time zone",
  "timestamp without time zone",
  "time with time zone",
  "time without time zone",
];

/** Recognized referential actions (used by all FK regexes). */
const FK_ACTION = "(?:CASCADE|SET\\s+NULL|SET\\s+DEFAULT|RESTRICT|NO\\s+ACTION)";

const RAW_MAP = {
  varchar: "string", "character varying": "string", char: "string", character: "string", nvarchar: "string",
  varchar2: "string", nvarchar2: "string", nchar: "string", string: "string", text: "text",
  clob: "text", nclob: "text", tinytext: "text", mediumtext: "text", longtext: "text", ntext: "text", long: "text",
  int: "integer", integer: "integer", smallint: "integer", mediumint: "integer", serial: "integer",
  smallserial: "integer", number: "integer", "number(10)": "integer", year: "integer",
  bigint: "bigint", bigserial: "bigint", "number(19)": "bigint",
  float: "float", double: "float", real: "float", "double precision": "float", binary_double: "float", binary_float: "float",
  decimal: "decimal", numeric: "decimal", money: "decimal", smallmoney: "decimal",
  boolean: "boolean", bool: "boolean", bit: "boolean",
  date: "date", time: "time", interval: "time",
  datetime: "datetime", datetime2: "datetime", timestamp: "datetime", timestamptz: "datetime",
  "timestamp with time zone": "datetime", "timestamp without time zone": "datetime",
  smalldatetime: "datetime", datetimeoffset: "datetime",
  json: "json", jsonb: "json", uuid: "uuid", uniqueidentifier: "uuid", raw: "uuid", "raw(16)": "uuid",
  blob: "blob", bytea: "blob", binary: "blob", varbinary: "blob", image: "blob", tinyblob: "blob", mediumblob: "blob", longblob: "blob",
  enum: "enum", set: "enum", timeuuid: "string", inet: "string", cidr: "string", xml: "text", any: "string",
};

export function logicalType(rawType, args) {
  const key = String(rawType || "").toLowerCase().replace(/\s+/g, " ").trim();
  let logical = RAW_MAP[key];
  if (!logical && /number/.test(key)) logical = key.includes(",") ? "decimal" : "integer";
  if (!logical) logical = null;
  if (logical === "integer" && key === "tinyint" && String(args || "").trim() === "1") return "boolean";
  return logical || "string";
}

/** Parse full SQL text → { name, engineHint, tables, relations } */
export function parseSql(text) {
  const statements = splitStatements(stripComments(text));
  const tables = [];
  const relations = [];
  let name = "";
  let engineHint = "generic";

  for (const raw of statements) {
    const stmt = raw.trim();
    if (!stmt) continue;
    const up = stmt.replace(/^CREATE\s+/i, "CREATE ").toUpperCase();

    const dbMatch = stmt.match(/^(?:IF[\s\S]*?\b)?CREATE\s+(?:DATABASE|SCHEMA)\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"\[\]A-Za-z0-9_.-]+)/i);
    if (dbMatch && !name) {
      name = unquote(dbMatch[1]);
      continue;
    }

    if (/^CREATE\s+TABLE/i.test(stmt)) {
      const t = parseCreateTable(stmt);
      if (t) {
        tables.push(t);
        relations.push(...t._rels);
        delete t._rels;
      }
      continue;
    }

    if (/^ALTER\s+TABLE/i.test(stmt)) {
      const rels = parseAlterFk(stmt, tables);
      relations.push(...rels);
      continue;
    }
  }

  const inlineRels = extractRelationsFromColumns(tables);
  relations.push(...inlineRels);

  engineHint = detectDialect(statements.join("\n"));

  return { name, engineHint, tables, relations };
}

/* ---------------- internals ---------------- */

function stripComments(sql) {
  let out = "";
  let i = 0;
  let quote = null; // '\'', '"', '`'
  let inLine = false;
  let inBlock = false;
  const n = sql.length;
  while (i < n) {
    const c = sql[i];
    const c2 = sql[i + 1];
    if (inLine) {
      if (c === "\n") {
        inLine = false;
        out += "\n";
      }
      i++;
      continue;
    }
    if (inBlock) {
      if (c === "*" && c2 === "/") {
        inBlock = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }
    if (quote) {
      if (c === "\\" && quote === "'") {
        out += c + (c2 || "");
        i += 2;
        continue;
      }
      if (c === quote) {
        // handle doubled quote escape ''
        if (quote === "'" && c2 === "'") {
          out += "''";
          i += 2;
          continue;
        }
        quote = null;
      }
      out += c;
      i++;
      continue;
    }
    if (c === "-" && c2 === "-") {
      inLine = true;
      i += 2;
      continue;
    }
    if (c === "#" && /^#\s/.test(sql.slice(i, i + 2))) {
      inLine = true;
      i++;
      continue;
    }
    if (c === "/" && c2 === "*") {
      inBlock = true;
      i += 2;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      quote = c;
      out += c;
      i++;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

function splitStatements(sql) {
  // T-SQL "GO" is a batch separator, not a statement — treat it as a terminator.
  sql = sql.replace(/^[ \t]*GO[ \t]*;?[ \t]*$/gim, ";");
  const stmts = [];
  let cur = "";
  let quote = null;
  let depth = 0;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (quote) {
      cur += c;
      if (c === "\\" && quote === "'") {
        cur += sql[i + 1] || "";
        i++;
        continue;
      }
      if (c === quote) {
        if (quote === "'" && sql[i + 1] === "'") {
          cur += "''";
          i++;
          continue;
        }
        quote = null;
      }
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      quote = c;
      cur += c;
      continue;
    }
    if (c === "(") depth++;
    if (c === ")") depth = Math.max(0, depth - 1);
    if (c === ";" && depth === 0) {
      stmts.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  if (cur.trim()) stmts.push(cur);
  return stmts;
}

function unquote(s) {
  s = String(s || "").trim();
  if (s.startsWith("`") && s.endsWith("`")) return s.slice(1, -1);
  if (s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
  if (s.startsWith("[") && s.endsWith("]")) return s.slice(1, -1);
  // drop schema/database prefix
  const parts = s.split(".");
  return parts[parts.length - 1].replace(/^[`"\[]|[`"\]]$/g, "");
}

function splitTopLevel(body) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let cur = "";
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (quote) {
      cur += c;
      if (c === "\\" && quote === "'") {
        cur += body[i + 1] || "";
        i++;
        continue;
      }
      if (c === quote) {
        if (quote === "'" && body[i + 1] === "'") {
          cur += "''";
          i++;
          continue;
        }
        quote = null;
      }
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      quote = c;
      cur += c;
      continue;
    }
    if (c === "(") depth++;
    if (c === ")") depth--;
    if (c === "," && depth === 0) {
      parts.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

function parseCreateTable(stmt) {
  const head = stmt.match(/^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`"\[\]A-Za-z0-9_.-]+)/i);
  if (!head) return null;
  const name = unquote(head[1]);
  const open = stmt.indexOf("(");
  const close = lastMatchingParen(stmt, open);
  if (open < 0 || close < 0) return null;
  const body = stmt.slice(open + 1, close);

  const table = { name, note: "", x: 0, y: 0, columns: [], _rels: [] };
  const parts = splitTopLevel(body);
  const pendingPk = new Set();

  for (const partRaw of parts) {
    const part = partRaw.trim();
    if (!part) continue;
    const up = part.toUpperCase();

    if (up.startsWith("PRIMARY KEY")) {
      const cols = parseColList(part);
      cols.forEach((c) => pendingPk.add(c.toLowerCase()));
      continue;
    }
    if (up.startsWith("FOREIGN KEY")) {
      const rel = parseForeignKeyClause(part, name);
      if (rel) table._rels.push(rel);
      continue;
    }
    if (/^(UNIQUE|KEY|INDEX|FULLTEXT|SPATIAL|CHECK|CONSTRAINT|EXCLUDE)/.test(up)) {
      if (up.startsWith("CONSTRAINT")) {
        // CONSTRAINT ... FOREIGN KEY / CHECK / UNIQUE
        if (/FOREIGN\s+KEY/i.test(part)) {
          const rel = parseForeignKeyClause(part, name);
          if (rel) table._rels.push(rel);
        }
        if (/^CONSTRAINT\s+\S+\s+CHECK/i.test(part)) continue;
        if (/^CONSTRAINT\s+\S+\s+UNIQUE/i.test(part)) {
          const cols = parseColList(part);
          for (const cn of cols) {
            const col = table.columns.find((c) => c.name.toLowerCase() === cn.toLowerCase());
            if (col) col.unique = true;
          }
        }
      }
      continue;
    }

    const col = parseColumnDef(part);
    if (col) table.columns.push(col);
  }

  for (const c of table.columns) {
    if (pendingPk.has(c.name.toLowerCase())) c.primaryKey = true;
  }

  return table.columns.length ? table : null;
}

function lastMatchingParen(s, open) {
  let depth = 0;
  let quote = null;
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      if (c === "\\") {
        i++;
        continue;
      }
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      quote = c;
      continue;
    }
    if (c === "(") depth++;
    if (c === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function parseColList(clause) {
  const inner = clause.slice(clause.indexOf("(") + 1, clause.lastIndexOf(")"));
  return splitTopLevel(inner).map((x) => unquote(x.trim()));
}

function parseForeignKeyClause(part, sourceTableName) {
  const m = part.match(
    new RegExp(
      "FOREIGN\\s+KEY\\s*\\(([^)]+)\\)\\s*REFERENCES\\s+([`\"\\[\\]A-Za-z0-9_.-]+)\\s*(?:\\(([^)]+)\\))?\\s*" +
        "(?:ON\\s+DELETE\\s+(" +
        FK_ACTION +
        "))?(?:\\s+ON\\s+UPDATE\\s+(" +
        FK_ACTION +
        "))?\\s*$",
      "i"
    )
  );
  if (!m) return null;
  const srcCols = splitTopLevel(m[1]).map((x) => unquote(x.trim()));
  const target = unquote(m[2]);
  const tgtCols = m[3] ? splitTopLevel(m[3]).map((x) => unquote(x.trim())) : [];
  const rel = {
    sourceTable: sourceTableName,
    sourceColumn: srcCols[0] || "",
    targetTable: target,
    targetColumn: tgtCols[0] || "",
    type: "1-n",
    onDelete: normAction(m[4]),
    onUpdate: normAction(m[5]),
  };
  return rel;
}

function parseAlterFk(stmt, tables) {
  const m = stmt.match(
    new RegExp(
      "ALTER\\s+TABLE\\s+([`\"\\[\\]A-Za-z0-9_.-]+)\\s+ADD\\s+(?:CONSTRAINT\\s+[`\"\\[\\]\\w]+\\s+)?" +
        "FOREIGN\\s+KEY\\s*\\(([^)]+)\\)\\s*REFERENCES\\s+([`\"\\[\\]A-Za-z0-9_.-]+)\\s*(?:\\(([^)]+)\\))?\\s*" +
        "(?:ON\\s+DELETE\\s+(" + FK_ACTION + "))?(?:\\s+ON\\s+UPDATE\\s+(" + FK_ACTION + "))?",
      "i"
    )
  );
  if (!m) return [];
  const src = unquote(m[1]);
  const srcCols = splitTopLevel(m[2]).map((x) => unquote(x.trim()));
  const tgt = unquote(m[3]);
  const tgtCols = m[4] ? splitTopLevel(m[4]).map((x) => unquote(x.trim())) : [];
  const rels = [];
  for (let i = 0; i < srcCols.length; i++) {
    rels.push({
      sourceTable: src,
      sourceColumn: srcCols[i],
      targetTable: tgt,
      targetColumn: tgtCols[i] || "",
      type: "1-n",
      onDelete: normAction(m[5]),
      onUpdate: normAction(m[6]),
    });
  }
  return rels;
}

function normAction(v) {
  const s = String(v || "").trim().toUpperCase();
  if (!s) return "NO ACTION";
  if (s.startsWith("CASCADE")) return "CASCADE";
  if (s.startsWith("SET NULL")) return "SET NULL";
  if (s.startsWith("RESTRICT")) return "RESTRICT";
  if (s.startsWith("SET DEFAULT")) return "SET DEFAULT";
  return "NO ACTION";
}

function parseColumnDef(part) {
  // name
  const nm = part.match(/^\s*([`"\[\]A-Za-z_][`"\[\]A-Za-z0-9_$]*)/);
  if (!nm) return null;
  const name = unquote(nm[1]);
  let rest = part.slice(nm[1].length).trim();

  // type (multi-word first, then single token + optional parens)
  let rawType = "";
  let args = "";
  for (const mw of MULTI_WORD) {
    if (rest.toLowerCase().startsWith(mw)) {
      rawType = mw;
      rest = rest.slice(mw.length).trim();
      break;
    }
  }
  if (!rawType) {
    const tm = rest.match(/^([A-Za-z_][A-Za-z0-9_$]*)\s*(\(([^)]*)\))?/);
    if (!tm) return null;
    rawType = tm[1];
    args = tm[3] || "";
    rest = rest.slice(tm[0].length).trim();
  }

  const col = {
    name,
    type: logicalType(rawType, args),
    length: "",
    required: false,
    primaryKey: false,
    unique: false,
    autoIncrement: false,
    defaultValue: "",
    enumValues: [],
    note: "",
  };

  if (rawType.toLowerCase() === "enum" && args) {
    col.enumValues = splitTopLevel(args).map((v) => v.trim().replace(/^'|'$/g, "").replace(/''/g, "'"));
  } else if (args) {
    const a = String(args).trim();
    if (/^\d+(\s*,\s*\d+)?$/.test(a)) col.length = a.replace(/\s+/g, "");
  }

  const flags = rest;

  if (/^(SERIAL|BIGSERIAL|SMALLSERIAL)$/i.test(rawType)) col.autoIncrement = true;
  if (/auto_increment|autoincrement/i.test(flags)) col.autoIncrement = true;
  if (/generated\s+(always|by\s+default)\s+as\s+identity/i.test(flags)) col.autoIncrement = true;
  if (/identity\s*\(\s*\d+\s*,\s*\d+\s*\)/i.test(flags)) col.autoIncrement = true;

  if (/\bPRIMARY\s+KEY\b/i.test(flags)) col.primaryKey = true;
  if (/\bNOT\s+NULL\b/i.test(flags)) col.required = true;
  if (/\bNULL\b/i.test(flags) && !/\bNOT\s+NULL\b/i.test(flags)) col.required = false;
  if (/\bUNIQUE\b/i.test(flags)) col.unique = true;

  const dm = flags.match(/\bDEFAULT\s+('(?:[^']|'')*'|[\w.()+-]+(?:\(\))?)/i);
  if (dm) {
    let v = dm[1];
    if (v.startsWith("'")) v = v.slice(1, -1).replace(/''/g, "'");
    else v = v.replace(/\s+$/, "");
    col.defaultValue = v;
  }

  // inline REFERENCES (postgres / sqlite style)
  const rm = flags.match(
    new RegExp(
      "\\bREFERENCES\\s+([`\"\\[\\]A-Za-z0-9_.-]+)\\s*(?:\\(([^)]+)\\))?\\s*" +
        "(?:ON\\s+DELETE\\s+(" + FK_ACTION + "))?(?:\\s+ON\\s+UPDATE\\s+(" + FK_ACTION + "))?",
      "i"
    )
  );
  if (rm) {
    col._ref = {
      targetTable: unquote(rm[1]),
      targetColumn: rm[2] ? unquote(rm[2]) : "",
      onDelete: normAction(rm[3]),
      onUpdate: normAction(rm[4]),
    };
  }

  return col;
}

/** Convert parsed columns' inline references into relations */
export function extractRelationsFromColumns(tables) {
  const rels = [];
  for (const t of tables) {
    for (const c of t.columns) {
      if (c._ref) {
        rels.push({
          sourceTable: t.name,
          sourceColumn: c.name,
          targetTable: c._ref.targetTable,
          targetColumn: c._ref.targetColumn || "id",
          type: "1-n",
          onDelete: c._ref.onDelete || "NO ACTION",
          onUpdate: c._ref.onUpdate || "NO ACTION",
        });
        delete c._ref;
      }
    }
  }
  return rels;
}

function detectDialect(text) {
  if (/AUTOINCREMENT/i.test(text)) return "sqlite";
  if (/\bSERIAL\b|\bGENERATED\s+ALWAYS\s+AS\s+IDENTITY\b|::/i.test(text)) return "postgresql";
  if (/\bNVARCHAR\b|\bIDENTITY\s*\(|\[dbo\]/i.test(text)) return "mssql";
  if (/\bVARCHAR2\b|\bCLOB\b|\bBINARY_DOUBLE\b/i.test(text)) return "oracle";
  if (/`/.test(text) || /ENGINE\s*=\s*InnoDB/i.test(text)) return "mysql";
  return "generic";
}
