import React, { useEffect, useState } from "react";
import { Modal } from "../../components/ui/modal";
import { Button } from "../../components/ui/button";
import { Input, Textarea } from "../../components/ui/input";
import { Checkbox } from "../../components/ui/checkbox";
import { Select } from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { useI18n } from "../../lib/i18n";
import { useBuilder } from "./BuilderContext";
import { TYPE_GROUPS } from "../../database-engines/base";

/** Full column editor (unique, auto-increment, enum values, note). */
export function ColumnDetails({ column, table, onClose }) {
  const { t } = useI18n();
  const { engine, updateColumn, deleteColumn } = useBuilder();
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (column) setForm({ ...column, enumValuesText: (column.enumValues || []).join(", ") });
  }, [column]);

  if (!column || !form) return null;

  const typeOptions = (engine?.types || []).map((ty) => ({ value: ty.id, label: `${ty.native}`, group: t(`typeGroup.${ty.group}`) }));
  const isEnum = form.type === "enum";

  const save = () => {
    updateColumn(table.id, column.id, {
      ...form,
      enumValues: isEnum
        ? form.enumValuesText.split(",").map((v) => v.trim()).filter(Boolean)
        : (column.enumValues || []),
    });
    onClose();
  };

  return (
    <Modal
      open={!!column}
      onClose={onClose}
      title={t("builder.columnDetails")}
      footer={
        <>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive me-auto"
            onClick={() => {
              deleteColumn(table.id, column.id);
              onClose();
            }}
          >
            {t("builder.deleteColumn")}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>{t("common.cancel")}</Button>
          <Button size="sm" onClick={save}>{t("common.save")}</Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label={t("builder.column")}>
          <Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mono" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("builder.type")}>
            <Select value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={typeOptions} searchable />
          </Field>
          <Field label={`${t("builder.length")} / ${t("builder.precision")}`}>
            <Input
              value={form.length || ""}
              onChange={(e) => setForm({ ...form, length: e.target.value })}
              placeholder={engine?.typeIndex[form.type]?.defaultLength ? String(engine.typeIndex[form.type].defaultLength) : "—"}
              className="mono"
            />
          </Field>
        </div>

        <div className="flex flex-wrap gap-4 rounded-lg border border-border bg-muted/40 p-3">
          <Checkbox checked={!!form.required} onChange={(v) => setForm({ ...form, required: v })} label={t("builder.required")} />
          <Checkbox checked={!!form.unique} onChange={(v) => setForm({ ...form, unique: v })} label={t("builder.unique")} />
          <Checkbox
            checked={!!form.primaryKey}
            onChange={(v) => setForm({ ...form, primaryKey: v, unique: v ? true : form.unique })}
            label={t("builder.primaryKey")}
          />
          <Checkbox
            checked={!!form.autoIncrement}
            onChange={(v) => setForm({ ...form, autoIncrement: v })}
            label={t("builder.autoIncrement")}
            disabled={form.type !== "integer" && form.type !== "bigint"}
          />
        </div>

        {isEnum && (
          <Field label={t("builder.enumValues")} hint={t("builder.enumValuesHint")}>
            <Input value={form.enumValuesText} onChange={(e) => setForm({ ...form, enumValuesText: e.target.value })} className="mono" placeholder={t("builder.enumValuesPlaceholder")} />
          </Field>
        )}

        <Field label={t("builder.note")} hint={t("builder.noteHint")}>
          <Textarea value={form.note || ""} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2} />
        </Field>

        {engine?.id === "dynamodb" && (
          <Field label={t("builder.keyFlag")}>
            <Select
              value={form.flag || ""}
              onChange={(v) => setForm({ ...form, flag: v || undefined, primaryKey: v === "partition" })}
              options={[
                { value: "", label: t("builder.flagNone") },
                { value: "partition", label: t("builder.flagPartition") },
                { value: "sort", label: t("builder.flagSort") },
              ]}
            />
          </Field>
        )}
      </div>
    </Modal>
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {label}
        {hint && <Badge variant="muted" size="sm">{hint}</Badge>}
      </span>
      {children}
    </label>
  );
}
