import { makeEngine, baseValidate, quotes, T, TYPE_GROUPS } from "../base.js";

/** Microsoft SQL Server — enterprise relational database by Microsoft */
const ENGINE = makeEngine({
  id: "mssql",
  family: "sql",
  label: "SQL Server",
  desc: "Microsoft's enterprise relational database with T-SQL, wide tooling and cloud integration.",
  descFa: "پایگاه‌داده سازمانی مایکروسافت با T-SQL، ابزارهای گسترده و یکپارچگی ابری.",
  color: "#E8404B",
  ext: "sql",
  terms: { table: "Table", column: "Column", pk: "Primary Key", tableFa: "جدول", columnFa: "ستون", pkFa: "کلید اصلی" },
  supports: { sql: true, prisma: true, prismaProvider: "sqlserver", native: false, json: true },
  types: [
    T("string", "NVARCHAR", { length: "chars", defaultLength: 255 }),
    T("text", "NVARCHAR(MAX)"),
    T("integer", "INT", { group: TYPE_GROUPS.numbers }),
    T("bigint", "BIGINT", { group: TYPE_GROUPS.numbers }),
    T("float", "FLOAT", { group: TYPE_GROUPS.numbers }),
    T("decimal", "DECIMAL", { length: "precision", defaultLength: "10,2", group: TYPE_GROUPS.numbers }),
    T("boolean", "BIT", { group: TYPE_GROUPS.boolean }),
    T("date", "DATE", { group: TYPE_GROUPS.datetime }),
    T("time", "TIME", { group: TYPE_GROUPS.datetime }),
    T("datetime", "DATETIME2", { group: TYPE_GROUPS.datetime }),
    T("json", "NVARCHAR(MAX)", { group: TYPE_GROUPS.other }),
    T("uuid", "UNIQUEIDENTIFIER", { group: TYPE_GROUPS.other }),
    T("blob", "VARBINARY(MAX)", { group: TYPE_GROUPS.other }),
  ],
  aliases: {
    nvarchar: "string", varchar: "string", char: "string", nchar: "string",
    nvarcharmax: "text", text: "text", ntext: "text",
    int: "integer", integer: "integer", smallint: "integer", tinyint: "integer",
    bigint: "bigint", float: "float", real: "float",
    decimal: "decimal", numeric: "decimal", money: "decimal", smallmoney: "decimal",
    bit: "boolean", boolean: "boolean", date: "date", time: "time",
    datetime: "datetime", datetime2: "datetime", datetimeoffset: "datetime", smalldatetime: "datetime",
    uuid: "uuid", uniqueidentifier: "uuid",
    blob: "blob", varbinary: "blob", image: "blob", binary: "blob",
    json: "json", xml: "text",
  },
  dialect: {
    quote: quotes.bracket,
    autoIncrement: "IDENTITY(1,1)",
    pkInline: true,
    inlineReferences: false,
    fkAlter: true,
    indexForFk: true,
    createDatabase: true,
    tableOptions: "",
    booleanTrue: "1",
    booleanFalse: "0",
  },
  validate(schema) {
    return baseValidate(schema, this, { identifier: /^[A-Za-z_][A-Za-z0-9_]*$/ });
  },
});

export default ENGINE;
