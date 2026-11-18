import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { schemaReducer } from "./schemaReducer";
import { createColumn, createEmptySchema, createRelation, createTable, findTable, normalizeSchema, updateColumn as updCol, updateTable as updTbl } from "../../schema/model";
import { getEngine } from "../../database-engines";
import { loadProject, pushRecent, saveProject } from "../../lib/storage";
import { uid } from "../../lib/utils";

const Ctx = createContext(null);

export function BuilderProvider({ children }) {
  const [state, dispatch] = useReducerWithStorage();
  const [selectedTableId, setSelectedTableId] = useState(null);
  const schemaRef = useRef(state.schema);
  schemaRef.current = state.schema;

  const update = useCallback((fn) => {
    const current = schemaRef.current;
    if (!current) return;
    dispatch({ type: "APPLY", schema: fn(current) });
  }, []);

  const load = useCallback((schema) => {
    dispatch({ type: "LOAD", schema });
    setSelectedTableId(schema?.tables?.[0]?.id || null);
  }, []);

  /* ---------------- semantic actions ---------------- */

  const newSchema = useCallback((engineId, name = "") => {
    load(createEmptySchema(engineId, name));
  }, [load]);

  const importSchema = useCallback(
    (raw, { engineId, name } = {}) => {
      const engine = getEngine(engineId) || null;
      const normalized = normalizeSchema(raw, engine, { autoLayout: !raw.tables?.some((t) => t.x) });
      normalized.id = uid("db_");
      if (name != null) normalized.name = name;
      if (engineId) normalized.engine = engineId;
      load(normalized);
      return normalized;
    },
    [load]
  );

  const renameSchema = useCallback((name) => update((s) => ({ ...s, name })), [update]);

  const addTable = useCallback(
    (name) => {
      const engine = getEngine(schemaRef.current.engine);
      const count = schemaRef.current.tables.length;
      const table = createTable({
        name: name || uniqueTableName(schemaRef.current, engine?.terms?.table || "Table"),
        x: 60 + (count % 4) * 300,
        y: 60 + Math.floor(count / 4) * 380,
        columns: [
          createColumn(engine, { name: "id", type: engine?.defaultType === "string" ? "string" : "integer", primaryKey: true, autoIncrement: true, required: true }),
        ],
      });
      update((s) => ({ ...s, tables: [...s.tables, table] }));
      setSelectedTableId(table.id);
      return table;
    },
    [update]
  );

  const deleteTable = useCallback(
    (tableId) => {
      update((s) => ({
        ...s,
        tables: s.tables.filter((t) => t.id !== tableId),
        relations: s.relations.filter((r) => r.sourceTable !== tableId && r.targetTable !== tableId),
      }));
      if (selectedTableId === tableId) setSelectedTableId(null);
    },
    [update, selectedTableId]
  );

  const duplicateTable = useCallback(
    (tableId) => {
      const src = findTable(schemaRef.current, tableId);
      if (!src) return;
      const copy = JSON.parse(JSON.stringify(src));
      copy.id = uid("tbl_");
      copy.name = uniqueTableName(schemaRef.current, src.name, true);
      copy.x = src.x + 40;
      copy.y = src.y + 40;
      copy.columns = copy.columns.map((c) => ({ ...c, id: uid("col_") }));
      // duplicated table keeps FKs pointing at the original — drop incoming/outgoing relations of the copy
      update((s) => ({ ...s, tables: [...s.tables, copy] }));
      setSelectedTableId(copy.id);
      return copy;
    },
    [update]
  );

  const renameTable = useCallback((tableId, name) => update((s) => updTbl(s, tableId, (t) => ({ ...t, name }))), [update]);
  const setTableNote = useCallback((tableId, note) => update((s) => updTbl(s, tableId, (t) => ({ ...t, note }))), [update]);
  const setTablePos = useCallback((tableId, x, y) => update((s) => updTbl(s, tableId, (t) => ({ ...t, x, y }))), [update]);

  const addColumn = useCallback(
    (tableId, patch = {}) => {
      const engine = getEngine(schemaRef.current.engine);
      const col = createColumn(engine, patch);
      update((s) => updTbl(s, tableId, (t) => ({ ...t, columns: [...t.columns, col] })));
      return col;
    },
    [update]
  );

  const updateColumn = useCallback((tableId, colId, patch) => update((s) => updCol(s, tableId, colId, (c) => ({ ...c, ...patch }))), [update]);

  const deleteColumn = useCallback(
    (tableId, colId) => {
      update((s) => ({
        ...updTbl(s, tableId, (t) => ({ ...t, columns: t.columns.filter((c) => c.id !== colId) })),
        relations: s.relations.filter((r) => !(r.sourceTable === tableId && r.sourceColumn === colId) && !(r.targetTable === tableId && r.targetColumn === colId)),
      }));
    },
    [update]
  );

  const moveColumn = useCallback(
    (tableId, colId, dir) => {
      update((s) =>
        updTbl(s, tableId, (t) => {
          const cols = [...t.columns];
          const i = cols.findIndex((c) => c.id === colId);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= cols.length) return t;
          [cols[i], cols[j]] = [cols[j], cols[i]];
          return { ...t, columns: cols };
        })
      );
    },
    [update]
  );

  const duplicateColumn = useCallback(
    (tableId, colId) => {
      const src = findTable(schemaRef.current, tableId)?.columns.find((c) => c.id === colId);
      if (!src) return;
      const copy = { ...src, id: uid("col_"), name: uniqueColName(findTable(schemaRef.current, tableId), src.name), primaryKey: false };
      update((s) => updTbl(s, tableId, (t) => {
        const i = t.columns.findIndex((c) => c.id === colId);
        const cols = [...t.columns];
        cols.splice(i + 1, 0, copy);
        return { ...t, columns: cols };
      }));
    },
    [update]
  );

  const addRelation = useCallback(
    (patch) => {
      const rel = createRelation(patch);
      update((s) => ({ ...s, relations: [...s.relations, rel] }));
      return rel;
    },
    [update]
  );

  const updateRelation = useCallback((relId, patch) => update((s) => ({ ...s, relations: s.relations.map((r) => (r.id === relId ? { ...r, ...patch } : r)) })), [update]);

  const deleteRelation = useCallback((relId) => update((s) => ({ ...s, relations: s.relations.filter((r) => r.id !== relId) })), [update]);

  const undo = useCallback(() => dispatch({ type: "UNDO" }), []);
  const redo = useCallback(() => dispatch({ type: "REDO" }), []);

  /* ---------------- context value ---------------- */

  const schema = state.schema;
  const engine = useMemo(() => getEngine(schema?.engine), [schema?.engine]);
  const selectedTable = useMemo(() => (schema && selectedTableId ? findTable(schema, selectedTableId) : null), [schema, selectedTableId]);

  // Keep selection valid across reloads, imports, and deletions.
  useEffect(() => {
    if (!schema || schema.tables.length === 0) return;
    if (!selectedTableId || !schema.tables.some((t) => t.id === selectedTableId)) {
      setSelectedTableId(schema.tables[0].id);
    }
  }, [schema, selectedTableId]);

  const value = useMemo(
    () => ({
      schema,
      engine,
      hasSchema: !!schema,
      selectedTableId,
      setSelectedTableId,
      selectedTable,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      undo,
      redo,
      update,
      newSchema,
      load,
      importSchema,
      renameSchema,
      addTable,
      deleteTable,
      duplicateTable,
      renameTable,
      setTableNote,
      setTablePos,
      addColumn,
      updateColumn,
      deleteColumn,
      moveColumn,
      duplicateColumn,
      addRelation,
      updateRelation,
      deleteRelation,
    }),
    [schema, engine, selectedTableId, selectedTable, state.past.length, state.future.length, undo, redo, update, newSchema, load, importSchema, renameSchema, addTable, deleteTable, duplicateTable, renameTable, setTableNote, setTablePos, addColumn, updateColumn, deleteColumn, moveColumn, duplicateColumn, addRelation, updateRelation, deleteRelation]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBuilder() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBuilder must be used inside BuilderProvider");
  return ctx;
}

/* ---------------- helpers ---------------- */

function uniqueTableName(schema, base, copy) {
  const names = new Set(schema.tables.map((t) => t.name.toLowerCase()));
  let candidate = copy ? `${base}_copy` : `${base.toLowerCase()}`;
  let i = 2;
  while (names.has(candidate.toLowerCase())) {
    candidate = `${candidate}_${i++}`;
  }
  return candidate;
}

function uniqueColName(table, base) {
  const names = new Set(table.columns.map((c) => c.name.toLowerCase()));
  let candidate = `${base}_copy`;
  let i = 2;
  while (names.has(candidate.toLowerCase())) {
    candidate = `${base}_copy_${i++}`;
  }
  return candidate;
}

/** Reducer wrapper that autosaves the current schema to localStorage */
function useReducerWithStorage() {
  const [state, dispatchRaw] = React.useReducer(schemaReducer, null, () => ({
    schema: loadProject(),
    past: [],
    future: [],
    savedAt: null,
  }));

  useEffect(() => {
    if (state.schema) {
      const t = setTimeout(() => {
        saveProject(state.schema);
        pushRecent(state.schema);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [state.schema]);

  return [state, dispatchRaw];
}
