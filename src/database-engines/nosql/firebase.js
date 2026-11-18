import { makeEngine, baseValidate, T, TYPE_GROUPS } from "../base.js";

/** Firebase (Cloud Firestore) — serverless document store */
const ENGINE = makeEngine({
  id: "firebase",
  family: "nosql",
  label: "Firebase",
  desc: "Google's serverless Firestore database with realtime sync and security rules.",
  descFa: "پایگاه‌داده Firestore بدون سرور از گوگل با همگام‌سازی لحظه‌ای و قوانین امنیتی.",
  color: "#FFA000",
  ext: "json",
  terms: { table: "Collection", column: "Field", pk: "Document ID", tableFa: "کالکشن", columnFa: "فیلد", pkFa: "شناسه سند" },
  supports: { sql: false, prisma: false, native: true, json: true },
  defaultType: "string",
  types: [
    T("string", "string"),
    T("text", "string"),
    T("integer", "number", { group: TYPE_GROUPS.numbers }),
    T("float", "number", { group: TYPE_GROUPS.numbers }),
    T("boolean", "boolean", { group: TYPE_GROUPS.boolean }),
    T("date", "timestamp", { group: TYPE_GROUPS.datetime }),
    T("datetime", "timestamp", { group: TYPE_GROUPS.datetime }),
    T("reference", "reference", { group: TYPE_GROUPS.other }),
    T("geopoint", "geopoint", { group: TYPE_GROUPS.other }),
    T("array", "array", { group: TYPE_GROUPS.other }),
    T("object", "map", { group: TYPE_GROUPS.other }),
  ],
  aliases: { string: "string", number: "integer", timestamp: "datetime", reference: "reference", geopoint: "geopoint", array: "array", map: "object" },
  validate(schema) {
    return baseValidate(schema, this, { sqlish: false, identifier: /^[A-Za-z][A-Za-z0-9_]*$/, reserved: [] });
  },
  /** Export: collection map (JSON) + starter security rules */
  generate(schema) {
    const collections = (schema.tables || []).map((t) => ({
      collection: t.name,
      note: t.note || undefined,
      fields: Object.fromEntries(
        (t.columns || []).map((c) => [
          c.name,
          { type: this.typeIndex[c.type]?.native || "string", required: !!c.required, note: c.note || undefined },
        ])
      ),
    }));
    const doc = {
      project: schema.name || "firebase-schema",
      generatedBy: "DB Easy Builder",
      collections,
      relations: (schema.relations || []).map((r) => ({
        from: r.sourceTable,
        field: r.sourceColumn,
        to: r.targetTable,
        toField: r.targetColumn,
        cardinality: r.type,
      })),
    };
    const rules = [
      "rules_version = '2';",
      "service cloud.firestore {",
      "  match /databases/{database}/documents {",
      "    // Authenticated users can read/write; guests read only.",
      "    match /{document=**} {",
      "      allow read: if true;",
      "      allow write: if request.auth != null;",
      "    }",
      ...collections.map((c) => `    match /${c.collection}/{docId} { allow read: if true; allow write: if request.auth != null; }`),
      "  }",
      "}",
    ];
    return (
      JSON.stringify(doc, null, 2) +
      "\n\n/* ---- firestore.rules ---- */\n" +
      rules.join("\n") +
      "\n"
    );
  },
});

export default ENGINE;
