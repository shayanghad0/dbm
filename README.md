# DB Easy Builder

A visual, no-SQL-required database designer with a Canva/Figma-like editing experience. Pick one of **13 database engines**, sketch tables and relationships on a canvas, import existing schemas, and export production-ready files for the engine of your choice.

Built with **Node.js + Express + React (plain JavaScript/JSX)** — no TypeScript, no Next.js, no Docker.

---

## Highlights

- **13 engines** — MySQL, PostgreSQL, SQLite, MariaDB, SQL Server, Oracle, Supabase, MongoDB, Redis, Firebase, DynamoDB, Cassandra, Neo4j.
- **Spreadsheet-style table editor** — add/delete/rename/duplicate tables, add/delete/duplicate columns, primary keys, foreign keys, defaults, enum values, required/unique/auto-increment flags, per-column notes.
- **Draggable relationship diagram** — connect columns by dragging dots, pan/zoom canvas, edit/delete relations, live cardinality display.
- **Import** — SQL (`CREATE TABLE`, `ALTER TABLE`, dialect quoting, `GO`, inline/table-level FKs), JSON schema, Prisma models. Imports stay fully editable.
- **Export** — SQL DDL, JSON, Prisma, Markdown docs, plus native generators (mongosh, Redis, CQL, Cypher, DynamoDB JS, Firebase rules, Supabase SQL).
- **7 starter templates** — online shop, school system, CRM, banking, blog, social network, trading platform.
- **AI assistant** — describe a schema in natural language; works offline with a deterministic local generator and can call any OpenAI-compatible model when configured.
- **Bilingual UI** — English and Persian (فارسی) with full RTL/LTR switching. All UI text lives in `src/locales/en.json` and `src/locales/fa.json`.
- **Dark/light theme**, macOS-style dock, spotlight cards, background paths hero, mobile navigation, autosave + undo/redo.
- **Local-first** — schema export/import and AI fallback work entirely in the browser; the server is optional for those flows.

---

## Requirements

- **Node.js 20+** (developed and tested on Node 24)
- **npm 10+**
- For `npm run test:ui`: **Node 22+** (uses the global `WebSocket`) and Chrome or Edge installed.

No database server or credentials are needed. DB Easy Builder is a schema designer/generator — it does not connect to live databases.

---

## Quick start

```bash
npm install

# Development: Express API on :4001 + Vite dev server on :5173
npm run dev
# open http://localhost:5173
```

Production-style run (single server serves the built client):

```bash
npm run build
npm start
# open http://localhost:4001
```

Or do both in one command:

```bash
npm run serve
```

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Runs API (`server/index.js`) and Vite dev server concurrently |
| `npm run dev:client` | Vite dev server only (`:5173`) |
| `npm run dev:server` | Express API only (`:4001`) |
| `npm run build` | Builds the client into `dist/` |
| `npm start` | Starts the Express server (serves `dist/` if present) |
| `npm run serve` | `build` followed by `start` |
| `npm test` | Build-time engine/generator/parser suite (125 checks) |
| `npm run test:locales` | Verifies every `t()` key exists in EN + FA and both dictionaries are in parity |
| `npm run test:ui` | Real headless-browser UI suite (13 checks). Needs `npm run build` and a server on `:4001` |

---

## Project structure

```text
dbm/
├── index.html
├── vite.config.js            # Vite + /api proxy → :4001
├── tailwind.config.js
├── postcss.config.js
├── package.json
├── examples/                 # Example databases + exported files
├── scripts/
│   ├── smoke-test.mjs        # Engine/generator/parser tests
│   ├── check-locales.mjs     # Locale key audit
│   └── ui-smoke.mjs          # Headless Chrome/CDP UI test
├── server/
│   ├── index.js              # Express entry, static dist + SPA fallback
│   ├── routes/               # /api route table
│   ├── controllers/          # HTTP handlers (meta, import, export, ai)
│   └── services/             # Schema service + example file loader
└── src/
    ├── components/
    │   ├── layout/           # Topbar
    │   ├── ui/               # Buttons, modal, select, dock, toast, ...
    │   ├── engine-icon.jsx
    │   └── language-switcher.jsx
    ├── features/
    │   ├── welcome/          # Engine picker + recent projects
    │   ├── builder/          # Table editor, context, reducer, relation editor
    │   ├── diagram/          # Canvas, table nodes, relation layer
    │   ├── import/
    │   ├── export/
    │   ├── templates/
    │   └── ai/               # AI client, prompt builder, local stub
    ├── database-engines/
    │   ├── base.js           # makeEngine, T(), baseValidate
    │   ├── index.js          # Engine registry
    │   ├── sql/              # mysql, postgresql, sqlite, mariadb, mssql, oracle, supabase
    │   └── nosql/            # mongodb, redis, firebase, dynamodb, cassandra, neo4j
    ├── generators/           # sql, json, prisma, markdown + dispatcher
    ├── parsers/              # sql, json, prisma + format detection
    ├── templates/            # 7 starter schemas
    ├── schema/model.js       # Canonical schema model + normalizeSchema
    ├── locales/              # en.json, fa.json
    ├── lib/                  # i18n, theme, hash router, storage, utils
    ├── styles/globals.css
    ├── App.jsx
    └── main.jsx
```

