/** Prisma schema import — models, scalar fields, attributes, @relation, enums. */

const TYPE_MAP = {
  String: "string", Int: "integer", BigInt: "bigint", Float: "float", Decimal: "decimal",
  Boolean: "boolean", DateTime: "datetime", Json: "json", Bytes: "blob", UUID: "uuid",
};

const ACTION_MAP = {
  Cascade: "CASCADE", SetNull: "SET NULL", Restrict: "RESTRICT", NoAction: "NO ACTION", SetDefault: "SET DEFAULT",
};

export function parsePrisma(text) {
  const models = [];
  const enums = new Map();
  let provider = "";

  const ds = text.match(/datasource\s+\w+\s*\{([\s\S]*?)\}/);
  if (ds) {
    const pm = ds[1].match(/provider\s*=\s*"([^"]+)"/);
    if (pm) provider = pm[1];
  }

  const enumRe = /enum\s+(\w+)\s*\{([\s\S]*?)\}/g;
  let m;
  while ((m = enumRe.exec(text))) {
    const values = m[2].split("\n").map((l) => l.trim().replace(/\s.*$/, "")).filter((v) => v && !v.startsWith("//"));
    enums.set(m[1], values);
  }

  const modelRe = /model\s+(\w+)\s*\{([\s\S]*?)\n\s*\}/g;
  while ((m = modelRe.exec(text))) {
    models.push({ name: m[1], body: m[2] });
  }

  if (!models.length) throw new Error('No "model" blocks found — is this a Prisma schema file?');

  const tables = models.map((mo) => {
    const table = { name: mo.name, note: "", x: 0, y: 0, columns: [], _rels: [] };
    for (let line of mo.body.split("\n")) {
      line = line.trim();
      if (!line || line.startsWith("//")) continue;
      if (line.startsWith("@@")) {
        const um = line.match(/@@unique\s*\(\s*\[([^\]]+)\]/);
        if (um) {
          for (const fname of um[1].split(",")) {
            const col = table.columns.find((c) => c.name === fname.trim());
            if (col) col.unique = true;
          }
        }
        continue;
      }
      const parsed = parseField(line, enums);
      if (!parsed) continue;
      if (parsed._isRelationField) {
        // relation holder field (e.g. user User @relation(fields:[authorId], references:[id]))
        table._rels.push({
          sourceTable: mo.name,
          sourceColumn: parsed._fkSourceField || "",
          targetTable: parsed._target,
          targetColumn: parsed._references || "",
          type: "1-n",
          onDelete: ACTION_MAP[parsed._onDelete] || "NO ACTION",
          onUpdate: ACTION_MAP[parsed._onUpdate] || "NO ACTION",
        });
      } else {
        table.columns.push(parsed);
      }
    }
    delete table._isRelationField;
    return table;
  });

  const relations = [];
  for (const t of tables) {
    relations.push(...(t._rels || []));
    delete t._rels;
  }

  const providerEngine = { mysql: "mysql", postgresql: "postgresql", sqlite: "sqlite", sqlserver: "mssql", mongodb: "mongodb", mongodbAtlas: "mongodb", oracle: "postgresql" }[provider] || "generic";

  return { name: "", engineHint: providerEngine || "generic", tables, relations };
}

function parseField(line, enums) {
  // skip back-relation list fields (they duplicate the fk side)
  const fm = line.match(/^([A-Za-z_]\w*)\s+([A-Za-z_]\w*)(\[\])?(\?)?\s*(.*)$/);
  if (!fm) return null;
  const [, name, rawType, list, opt, rest] = fm;
  if (list) return null; // e.g. Post Post[]

  const relMatch = rest.match(/@relation\(([^)]*)\)/);
  if (relMatch && /fields\s*:/.test(relMatch[1])) {
    // This line holds the FK relation (e.g. author User @relation(fields:[authorId], references:[id]))
    const fields = relMatch[1].match(/fields:\s*\[([^\]]+)\]/);
    const refs = relMatch[1].match(/references:\s*\[([^\]]+)\]/);
    const onDel = relMatch[1].match(/onDelete:\s*(\w+)/);
    const onUpd = relMatch[1].match(/onUpdate:\s*(\w+)/);
    return {
      _isRelationField: true,
      _target: rawType,
      _fkSourceField: fields ? fields[1].split(",")[0].trim() : "",
      _references: refs ? refs[1].split(",")[0].trim() : "",
      _onDelete: onDel ? onDel[1] : "",
      _onUpdate: onUpd ? onUpd[1] : "",
    };
  }

  const col = {
    name,
    type: prismaToLogical(rawType, enums),
    length: "",
    required: !opt,
    primaryKey: /\b@id\b/.test(rest) || /\b@id\s*\(/.test(rest),
    unique: /\b@unique\b/.test(rest),
    autoIncrement: /@default\(autoincrement\(\)\)/.test(rest) || /@default\(auto\(\)\)/.test(rest),
    defaultValue: "",
    enumValues: [],
    note: "",
  };

  const dm = rest.match(/@default\(\s*("((?:[^"\\]|\\.)*)"|'([^']*)'|([\w.()]+))\s*\)/);
  if (dm) {
    if (dm[2] != null || dm[3] != null) col.defaultValue = dm[2] != null ? dm[2] : dm[3];
    else if (dm[4] === "autoincrement()") col.autoIncrement = true;
    else if (dm[4] === "uuid()" || dm[4] === "cuid()") col.defaultValue = "";
    else if (dm[4] === "now()") col.defaultValue = "CURRENT_TIMESTAMP";
    else col.defaultValue = dm[4] || "";
  }

  if (col.type === "enum" && enums.has(rawType)) col.enumValues = enums.get(rawType);

  return col;
}

function prismaToLogical(rawType, enums) {
  if (TYPE_MAP[rawType]) return TYPE_MAP[rawType];
  if (enums.has(rawType)) return "enum";
  return "string";
}
