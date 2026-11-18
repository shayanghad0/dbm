import { makeEngine, baseValidate, quotes, T, TYPE_GROUPS } from "../base.js";

/** Oracle Database — enterprise-grade relational database */
const ENGINE = makeEngine({
  id: "oracle",
  family: "sql",
  label: "Oracle",
  desc: "Enterprise-grade relational database known for scale, PL/SQL and mission-critical workloads.",
  descFa: "پایگاه‌داده سازمانی قدرتمند با مقیاس بالا، PL/SQL و بارهای کاری حیاتی.",
  color: "#F80000",
  ext: "sql",
  terms: { table: "Table", column: "Column", pk: "Primary Key", tableFa: "جدول", columnFa: "ستون", pkFa: "کلید اصلی" },
  supports: { sql: true, prisma: false, native: false, json: true },
  types: [
    T("string", "VARCHAR2", { length: "chars", defaultLength: 255 }),
    T("text", "CLOB"),
    T("integer", "NUMBER(10)", { group: TYPE_GROUPS.numbers }),
    T("bigint", "NUMBER(19)", { group: TYPE_GROUPS.numbers }),
    T("float", "BINARY_DOUBLE", { group: TYPE_GROUPS.numbers }),
    T("decimal", "NUMBER", { length: "precision", defaultLength: "10,2", group: TYPE_GROUPS.numbers }),
    T("boolean", "NUMBER(1)", { group: TYPE_GROUPS.boolean }),
    T("date", "DATE", { group: TYPE_GROUPS.datetime }),
    T("time", "TIMESTAMP", { group: TYPE_GROUPS.datetime }),
    T("datetime", "TIMESTAMP", { group: TYPE_GROUPS.datetime }),
    T("json", "CLOB", { group: TYPE_GROUPS.other }),
    T("uuid", "RAW(16)", { group: TYPE_GROUPS.other }),
    T("blob", "BLOB", { group: TYPE_GROUPS.other }),
  ],
  aliases: {
    varchar2: "string", varchar: "string", nvarchar2: "string", char: "string", nchar: "string",
    clob: "text", nclob: "text", long: "text",
    number: "integer", integer: "integer", int: "integer", "number(10)": "integer",
    "number(19)": "bigint", smallint: "integer",
    binary_double: "float", binary_float: "float", float: "float",
    date: "date", timestamp: "datetime", "timestamp with time zone": "datetime",
    blob: "blob", raw: "uuid", "raw(16)": "uuid", uuid: "uuid",
    json: "json", clob_json: "json",
  },
  dialect: {
    quote: quotes.double,
    autoIncrement: "GENERATED ALWAYS AS IDENTITY",
    pkInline: true,
    inlineReferences: false,
    fkAlter: true,
    indexForFk: true,
    createDatabase: false,
    tableOptions: "",
    booleanTrue: "1",
    booleanFalse: "0",
  },
  validate(schema) {
    return baseValidate(schema, this, { identifier: /^[A-Za-z_][A-Za-z0-9_]*$/ });
  },
});

export default ENGINE;