---

## How it works

The app keeps one **canonical, engine-agnostic schema** in memory, persists it to `localStorage`, and adapts it at the edges:

```text
                   ┌────────────────────────────────────────┐
  Welcome / import │        Canonical schema model          │  Builder / Diagram
  Templates / AI  ─┤ tables · columns · relations · layout ├─ UI editing
                   └───────────────┬────────────────────────┘
                                   │ normalizeSchema(schema, engine)
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
              Engine adapter   Generators      Parsers
              types/validate   sql/json/...    sql/json/prisma
```

A schema looks like this:

```json
{
  "id": "db_...",
  "name": "Blog",
  "engine": "postgresql",
  "tables": [
    {
      "id": "tbl_...",
      "name": "posts",
      "note": "",
      "x": 60,
      "y": 60,
      "columns": [
        {
          "id": "col_...",
          "name": "id",
          "type": "integer",
          "length": "",
          "required": true,
          "primaryKey": true,
          "unique": false,
          "autoIncrement": true,
          "defaultValue": "",
          "enumValues": [],
          "note": ""
        }
      ]
    }
  ],
  "relations": [
    {
      "id": "rel_...",
      "sourceTable": "tbl_...",
      "sourceColumn": "col_...",
      "targetTable": "tbl_...",
      "targetColumn": "col_...",
      "type": "1-n",
      "onDelete": "CASCADE",
      "onUpdate": "NO ACTION"
    }
  ]
}
```

`normalizeSchema()` attaches missing ids, resolves name-based relations from imports/templates, runs optional auto-layout, and calls an engine-specific `normalize()` hook when present (used by DynamoDB for partition keys).

### Logical column types

Adapters map logical types to native ones. The complete set used by the 13 engines:

`string`, `text`, `enum`, `integer`, `bigint`, `float`, `decimal`, `boolean`, `date`, `time`, `datetime`, `json`, `uuid`, `blob`, `objectId`, `object`, `array`, `list`, `set`, `map`, `counter`, `hash`, `sortedSet`, `stream`, `reference`, `geopoint`, `point`, `timeuuid`, `stringSet`, `numberSet`, `binarySet`.

The builder only offers types valid for the selected engine.

---

## Supported engines and export formats

| Engine | Family | Default export | Also available |
| --- | --- | --- | --- |
| MySQL | SQL | `sql` | `json`, `prisma`, `markdown` |
| PostgreSQL | SQL | `sql` | `json`, `prisma`, `markdown` |
| SQLite | SQL | `sql` | `json`, `prisma`, `markdown` |
| MariaDB | SQL | `sql` | `json`, `prisma`, `markdown` |
| SQL Server | SQL | `sql` | `json`, `prisma`, `markdown` |
| Oracle | SQL | `sql` | `json`, `markdown` (no Prisma) |
| Supabase | SQL | `sql` | `engine` (Supabase SQL), `json`, `prisma`, `markdown` |
| MongoDB | NoSQL | `engine` (mongosh `.js`) | `json`, `prisma`, `markdown` |
| Redis | NoSQL | `engine` (`.redis`) | `json`, `markdown` |
| Firebase | NoSQL | `engine` (JSON rules/config) | `json`, `markdown` |
| DynamoDB | NoSQL | `engine` (JS `.js`) | `json`, `markdown` |
| Cassandra | NoSQL | `engine` (`.cql`) | `json`, `markdown` |
| Neo4j | NoSQL | `engine` (`.cypher`) | `json`, `markdown` |

Export-specific behaviors worth knowing:

