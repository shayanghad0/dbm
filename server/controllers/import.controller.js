import { runImport } from "../services/schema.service.js";

export function importSchema(req, res, next) {
  try {
    res.json(runImport(req.body));
  } catch (err) {
    next(err);
  }
}
