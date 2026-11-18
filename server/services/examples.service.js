import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXAMPLES_DIR = path.resolve(__dirname, "..", "..", "examples");
const MANIFEST_PATH = path.join(EXAMPLES_DIR, "manifest.json");

let cache = null;

/** Read and validate the examples manifest (id + filename only). */
export async function listExampleEntries() {
  if (cache) return cache;
  let manifest = { examples: [] };
  try {
    manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  } catch {
    cache = [];
    return cache;
  }
  cache = (Array.isArray(manifest.examples) ? manifest.examples : [])
    .filter((entry) => entry && typeof entry.id === "string" && typeof entry.filename === "string")
    .map((entry) => ({
      id: entry.id,
      filename: path.basename(entry.filename),
      title: entry.title || entry.filename,
      engine: entry.engine || null,
      format: entry.format || null,
      importable: entry.importable !== false,
    }));
  return cache;
}

/** Load one example file by id. */
export async function loadExample(id) {
  const entries = await listExampleEntries();
  const entry = entries.find((item) => item.id === id);
  if (!entry) return null;
  const content = await readFile(path.join(EXAMPLES_DIR, entry.filename), "utf8");
  return { ...entry, content };
}
