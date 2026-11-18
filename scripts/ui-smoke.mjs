/**
 * Real-browser UI smoke test — no extra npm dependencies.
 *
 * Launches headless Chrome/Edge with the DevTools protocol, drives the built
 * app through its main flows and asserts on real DOM state.
 *
 * Prerequisite: `npm run build` and the API/static server running on :4001
 * (or set UI_BASE / UI_CHROME).
 *
 * Run with: npm run test:ui
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BASE = process.env.UI_BASE || "http://localhost:4001";
const DEBUG_PORT = Number(process.env.UI_DEBUG_PORT || 9333);
const CHROME = process.env.UI_CHROME || findChrome();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const pageExceptions = [];
const pageConsoleErrors = [];

function findChrome() {
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  const found = candidates.find((p) => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  });
  if (!found) throw new Error("Chrome/Edge not found — set UI_CHROME to the executable path");
  return found;
}

async function waitHttp(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch {
      /* not up yet */
    }
    await sleep(150);
  }
  throw new Error(`DevTools endpoint did not come up at ${url}`);
}

class CDP {
  constructor(url) {
    this.url = url;
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Map();
  }

  async open() {
    this.ws = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", () => reject(new Error("CDP socket error")), { once: true });
    });
    this.ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method) {
        (this.listeners.get(msg.method) || []).forEach((fn) => fn(msg.params));
      }
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, fn) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(fn);
  }

  close() {
    try {
      this.ws.close();
    } catch {
      /* ignore */
    }
  }
}

const HELPERS = `(() => {
  const visible = (el) => !!el && (el.offsetParent !== null || el.getClientRects().length > 0);
  const pick = (nodes, text, exact) => {
    const list = nodes.filter(visible);
    return (exact ? list.find((n) => n.innerText.trim() === text) : null) || list.find((n) => n.innerText.trim().includes(text));
  };
  window.__ui = {
    visible,
    clickText(text) {
      const el = pick([...document.querySelectorAll('button, a, [role="button"], .spotlight-card')], text);
      if (!el) return false;
      el.click();
      return true;
    },
    clickInCard(cardText, buttonText) {
      const card = [...document.querySelectorAll('.spotlight-card')].filter(visible).find((c) => c.innerText.includes(cardText));
      if (!card) return false;
      const el = pick([...card.querySelectorAll('button')], buttonText, true) || pick([...card.querySelectorAll('button')], buttonText);
      if (!el) return false;
      el.click();
      return true;
    },
    clickDialog(text) {
      const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(visible);
      const dialog = dialogs[dialogs.length - 1];
      if (!dialog) return false;
      const el = pick([...dialog.querySelectorAll('button')], text, true) || pick([...dialog.querySelectorAll('button')], text);
      if (!el) return false;
      el.click();
      return true;
    },
    setValue(el, value) {
      if (!el) return false;
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    },
    commit(el) {
      if (!el) return false;
      el.focus();
      // React maps onBlur to focusout; dispatch it explicitly so the commit
      // works deterministically even when headless Chrome has no window focus.
      el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      el.blur?.();
      return true;
    },
    state() {
      try { return JSON.parse(localStorage.getItem('dbeb.project.v1') || 'null'); } catch { return null; }
    },
  };
  return true;
})()`;

