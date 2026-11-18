/**
 * Build-time smoke test — no server required.
 * Run with: npm test
 *
 * Covers:
 *  - every template normalizes cleanly on all 13 engines and generates every format
 *  - JSON export → import round trip on all engines
 *  - SQL export → import round trip on SQL engines
 *  - Prisma export → import round trip on Prisma-capable engines
 */
import { ENGINE_LIST } from "../src/database-engines/index.js";
import { TEMPLATES } from "../src/templates/index.js";
import { generateExport, formatsFor } from "../src/generators/index.js";
import { parseFile, detectFormat } from "../src/parsers/index.js";
import { normalizeSchema } from "../src/schema/model.js";

let pass = 0;
let fail = 0;
const failures = [];

function check(name, fn) {
  try {
    const detail = fn();
    pass++;
    console.log(`PASS ${name}${detail ? " — " + detail : ""}`);
  } catch (e) {
    fail++;
    failures.push(`${name}: ${e.message}`);
    console.log(`FAIL ${name} — ${e.message}`);
  }
}

const sample = {
  name: "Round Trip",
  tables: [
    {
      name: "users",
      columns: [
        { name: "id", type: "integer", primaryKey: true, required: true, autoIncrement: true },
        { name: "email", type: "string", length: "190", required: true, unique: true },
        { name: "created_at", type: "datetime", defaultValue: "CURRENT_TIMESTAMP" },
      ],
    },
    {
      name: "orders",
      columns: [
        { name: "id", type: "integer", primaryKey: true, required: true, autoIncrement: true },
        { name: "user_id", type: "integer", required: true },
        { name: "total", type: "decimal", length: "12,2", defaultValue: "0" },
        { name: "placed_at", type: "datetime" },
      ],
    },
  ],
  relations: [
    { sourceTable: "orders", sourceColumn: "user_id", targetTable: "users", targetColumn: "id", type: "1-n", onDelete: "CASCADE", onUpdate: "NO ACTION" },
  ],
};

// 1. Templates × engines: normalize + validate + generate all formats
for (const tpl of TEMPLATES) {
  for (const engine of ENGINE_LIST) {
    check(`template ${tpl.id} / ${engine.id}`, () => {
      const schema = normalizeSchema(tpl.schema, engine);
      const errors = engine.validate(schema).filter((i) => i.level === "error");
      if (errors.length) throw new Error(`${errors.length} validation error(s): ${errors[0].code} ${errors[0].message}`);
      for (const f of formatsFor(engine)) {
        const out = generateExport(schema, engine, f.id);
        if (!out || out.length < 20) throw new Error(`empty ${f.id} output`);
      }
      return `${schema.tables.length} tables, ${schema.relations.length} relations, ${formatsFor(engine).length} formats`;
    });
  }
}

// 2. JSON round trip for every engine
for (const engine of ENGINE_LIST) {
  check(`json round trip / ${engine.id}`, () => {
    const schema = normalizeSchema(sample, engine);
    const json = generateExport(schema, engine, "json");
    const again = normalizeSchema(parseFile(json, "json"), engine);
    if (again.tables.length !== 2) throw new Error(`expected 2 tables, got ${again.tables.length}`);
    if (again.relations.length !== 1) throw new Error(`expected 1 relation, got ${again.relations.length}`);
    const users = again.tables.find((t) => t.name === "users");
    if (!users) throw new Error("users table lost");
    if (!users.columns.find((c) => c.name === "id")?.primaryKey) throw new Error("primary key lost");
    return `${again.tables.length} tables, ${again.relations.length} relations`;
  });
}

// 3. SQL round trip for SQL engines
for (const engine of ENGINE_LIST.filter((e) => e.family === "sql")) {
  check(`sql round trip / ${engine.id}`, () => {
    const schema = normalizeSchema(sample, engine);
    const sql = generateExport(schema, engine, "sql");
    const fmt = detectFormat(sql, "x.sql");
    if (fmt !== "sql") throw new Error(`detected ${fmt}`);
    const again = normalizeSchema(parseFile(sql, "sql"), engine);
    if (again.tables.length !== 2) throw new Error(`expected 2 tables, got ${again.tables.length}`);
    if (!again.relations.length) throw new Error("no relations parsed back");
    return `${again.tables.length} tables, ${again.relations.length} relations`;
  });
}

// 4. Prisma round trip for Prisma-capable engines
for (const engine of ENGINE_LIST.filter((e) => e.supports?.prisma)) {
  check(`prisma round trip / ${engine.id}`, () => {
    const schema = normalizeSchema(sample, engine);
    const text = generateExport(schema, engine, "prisma");
    const fmt = detectFormat(text, "schema.prisma");
    if (fmt !== "prisma") throw new Error(`detected ${fmt}`);
    const again = normalizeSchema(parseFile(text, "prisma"), engine);
    if (again.tables.length !== 2) throw new Error(`expected 2 tables, got ${again.tables.length}`);
    if (!again.relations.length) throw new Error("no relations parsed back");
    return `${again.tables.length} tables, ${again.relations.length} relations`;
  });
}

// 5. Native output determinism
for (const engine of ENGINE_LIST.filter((e) => e.supports?.native)) {
  check(`native output / ${engine.id}`, () => {
    const schema = normalizeSchema(sample, engine);
    const a = generateExport(schema, engine, "engine");
    const b = generateExport(schema, engine, "engine");
    if (a !== b) throw new Error("non-deterministic output");
    return `${a.split("\n").length} lines`;
  });
}

console.log(`\n==== ${pass}/${pass + fail} passed ====`);
if (fail) {
  for (const f of failures) console.log("  FAILED:", f);
  process.exitCode = 1;
}
