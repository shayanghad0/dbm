import { ENGINE_LIST, getEngine } from "../../src/database-engines/index.js";
import { TEMPLATES } from "../../src/templates/index.js";
import { listExampleEntries, loadExample } from "../services/examples.service.js";

export function health(req, res) {
  res.json({
    ok: true,
    name: "DB Easy Builder API",
    version: "1.0.0",
    engines: ENGINE_LIST.length,
    templates: TEMPLATES.length,
    time: new Date().toISOString(),
  });
}

export function engines(req, res) {
  res.json({
    engines: ENGINE_LIST.map(serializeEngine),
  });
}

export function templates(req, res) {
  res.json({
    templates: TEMPLATES.map((tpl) => ({
      id: tpl.id,
      nameKey: tpl.nameKey,
      descKey: tpl.descKey,
      name: tpl.schema.name,
      icon: tpl.icon,
      color: tpl.color,
      tables: tpl.schema.tables.length,
      relations: tpl.schema.relations.length,
    })),
  });
}

export async function listExamples(req, res, next) {
  try {
    const entries = await listExampleEntries();
    res.json({
      examples: entries
        .filter((entry) => entry.importable !== false)
        .map(({ id, filename, title, engine, format }) => ({ id, filename, title, engine, format })),
    });
  } catch (err) {
    next(err);
  }
}

export async function readExample(req, res, next) {
  try {
    const data = await loadExample(req.params.id);
    if (!data) {
      const err = new Error("Example not found");
      err.status = 404;
      err.code = "NOT_FOUND";
      throw err;
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
}

function serializeEngine(engine) {
  return {
    id: engine.id,
    family: engine.family,
    label: engine.label,
    desc: engine.desc,
    descFa: engine.descFa,
    color: engine.color,
    ext: engine.ext,
    defaultType: engine.defaultType,
    terms: engine.terms,
    supports: engine.supports,
    types: engine.types,
    aliases: engine.aliases,
    validate: undefined,
  };
}

export function engineOrThrow(id) {
  const engine = getEngine(id);
  if (!engine) {
    const err = new Error(`Unknown engine "${id}"`);
    err.status = 400;
    err.code = "UNKNOWN_ENGINE";
    throw err;
  }
  return engine;
}
