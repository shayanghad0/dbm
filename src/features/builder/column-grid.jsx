import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Copy, Link, Link2, Pencil, Plus, Search, Trash2, KeyRound, Settings2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { useI18n } from "../../lib/i18n";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import { Select } from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { TYPE_GROUPS } from "../../database-engines/base";
import { useBuilder } from "./BuilderContext";

/** Text input that commits to the store on blur/Enter (one undo step per edit) */
function CommitInput({ value, onCommit, className, placeholder, ariaLabel, type = "text", autoFocus }) {
  const [local, setLocal] = useState(value);
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setLocal(value);
  }, [value]);

  return (
    <input
      type={type}
      value={local}
      autoFocus={autoFocus}
      aria-label={ariaLabel}
      placeholder={placeholder}
      onFocus={() => {
        focused.current = true;
      }}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        focused.current = false;
        if (local !== value) onCommit(local);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.target.blur();
        } else if (e.key === "Escape") {
          setLocal(value);
          e.target.blur();
        }
      }}
      className={cn("cell-input h-8 text-sm", className)}
    />
  );
}

export function ColumnGrid({ table, onEditColumn, onCreateRelation, relationFor }) {
  const { t, lang } = useI18n();
  const { engine, updateColumn, deleteColumn, moveColumn, duplicateColumn, addColumn } = useBuilder();
  const [query, setQuery] = useState("");

  const baseTerms = engine?.terms || { column: "Column", pk: "Primary Key" };
  const terms = {
    column: (lang === "fa" && baseTerms.columnFa) || baseTerms.column,
    pk: (lang === "fa" && baseTerms.pkFa) || baseTerms.pk,
  };
  const typeOptions = useMemo(() => {
    return (engine?.types || []).map((ty) => ({ value: ty.id, label: ty.native, group: t(`typeGroup.${ty.group}`) }));
  }, [engine, t]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (table.columns || []).filter((c) => !q || c.name.toLowerCase().includes(q) || (engine?.typeIndex[c.type]?.native || "").toLowerCase().includes(q));
  }, [table.columns, query, engine]);

  if (!table) return null;

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <div className="relative w-56">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("builder.searchColumns")} className="h-8 ps-8 text-xs" aria-label={t("builder.searchColumns")} />
        </div>
        <Badge variant="muted" size="sm" className="tnum">
          {rows.length} / {table.columns.length}
        </Badge>
        <Button size="sm" className="ms-auto" onClick={() => addColumn(table.id)}>
          <Plus className="h-4 w-4" />
          {t("builder.addColumn")}
        </Button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[820px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="sticky top-0 z-10 bg-card">
              {[t("builder.column"), t("builder.type"), t("builder.length"), t("builder.required"), t("builder.primaryKey"), t("builder.defaultValue"), ""].map((h, i) => (
                <th
                  key={i}
                  className={cn(
                    "border-b border-border bg-card px-2 py-2 text-start text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
                    i > 2 && i < 5 && "text-center"
                  )}
                >
                  {h === t("builder.primaryKey") ? terms.pk : h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {query ? t("builder.noColumnResults") : t("builder.noColumns")}
                </td>
              </tr>
            )}
            {rows.map((col) => {
              const lengthCapable = engine?.lengthCapable?.(col.type);
              const isEnum = col.type === "enum";
              const rel = relationFor(col);
              return (
                <tr key={col.id} className="group/row transition-colors hover:bg-accent/30">
                  {/* name */}
                  <td className="w-[180px] border-b border-border/60 bg-card/40 px-1 py-0.5">
                    <div className="flex items-center gap-1">
                      {col.primaryKey && <KeyRound className="h-3 w-3 shrink-0 text-primary" />}
                      <CommitInput value={col.name} onCommit={(v) => updateColumn(table.id, col.id, { name: v })} placeholder={t("builder.columnName")} ariaLabel={t("builder.columnName")} className="font-medium" />
                    </div>
                  </td>
                  {/* type */}
                  <td className="w-[170px] border-b border-border/60 px-1 py-0.5">
                    <Select
                      value={col.type}
                      onChange={(v) => updateColumn(table.id, col.id, { type: v, length: engine?.lengthCapable?.(v) ? col.length : "" })}
                      options={typeOptions}
                      searchable
                      className="[&>button]:h-8 [&>button]:border-transparent [&>button]:bg-transparent [&>button]:shadow-none [&>button]:hover:bg-accent/60"
                      buttonClassName="font-mono text-xs"
                      ariaLabel={`${col.name || t("builder.unnamed")} ${t("builder.type")}`}
                    />
                  </td>
                  {/* length */}
                  <td className="w-[90px] border-b border-border/60 px-1 py-0.5">
                    {isEnum ? (
                      <span className="block truncate px-1.5 text-xs text-muted-foreground mono" title={t("builder.enumValuesHint")}>
                        {col.enumValues?.length ? t("builder.optionsCount", { count: col.enumValues.length }) : "—"}
                      </span>
                    ) : lengthCapable ? (
                      <CommitInput value={col.length} onCommit={(v) => updateColumn(table.id, col.id, { length: v })} placeholder={engine.typeIndex[col.type]?.defaultLength ? String(engine.typeIndex[col.type].defaultLength) : "—"} ariaLabel={`${col.name || t("builder.unnamed")} ${t("builder.length")}`} className="mono text-xs" />
                    ) : (
                      <span className="block px-1.5 text-center text-xs text-muted-foreground/50">—</span>
                    )}
                  </td>
                  {/* required */}
                  <td className="w-[70px] border-b border-border/60 text-center">
                    <div className="flex justify-center">
                      <Checkbox checked={!!col.required} onChange={(v) => updateColumn(table.id, col.id, { required: v, ...(v ? {} : {}) })} ariaLabel={`${col.name || t("builder.unnamed")} ${t("builder.required")}`} />
                    </div>
                  </td>
                  {/* pk */}
                  <td className="w-[80px] border-b border-border/60 text-center">
                    <div className="flex justify-center">
                      <Checkbox checked={!!col.primaryKey} onChange={(v) => updateColumn(table.id, col.id, { primaryKey: v, ...(v ? { unique: true } : {}) })} ariaLabel={`${col.name || t("builder.unnamed")} ${terms.pk}`} />
                    </div>
                  </td>
                  {/* default */}
                  <td className="border-b border-border/60 px-1 py-0.5">
                    <CommitInput value={col.defaultValue || ""} onCommit={(v) => updateColumn(table.id, col.id, { defaultValue: v })} placeholder="—" ariaLabel={`${col.name || t("builder.unnamed")} ${t("builder.defaultValue")}`} className="mono text-xs" />
                  </td>
                  {/* actions */}
                  <td className="w-[128px] border-b border-border/60 px-1 py-0.5">
                    <div className="flex items-center justify-end gap-0.5 opacity-40 transition-opacity group-hover/row:opacity-100">
                      <Button variant="ghost" size="iconSm" className="h-6 w-6" onClick={() => onEditColumn(col)} title={t("builder.columnDetails")} aria-label={t("builder.columnDetails")}>
                        <Settings2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="iconSm"
                        className={cn("h-6 w-6", rel && "text-primary opacity-100")}
                        onClick={() => (rel ? onCreateRelation(rel) : onCreateRelation({ sourceTable: table.id, sourceColumn: col.id }))}
                        title={rel ? t("builder.editRelation") : t("builder.makeForeignKey")}
                        aria-label={rel ? t("builder.editRelation") : t("builder.makeForeignKey")}
                      >
                        {rel ? <Link2 className="h-3.5 w-3.5" /> : <Link className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="iconSm" className="h-6 w-6" onClick={() => moveColumn(table.id, col.id, -1)} title={t("builder.moveUp")} aria-label={t("builder.moveUp")}>
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="iconSm" className="h-6 w-6" onClick={() => moveColumn(table.id, col.id, 1)} title={t("builder.moveDown")} aria-label={t("builder.moveDown")}>
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="iconSm" className="h-6 w-6" onClick={() => duplicateColumn(table.id, col.id)} title={t("builder.duplicateColumn")} aria-label={t("builder.duplicateColumn")}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="iconSm" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => deleteColumn(table.id, col.id)} title={t("builder.deleteColumn")} aria-label={t("builder.deleteColumn")}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
