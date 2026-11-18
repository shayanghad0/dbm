import React, { useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, Copy, GitBranch, Plus, Search, Table2, Trash2, CheckCircle2, ClipboardCheck, Link2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { useI18n } from "../../lib/i18n";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { EmptyState } from "../../components/ui/empty-state";
import { useBuilder } from "./BuilderContext";

const TABS = [
  { key: "tables", icon: Table2 },
  { key: "relations", icon: GitBranch },
  { key: "checks", icon: ClipboardCheck },
];

export function TableSidebar({ issues, onAddRelation, onEditRelation, onOpenTable, className }) {
  const { t, lang } = useI18n();
  const { schema, engine, selectedTableId, setSelectedTableId, addTable, deleteTable, duplicateTable } = useBuilder();
  const [tab, setTab] = useState("tables");
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  const baseTerms = engine?.terms || { table: "Table", column: "Column" };
  const terms = {
    table: (lang === "fa" && baseTerms.tableFa) || baseTerms.table,
    column: (lang === "fa" && baseTerms.columnFa) || baseTerms.column,
  };

  const filteredTables = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (schema?.tables || []).filter((tb) => !q || tb.name.toLowerCase().includes(q) || tb.columns.some((c) => c.name.toLowerCase().includes(q)));
  }, [schema, query]);

  const errorCount = issues.filter((i) => i.level === "error").length;
  const warnCount = issues.length - errorCount;

  return (
    <aside className={cn("flex h-full w-full flex-col border-e border-border bg-card/50 lg:w-72", className)}>
      {/* Tabs */}
      <div className="grid grid-cols-3 gap-1 border-b border-border p-2">
        {TABS.map((tabDef) => {
          const count = tabDef.key === "tables" ? (schema?.tables.length ?? 0) : tabDef.key === "relations" ? (schema?.relations.length ?? 0) : issues.length;
          const active = tab === tabDef.key;
          const checksAlert = tabDef.key === "checks" && count > 0;
          return (
            <button
              key={tabDef.key}
              onClick={() => setTab(tabDef.key)}
              className={cn(
                "flex min-w-0 items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-xs font-medium transition-colors",
                active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
              aria-pressed={active}
              title={`${t(`sidebar.${tabDef.key}`)} (${count})`}
            >
              <tabDef.icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t(`sidebar.${tabDef.key}`)}</span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums leading-4",
                  checksAlert
                    ? errorCount > 0
                      ? "bg-destructive/15 text-destructive"
                      : "bg-warning/15 text-warning"
                    : active
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "tables" && (
        <>
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("builder.searchTables")} className="h-8 ps-8 text-xs" aria-label={t("builder.searchTables")} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {filteredTables.length === 0 ? (
              <EmptyState
                icon={Table2}
                title={t(query ? "builder.noTableResults" : "builder.noTables")}
                description={query ? t("builder.noTableResultsHint") : t("builder.noTablesHint")}
                className="py-8"
              />
            ) : (
              <ul className="space-y-1">
                {filteredTables.map((tb) => {
                  const active = tb.id === selectedTableId;
                  const pkCount = tb.columns.filter((c) => c.primaryKey).length;
                  const fkCount = schema.relations.filter((r) => r.sourceTable === tb.id).length;
                  return (
                    <li key={tb.id} className="group relative">
                      <button
                        onClick={() => {
                          setSelectedTableId(tb.id);
                          onOpenTable?.(tb);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-start transition-colors",
                          active ? "border-primary/40 bg-primary/10" : "border-transparent hover:bg-accent/60"
                        )}
                        aria-current={active}
                      >
                        <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center", active ? "text-primary" : "text-muted-foreground")}>
                          <Table2 className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{tb.name || t("common.untitled")}</span>
                          <span className="text-[11px] text-muted-foreground tnum">{t("builder.itemCount", { count: tb.columns.length, term: terms.column })}{pkCount ? ` · ${pkCount} 🔑` : ""}{fkCount ? ` · ${fkCount} 🔗` : ""}</span>
                        </span>
                      </button>
                      <div className="absolute end-1 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-md border border-border bg-card p-0.5 shadow-sm group-hover:flex">
                        <Button variant="ghost" size="iconSm" onClick={(e) => { e.stopPropagation(); duplicateTable(tb.id); }} title={t("builder.duplicateTable")} aria-label={t("builder.duplicateTable")}>
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="iconSm" className="text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setPendingDelete(tb); }} title={t("builder.deleteTable")} aria-label={t("builder.deleteTable")}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="border-t border-border p-2">
            <Button className="w-full" variant="outline" size="sm" onClick={() => addTable()}>
              <Plus className="h-4 w-4" />
              {t("builder.addTable")}
            </Button>
          </div>
        </>
      )}

      {tab === "relations" && (
        <>
          <div className="flex-1 overflow-y-auto p-2">
            {(schema?.relations || []).length === 0 ? (
              <EmptyState icon={GitBranch} title={t("builder.noRelations")} description={t("builder.noRelationsHint")} className="py-8" />
            ) : (
              <ul className="space-y-1">
                {schema.relations.map((r) => {
                  const st = schema.tables.find((x) => x.id === r.sourceTable);
                  const tt = schema.tables.find((x) => x.id === r.targetTable);
                  return (
                    <li key={r.id} className="group relative">
                      <button
                        onClick={() => onEditRelation(r)}
                        className="flex w-full flex-col gap-0.5 rounded-lg border border-transparent px-2.5 py-2 text-start transition-colors hover:border-border hover:bg-accent/60"
                      >
                        <span className="flex items-center gap-1 text-xs font-medium">
                          <Link2 className="h-3 w-3 shrink-0 text-primary" />
                          <span className="truncate">{st?.name || "?"}.{(st?.columns.find((c) => c.id === r.sourceColumn) || {}).name}</span>
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span className="truncate">→ {tt?.name || "?"}.{(tt?.columns.find((c) => c.id === r.targetColumn) || {}).name}</span>
                          <Badge variant="muted" size="sm">{r.type}</Badge>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="border-t border-border p-2">
            <Button className="w-full" variant="outline" size="sm" onClick={onAddRelation} disabled={!schema?.tables.length}>
              <Plus className="h-4 w-4" />
              {t("builder.addRelation")}
            </Button>
          </div>
        </>
      )}

      {tab === "checks" && (
        <div className="flex-1 overflow-y-auto p-2">
          {issues.length === 0 ? (
            <EmptyState icon={CheckCircle2} title={t("builder.noIssues")} description={t("builder.noIssuesHint")} className="py-8" />
          ) : (
            <div className="mb-3 flex gap-2">
              <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />{errorCount}</Badge>
              <Badge variant="warning" className="gap-1"><AlertTriangle className="h-3 w-3" />{warnCount}</Badge>
            </div>
          )}
          <ul className="space-y-1.5">
            {issues.map((issue, i) => (
              <li key={i}>
                <button
                  onClick={() => {
                    const tbl = issue.tableId || null;
                    if (tbl) {
                      setSelectedTableId(tbl);
                      setTab("tables");
                      onOpenTable?.(schema.tables.find((x) => x.id === tbl));
                    }
                  }}
                  className="flex w-full items-start gap-2 rounded-lg border border-border/60 bg-card px-2.5 py-2 text-start text-xs transition-colors hover:border-border hover:bg-accent/40"
                >
                  {issue.level === "error" ? <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />}
                  <span className="text-muted-foreground">{t(`validation.${issue.code}`, issue.params || {})}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