- **MySQL/MariaDB** emit `CREATE DATABASE` (quoted) and `USE`.
- **SQL Server** emits `IF DB_ID(...) IS NULL`, `GO` batch separators and `USE`.
- **PostgreSQL/SQLite/Supabase** emit inline `REFERENCES` for single-column FKs.
- Foreign-key indexes are emitted after tables for SQL engines.
- **Oracle** intentionally has no Prisma generator.
- JSON export is a stable, self-describing schema and is the recommended interchange format.

### Import

Supported import formats: **SQL**, **JSON**, **Prisma**. Format is detected from the filename extension, then from content.

The SQL parser understands:

- `CREATE TABLE` with quoted/unquoted identifiers: `` `col` ``, `"col"`, `[col]`.
- Inline FKs and table-level `FOREIGN KEY (...) REFERENCES ...`.
- `ALTER TABLE ... ADD CONSTRAINT ... FOREIGN KEY ...`.
- `ON DELETE` / `ON UPDATE` actions (CASCADE, SET NULL, SET DEFAULT, RESTRICT, NO ACTION).
- `CREATE DATABASE` / `CREATE SCHEMA` (including `IF NOT EXISTS` and T-SQL `IF ... CREATE DATABASE`).
- T-SQL `GO` batch separators.
- Common dialect types (`AUTO_INCREMENT`, `SERIAL`, `IDENTITY`, `AUTOINCREMENT`, `VARCHAR2`, `NVARCHAR`, `CLOB`, etc.).
- Multi-word types such as `double precision`, `timestamp with time zone`.

Native NoSQL scripts (mongosh, CQL, Cypher, .redis) are export-only; import them as JSON if you need to round-trip.

---

## Starter templates

| Template | Tables |
| --- | --- |
| Online Shop | users, categories, products, orders, order_items, payments |
| School System | students, teachers, classes, subjects, enrollments, grades |
| CRM | companies, contacts, deals, activities, notes |
| Banking | customers, accounts, transactions, cards, loans |
| Blog | users, categories, posts, comments, tags, post_tags |
| Social Network | users, posts, follows, likes, comments, messages |
| Trading Platform | users, wallets, markets, orders, trades |

Templates are authored with logical types and name-based relations, so they apply cleanly to any engine. Applying a template or importing a schema asks for confirmation before replacing the current project.

---

## AI assistant

The AI page turns a natural-language description into a schema, shows a plan, then lets you apply it to the builder.

Two execution modes:

1. **No API key (default)** — the server uses `src/features/ai/stubGenerator.js`, a deterministic local generator. It matches common domains (shop, school, CRM, banking, blog, social, trading) and falls back to a sensible generic schema. It works offline and is what the test suite exercises.
2. **Model mode** — set an OpenAI-compatible API key and the server asks the model for JSON, normalizes it for the selected engine, and returns the same response contract.

Environment variables for the server:

| Variable | Default | Purpose |
| --- | --- | --- |
| `AI_API_KEY` | — | Enables model mode |
| `AI_MODEL` | `gpt-4o-mini` | Chat-completions model ID |
| `AI_BASE_URL` | `https://api.openai.com/v1` | Any OpenAI-compatible base URL |

Example (PowerShell):

```powershell
$env:AI_API_KEY = "sk-..."
npm start
```

If the API is unreachable from a static deployment, the browser falls back to the same local stub, so the feature never hard-fails.

To connect a different model provider, keep the response contract `{ schema, plan, source }` and update `server/controllers/ai.controller.js` / `src/features/ai/promptBuilder.js`.

---

## HTTP API

Base URL in development: `http://localhost:4001`. The Vite dev server proxies `/api` to it, so the browser can always call relative URLs.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Status, version, engine/template counts |
| `GET` | `/api/engines` | Metadata for all 13 engines (labels, types, terms, supports) |
| `GET` | `/api/templates` | Template summaries |
| `GET` | `/api/examples` | Importable example files |
| `GET` | `/api/examples/:id` | Example metadata + content |
| `POST` | `/api/export` | Generate an export from a schema |
| `POST` | `/api/import` | Parse SQL / JSON / Prisma |
| `POST` | `/api/ai/generate` | Generate a schema from a prompt |

### `POST /api/export`

