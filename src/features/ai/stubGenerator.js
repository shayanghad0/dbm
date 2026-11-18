/**
 * Deterministic local AI stub — keyword + entity extraction.
 * Used when no model is configured or the API is offline.
 * Returns the same contract as a real model: { schema, plan, source }.
 */
import { TEMPLATES } from "../../templates/index.js";

const TEMPLATE_KEYWORDS = [
  ["online-shop", ["shop", "store", "ecommerce", "e-commerce", "فروشگاه", "خرید", "تجارت الکترونیک"]],
  ["school", ["school", "student", "teacher", "مدرسه", "دانشگاه", "دانش‌آموز", "آموزش"]],
  ["crm", ["crm", "customer", "sales", "مشتری", "فروش", "ارتباط با مشتری"]],
  ["banking", ["bank", "finance", "payment", "بانک", "مالی", "تراکنش"]],
  ["blog", ["blog", "article", "news", "وبلاگ", "مقاله", "خبر"]],
  ["social", ["social", "friends", "feed", "شبکه اجتماعی", "دوست", "پست"]],
  ["trading", ["trading", "exchange", "trade", "crypto", "معامله", "صرافی", "بورس"]],
];

const ENTITY_LIB = {
  users: { label: "users", columns: [["id", "integer", { primaryKey: true, autoIncrement: true, required: true }], ["full_name", "string", {}], ["email", "string", { unique: true, required: true }], ["password_hash", "string", {}], ["created_at", "datetime", { defaultValue: "CURRENT_TIMESTAMP" }]] },
  customers: { label: "customers", columns: [["id", "integer", { primaryKey: true, autoIncrement: true, required: true }], ["full_name", "string", { required: true }], ["email", "string", { unique: true }], ["phone", "string", {}], ["created_at", "datetime", { defaultValue: "CURRENT_TIMESTAMP" }]] },
  products: { label: "products", columns: [["id", "integer", { primaryKey: true, autoIncrement: true, required: true }], ["name", "string", { required: true }], ["price", "decimal", { length: "10,2" }], ["stock", "integer", { defaultValue: "0" }], ["created_at", "datetime", { defaultValue: "CURRENT_TIMESTAMP" }]] },
  orders: { label: "orders", columns: [["id", "integer", { primaryKey: true, autoIncrement: true, required: true }], ["status", "string", { defaultValue: "pending" }], ["total", "decimal", { length: "10,2" }], ["created_at", "datetime", { defaultValue: "CURRENT_TIMESTAMP" }]] },
  payments: { label: "payments", columns: [["id", "integer", { primaryKey: true, autoIncrement: true, required: true }], ["amount", "decimal", { length: "10,2" }], ["method", "string", {}], ["created_at", "datetime", { defaultValue: "CURRENT_TIMESTAMP" }]] },
  posts: { label: "posts", columns: [["id", "integer", { primaryKey: true, autoIncrement: true, required: true }], ["title", "string", { required: true }], ["body", "text", {}], ["created_at", "datetime", { defaultValue: "CURRENT_TIMESTAMP" }]] },
  comments: { label: "comments", columns: [["id", "integer", { primaryKey: true, autoIncrement: true, required: true }], ["body", "text", { required: true }], ["created_at", "datetime", { defaultValue: "CURRENT_TIMESTAMP" }]] },
  categories: { label: "categories", columns: [["id", "integer", { primaryKey: true, autoIncrement: true, required: true }], ["name", "string", { required: true }]] },
  tags: { label: "tags", columns: [["id", "integer", { primaryKey: true, autoIncrement: true, required: true }], ["name", "string", { required: true, unique: true }]] },
  messages: { label: "messages", columns: [["id", "integer", { primaryKey: true, autoIncrement: true, required: true }], ["body", "text", { required: true }], ["created_at", "datetime", { defaultValue: "CURRENT_TIMESTAMP" }]] },
  invoices: { label: "invoices", columns: [["id", "integer", { primaryKey: true, autoIncrement: true, required: true }], ["number", "string", { unique: true }], ["total", "decimal", { length: "12,2" }], ["status", "string", { defaultValue: "draft" }], ["created_at", "datetime", { defaultValue: "CURRENT_TIMESTAMP" }]] },
  tasks: { label: "tasks", columns: [["id", "integer", { primaryKey: true, autoIncrement: true, required: true }], ["title", "string", { required: true }], ["done", "boolean", { defaultValue: "false" }], ["created_at", "datetime", { defaultValue: "CURRENT_TIMESTAMP" }]] },
  students: { label: "students", columns: [["id", "integer", { primaryKey: true, autoIncrement: true, required: true }], ["full_name", "string", { required: true }], ["email", "string", { unique: true }], ["created_at", "datetime", { defaultValue: "CURRENT_TIMESTAMP" }]] },
  classes: { label: "classes", columns: [["id", "integer", { primaryKey: true, autoIncrement: true, required: true }], ["title", "string", { required: true }], ["schedule", "datetime", {}]] },
  departments: { label: "departments", columns: [["id", "integer", { primaryKey: true, autoIncrement: true, required: true }], ["name", "string", { required: true }]] },
  employees: { label: "employees", columns: [["id", "integer", { primaryKey: true, autoIncrement: true, required: true }], ["full_name", "string", { required: true }], ["email", "string", { unique: true }], ["department_id", "integer", {}], ["created_at", "datetime", { defaultValue: "CURRENT_TIMESTAMP" }]] },
};

