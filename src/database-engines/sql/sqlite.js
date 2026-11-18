import { makeEngine, baseValidate, quotes, T, TYPE_GROUPS } from "../base.js";

/** SQLite — serverless, single-file relational database */
const ENGINE = makeEngine({
  id: "sqlite",
  family: "sql",
  label: "SQLite",
  desc: "Serverless, single-file database. Perfect for mobile apps, desktop tools and prototypes.",
  descFa: "پایگاه‌داده بدون سرور و تک‌فایلی. عالی برای اپلیکیشن‌های موبایل، ابزارهای دسکتاپ و نمونه‌های اولیه.",
  color: "#0F4C81",
  ext: "sql",
  terms: { table: "Table", column: "Column", pk: "Primary Key", tableFa: "جدول", columnFa: "ستون", pkFa: "کلید اصلی" },
  supports: { sql: true, prisma: true, prismaProvider: "sqlite", native: false, json: true },
  types: [
    T("string", "TEXT"),
    T("text", "TEXT"),
    T("integer", "INTEGER", { group: TYPE_GROUPS.numbers }),
    T("bigint", "INTEGER", { group: TYPE_GROUPS.numbers }),
    T("float", "REAL", { group: TYPE_GROUPS.numbers }),
    T("decimal", "NUMERIC", { group: TYPE_GROUPS.numbers }),
    T("boolean", "INTEGER", { group: TYPE_GROUPS.boolean }),
    T("date", "TEXT", { group: TYPE_GROUPS.datetime }),
    T("time", "TEXT", { group: TYPE_GROUPS.datetime }),
    T("datetime", "TEXT", { group: TYPE_GROUPS.datetime }),
    T("json", "TEXT", { group: TYPE_GROUPS.other }),
    T("uuid", "TEXT", { group: TYPE_GROUPS.other }),
    T("blob", "BLOB", { group: TYPE_GROUPS.other }),
  ],
  aliases: {
    varchar: "string", text: "text", int: "integer", integer: "integer",
    bigint: "bigint", real: "float", double: "float", float: "float",
    numeric: "decimal", decimal: "decimal", boolean: "boolean", bool: "boolean",
    date: "date", time: "time", datetime: "datetime", timestamp: "datetime",
    json: "json", uuid: "uuid", blob: "blob", any: "string",
  },
  dialect: {
    quote: quotes.double,
    autoIncrement: "AUTOINCREMENT",
    pkInline: true,
    inlineReferences: true,
    fkAlter: false,
    indexForFk: false,
    createDatabase: false,
    tableOptions: "",
    booleanTrue: "1",
    booleanFalse: "0",
    headerPragma: "PRAGMA foreign_keys = ON;",
  },
  validate(schema) {
    return baseValidate(schema, this, { identifier: /^[A-Za-z_][A-Za-z0-9_]*$/ });
  },
});

export default ENGINE;
