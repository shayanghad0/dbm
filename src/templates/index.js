/**
 * Starter templates. Authored with logical types so they adapt to any engine.
 * Relations are name-based; normalizeSchema resolves them on apply.
 */

const c = (name, type = "string", o = {}) => ({ name, type, ...o });
const pk = (type = "integer") => c("id", type, { primaryKey: true, required: true, autoIncrement: type === "integer" });
const fk = (name, o = {}) => c(name, "integer", { required: true, ...o });
const created = () => c("created_at", "datetime", { defaultValue: "CURRENT_TIMESTAMP" });
const updated = () => c("updated_at", "datetime", { defaultValue: "CURRENT_TIMESTAMP" });

const rel = (sourceTable, sourceColumn, targetTable, type = "1-n", onDelete = "CASCADE") => ({
  sourceTable,
  sourceColumn,
  targetTable,
  type,
  onDelete,
  onUpdate: "NO ACTION",
});

const P = (i) => ({ x: 60 + (i % 4) * 300, y: 60 + Math.floor(i / 4) * 360 });

export const TEMPLATES = [
  {
    id: "online-shop",
    icon: "ShoppingCart",
    color: "#6366F1",
    nameKey: "templates.onlineShop",
    descKey: "templates.onlineShopDesc",
    schema: {
      name: "Online Shop",
      tables: [
        { name: "users", ...P(0), columns: [pk(), c("full_name"), c("email", "string", { required: true, unique: true }), c("password_hash"), c("role", "enum", { enumValues: ["customer", "admin"], defaultValue: "customer" }), created()] },
        { name: "categories", ...P(1), columns: [pk(), c("name", "string", { required: true }), c("slug", "string", { unique: true }), c("parent_id", "integer"), created()] },
        { name: "products", ...P(2), columns: [pk(), c("category_id", "integer", { required: true }), c("name", "string", { required: true }), c("slug", "string", { unique: true }), c("price", "decimal", { length: "10,2", required: true }), c("stock", "integer", { defaultValue: "0" }), c("is_active", "boolean", { defaultValue: "true" }), created()] },
        { name: "orders", ...P(3), columns: [pk(), c("user_id", "integer", { required: true }), c("status", "enum", { enumValues: ["pending", "paid", "shipped", "cancelled"], defaultValue: "pending" }), c("total", "decimal", { length: "10,2" }), created()] },
        { name: "order_items", ...P(4), columns: [pk(), c("order_id", "integer", { required: true }), c("product_id", "integer", { required: true }), c("quantity", "integer", { required: true, defaultValue: "1" }), c("unit_price", "decimal", { length: "10,2" })] },
        { name: "payments", ...P(5), columns: [pk(), c("order_id", "integer", { required: true }), c("provider", "enum", { enumValues: ["stripe", "paypal", "zarinpal"] }), c("amount", "decimal", { length: "10,2", required: true }), c("paid_at", "datetime"), created()] },
      ],
      relations: [
        rel("products", "category_id", "categories"),
        rel("orders", "user_id", "users"),
        rel("order_items", "order_id", "orders"),
        rel("order_items", "product_id", "products"),
        rel("payments", "order_id", "orders", "1-1"),
      ],
    },
  },
  {
    id: "school",
    icon: "GraduationCap",
    color: "#0EA5E9",
    nameKey: "templates.school",
    descKey: "templates.schoolDesc",
    schema: {
      name: "School System",
      tables: [
        { name: "students", ...P(0), columns: [pk(), c("first_name", "string", { required: true }), c("last_name", "string", { required: true }), c("national_code", "string", { unique: true }), c("birth_date", "date"), c("enrolled_at", "date")] },
        { name: "teachers", ...P(1), columns: [pk(), c("full_name", "string", { required: true }), c("email", "string", { unique: true }), c("hire_date", "date")] },
        { name: "classes", ...P(2), columns: [pk(), c("name", "string", { required: true }), c("grade", "integer"), c("teacher_id", "integer", { required: true }), created()] },
        { name: "subjects", ...P(3), columns: [pk(), c("title", "string", { required: true }), c("weekly_hours", "integer", { defaultValue: "2" })] },
        { name: "enrollments", ...P(4), columns: [pk(), c("student_id", "integer", { required: true }), c("class_id", "integer", { required: true }), c("enrolled_at", "date", { defaultValue: "CURRENT_TIMESTAMP" })] },
        { name: "grades", ...P(5), columns: [pk(), c("enrollment_id", "integer", { required: true }), c("subject_id", "integer", { required: true }), c("score", "float"), c("term", "integer", { defaultValue: "1" })] },
      ],
      relations: [
        rel("classes", "teacher_id", "teachers"),
        rel("enrollments", "student_id", "students"),
        rel("enrollments", "class_id", "classes"),
        rel("grades", "enrollment_id", "enrollments"),
        rel("grades", "subject_id", "subjects"),
      ],
    },
  },
  {
    id: "crm",
    icon: "Briefcase",
    color: "#8B5CF6",
    nameKey: "templates.crm",
    descKey: "templates.crmDesc",
    schema: {
      name: "CRM",
      tables: [
        { name: "companies", ...P(0), columns: [pk(), c("name", "string", { required: true }), c("website"), c("industry"), c("size", "integer"), created()] },
        { name: "contacts", ...P(1), columns: [pk(), c("company_id", "integer"), c("first_name", "string", { required: true }), c("last_name"), c("email", "string", { unique: true }), c("phone"), created()] },
        { name: "deals", ...P(2), columns: [pk(), c("contact_id", "integer", { required: true }), c("title", "string", { required: true }), c("amount", "decimal", { length: "12,2" }), c("stage", "enum", { enumValues: ["lead", "qualified", "proposal", "won", "lost"], defaultValue: "lead" }), c("close_date", "date"), created()] },
        { name: "activities", ...P(3), columns: [pk(), c("deal_id", "integer"), c("contact_id", "integer"), c("type", "enum", { enumValues: ["call", "email", "meeting", "task"], defaultValue: "task" }), c("due_at", "datetime"), c("done", "boolean", { defaultValue: "false" })] },
        { name: "notes", ...P(4), columns: [pk(), c("contact_id", "integer", { required: true }), c("body", "text", { required: true }), created()] },
      ],
      relations: [
        rel("contacts", "company_id", "companies"),
        rel("deals", "contact_id", "contacts"),
        rel("activities", "deal_id", "deals"),
        rel("activities", "contact_id", "contacts"),
        rel("notes", "contact_id", "contacts"),
      ],
    },
  },
  {
    id: "banking",
    icon: "Landmark",
    color: "#F59E0B",
    nameKey: "templates.banking",
    descKey: "templates.bankingDesc",
    schema: {
      name: "Banking",
      tables: [
        { name: "customers", ...P(0), columns: [pk(), c("first_name", "string", { required: true }), c("last_name", "string", { required: true }), c("national_id", "string", { required: true, unique: true }), c("phone"), c("kyc_verified", "boolean", { defaultValue: "false" }), created()] },
        { name: "accounts", ...P(1), columns: [pk(), c("customer_id", "integer", { required: true }), c("account_no", "string", { required: true, unique: true }), c("type", "enum", { enumValues: ["checking", "savings", "credit"], defaultValue: "checking" }), c("balance", "decimal", { length: "16,2", defaultValue: "0" }), c("status", "enum", { enumValues: ["active", "frozen", "closed"], defaultValue: "active" }), created()] },
        { name: "transactions", ...P(2), columns: [pk("bigint"), c("account_id", "integer", { required: true }), c("kind", "enum", { enumValues: ["deposit", "withdraw", "transfer"], defaultValue: "deposit" }), c("amount", "decimal", { length: "16,2", required: true }), c("reference", "string", { unique: true }), created()] },
        { name: "cards", ...P(3), columns: [pk(), c("account_id", "integer", { required: true }), c("card_no", "string", { required: true, unique: true }), c("exp_date", "date"), c("is_active", "boolean", { defaultValue: "true" })] },
        { name: "loans", ...P(4), columns: [pk(), c("customer_id", "integer", { required: true }), c("principal", "decimal", { length: "16,2", required: true }), c("rate", "float"), c("term_months", "integer"), c("approved", "boolean", { defaultValue: "false" })] },
      ],
      relations: [
        rel("accounts", "customer_id", "customers"),
        rel("transactions", "account_id", "accounts"),
        rel("cards", "account_id", "accounts"),
        rel("loans", "customer_id", "customers"),
      ],
    },
  },
  {
    id: "blog",
    icon: "Newspaper",
    color: "#EC4899",
    nameKey: "templates.blog",
    descKey: "templates.blogDesc",
    schema: {
      name: "Blog",
      tables: [
        { name: "users", ...P(0), columns: [pk(), c("username", "string", { required: true, unique: true }), c("email", "string", { required: true, unique: true }), c("display_name"), created()] },
        { name: "categories", ...P(1), columns: [pk(), c("name", "string", { required: true }), c("slug", "string", { unique: true })] },
        { name: "posts", ...P(2), columns: [pk(), c("author_id", "integer", { required: true }), c("category_id", "integer"), c("title", "string", { required: true }), c("slug", "string", { unique: true }), c("body", "text"), c("status", "enum", { enumValues: ["draft", "published"], defaultValue: "draft" }), created(), updated()] },
        { name: "comments", ...P(3), columns: [pk(), c("post_id", "integer", { required: true }), c("user_id", "integer"), c("body", "text", { required: true }), created()] },
        { name: "tags", ...P(4), columns: [pk(), c("name", "string", { required: true, unique: true })] },
        { name: "post_tags", ...P(5), columns: [pk(), c("post_id", "integer", { required: true }), c("tag_id", "integer", { required: true })] },
      ],
      relations: [
        rel("posts", "author_id", "users"),
        rel("posts", "category_id", "categories"),
        rel("comments", "post_id", "posts"),
        rel("comments", "user_id", "users"),
        rel("post_tags", "post_id", "posts", "n-m"),
        rel("post_tags", "tag_id", "tags", "n-m"),
      ],
    },
  },
  {
    id: "social",
    icon: "Users",
    color: "#10B981",
    nameKey: "templates.social",
    descKey: "templates.socialDesc",
    schema: {
      name: "Social Network",
      tables: [
        { name: "users", ...P(0), columns: [pk(), c("username", "string", { required: true, unique: true }), c("email", "string", { required: true, unique: true }), c("bio", "text"), c("avatar_url"), created()] },
        { name: "posts", ...P(1), columns: [pk("bigint"), c("user_id", "integer", { required: true }), c("content", "text", { required: true }), c("media_url"), c("visibility", "enum", { enumValues: ["public", "followers", "private"], defaultValue: "public" }), created()] },
        { name: "follows", ...P(2), columns: [pk(), c("follower_id", "integer", { required: true }), c("following_id", "integer", { required: true }), created()] },
        { name: "likes", ...P(3), columns: [pk(), c("user_id", "integer", { required: true }), c("post_id", "integer", { required: true }), created()] },
        { name: "comments", ...P(4), columns: [pk(), c("post_id", "integer", { required: true }), c("user_id", "integer", { required: true }), c("body", "text", { required: true }), created()] },
        { name: "messages", ...P(5), columns: [pk("bigint"), c("sender_id", "integer", { required: true }), c("receiver_id", "integer", { required: true }), c("body", "text", { required: true }), c("read_at", "datetime"), created()] },
      ],
      relations: [
        rel("posts", "user_id", "users"),
        rel("follows", "follower_id", "users"),
        rel("follows", "following_id", "users"),
        rel("likes", "user_id", "users"),
        rel("likes", "post_id", "posts"),
        rel("comments", "post_id", "posts"),
        rel("comments", "user_id", "users"),
        rel("messages", "sender_id", "users"),
        rel("messages", "receiver_id", "users"),
      ],
    },
  },
  {
    id: "trading",
    icon: "TrendingUp",
    color: "#14B8A6",
    nameKey: "templates.trading",
    descKey: "templates.tradingDesc",
    schema: {
      name: "Trading Platform",
      tables: [
        { name: "users", ...P(0), columns: [pk(), c("email", "string", { required: true, unique: true }), c("full_name"), c("kyc_status", "enum", { enumValues: ["pending", "verified", "rejected"], defaultValue: "pending" }), created()] },
        { name: "wallets", ...P(1), columns: [pk(), c("user_id", "integer", { required: true }), c("currency", "string", { required: true }), c("balance", "decimal", { length: "20,8", defaultValue: "0" }), c("locked", "decimal", { length: "20,8", defaultValue: "0" })] },
        { name: "markets", ...P(2), columns: [pk(), c("symbol", "string", { required: true, unique: true }), c("base_asset", "string", { required: true }), c("quote_asset", "string", { required: true }), c("is_active", "boolean", { defaultValue: "true" })] },
        { name: "orders", ...P(3), columns: [pk("bigint"), c("user_id", "integer", { required: true }), c("market_id", "integer", { required: true }), c("side", "enum", { enumValues: ["buy", "sell"], defaultValue: "buy" }), c("type", "enum", { enumValues: ["limit", "market"], defaultValue: "limit" }), c("price", "decimal", { length: "20,8" }), c("quantity", "decimal", { length: "20,8", required: true }), c("status", "enum", { enumValues: ["open", "filled", "cancelled"], defaultValue: "open" }), created()] },
        { name: "trades", ...P(4), columns: [pk("bigint"), c("order_id", "integer", { required: true }), c("price", "decimal", { length: "20,8", required: true }), c("quantity", "decimal", { length: "20,8", required: true }), c("fee", "decimal", { length: "20,8", defaultValue: "0" }), created()] },
      ],
      relations: [
        rel("wallets", "user_id", "users"),
        rel("orders", "user_id", "users"),
        rel("orders", "market_id", "markets"),
        rel("trades", "order_id", "orders"),
      ],
    },
  },
];

export function getTemplate(id) {
  return TEMPLATES.find((t) => t.id === id) || null;
}
