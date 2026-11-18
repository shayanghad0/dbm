import React, { useMemo, useState } from "react";
import { Copy, Database, GitBranch, Table2, Trash2, Plus, Lightbulb, ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { cn } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { EmptyState } from "../../components/ui/empty-state";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { useBuilder } from "./BuilderContext";
import { TableSidebar } from "./table-sidebar";
import { ColumnGrid } from "./column-grid";
import { ColumnDetails } from "./column-details";
import { RelationEditor } from "./relation-editor";

export function BuilderPage({ navigate }) {
  const { t, lang, isRtl } = useI18n();
  const { schema, engine, hasSchema, selectedTable, selectedTableId, addTable, deleteTable, duplicateTable, renameTable, setTableNote, addRelation, updateRelation, deleteRelation, setSelectedTableId } = useBuilder();

  const [editColumn, setEditColumn] = useState(null);
  const [relationDraft, setRelationDraft] = useState(null);
  const [confirmDeleteTable, setConfirmDeleteTable] = useState(false);
  const [mobileListView, setMobileListView] = useState(false);

  const issues = useMemo(() => {
    if (!schema || !engine) return [];
    return engine.validate(schema);
  }, [schema, engine]);

  if (!hasSchema) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4">
        <EmptyState
          icon={Database}
          title={t("builder.noDatabaseTitle")}
          description={t("builder.noDatabaseHint")}
          action={
            <Button onClick={() => navigate("home")}>
              <Plus className="h-4 w-4" />
              {t("nav.home")}
            </Button>
          }
          className="w-full border border-border bg-card"
        />
      </div>
    );
  }

  const baseTerms = engine?.terms || { table: "Table", column: "Column", pk: "Primary Key" };
  const terms = {
    table: (lang === "fa" && baseTerms.tableFa) || baseTerms.table,
    column: (lang === "fa" && baseTerms.columnFa) || baseTerms.column,
    pk: (lang === "fa" && baseTerms.pkFa) || baseTerms.pk,
  };
  const relationFor = (col) => schema.relations.find((r) => r.sourceTable === selectedTableId && r.sourceColumn === col.id);

  const openNewRelation = () => setRelationDraft({ sourceTable: selectedTableId || schema.tables[0]?.id });
  const BackIcon = isRtl ? ChevronRight : ChevronLeft;

  // On first small-screen render, prefer list when nothing is selected explicitly handled by auto-select.
  React.useEffect(() => {
    if (!selectedTable) setMobileListView(true);
  }, [selectedTable]);

  const hasTables = schema.tables.length > 0;
  const showSidebar = hasTables && (mobileListView || !selectedTable);
  const showEditor = !hasTables || !mobileListView;

  return (
    <div className="flex h-[calc(100dvh-3.5rem)]">
      <div className={cn("h-full shrink-0 border-e border-border bg-card/50 lg:block lg:w-72", showSidebar ? "block w-full" : "hidden")}>
        <TableSidebar
          className="w-full border-0 lg:w-full"
          issues={issues}
          onAddRelation={openNewRelation}
          onEditRelation={(rel) => setRelationDraft(rel)}
          onOpenTable={() => setMobileListView(false)}
        />
      </div>

      <main className={cn("min-w-0 flex-1 flex-col lg:flex", showEditor ? "flex" : "hidden")}>
        {!selectedTable ? (
          <div className="flex flex-1 items-center justify-center p-6">
            {schema.tables.length === 0 ? (
              <EmptyState
                icon={Table2}
                title={t("builder.emptyTitle")}
                description={t("builder.emptyHint")}
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button onClick={() => addTable()}>
                      <Plus className="h-4 w-4" />
                      {t("builder.addFirstTable")}
                    </Button>
                    <Button variant="outline" onClick={() => navigate("templates")}>
                      {t("welcome.startTemplate")}
                    </Button>
                  </div>
                }
              />
            ) : (
              <EmptyState icon={Table2} title={t("builder.selectTableTitle")} description={t("builder.selectTableHint")} />
            )}
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card/40 px-3 py-2.5">
              <Button
                variant="ghost"
                size="iconSm"
                className="lg:hidden"
                onClick={() => setMobileListView(true)}
                aria-label={t("builder.backToTables")}
                title={t("builder.backToTables")}
              >
                <BackIcon className="h-4 w-4" />
              </Button>
              <span className="flex h-8 w-8 items-center justify-center text-primary">
                <Table2 className="h-5 w-5" />
              </span>
              <input
                value={selectedTable.name}
                onChange={(e) => renameTable(selectedTable.id, e.target.value)}
                className="min-w-0 max-w-[220px] rounded-md border border-transparent bg-transparent px-1.5 py-1 text-lg font-semibold outline-none transition-colors hover:border-border focus:border-input focus:bg-card sm:max-w-[260px]"
                placeholder={t("builder.tableName")}
                aria-label={t("builder.tableName")}
              />
              <Badge variant="muted" size="sm">
                {t("builder.itemCount", { count: selectedTable.columns.length, term: terms.column })}
              </Badge>
              {selectedTable.columns.some((c) => c.primaryKey) ? (
                <Badge variant="success" size="sm">{terms.pk}</Badge>
              ) : (
                <Badge variant="warning" size="sm">{t("builder.noPk")}</Badge>
              )}
              <div className="ms-auto flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => duplicateTable(selectedTable.id)}>
                  <Copy className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("builder.duplicateTable")}</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={openNewRelation} disabled={schema.tables.length < 2}>
                  <GitBranch className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("builder.addRelation")}</span>
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmDeleteTable(true)}>
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("builder.deleteTable")}</span>
                </Button>
              </div>
            </div>

            {/* Table note + column grid */}
            <div className="flex min-h-0 flex-1 flex-col pb-24">
              <div className="border-b border-border px-3 py-1.5">
                <Input
                  value={selectedTable.note || ""}
                  onChange={(e) => setTableNote(selectedTable.id, e.target.value)}
                  placeholder={t("builder.tableNotePlaceholder")}
                  className="h-7 border-transparent bg-transparent px-1 text-xs text-muted-foreground shadow-none focus-visible:bg-card"
                />
              </div>
              <ColumnGrid
                table={selectedTable}
                onEditColumn={(col) => setEditColumn(col)}
                onCreateRelation={(draft) => setRelationDraft(draft)}
                relationFor={relationFor}
              />
              <div className="flex items-center gap-2 border-t border-border bg-card/60 px-4 py-2 text-xs text-muted-foreground">
                <Lightbulb className="h-3.5 w-3.5" />
                {t("builder.tip")}
              </div>
            </div>
          </>
        )}
      </main>

      {editColumn && selectedTable && (
        <ColumnDetails column={editColumn} table={selectedTable} onClose={() => setEditColumn(null)} />
      )}

      <RelationEditor
        open={!!relationDraft}
        initial={relationDraft}
        tables={schema.tables}
        engine={engine}
        onClose={() => setRelationDraft(null)}
        onSubmit={(rel) => {
          if (rel.id && schema.relations.some((r) => r.id === rel.id)) updateRelation(rel.id, rel);
          else addRelation(rel);
        }}
        onDelete={deleteRelation}
      />

      <ConfirmDialog
        open={!!confirmDeleteTable && !!selectedTable}
        onClose={() => setConfirmDeleteTable(false)}
        onConfirm={() => selectedTable && deleteTable(selectedTable.id)}
        title={t("confirm.deleteTableTitle")}
        body={t("confirm.deleteTableBody", { name: selectedTable?.name || t("common.untitled") })}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
      />
    </div>
  );
}
