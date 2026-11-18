import { makeEngine, baseValidate, quotes, T, TYPE_GROUPS } from "../base.js";

/** MariaDB — MySQL-compatible open-source relational database */
const ENGINE = makeEngine({
  id: "mariadb",
  family: "sql",
  label: "MariaDB",
  desc: "Community-developed MySQL-compatible database with additional engines and features.",
  descFa: "پایگاه‌داده متن‌باز و سازگار با MySQL با موتورهای ذخیره‌سازی و قابلیت‌های بیشتر.",
  color: "#C0765A",
  ext: "sql",
  terms: { table: "Table", column: "Column", pk: "Primary Key", tableFa: "جدول", columnFa: "ستون", pkFa: "کلید اصلی" },
  supports: { sql: true, prisma: true, prismaProvider: "mysql", native: false, json: true },
  types: [
    T("string", "VARCHAR", { length: "chars", defaultLength: 255 }),
    T("text", "TEXT"),
    T("enum", "ENUM"),
    T("integer", "INT", { group: TYPE_GROUPS.numbers }),
    T("bigint", "BIGINT", { group: TYPE_GROUPS.numbers }),
    T("float", "DOUBLE", { group: TYPE_GROUPS.numbers }),
    T("decimal", "DECIMAL", { length: "precision", defaultLength: "10,2", group: TYPE_GROUPS.numbers }),
    T("boolean", "TINYINT(1)", { group: TYPE_GROUPS.boolean }),
    T("date", "DATE", { group: TYPE_GROUPS.datetime }),
    T("time", "TIME", { group: TYPE_GROUPS.datetime }),
    T("datetime", "DATETIME", { group: TYPE_GROUPS.datetime }),
    T("json", "LONGTEXT", { group: TYPE_GROUPS.other }),
    T("uuid", "CHAR(36)", { group: TYPE_GROUPS.other }),
    T("blob", "BLOB", { group: TYPE_GROUPS.other }),
  ],
  aliases: {
    varchar: "string", char: "string", tinytext: "text", mediumtext: "text", longtext: "text", text: "text",
    tinyint: "integer", smallint: "integer", mediumint: "integer", int: "integer", integer: "integer",
    bigint: "bigint", float: "float", double: "float", real: "float",
    decimal: "decimal", numeric: "decimal", bool: "boolean", boolean: "boolean",
    date: "date", time: "time", datetime: "datetime", timestamp: "datetime",
    json: "json", uuid: "uuid", blob: "blob", enum: "enum", set: "enum", bit: "boolean",
  },
  dialect: {
    quote: quotes.backtick,
    autoIncrement: "AUTO_INCREMENT",
    pkInline: true,
    inlineReferences: false,
    fkAlter: true,
    indexForFk: false,
    createDatabase: true,
    tableOptions: " ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    booleanTrue: "1",
    booleanFalse: "0",
  },
  validate(schema) {
    return baseValidate(schema, this, { identifier: /^[A-Za-z_][A-Za-z0-9_]*$/ });
  },
});

export default ENGINE;
