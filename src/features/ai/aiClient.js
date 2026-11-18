/**
 * AI assistant client — the single seam for all AI features.
 *
 * Today: calls POST /api/ai/generate. When the server has an AI model
 * configured (AI_API_KEY), it proxies to an OpenAI-compatible endpoint.
 * Without a key, the server returns a deterministic local suggestion.
 *
 * If the API is unreachable (static hosting), we fall back to the built-in
 * stub in the browser so the feature never breaks.
 *
 * To connect a real model later:
 *   1. set AI_API_KEY (and optionally AI_MODEL, AI_BASE_URL) on the server
 *   2. optionally replace the prompt in promptBuilder.js
 * The response contract stays the same: { schema, plan, source }.
 */

import { stubGenerate } from "./stubGenerator.js";
import { buildPrompt } from "./promptBuilder.js";

export async function generateSchemaWithAi({ prompt, engineId, schema }) {
  try {
    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, engineId, schema, context: buildPrompt({ prompt, engineId, schema }) }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    if (data?.schema?.tables?.length) return data;
    throw new Error("Empty AI response");
  } catch {
    return stubGenerate({ prompt, engineId, schema });
  }
}
