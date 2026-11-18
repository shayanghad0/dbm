/** Local persistence: autosave project + recent projects */

const PROJECT_KEY = "dbeb.project.v1";
const RECENTS_KEY = "dbeb.recents.v1";
const MAX_RECENTS = 6;

export function loadProject() {
  try {
    const raw = localStorage.getItem(PROJECT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.engine) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function saveProject(schema) {
  try {
    localStorage.setItem(PROJECT_KEY, JSON.stringify(schema));
  } catch {
    /* storage full — ignore */
  }
}

export function clearProject() {
  try {
    localStorage.removeItem(PROJECT_KEY);
  } catch {
    /* ignore */
  }
}

export function loadRecents() {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Store a full schema snapshot as a recent project */
export function pushRecent(schema) {
  const entry = {
    id: schema.id,
    name: schema.name || "",
    engine: schema.engine,
    updatedAt: Date.now(),
    tables: (schema.tables || []).length,
    schema,
  };
  const list = [entry, ...loadRecents().filter((r) => r.id !== schema.id)].slice(0, MAX_RECENTS);
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
  return list;
}

export function removeRecent(id) {
  const list = loadRecents().filter((r) => r.id !== id);
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
  return list;
}
