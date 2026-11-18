import { makeEngine, baseValidate, quotes, T, TYPE_GROUPS } from "../base.js";

/** PostgreSQL — the most advanced open-source relational database */
const ENGINE = makeEngine({
  id: "postgresql",
  family: "sql",
  label: "PostgreSQL",
  desc: "Powerful open-source relational database with rich types, JSONB and extensions.",
  descFa: "پایگاه‌داده رابطه‌ای متن‌باز قدرتمند با انواع داده پیشرفته، JSONB و افزونه‌ها.",
  color: "#336791",
  ext: "sql",
  terms: { table: "Table", column: "Column", pk: "Primary Key", tableFa: "جدول", columnFa: "ستون", pkFa: "کلید اصلی" },
  supports: { sql: true, prisma: true, prismaProvider: "postgresql", native: false, json: true },
  types: [
    T("string", "VARCHAR", { length: "chars", defaultLength: 255 }),
    T("text", "TEXT"),
    T("integer", "INTEGER", { group: TYPE_GROUPS.numbers }),
    T("bigint", "BIGINT", { group: TYPE_GROUPS.numbers }),
    T("float", "DOUBLE PRECISION", { group: TYPE_GROUPS.numbers }),
    T("decimal", "NUMERIC", { length: "precision", defaultLength: "10,2", group: TYPE_GROUPS.numbers }),
    T("boolean", "BOOLEAN", { group: TYPE_GROUPS.boolean }),
    T("date", "DATE", { group: TYPE_GROUPS.datetime }),
    T("time", "TIME", { group: TYPE_GROUPS.datetime }),
    T("datetime", "TIMESTAMPTZ", { group: TYPE_GROUPS.datetime }),
    T("json", "JSONB", { group: TYPE_GROUPS.other }),
    T("uuid", "UUID", { group: TYPE_GROUPS.other }),
    T("blob", "BYTEA", { group: TYPE_GROUPS.other }),
  ],
  aliases: {
    varchar: "string", character: "string", char: "string",
    text: "text", integer: "integer", int: "integer", smallint: "integer",
    bigint: "bigint", real: "float", "double precision": "float", double: "float",
    numeric: "decimal", decimal: "decimal", money: "decimal",
    boolean: "boolean", bool: "boolean", date: "date", time: "time",
    timestamp: "datetime", timestamptz: "datetime", "timestamp with time zone": "datetime",
    json: "json", jsonb: "json", uuid: "uuid", bytea: "blob",
    serial: "integer", bigserial: "bigint", smallserial: "integer",
    inet: "string", cidr: "string", interval: "time", xml: "text", array: "json",
  },
  dialect: {
    quote: quotes.double,
    autoIncrement: "GENERATED ALWAYS AS IDENTITY",
    pkInline: true,
    inlineReferences: true,
    fkAlter: false,
    indexForFk: true,
    createDatabase: false,
    tableOptions: "",
    booleanTrue: "TRUE",
    booleanFalse: "FALSE",
  },
  validate(schema) {
    return baseValidate(schema, this, { identifier: /^[A-Za-z_][A-Za-z0-9_]*$/ });
  },
});

export default ENGINE;
