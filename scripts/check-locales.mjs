/** Audit: every t("a.b") literal in src has a matching key in en.json and fa.json. */
import fs from "fs";
import path from "path";

const SRC = "src";
const locales = {
  en: JSON.parse(fs.readFileSync("src/locales/en.json", "utf8")),
  fa: JSON.parse(fs.readFileSync("src/locales/fa.json", "utf8")),
};

const flatten = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? flatten(v, prefix + k + ".") : [prefix + k]
  );

const keys = {
  en: new Set(flatten(locales.en)),
  fa: new Set(flatten(locales.fa)),
};

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (/\.(jsx?|mjs)$/.test(entry.name)) files.push(p);
  }
})(SRC);

const used = new Map(); // key -> [files]
const re = /\bt\(\s*["'`]([A-Za-z0-9_.-]+)["'`]/g;
const dynRe = /\bt\(\s*`([^`]*\$\{[^`]*)`/g;

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  for (const m of text.matchAll(re)) {
    const key = m[1];
    if (!used.has(key)) used.set(key, new Set());
    used.get(key).add(file);
  }
  for (const m of text.matchAll(dynRe)) {
    const key = m[1];
    if (!used.has(key)) used.set(key, new Set());
    used.get(key).add(file + " (dynamic)");
  }
}

let problems = 0;

const dynamicKeys = [...used.keys()].filter((k) => k.includes("${"));
const staticKeys = [...used.keys()].filter((k) => !k.includes("${"));

for (const key of staticKeys) {
  for (const lang of ["en", "fa"]) {
    if (!keys[lang].has(key)) {
      problems++;
      console.log(`MISSING ${lang}: ${key}  ← ${[...used.get(key)].join(", ")}`);
    }
  }
}

for (const key of dynamicKeys) {
  // Validate the static prefix resolves to an object, e.g. export.formats.
  const prefix = key.slice(0, key.indexOf("${")).replace(/\.$/, "");
  const ok = (obj) => {
    let cur = obj;
    for (const part of prefix.split(".").filter(Boolean)) {
      if (cur == null) return false;
      cur = cur[part];
    }
    return cur != null;
  };
  if (!ok(locales.en) || !ok(locales.fa)) {
    problems++;
    console.log(`MISSING dynamic prefix: ${prefix}  ← ${[...used.get(key)].join(", ")}`);
  } else {
    console.log(`dynamic ok: ${key}`);
  }
}

// Unused keys (informational)
const unused = [...keys.en].filter((k) => !used.has(k));
console.log(`\n${staticKeys.length} static keys used, ${unused.length} unused keys in en.json`);
if (unused.length) console.log("unused:", unused.join(", "));

// Key parity between en and fa
const onlyEn = [...keys.en].filter((k) => !keys.fa.has(k));
const onlyFa = [...keys.fa].filter((k) => !keys.en.has(k));
if (onlyEn.length) { problems++; console.log("\nOnly in en:", onlyEn.join(", ")); }
if (onlyFa.length) { problems++; console.log("\nOnly in fa:", onlyFa.join(", ")); }

console.log(problems ? `\n${problems} problem(s)` : "\nAll locale keys resolve in both languages");
process.exitCode = problems ? 1 : 0;