```json
{
  "engine": "postgresql",
  "format": "sql",
  "schema": {
    "name": "Blog",
    "tables": [
      {
        "name": "posts",
        "columns": [
          { "name": "id", "type": "integer", "primaryKey": true, "required": true, "autoIncrement": true },
          { "name": "title", "type": "string", "length": "190", "required": true }
        ]
      }
    ],
    "relations": []
  }
}
```

Response:

```json
{
  "engine": "postgresql",
  "format": "sql",
  "filename": "blog-schema.sql",
  "mime": "text/plain",
  "content": "-- PostgreSQL schema ...",
  "issues": []
}
```

Errors: `400 UNKNOWN_ENGINE`, `400 INVALID_SCHEMA`, `400 UNSUPPORTED_FORMAT`, `422 EXPORT_FAILED`.

### `POST /api/import`

```json
{
  "content": "CREATE TABLE users (id INT PRIMARY KEY, email VARCHAR(190) NOT NULL);",
  "format": "sql"
}
```

`format` is optional when the content/`filename` is recognizable.

Response:

```json
{
  "name": "",
  "engineHint": null,
  "tables": [{ "name": "users", "columns": [{ "name": "id", "type": "integer", "primaryKey": true }] }],
  "relations": [],
  "format": "sql",
  "summary": { "tables": 1, "columns": 2, "relations": 0 }
}
```

Errors: `400 EMPTY_CONTENT`, `400 UNKNOWN_FORMAT`, `422 PARSE_FAILED`, `422 NO_TABLES`.

### `POST /api/ai/generate`

```json
{
  "prompt": "An online shop with customers, orders, products and payments",
  "engineId": "mysql",
  "schema": null
}
```

Response:

```json
{
  "source": "stub",
  "schema": { "name": "...", "engine": "mysql", "tables": [], "relations": [] },
  "plan": [{ "key": "ai.plan.parsedRequest" }],
  "issues": []
}
```

`source` is `"stub"` or `"model"`. `issues` uses the same validation shape as the UI.

### Example requests

```bash
curl http://localhost:4001/api/health
curl http://localhost:4001/api/engines
curl http://localhost:4001/api/examples/blog-prisma

curl.exe -X POST http://localhost:4001/api/import \
  -H "Content-Type: application/json" \
  -d '{"content":"CREATE TABLE users (id INT PRIMARY KEY, email VARCHAR(190));","format":"sql"}'
```

---

## Example files

`examples/` contains ready-to-import schemas and reference exports:

| File | Format | Importable |
| --- | --- | --- |
| `online-shop.mysql.sql` | MySQL DDL | ✅ |
| `online-shop.postgresql.sql` | PostgreSQL DDL | ✅ |
| `school.sqlite.sql` | SQLite DDL | ✅ |
| `blog.prisma` | Prisma models | ✅ |
| `crm.json` | JSON schema | ✅ |
| `online-shop.md` | Markdown docs | — |
| `online-shop.mongodb.js` | mongosh script | — |

`examples/manifest.json` is the source of truth for the examples list and the importable flag.

---

## Localization

Every user-facing string is keyed through `t()` and stored in:

- `src/locales/en.json`
- `src/locales/fa.json`

`npm run test:locales` fails if a static or dynamic key used in `src/` is missing from either dictionary, or if the two files have different key sets.

Adding a language:

1. Add the dictionary under `src/locales/`.
2. Register it in `src/lib/i18n.jsx` (`DICTS`).
3. Add the switcher option in `src/components/language-switcher.jsx`.
4. Extend `scripts/check-locales.mjs` to check the new dictionary.
5. For RTL languages, extend the `dir` logic in `src/lib/i18n.jsx`.

---

## Persistence

| Key | Contents |
| --- | --- |
| `dbeb.project.v1` | Current schema (autosaved, debounced 600 ms) |
| `dbeb.recents.v1` | Recent projects shown on the home page |
| `dbeb.lang` | `en` or `fa` |
| `dbeb.theme` | `light` or `dark` |

Local storage is the only persistence layer; there is no account, database, or telemetry.

---

## Tests

```bash
# Fast, no browser: 125 checks
npm test

# Locale audit
npm run test:locales

# Real browser (rebuild + server first)
npm run build
npm start            # in one terminal (port 4001)
npm run test:ui      # in another
```

`npm test` covers:

- Every template against every engine (13 engines × 7 templates).
- JSON export → import round trips for all engines.
- SQL export → import round trips for SQL engines.
- Prisma export → import round trips where supported.
- Native generator determinism and non-empty output.
- Engine validation behavior, including DynamoDB partition/sort keys.

