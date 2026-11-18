import React, { useEffect, useMemo, useState } from "react";
import { Link2, Trash2 } from "lucide-react";
import { Modal } from "../../components/ui/modal";
import { Button } from "../../components/ui/button";
import { Select } from "../../components/ui/select";
import { useI18n } from "../../lib/i18n";
import { uid } from "../../lib/utils";

const CARDINALITIES = [
  { value: "1-n", key: "cardinality.1n" },
  { value: "n-1", key: "cardinality.n1" },
  { value: "1-1", key: "cardinality.11" },
  { value: "n-m", key: "cardinality.nm" },
];

const ACTIONS = ["NO ACTION", "CASCADE", "SET NULL", "RESTRICT", "SET DEFAULT"];

/**
 * Create/edit a relationship between two tables (and columns).
 * initial: relation object or {sourceTable, sourceColumn, targetTable} prefill.
 */
export function RelationEditor({ open, onClose, initial, tables, engine, onSubmit, onDelete }) {
  const { t, lang } = useI18n();
  const baseTerms = engine?.terms || { table: "Table", column: "Column", pk: "Primary Key" };
  const terms = {
    table: (lang === "fa" && baseTerms.tableFa) || baseTerms.table,
    column: (lang === "fa" && baseTerms.columnFa) || baseTerms.column,
    pk: (lang === "fa" && baseTerms.pkFa) || baseTerms.pk,
  };
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!open) return;
    setForm({
      id: initial?.id,
      sourceTable: initial?.sourceTable || tables[0]?.id || "",
      sourceColumn: initial?.sourceColumn || "",
      targetTable: initial?.targetTable || tables[1]?.id || tables[0]?.id || "",
      targetColumn: initial?.targetColumn || "",
      type: initial?.type || "1-n",
      onDelete: initial?.onDelete || "NO ACTION",
      onUpdate: initial?.onUpdate || "NO ACTION",
    });
  }, [open, initial, tables]);

  const colOptions = useMemo(() => {
    if (!form) return { source: [], target: [] };
    const st = tables.find((x) => x.id === form.sourceTable);
    const tt = tables.find((x) => x.id === form.targetTable);
    const toOpts = (table, excludeSelf) =>
      (table?.columns || [])
        .filter((c) => (excludeSelf && table.id === form?.sourceTable && c.id === form?.sourceColumn ? false : true))
        .map((c) => ({ value: c.id, label: c.name || t("builder.unnamed"), group: c.primaryKey ? terms.pk : undefined }));
    return { source: toOpts(st), target: toOpts(tt, true) };
  }, [form, tables, terms.pk]);

  if (!form) return null;

  const isAbstract = engine?.family === "nosql";
  const sourceTableObj = tables.find((x) => x.id === form.sourceTable);
  const targetTableObj = tables.find((x) => x.id === form.targetTable);
  const needCols = engine?.family !== "nosql";
  const valid =
    form.sourceTable &&
    form.targetTable &&
    (!needCols || (colOptions.source.some((o) => o.value === form.sourceColumn) && colOptions.target.some((o) => o.value === form.targetColumn))) &&
    sourceTableObj &&
    targetTableObj;

  const tableOptions = tables.map((x) => ({ value: x.id, label: x.name || t("builder.unnamed") }));
  const cardOptions = CARDINALITIES.map((c) => ({ value: c.value, label: t(c.key) }));
  const actionOptions = ACTIONS.map((a) => ({ value: a, label: a }));

  const submit = () => {
    if (!valid) return;
    onSubmit({
      id: form.id || uid("rel_"),
      sourceTable: form.sourceTable,
      sourceColumn: form.sourceColumn,
      targetTable: form.targetTable,
      targetColumn: form.targetColumn,
      type: form.type,
      onDelete: form.onDelete,
      onUpdate: form.onUpdate,
    });
    onClose?.();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t(initial?.id ? "diagram.editRelation" : "diagram.newRelation")}
      footer={
        <>
          {initial?.id && onDelete && (
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive me-auto" onClick={() => { onDelete(initial.id); onClose?.(); }}>
              <Trash2 className="h-4 w-4" />
              {t("common.delete")}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button size="sm" onClick={submit} disabled={!valid}>
            <Link2 className="h-4 w-4" />
            {t(initial?.id ? "common.save" : "common.create")}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("relation.source")}>
          <Select value={form.sourceTable} onChange={(v) => setForm({ ...form, sourceTable: v, sourceColumn: "" })} options={tableOptions} ariaLabel={t("relation.source")} />
        </Field>
        <Field label={`${t("relation.sourceColumn")} (${terms.column})`}>
          <Select
            value={form.sourceColumn}
            onChange={(v) => setForm({ ...form, sourceColumn: v })}
            options={colOptions.source}
            searchable
            placeholder={isAbstract ? t("common.optional") : t("common.select")}
          />
        </Field>
        <Field label={t("relation.target")}>
          <Select value={form.targetTable} onChange={(v) => setForm({ ...form, targetTable: v, targetColumn: "" })} options={tableOptions} ariaLabel={t("relation.target")} />
        </Field>
        <Field label={`${t("relation.targetColumn")} (${terms.column})`}>
          <Select
            value={form.targetColumn}
            onChange={(v) => setForm({ ...form, targetColumn: v })}
            options={colOptions.target}
            searchable
            placeholder={isAbstract ? t("common.optional") : t("common.select")}
          />
        </Field>
        <Field label={t("relation.cardinality")}>
          <Select value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={cardOptions} />
        </Field>
        <Field label={t("relation.onDelete")}>
          <Select value={form.onDelete} onChange={(v) => setForm({ ...form, onDelete: v })} options={actionOptions} />
        </Field>
        <Field label={t("relation.onUpdate")}>
          <Select value={form.onUpdate} onChange={(v) => setForm({ ...form, onUpdate: v })} options={actionOptions} />
        </Field>
      </div>
      {!valid && (
        <p className="mt-3 text-xs text-destructive">
          {form.sourceTable && form.targetTable && needCols
            ? t("validation.RELATION_FIELDS_REQUIRED")
            : t("validation.RELATION_TABLES_REQUIRED")}
        </p>
      )}
    </Modal>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