async function main() {
  if (typeof WebSocket === "undefined") throw new Error("This test needs Node 22+ (global WebSocket)");

  const server = await fetch(BASE + "/api/health")
    .then((r) => r.json())
    .catch(() => null);
  if (!server?.ok) throw new Error(`API server not reachable at ${BASE} — run "npm start" first`);

  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "dbeb-ui-"));
  console.log(`Chrome: ${CHROME}`);
  console.log(`Profile: ${profile}\n`);

  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-sync",
      "--mute-audio",
      `--remote-debugging-port=${DEBUG_PORT}`,
      "--remote-debugging-address=127.0.0.1",
      `--user-data-dir=${profile}`,
      "--window-size=1360,920",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  let cdp;
  try {
    const targets = await waitHttp(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
    const page = targets.find((t) => t.type === "page");
    if (!page) throw new Error("No page target found");

    cdp = new CDP(page.webSocketDebuggerUrl);
    await cdp.open();
    cdp.on("Runtime.exceptionThrown", (p) => {
      pageExceptions.push(p.exceptionDetails?.exception?.description || p.exceptionDetails?.text || "unknown exception");
    });
    cdp.on("Runtime.consoleAPICalled", (p) => {
      if (p.type !== "error") return;
      const text = (p.args || []).map((a) => a.value ?? a.description ?? a.type).join(" ");
      if (!/favicon|Failed to load resource/i.test(text)) pageConsoleErrors.push(text);
    });

    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Log.enable");

    const js = async (expression) => {
      const res = await cdp.send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
        userGesture: true,
      });
      if (res.exceptionDetails) {
        throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text || "evaluate failed");
      }
      return res.result?.value;
    };

    const waitFor = async (expr, timeout = 7000, label = expr) => {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        try {
          const value = await js(expr);
          if (value) return value;
        } catch {
          /* context may be navigating */
        }
        await sleep(120);
      }
      throw new Error(`timeout waiting for ${label}`);
    };

    const installHelpers = async () => {
      await waitFor("document.readyState === 'complete'", 10000, "document ready");
      await js(HELPERS);
    };

    const open = async (hash) => {
      await cdp.send("Page.navigate", { url: `${BASE}/#/${hash}` });
      await installHelpers();
      await sleep(500);
    };

    const click = async (text) => {
      const ok = await js(`__ui.clickText(${JSON.stringify(text)})`);
      if (!ok) throw new Error(`no clickable element containing "${text}"`);
      await sleep(250);
    };

    const clickDialog = async (text) => {
      const ok = await js(`__ui.clickDialog(${JSON.stringify(text)})`);
      if (!ok) throw new Error(`dialog button "${text}" not found`);
      await sleep(300);
    };

    const state = () => js("__ui.state()");
    const must = (cond, message) => {
      if (!cond) throw new Error(message);
    };

    const check = async (name, fn) => {
      try {
        const detail = await fn();
        results.push({ name, ok: true, detail });
        console.log(`PASS ${name}${detail ? " — " + detail : ""}`);
      } catch (e) {
        results.push({ name, ok: false, error: e.message });
        console.log(`FAIL ${name} — ${e.message}`);
      }
    };

    /* ------------------------------------------------------------------ */
    /* 1. Home                                                             */
    /* ------------------------------------------------------------------ */
    await open("");
    await check("home renders all 13 engines", async () => {
      await waitFor("document.querySelectorAll('.spotlight-card').length >= 13", 8000, "engine cards");
      const info = await js(`({
        cards: document.querySelectorAll('.spotlight-card').length,
        dir: document.documentElement.dir,
        lang: document.documentElement.lang,
        text: document.body.innerText,
      })`);
      const names = ["MySQL", "PostgreSQL", "SQLite", "MariaDB", "SQL Server", "Oracle", "MongoDB", "Redis", "Firebase", "Supabase", "DynamoDB", "Cassandra", "Neo4j"];
      must(info.cards >= 13, `expected >= 13 cards, got ${info.cards}`);
      const missing = names.filter((n) => !info.text.includes(n));
      must(missing.length === 0, `missing engines: ${missing.join(", ")}`);
      must(info.dir === "ltr" && info.lang === "en", `expected ltr/en, got ${info.dir}/${info.lang}`);
      return `${info.cards} cards, 13 engine names, ltr`;
    });

    await check("theme toggle switches light/dark", async () => {
      const before = await js("document.documentElement.classList.contains('dark')");
      await js(`document.querySelector('[aria-label="Toggle theme"]').click()`);
      await sleep(200);
      const after = await js("document.documentElement.classList.contains('dark')");
      must(before !== after, "html.dark did not change");
      await js(`document.querySelector('[aria-label="Toggle theme"]').click()`);
      await sleep(150);
      return `${before ? "dark" : "light"} → ${after ? "dark" : "light"} → back`;
    });

    await check("language switch FA (RTL) and back to EN (LTR)", async () => {
      const ok = await js(`(() => { const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='فا'); if(!b) return false; b.click(); return true; })()`);
      must(ok, "FA button not found");
      await sleep(400);
      const fa = await js(`({ dir: document.documentElement.dir, lang: document.documentElement.lang, text: document.body.innerText })`);
      must(fa.dir === "rtl" && fa.lang === "fa", `expected rtl/fa, got ${fa.dir}/${fa.lang}`);
      must(/[\u0600-\u06FF]/.test(fa.text), "no Persian text rendered");
      const back = await js(`(() => { const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='EN'); if(!b) return false; b.click(); return true; })()`);
      must(back, "EN button not found");
      await sleep(400);
      const en = await js(`({ dir: document.documentElement.dir, lang: document.documentElement.lang })`);
      must(en.dir === "ltr" && en.lang === "en", `expected ltr/en, got ${en.dir}/${en.lang}`);
      return "fa/RTL renders Persian, en/LTR restores";
    });

    await check("dock appears on inner pages", async () => {
      await click("MySQL");
      await waitFor("location.hash === '#/builder'", 4000, "builder route");
      const dock = await js(`({ present: !!document.querySelector('nav[aria-label="Dock"]'), items: document.querySelectorAll('nav[aria-label="Dock"] button').length })`);
      must(dock.present && dock.items >= 7, `dock=${dock.present}, items=${dock.items}`);
      return `${dock.items} dock items`;
    });

    /* ------------------------------------------------------------------ */
    /* 2. Builder                                                          */
    /* ------------------------------------------------------------------ */
    await check("builder creates tables and columns", async () => {
      await click("Add first table");
      await waitFor("(() => { const s=__ui.state(); return !!s && s.tables.length === 1; })()", 8000, "first table saved");
      let s = await state();
      must(s.engine === "mysql", `engine ${s.engine}`);
      must(s.tables[0].columns.some((c) => c.primaryKey), "default id PK missing");

      // Rename first table to users
      await js(`__ui.setValue(document.querySelector('input[aria-label="Table name"]'), 'users')`);
      await sleep(300);
      await waitFor("(() => { const s=__ui.state(); return s && s.tables[0].name === 'users'; })()", 5000, "users rename");

      // Add a second table and rename it to orders
      await click("Add table");
      await waitFor("(() => { const s=__ui.state(); return s && s.tables.length === 2; })()", 5000, "second table");
      await js(`__ui.setValue(document.querySelector('input[aria-label="Table name"]'), 'orders')`);
      await sleep(300);
      await waitFor("(() => { const s=__ui.state(); return s && s.tables.some(t=>t.name==='orders'); })()", 5000, "orders rename");

      // Add a user_id column to orders
      await click("Add column");
      await sleep(400);
      const colNameLabel = await js("document.documentElement.lang === 'fa' ? 'نام ستون' : 'Column name'");
      await js(`__ui.setValue([...document.querySelectorAll('input[aria-label="${colNameLabel}"]')].pop(), 'user_id')`);
      await sleep(300);
      await js(`__ui.commit([...document.querySelectorAll('input[aria-label="${colNameLabel}"]')].pop())`);
      await waitFor(
        "(() => { const s=__ui.state(); const o=s&&s.tables.find(t=>t.name==='orders'); return !!o && o.columns.some(c=>c.name==='user_id'); })()",
        5000,
        "user_id column"
      );
      s = await state();
      const users = s.tables.find((t) => t.name === "users");
      const orders = s.tables.find((t) => t.name === "orders");
      must(users && orders, "renamed tables missing");
      must(orders.columns.length === 2, `orders has ${orders.columns.length} columns`);
      return `${s.tables.length} tables, user_id column committed`;
    });

    /* ------------------------------------------------------------------ */
    /* 3. Diagram                                                          */
    /* ------------------------------------------------------------------ */
    await check("diagram drags tables and creates a relationship", async () => {
      await js(`document.querySelector('nav[aria-label="Dock"] button[aria-label="Diagram"]').click()`);
      await waitFor("location.hash === '#/diagram' && document.querySelectorAll('[data-node]').length === 2", 6000, "diagram nodes");

      const before = await state();
      const usersBefore = before.tables.find((t) => t.name === "users");
      const rect = await js(`(() => {
        const node = [...document.querySelectorAll('[data-node]')].find(n => n.innerText.includes('users'));
        const header = node.querySelector('.cursor-grab');
        const r = header.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      })()`);
      await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: rect.x, y: rect.y, button: "left", clickCount: 1, buttons: 1 });
      await sleep(60);
      await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: rect.x + 130, y: rect.y + 70, button: "left", buttons: 1 });
      await sleep(60);
      await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: rect.x + 130, y: rect.y + 70, button: "left", clickCount: 1, buttons: 0 });
      const usersBeforeX = usersBefore.x;
      await waitFor(
        `(() => { const s=__ui.state(); const u=s&&s.tables.find(t=>t.name==='users'); return !!u && Math.abs(u.x-${usersBeforeX}) > 20; })()`,
        5000,
        "drag persisted"
      );
      const after = await state();
      const usersAfter = after.tables.find((t) => t.name === "users");
      must(
        Math.abs(usersAfter.x - usersBefore.x) > 20 || Math.abs(usersAfter.y - usersBefore.y) > 20,
        `table did not move (${usersBefore.x},${usersBefore.y}) → (${usersAfter.x},${usersAfter.y})`
      );

      // orders.user_id (right dot) → users.id (left dot)
      await js(`(() => {
        const n = [...document.querySelectorAll('[data-node]')].find(x => x.innerText.includes('orders'));
        const b = [...n.querySelectorAll('button[aria-label]')];
        b[b.length - 1].click();
        return b.length;
      })()`);
      await sleep(250);
      const pending = await js("document.body.innerText.includes('finish the relationship')");
      must(pending, "connection mode did not start");
      await js(`(() => {
        const n = [...document.querySelectorAll('[data-node]')].find(x => x.innerText.includes('users'));
        const b = [...n.querySelectorAll('button[aria-label]')];
        b[0].click();
        return b.length;
      })()`);
      await waitFor("!!document.querySelector('[role=dialog]')", 5000, "relation dialog");
      await clickDialog("Create");
      await waitFor("(() => { const s=__ui.state(); return s && s.relations.length === 1; })()", 6000, "relation saved");
      const s = await state();
      const rel = s.relations[0];
      const orders = s.tables.find((t) => t.name === "orders");
      const users = s.tables.find((t) => t.name === "users");
      must(rel.sourceTable === orders.id && rel.sourceColumn === orders.columns[1].id, "source is not orders.user_id");
      must(rel.targetTable === users.id && rel.targetColumn === users.columns[0].id, "target is not users.id");

      const zoomBefore = await js(`(() => { const el=[...document.querySelectorAll('span')].find(s=>/^\\d+%$/.test(s.innerText.trim())); return el ? el.innerText.trim() : null; })()`);
      await js(`document.querySelector('button[aria-label="Zoom in"]').click()`);
      await sleep(250);
      const zoomAfter = await js(`(() => { const el=[...document.querySelectorAll('span')].find(s=>/^\\d+%$/.test(s.innerText.trim())); return el ? el.innerText.trim() : null; })()`);
      must(zoomBefore && zoomAfter && zoomBefore !== zoomAfter, `zoom did not change (${zoomBefore} → ${zoomAfter})`);
      return `moved ${Math.round(usersAfter.x - usersBefore.x)}px, relation orders.user_id → users.id, zoom ${zoomBefore} → ${zoomAfter}`;
    });

    /* ------------------------------------------------------------------ */
    /* 4. Templates                                                        */
    /* ------------------------------------------------------------------ */
    await check("template preview + apply (with replace confirm)", async () => {
      await js(`document.querySelector('nav[aria-label="Dock"] button[aria-label="Templates"]').click()`);
      await waitFor("location.hash === '#/templates' && document.querySelectorAll('.spotlight-card').length === 7", 6000, "templates grid");
      const opened = await js(`__ui.clickInCard('Online Shop', 'Preview')`);
      must(opened, "Online Shop preview button not found");
      await waitFor("!!document.querySelector('[role=dialog]')", 5000, "preview modal");
      await clickDialog("Use template");
      await waitFor("!!document.querySelector('[role=dialog]')", 5000, "replace confirmation");
      await clickDialog("Use template");
      await waitFor("location.hash === '#/builder'", 6000, "builder after template");
      await waitFor("(() => { const s=__ui.state(); return s && s.tables.length >= 5; })()", 8000, "template schema");
      const s = await state();
      must(s.engine === "mysql", `engine ${s.engine}`);
      must(s.relations.length >= 5, `${s.relations.length} relations`);
      return `${s.tables.length} tables, ${s.relations.length} relations`;
    });

    /* ------------------------------------------------------------------ */
    /* 5. Import                                                           */
    /* ------------------------------------------------------------------ */
    await check("import SQL via paste + open in builder", async () => {
      await js(`document.querySelector('nav[aria-label="Dock"] button[aria-label="Import"]').click()`);
      await waitFor("location.hash === '#/import'", 5000, "import route");
      await click("Paste code");
      const sql = `CREATE TABLE customers (
  id INT PRIMARY KEY,
  email VARCHAR(190) NOT NULL
);
CREATE TABLE purchases (
  id INT PRIMARY KEY,
  customer_id INT NOT NULL,
  total DECIMAL(10,2),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);`;
      const set = await js(`__ui.setValue(document.querySelector('textarea'), ${JSON.stringify(sql)})`);
      must(set, "paste textarea not found");
      await sleep(250);
      await click("Parse schema");
      await waitFor("document.body.innerText.includes('Parsed successfully')", 8000, "parse result");
      await click("Open in builder");
      await waitFor("!!document.querySelector('[role=dialog]')", 5000, "replace confirmation");
      await clickDialog("Open in builder");
      await waitFor("location.hash === '#/builder'", 6000, "builder after import");
      await waitFor("(() => { const s=__ui.state(); return s && s.tables.length === 2; })()", 8000, "imported schema");
      const s = await state();
      const names = s.tables.map((t) => t.name).sort();
      must(names.join(",") === "customers,purchases", `tables ${names.join(",")}`);
      must(s.relations.length === 1, `${s.relations.length} relations`);
      must(s.relations[0].onDelete === "CASCADE", `onDelete ${s.relations[0].onDelete}`);
      return "2 tables, FK with ON DELETE CASCADE";
    });

    /* ------------------------------------------------------------------ */
    /* 6. Export                                                           */
    /* ------------------------------------------------------------------ */
    await check("export SQL / JSON / Markdown previews", async () => {
      await js(`document.querySelector('nav[aria-label="Dock"] button[aria-label="Export"]').click()`);
      await waitFor("location.hash === '#/export'", 5000, "export route");
      await waitFor("document.querySelector('pre')?.innerText.includes('CREATE TABLE')", 6000, "SQL preview");
      const sqlText = await js("document.querySelector('pre').innerText");
      must(sqlText.includes("customers") && sqlText.includes("REFERENCES"), "SQL preview missing tables/FK");

      await click("JSON schema");
      await waitFor("document.querySelector('pre')?.innerText.includes('\"tables\"')", 6000, "JSON preview");
      const jsonText = await js("document.querySelector('pre').innerText");
      must(jsonText.includes("customers"), "JSON preview missing customers");

      await click("Markdown docs");
      await waitFor("document.querySelector('pre')?.innerText.includes('#')", 6000, "Markdown preview");
      const mdText = await js("document.querySelector('pre').innerText");
      must(mdText.includes("customers") && mdText.includes("|"), "Markdown preview missing table");
      return `${sqlText.split("\\n").length} SQL lines, JSON + Markdown ok`;
    });

    /* ------------------------------------------------------------------ */
    /* 7. AI assistant                                                     */
    /* ------------------------------------------------------------------ */
    await check("AI generate + apply schema", async () => {
      await js(`document.querySelector('nav[aria-label="Dock"] button[aria-label="AI Assistant"]').click()`);
      await waitFor("location.hash === '#/ai'", 5000, "AI route");
      const example = await js(`(() => {
        const b = [...document.querySelectorAll('button')].find(x => x.innerText.includes('An online shop with customers'));
        if (!b) return false;
        b.click();
        return true;
      })()`);
      must(example, "AI example chip not found");
      await sleep(250);
      await click("Generate schema");
      await waitFor("document.body.innerText.includes('Suggested schema')", 12000, "AI result");
      const summary = await js("document.body.innerText");
      must(summary.includes("tables"), "AI result summary missing");
      await click("Use this schema");
      await waitFor("!!document.querySelector('[role=dialog]')", 5000, "AI replace confirmation");
      await clickDialog("Use this schema");
      await waitFor("location.hash === '#/builder'", 6000, "builder after AI");
      await waitFor("(() => { const s=__ui.state(); return s && s.tables.length >= 4; })()", 8000, "AI schema");
      const s = await state();
      return `${s.tables.length} tables, ${s.relations.length} relations`;
    });

    /* ------------------------------------------------------------------ */
    /* 8. Mobile menu                                                      */
    /* ------------------------------------------------------------------ */
    await check("mobile menu opens and closes", async () => {
      await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
      await sleep(400);
      const opened = await js(`(() => { const b=document.querySelector('header button[aria-label="Menu"]'); if(!b) return false; b.click(); return true; })()`);
      must(opened, "mobile menu button not found");
      await sleep(350);
      const menu = await js(`(() => {
        const panel = document.querySelector('header .w-72');
        if (!panel) return null;
        return [...panel.querySelectorAll('button')].map(b => b.getAttribute('aria-label') || b.innerText.trim());
      })()`);
      must(menu && menu.length >= 8, `menu items: ${menu ? menu.join(",") : "none"}`);
      const closed = await js(`(() => { const b=document.querySelector('header button[aria-label="Close"]'); if(!b) return false; b.click(); return true; })()`);
      must(closed, "close button not found");
      await sleep(300);
      const gone = await js("!document.querySelector('header .w-72')");
      must(gone, "menu did not close");
      await cdp.send("Emulation.clearDeviceMetricsOverride");
      return `${menu.length} menu buttons`;
    });

    /* ------------------------------------------------------------------ */
    /* 9. Persistence across reload                                        */
    /* ------------------------------------------------------------------ */
    await check("project survives a page reload", async () => {
      const before = await state();
      await cdp.send("Page.reload", { ignoreCache: true });
      await installHelpers();
      await sleep(700);
      const after = await state();
      must(after && after.tables.length === before.tables.length, `expected ${before.tables.length} tables, got ${after?.tables?.length}`);
      await cdp.send("Page.navigate", { url: `${BASE}/#/` });
      await installHelpers();
      await waitFor("document.querySelectorAll('.spotlight-card').length >= 13", 10000, "home page");
      const text = await js("document.body.innerText");
      must(text.includes("Continue"), "continue-project button missing after reload");
      return `${after.tables.length} tables restored`;
    });

    /* ------------------------------------------------------------------ */
    /* 10. Console health                                                  */
    /* ------------------------------------------------------------------ */
    await check("no uncaught page exceptions", async () => {
      must(pageExceptions.length === 0, pageExceptions.slice(0, 3).join(" | "));
      return "0 exceptions";
    });

    if (pageConsoleErrors.length) {
      console.log(`\nConsole errors captured (${pageConsoleErrors.length}): ${pageConsoleErrors.slice(0, 5).join(" | ")}`);
    }

    const failed = results.filter((r) => !r.ok);
    console.log(`\n==== ${results.length - failed.length}/${results.length} UI checks passed ====`);
    if (failed.length) {
      for (const f of failed) console.log(`  FAILED: ${f.name} — ${f.error}`);
      process.exitCode = 1;
    }
  } finally {
    cdp?.close();
    chrome.kill();
    await sleep(300);
    try {
      fs.rmSync(profile, { recursive: true, force: true });
    } catch {
      /* Chrome may still hold files — temp dir is safe to leave */
    }
  }
}

main().catch((e) => {
  console.error("\nUI smoke test crashed:", e.message);
  process.exitCode = 1;
});
