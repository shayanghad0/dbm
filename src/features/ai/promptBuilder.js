/**
 * Prompt builder — prepares the context for a future LLM integration.
 * The output is a compact JSON payload the model can reason about,
 * and the same structure the API expects.
 */
export function buildPrompt({ prompt, engineId, schema }) {
  const existing = schema
    ? {
        engine: schema.engine,
        tables: schema.tables.map((t) => ({
          name: t.name,
          columns: t.columns.map((c) => ({
            name: c.name,
            type: c.type,
            primaryKey: !!c.primaryKey,
            required: !!c.required,
          })),
        })),
      }
    : null;

  const system = [
    "You are a database design assistant inside DB Easy Builder.",
    "Return ONLY JSON matching this shape:",
    '{ "name": string, "tables":[{ "name": string, "columns":[{ "name": string, "type": string, "length": string, "required": boolean, "primaryKey": boolean, "unique": boolean, "autoIncrement": boolean, "defaultValue": string, "note": string }] }], "relations":[{ "sourceTable": string, "sourceColumn": string, "targetTable": string, "targetColumn": string, "type": "1-n" | "1-1" | "n-m", "onDelete": string, "onUpdate": string }] }',
    `Target engine: ${engineId}. Use logical types (string, text, integer, bigint, float, decimal, boolean, date, time, datetime, json, uuid, blob).`,
    "Always add an integer primary key named id with autoIncrement and created_at datetime with CURRENT_TIMESTAMP default.",
  ].join("\n");

  return {
    system,
    user: JSON.stringify({ request: prompt, targetEngine: engineId, existingSchema: existing }),
  };
}
