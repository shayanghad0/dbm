import { Router } from "express";
import { health, engines, templates, listExamples, readExample } from "../controllers/meta.controller.js";
import { exportSchema } from "../controllers/export.controller.js";
import { importSchema } from "../controllers/import.controller.js";
import { generate } from "../controllers/ai.controller.js";

const router = Router();

router.get("/health", health);
router.get("/engines", engines);
router.get("/templates", templates);
router.get("/examples", listExamples);
router.get("/examples/:id", readExample);

router.post("/export", exportSchema);
router.post("/import", importSchema);
router.post("/ai/generate", generate);

export default router;
