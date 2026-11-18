import { fail, requireEngine, requireSchema, normalizeForEngine, runExport } from "../services/schema.service.js";

export function exportSchema(req, res, next) {
  try {
    res.json(runExport(req.body));
  } catch (err) {
    next(err);
  }
}

export { fail, requireEngine, requireSchema, normalizeForEngine };
