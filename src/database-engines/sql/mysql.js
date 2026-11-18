import { makeEngine, baseValidate, quotes, T, TYPE_GROUPS } from "../base.js";

/** MySQL — world's most popular open-source relational database */
const ENGINE = makeEngine({
  id: "mysql",
  family: "sql",
  label: "MySQL",
  desc: "Popular open-source relational database. Great for web apps, CMS and e-commerce.",
  descFa: "پایگاه‌داده رابطه‌ای متن‌باز و محبوب. مناسب وب‌اپلیکیشن‌ها، سیستم‌های مدیریت محتوا و فروشگاه‌سازی.",
  color: "#00758F",
  ext: "sql",
  terms: { table: "Table", column: "Column", pk: "Primary Key", tableFa: "جدول", columnFa: "ستون", pkFa: "کلید اصلی" },
  supports: { sql: true, prisma: true, prismaProvider: "mysql", native: false, json: true },
  types: [
    T("string", "VARCHAR", { length: "chars", defaultLength: 255 }),
    T("text", "TEXT", { group: TYPE_GROUPS.text }),
    T("enum", "ENUM", { group: TYPE_GROUPS.text }),
    T("integer", "INT", { group: TYPE_GROUPS.numbers }),
    T("bigint", "BIGINT", { group: TYPE_GROUPS.numbers }),
    T("float", "FLOAT", { group: TYPE_GROUPS.numbers }),
    T("decimal", "DECIMAL", { length: "precision", defaultLength: "10,2", group: TYPE_GROUPS.numbers }),
    T("boolean", "TINYINT(1)", { group: TYPE_GROUPS.boolean }),
    T("date", "DATE", { group: TYPE_GROUPS.datetime }),
    T("time", "TIME", { group: TYPE_GROUPS.datetime }),
    T("datetime", "DATETIME", { group: TYPE_GROUPS.datetime }),
    T("json", "JSON", { group: TYPE_GROUPS.other }),
    T("uuid", "CHAR(36)", { group: TYPE_GROUPS.other }),
    T("blob", "BLOB", { group: TYPE_GROUPS.other }),
  ],
  aliases: {
    varchar: "string", char: "string", tinytext: "text", mediumtext: "text", longtext: "text",
    tinyint: "integer", smallint: "integer", mediumint: "integer", int: "integer", integer: "integer",
    bigint: "bigint", float: "float", double: "float", real: "float",
    decimal: "decimal", numeric: "decimal", bool: "boolean", boolean: "boolean",
    date: "date", time: "time", datetime: "datetime", timestamp: "datetime",
    json: "json", uuid: "uuid", blob: "blob", tinyblob: "blob", mediumblob: "blob", longblob: "blob",
    enum: "enum", set: "enum", year: "integer", bit: "boolean", binary: "blob", varbinary: "blob",
    text_no: "text",
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
    comment: "comment",
  },
  validate(schema) {
    return baseValidate(schema, this, { identifier: /^[A-Za-z_][A-Za-z0-9_]*$/ });
  },
});

export default ENGINE;
