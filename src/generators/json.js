/** Portable JSON schema export — round-trips through the JSON importer. */
export function generateJson(schema) {
  const doc = {
    format: "dbeb-json",
    version: 1,
    database: {
      name: schema.name || "",
      engine: schema.engine,
      exportedAt: new Date().toISOString(),
    },
    tables: (schema.tables || []).map((t) => ({
      name: t.name,
      note: t.note || undefined,
      x: t.x,
      y: t.y,
      columns: (t.columns || []).map((c) => ({
        name: c.name,
        type: c.type,
        length: c.length || undefined,
        required: !!c.required,
        primaryKey: !!c.primaryKey,
        unique: !!c.unique,
        autoIncrement: !!c.autoIncrement,
        defaultValue: c.defaultValue === "" ? undefined : c.defaultValue,
        enumValues: c.enumValues?.length ? c.enumValues : undefined,
        note: c.note || undefined,
      })),
    })),
    relations: (schema.relations || []).map((r) => {
      const st = schema.tables.find((t) => t.id === r.sourceTable);
      const tt = schema.tables.find((t) => t.id === r.targetTable);
      const sc = st?.columns.find((c) => c.id === r.sourceColumn);
      const tc = tt?.columns.find((c) => c.id === r.targetColumn);
      return {
        from: { table: st?.name, column: sc?.name },
        to: { table: tt?.name, column: tc?.name },
        type: r.type,
        onDelete: r.onDelete,
        onUpdate: r.onUpdate,
      };
    }),
  };
  return JSON.stringify(doc, null, 2) + "\n";
}