/** Relations inferred when both entities are present */
const ENTITY_RELS = [
  ["orders", "user_id", "users", "users"],
  ["orders", "customer_id", "customers", "customers"],
  ["order_items", "order_id", "orders", "orders"],
  ["payments", "order_id", "orders", "orders"],
  ["payments", "invoice_id", "invoices", "invoices"],
  ["comments", "post_id", "posts", "posts"],
  ["posts", "user_id", "users", "users"],
  ["messages", "sender_id", "users", "users"],
  ["employees", "department_id", "departments", "departments"],
];

export function stubGenerate({ prompt, engineId }) {
  const p = String(prompt || "").toLowerCase();

  // 1) template match
  for (const [tplId, words] of TEMPLATE_KEYWORDS) {
    if (words.some((w) => p.includes(w))) {
      const tpl = TEMPLATES.find((x) => x.id === tplId);
      if (tpl) {
        return {
          source: "stub",
          schema: {
            name: tpl.schema.name,
            engine: engineId,
            tables: deepClone(tpl.schema.tables),
            relations: deepClone(tpl.schema.relations),
          },
          plan: [
            { key: "ai.plan.matchedTemplate", params: { name: tpl.schema.name } },
            { key: "ai.plan.tablesCreated", params: { count: tpl.schema.tables.length } },
            { key: "ai.plan.relationsAdded", params: { count: tpl.schema.relations.length } },
            { key: "ai.plan.review" },
          ],
        };
      }
    }
  }

  // 2) entity extraction
  const tokens = new Set(p.split(/[^a-z\u0600-\u06FF]+/).filter(Boolean));
  const found = [];
  for (const [key, def] of Object.entries(ENTITY_LIB)) {
    if (tokens.has(key) || (key.endsWith("s") && tokens.has(key.slice(0, -1)))) found.push(key);
  }
  // include known singulars
  const singularMap = { user: "users", product: "products", order: "orders", customer: "customers", post: "posts", comment: "comments", payment: "payments", category: "categories", invoice: "invoices", employee: "employees", student: "students" };
  for (const t of tokens) if (singularMap[t] && !found.includes(singularMap[t])) found.push(singularMap[t]);

  const picked = found.length ? [...new Set(found)].slice(0, 8) : ["users", "products", "orders", "payments"];
  const tables = picked.map((key) => ({
    name: ENTITY_LIB[key].label,
    x: 0,
    y: 0,
    columns: ENTITY_LIB[key].columns.map(([name, type, opts]) => ({ name, type, ...opts })),
  }));

  const present = new Set(picked);
  const relations = [];

  // common relations between picked entities
  if (present.has("orders") && present.has("users")) relations.push(mkRel("orders", "user_id", "users"));
  if (present.has("orders") && present.has("customers")) relations.push(mkRel("orders", "customer_id", "customers"));
  if (present.has("payments") && present.has("orders")) relations.push(mkRel("payments", "order_id", "orders"));
  if (present.has("payments") && present.has("invoices")) relations.push(mkRel("payments", "invoice_id", "invoices"));
  if (present.has("posts") && present.has("users")) relations.push(mkRel("posts", "user_id", "users"));
  if (present.has("comments") && present.has("posts")) relations.push(mkRel("comments", "post_id", "posts"));
  if (present.has("comments") && present.has("users")) relations.push(mkRel("comments", "user_id", "users"));
  if (present.has("products") && present.has("categories")) relations.push(mkRel("products", "category_id", "categories"));

  // add fk columns that are referenced by generated relations
  for (const r of relations) {
    const tb = tables.find((x) => x.name === r.sourceTable);
    if (tb && !tb.columns.some((c) => c.name === r.sourceColumn)) {
      const idx = tb.columns.findIndex((c) => c.name === "created_at");
      tb.columns.splice(idx >= 0 ? idx : tb.columns.length, 0, { name: r.sourceColumn, type: "integer", required: true });
    }
  }
  if (present.has("products") && present.has("categories")) {
    const prod = tables.find((x) => x.name === "products");
    if (prod && !prod.columns.some((c) => c.name === "category_id")) prod.columns.splice(1, 0, { name: "category_id", type: "integer" });
  }

  return {
    source: "stub",
    schema: { name: titleFromPrompt(prompt), engine: engineId, tables, relations },
    plan: [
      { key: "ai.plan.parsedRequest" },
      { key: "ai.plan.tablesCreated", params: { count: tables.length } },
      { key: "ai.plan.relationsAdded", params: { count: relations.length } },
      { key: "ai.plan.review" },
    ],
  };
}

function mkRel(sourceTable, sourceColumn, targetTable) {
  return { sourceTable, sourceColumn, targetTable, targetColumn: "id", type: "1-n", onDelete: "CASCADE", onUpdate: "NO ACTION" };
}

function titleFromPrompt(prompt) {
  const clean = String(prompt || "Generated database").trim().replace(/[.!?]+$/, "");
  const short = clean.length > 48 ? clean.slice(0, 48) + "…" : clean;
  return short.charAt(0).toUpperCase() + short.slice(1);
}

function deepClone(v) {
  return JSON.parse(JSON.stringify(v));
}
