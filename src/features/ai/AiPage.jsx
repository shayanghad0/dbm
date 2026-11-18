import React, { useMemo, useState } from "react";
import { ArrowRight, Bot, Check, CheckCircle2, Cpu, Loader2, Sparkles, Table2, Wand2, ServerCog, ShieldCheck, GitBranch } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { useBuilder } from "../builder/BuilderContext";
import { generateSchemaWithAi } from "./aiClient";
import { ENGINE_LIST, getEngine } from "../../database-engines";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Textarea } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Spinner } from "../../components/ui/spinner";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { useToast } from "../../components/ui/toast";
import { EngineIcon } from "../../components/engine-icon";
import { cn } from "../../lib/utils";

export function AiPage({ navigate }) {
  const { t } = useI18n();
  const { schema, engine, hasSchema, importSchema } = useBuilder();
  const { push } = useToast();
  const [prompt, setPrompt] = useState("");
  const [engineId, setEngineId] = useState(engine?.id || "mysql");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [confirmReplace, setConfirmReplace] = useState(false);

  const engineOptions = ENGINE_LIST.map((e) => ({ value: e.id, label: e.label, group: e.family === "sql" ? "SQL" : "NoSQL" }));
  const examples = useMemo(() => [t("ai.example1"), t("ai.example2"), t("ai.example3")], [t]);

  const generate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await generateSchemaWithAi({ prompt, engineId, schema });
      setResult(res);
    } catch (e) {
      push({ title: t("common.error"), description: e.message, variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    if (!result?.schema) return;
    importSchema(
      { ...result.schema, engine: engineId },
      { engineId, name: result.schema.name }
    );
    push({ title: t("toast.aiApplied"), description: t("toast.aiAppliedDesc", { tables: result.schema.tables.length }), variant: "success" });
    navigate("builder");
  };

  const requestApply = () => {
    if (hasSchema && schema?.tables?.length) setConfirmReplace(true);
    else apply();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 pb-28 pt-6">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-primary text-white shadow-glow">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            {t("ai.title")}
            <Badge variant="default" className="gap-1"><Wand2 className="h-3 w-3" />{t("ai.ready")}</Badge>
          </h1>
          <p className="text-sm text-muted-foreground">{t("ai.subtitle")}</p>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <label className="mb-2 block text-xs font-medium text-muted-foreground" htmlFor="ai-prompt">
          {t("ai.promptLabel")}
        </label>
        <Textarea
          id="ai-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t("ai.placeholder")}
          className="min-h-[110px] text-sm"
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") generate();
          }}
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {examples.map((ex) => (
            <button key={ex} onClick={() => setPrompt(ex)} className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary">
              {ex}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="w-52">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">{t("ai.targetEngine")}</span>
            <Select value={engineId} onChange={setEngineId} options={engineOptions} searchable />
          </div>
          <Button variant="glow" onClick={generate} disabled={loading || !prompt.trim()} className="ms-auto">
            {loading ? <Spinner /> : <Sparkles className="h-4 w-4" />}
            {loading ? t("ai.generating") : t("ai.generate")}
          </Button>
        </div>
      </section>

      {loading && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground animate-fade-in">
          <Bot className="h-5 w-5 text-primary" />
          {t("ai.thinking")}
        </div>
      )}

      {result && (
        <section className="mt-4 overflow-hidden rounded-xl border border-primary/30 bg-card animate-slide-up">
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-primary/5 px-4 py-3">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-sm font-semibold">{t("ai.resultTitle")}</span>
            <Badge variant="muted" size="sm" className="gap-1">
              {result.source === "stub" ? <Cpu className="h-3 w-3" /> : <ServerCog className="h-3 w-3" />}
              {t(result.source === "stub" ? "ai.localEngine" : "ai.serverModel")}
            </Badge>
            <div className="ms-auto flex gap-1.5">
              <Badge variant="muted" size="sm">{result.schema.tables.length} {t("common.tables")}</Badge>
              <Badge variant="muted" size="sm">{(result.schema.relations || []).length} {t("common.relationsCount")}</Badge>
            </div>
          </div>
          <div className="grid gap-4 p-4 md:grid-cols-2">
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <GitBranch className="h-3.5 w-3.5" /> {t("ai.planTitle")}
              </h3>
              <ol className="space-y-1.5">
                {(result.plan || []).map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                    {t(step.key, step.params || {})}
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Table2 className="h-3.5 w-3.5" /> {t("ai.schemaTitle")}
              </h3>
              <div className="space-y-1">
                {result.schema.tables.map((tb) => (
                  <div key={tb.name} className="flex items-center gap-2 rounded-md bg-muted/60 px-2 py-1.5 text-xs">
                    <Table2 className="h-3 w-3 text-primary" />
                    <span className="mono font-medium">{tb.name}</span>
                    <span className="ms-auto text-[10px] text-muted-foreground">{tb.columns.length} {t("common.columns")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <EngineIcon engine={getEngine(engineId)} size="xs" />
              {getEngine(engineId)?.label}
            </div>
            <Button variant="ghost" size="sm" className="ms-auto" onClick={() => setResult(null)}>{t("common.clear")}</Button>
            <Button size="sm" onClick={requestApply}>
              {t("ai.apply")}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Button>
          </div>
        </section>
      )}

      <section className="mt-6 rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm">
        <div className="mb-2 flex items-center gap-2 font-semibold">
          <ShieldCheck className="h-4 w-4 text-primary" />
          {t("ai.architectureTitle")}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{t("ai.architectureBody")}</p>
        <div className="mt-3 grid gap-1.5 text-[11px] text-muted-foreground sm:grid-cols-2">
          <code className="rounded bg-card px-2 py-1">src/features/ai/aiClient.js</code>
          <code className="rounded bg-card px-2 py-1">src/features/ai/promptBuilder.js</code>
          <code className="rounded bg-card px-2 py-1">server/controllers/ai.controller.js</code>
          <code className="rounded bg-card px-2 py-1">AI_API_KEY · AI_MODEL · AI_BASE_URL</code>
        </div>
      </section>

      <ConfirmDialog
        open={confirmReplace}
        onClose={() => setConfirmReplace(false)}
        onConfirm={apply}
        title={t("confirm.replaceSchemaTitle")}
        body={t("confirm.replaceSchemaBody")}
        confirmLabel={t("ai.apply")}
        cancelLabel={t("common.cancel")}
      />
    </div>
  );
}