`npm run test:ui` launches headless Chrome/Edge through the DevTools protocol with no extra npm dependencies and verifies:

1. Home renders all 13 engines.
2. Theme toggle.
3. FA/RTL ↔ EN/LTR switching.
4. Dock on inner pages.
5. Table + column editing with commit.
6. Diagram drag, relationship creation, zoom.
7. Template preview + apply with replace confirmation.
8. SQL paste import with `ON DELETE CASCADE`.
9. Export previews (SQL, JSON, Markdown).
10. AI generate + apply.
11. Mobile menu open/close.
12. Reload persistence.
13. Zero uncaught page exceptions.

Environment overrides:

| Variable | Meaning |
| --- | --- |
| `UI_BASE` | App URL (default `http://localhost:4001`) |
| `UI_CHROME` | Chrome/Edge executable path |
| `UI_DEBUG_PORT` | CDP port (default `9333`) |

---

## Adding a new engine

1. Create `src/database-engines/<family>/<id>.js`:

```js
import { makeEngine, T, baseValidate } from "../base.js";

export default makeEngine({
  id: "mydb",
  family: "sql",                 // "sql" | "nosql"
  label: "MyDB",
  desc: "Short description",
  descFa: "توضیح کوتاه",
  color: "#22C55E",
  ext: "sql",
  defaultType: "string",
  terms: { table: "Table", column: "Column", pk: "Primary Key" },
  types: [
    T("string", "VARCHAR", { length: "chars", group: "text" }),
    T("integer", "INT", { group: "numbers" }),
  ],
  aliases: { varchar: "string", int: "integer" },
  validate(schema) {
    return baseValidate(schema, this);
  },
  // optional native generator used by the "engine" export format
  generate(schema) {
    return "-- native output";
  },
});
```

2. Register it in `src/database-engines/index.js` (`import` + `ENGINES` entry).
3. Add locale keys if the engine copy is shown in the UI.
4. Add round-trip cases to `scripts/smoke-test.mjs`.
5. Run `npm test`, `npm run test:locales`, `npm run build`, `npm run test:ui`.

If the engine needs structural schema adjustments (like DynamoDB partition keys), export a `normalize(schema)` function from the adapter — `normalizeSchema()` calls it automatically.

## Adding a new template

1. Add a template object to `src/templates/index.js` using logical types and name-based relations.
2. Add `templates.<id>` and `templates.<id>Desc` keys to both locale files.
3. The template grid, export/import flow and tests pick it up automatically.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Port 4001 already in use` | Stop the other process or run with `PORT=4002` (proxy target in `vite.config.js` must match). |
| `npm start` shows a directory/404 | Run `npm run build` first, or use `npm run serve`. |
| UI test says API not reachable | Start the server on `:4001` (`npm start`) and rebuild after source changes. |
| UI test cannot find Chrome | Set `UI_CHROME` to `chrome.exe` / `msedge.exe` / the browser binary. |
| AI fails or is slow | It falls back to the local stub automatically; check `AI_API_KEY`, `AI_MODEL`, `AI_BASE_URL`. |
| Import says unknown format | Send an explicit `format` (`sql`, `json`, `prisma`) or include a recognized filename/extension. |
| Persian text renders LTR | Ensure `<html dir>` is set by the i18n provider (the app does this automatically; custom embeds must not override it). |

---

## Design system

The UI follows the guidelines in `prompt/ui-master.md`:

- macOS-style glass dock with hover magnification.
- Expandable tabs and segmented family filters.
- Spotlight glow cards (cursor-tracked radial highlight).
- Interactive hover/shine buttons.
- Animated background-paths hero with SVG.
- SVG icon set via `lucide-react`.
- Responsive layouts with a dedicated mobile menu.
- FA/EN switcher with full RTL/LTR support.
- Dark/light theme toggle with persisted preference.
- CSS-variable design tokens in `src/styles/globals.css` and Tailwind config.

---

## Notes and limitations

- This is a **designer/generator**, not a database client — no live connections, migrations, or execution.
- Native NoSQL export formats are one-way by design; use JSON for round trips.
- Imported SQL is normalized into logical types, so dialect-specific options that have no logical equivalent (tablespaces, storage engines, collations, partitioning) are not preserved.
- `npm audit` currently reports 12 advisories from the dev toolchain; they do not affect runtime behavior of the built app. Review before production deployment.
