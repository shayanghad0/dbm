import { stubGenerate } from "../../src/features/ai/stubGenerator.js";
import { buildPrompt } from "../../src/features/ai/promptBuilder.js";
import { fail, requireEngine, requireSchema, normalizeForEngine } from "../services/schema.service.js";

/**
 * POST /api/ai/generate
 * body: { prompt, engineId, schema? }
 *
 * Without AI_API_KEY: deterministic local generator (same contract).
 * With AI_API_KEY: OpenAI-compatible chat completion that must return JSON.
 * Env: AI_API_KEY, AI_MODEL (default gpt-4o-mini), AI_BASE_URL (default api.openai.com/v1)
 */
export async function generate(req, res, next) {
  try {
    const body = req.body || {};
    const prompt = String(body.prompt || "").trim();
    if (!prompt) fail("A prompt is required", "EMPTY_PROMPT");

    const engine = requireEngine(body.engineId || body.engine || "mysql");
    const existing = body.schema ? requireSchema(body.schema) : null;

    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
      return res.json(stubResponse({ prompt, engine, existing }));
    }

    try {
      const result = await callModel({ prompt, engine, schema: existing, apiKey });
      const schema = normalizeForEngine(result, engine);
      return res.json({
        source: "model",
        schema,
        plan: [
          { key: "ai.plan.parsedRequest" },
          { key: "ai.plan.tablesCreated", params: { count: schema.tables.length } },
          { key: "ai.plan.relationsAdded", params: { count: schema.relations.length } },
          { key: "ai.plan.review" },
        ],
        issues: engine.validate(schema),
      });
    } catch (err) {
      console.warn(`AI model call failed, using local generator: ${err.message}`);
      return res.json(stubResponse({ prompt, engine, existing }));
    }
  } catch (err) {
    next(err);
  }
}

function stubResponse({ prompt, engine }) {
  const stub = stubGenerate({ prompt, engineId: engine.id });
  const schema = normalizeForEngine(stub.schema, engine);
  return { ...stub, schema, issues: engine.validate(schema) };
}

async function callModel({ prompt, engine, schema, apiKey }) {
  const base = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = process.env.AI_MODEL || "gpt-4o-mini";
  const context = buildPrompt({ prompt, engineId: engine.id, schema });

  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: context.system },
        { role: "user", content: context.user },
      ],
    }),
    signal: AbortSignal.timeout(35000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Model returned ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("Model returned an empty response");

  const parsed = parseJsonBlock(text);
  if (!parsed || !Array.isArray(parsed.tables) || parsed.tables.length === 0) {
    throw new Error("Model returned an invalid schema");
  }
  return sanitizeModelSchema(parsed);
}

/** Accept raw JSON or a ```json fenced block. */
function parseJsonBlock(text) {
  const raw = String(text).trim();
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (!match) return null;
    try {
      return JSON.parse(match[1].trim());
    } catch {
      return null;
    }
  }
}

/** Keep the model response within sane, safe limits before normalization. */
function sanitizeModelSchema(raw) {
  const tables = (raw.tables || [])
    .slice(0, 40)
    .map((t) => ({
      name: String(t.name || "").slice(0, 64),
      note: String(t.note || "").slice(0, 240),
      columns: (t.columns || []).slice(0, 80).map((c) => ({
        name: String(c.name || "").slice(0, 64),
        type: String(c.type || "string").toLowerCase(),
        length: c.length != null ? String(c.length).slice(0, 24) : "",
        required: !!c.required,
        primaryKey: !!c.primaryKey,
        unique: !!c.unique,
        autoIncrement: !!c.autoIncrement,
        defaultValue: c.defaultValue != null ? String(c.defaultValue).slice(0, 120) : "",
        enumValues: Array.isArray(c.enumValues) ? c.enumValues.map((v) => String(v).slice(0, 64)).slice(0, 50) : [],
        note: String(c.note || "").slice(0, 240),
      })),
    }))
    .filter((t) => t.name && t.columns.length > 0);

  const relations = (raw.relations || [])
    .slice(0, 120)
    .map((r) => ({
      sourceTable: String(r.sourceTable || ""),
      sourceColumn: String(r.sourceColumn || ""),
      targetTable: String(r.targetTable || ""),
      targetColumn: String(r.targetColumn || ""),
      type: ["1-1", "1-n", "n-1", "n-m"].includes(r.type) ? r.type : "1-n",
      onDelete: String(r.onDelete || "NO ACTION").toUpperCase().slice(0, 20),
      onUpdate: String(r.onUpdate || "NO ACTION").toUpperCase().slice(0, 20),
    }))
    .filter((r) => r.sourceTable && r.targetTable);

  return {
    name: String(raw.name || "AI generated database").slice(0, 80),
    tables,
    relations,
  };
}
