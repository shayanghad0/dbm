import React, { useState } from "react";
import { ArrowRight, Check, GitBranch, ShoppingCart, GraduationCap, Briefcase, Landmark, Newspaper, Users, TrendingUp, Shapes, Table2, Eye } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { useBuilder } from "../builder/BuilderContext";
import { TEMPLATES } from "../../templates";
import { SpotlightCard } from "../../components/ui/spotlight-card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Modal } from "../../components/ui/modal";
import { Select } from "../../components/ui/select";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { EngineIcon } from "../../components/engine-icon";
import { ENGINE_LIST } from "../../database-engines";
import { useToast } from "../../components/ui/toast";
import { cn } from "../../lib/utils";

const ICONS = { ShoppingCart, GraduationCap, Briefcase, Landmark, Newspaper, Users, TrendingUp };

export function TemplatesPage({ navigate }) {
  const { t, isRtl } = useI18n();
  const { schema, engine, hasSchema, importSchema } = useBuilder();
  const { push } = useToast();
  const [preview, setPreview] = useState(null);
  const [targetEngine, setTargetEngine] = useState(null);
  const [confirmApply, setConfirmApply] = useState(false);

  const engineOptions = ENGINE_LIST.map((e) => ({ value: e.id, label: e.label, group: e.family === "sql" ? "SQL" : "NoSQL" }));
  const selectedEngineId = targetEngine || engine?.id || "mysql";

  const openPreview = (tpl) => {
    setPreview(tpl);
    setTargetEngine(engine?.id || "mysql");
  };

  const apply = () => {
    if (!preview) return;
    importSchema(
      { name: t(preview.nameKey), engine: selectedEngineId, tables: preview.schema.tables, relations: preview.schema.relations },
      { engineId: selectedEngineId, name: t(preview.nameKey) }
    );
    push({ title: t("toast.templateApplied"), description: t("toast.templateAppliedDesc", { name: t(preview.nameKey) }), variant: "success" });
    setPreview(null);
    navigate("builder");
  };

  const requestApply = () => {
    if (hasSchema && schema?.tables?.length) setConfirmApply(true);
    else apply();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-6">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center text-primary">
          <Shapes className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-xl font-bold">{t("templates.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("templates.subtitle")}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((tpl, i) => {
          const Icon = ICONS[tpl.icon] || Table2;
          const columns = tpl.schema.tables.reduce((n, tb) => n + tb.columns.length, 0);
          return (
            <SpotlightCard key={tpl.id} hue={tpl.color ? hueOfColor(tpl.color) : 250} className="flex flex-col" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="mb-3 flex items-start justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm" style={{ background: `linear-gradient(135deg, ${tpl.color}, ${tpl.color}CC)` }}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="flex gap-1">
                  <Badge variant="muted" size="sm">{tpl.schema.tables.length} {t("common.tables")}</Badge>
                  <Badge variant="muted" size="sm">{tpl.schema.relations.length} {t("common.links")}</Badge>
                </div>
              </div>
              <h3 className="text-base font-semibold">{t(tpl.nameKey)}</h3>
              <p className="mt-1 flex-1 text-sm text-muted-foreground">{t(tpl.descKey)}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {tpl.schema.tables.slice(0, 4).map((tb) => (
                  <span key={tb.name} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground mono">{tb.name}</span>
                ))}
                {tpl.schema.tables.length > 4 && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">+{tpl.schema.tables.length - 4}</span>}
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => openPreview(tpl)}>
                  <Eye className="h-4 w-4" />
                  {t("templates.preview")}
                </Button>
                <Button size="sm" className="flex-1" onClick={() => openPreview(tpl)}>
                  {t("templates.use")}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </Button>
              </div>
            </SpotlightCard>
          );
        })}
      </div>

      {/* Preview modal */}
      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview ? t(preview.nameKey) : ""}
        size="lg"
        footer={
          <>
            <div className="me-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("templates.targetEngine")}</span>
              <Select value={selectedEngineId} onChange={setTargetEngine} options={engineOptions} searchable className="w-40" />
            </div>
            <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>{t("common.cancel")}</Button>
            <Button size="sm" onClick={requestApply}>
              <Check className="h-4 w-4" />
              {t("templates.use")}
            </Button>
          </>
        }
      >
        {preview && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <EngineIcon engine={ENGINE_LIST.find((e) => e.id === selectedEngineId)} size="xs" />
              <span>{isRtl ? preview.schema.name : preview.schema.name}</span>
              <span>·</span>
              <span>{preview.schema.tables.length} {t("common.tables")}</span>
              <span>·</span>
              <span>{preview.schema.tables.reduce((n, tb) => n + tb.columns.length, 0)} {t("common.columns")}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {preview.schema.tables.map((tb) => (
                <div key={tb.name} className="rounded-lg border border-border p-3">
                  <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
                    <Table2 className="h-3.5 w-3.5 text-primary" />
                    <span className="mono">{tb.name}</span>
                    <Badge variant="muted" size="sm" className="ms-auto">{tb.columns.length}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {tb.columns.slice(0, 8).map((c) => (
                      <span key={c.name} className={cn("rounded px-1.5 py-0.5 text-[10px] mono", c.primaryKey ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                        {c.name}
                      </span>
                    ))}
                    {tb.columns.length > 8 && <span className="text-[10px] text-muted-foreground">+{tb.columns.length - 8}</span>}
                  </div>
                </div>
              ))}
            </div>
            {preview.schema.relations.length > 0 && (
              <div>
                <div className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                  <GitBranch className="h-3 w-3" /> {t("builder.relations")}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {preview.schema.relations.map((r, i) => (
                    <span key={i} className="rounded-md border border-border bg-muted/50 px-2 py-0.5 text-[10px] mono">
                      {r.sourceTable}.{r.sourceColumn} → {r.targetTable} <span className="text-muted-foreground">({r.type})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmApply}
        onClose={() => setConfirmApply(false)}
        onConfirm={apply}
        title={t("confirm.replaceSchemaTitle")}
        body={t("confirm.replaceSchemaBody")}
        confirmLabel={t("templates.use")}
        cancelLabel={t("common.cancel")}
      />
    </div>
  );
}

/** Rough hue extraction from hex color for spotlight tint */
function hueOfColor(hex) {
  try {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0;
    const d = max - min;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
    }
    return Math.round(h * 60 + 360) % 360;
  } catch {
    return 250;
  }
}
