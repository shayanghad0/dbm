import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, ClipboardPaste, FileCode2, FileInput, FileJson, FileUp, Globe, Loader2, Sparkles, Upload, Wand2, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { useI18n } from "../../lib/i18n";
import { useBuilder } from "../builder/BuilderContext";
import { detectFormat, parseFile, summarize } from "../../parsers";
import { ENGINE_LIST, getEngine } from "../../database-engines";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input, Textarea } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { EmptyState } from "../../components/ui/empty-state";
import { Spinner } from "../../components/ui/spinner";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { useToast } from "../../components/ui/toast";
import { EngineIcon } from "../../components/engine-icon";

export function ImportPage({ navigate }) {
  const { t } = useI18n();
  const { schema, engine, hasSchema, importSchema } = useBuilder();
  const { push } = useToast();

  const [mode, setMode] = useState("file");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [format, setFormat] = useState(null);
  const [engineId, setEngineId] = useState(null);
  const [over, setOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [examples, setExamples] = useState([]);
  const inputRef = useRef(null);

  const detected = useMemo(() => (text.trim() ? detectFormat(text, fileName) : null), [text, fileName]);
  const activeFormat = format || detected;

  // Try loading example files from the API (gracefully hidden offline)
  useEffect(() => {
    let alive = true;
    fetch("/api/examples")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && data?.examples) setExamples(data.examples);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const readFile = async (file) => {
    if (!file) return;
    setError(null);
    try {
      const content = await file.text();
      setText(content);
      setFileName(file.name);
      setFormat(null);
      setResult(null);
      setMode("paste");
    } catch {
      setError(t("import.readError"));
    }
  };

  const loadExample = async (ex) => {
    try {
      const res = await fetch(`/api/examples/${encodeURIComponent(ex.id)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setText(data.content);
      setFileName(ex.filename);
      setFormat(null);
      setResult(null);
      setMode("paste");
    } catch {
      push({ title: t("common.error"), description: t("import.readError"), variant: "error" });
    }
  };

  const doParse = () => {
    setError(null);
    setResult(null);
    if (!text.trim()) {
      setError(t("import.emptyError"));
      return;
    }
    const fmt = activeFormat;
    if (!fmt) {
      setError(t("import.unknownFormat"));
      return;
    }
    setParsing(true);
    // run async so the loading state is visible and the UI never blocks
    setTimeout(() => {
      try {
        const parsed = parseFile(text, fmt);
        if (!parsed.tables?.length) throw new Error(t("import.noTables"));
        const suggested = parsed.engineHint && getEngine(parsed.engineHint) ? parsed.engineHint : engine?.id || "mysql";
        setEngineId((prev) => prev || suggested);
        setResult({ ...parsed, format: fmt, summary: summarize(parsed) });
      } catch (e) {
        setError(e.message || t("import.parseError"));
      } finally {
        setParsing(false);
      }
    }, 120);
  };

  const doImport = () => {
    if (!result) return;
    const targetEngine = engineId || engine?.id || "mysql";
    importSchema(
      { name: result.name || "", engine: targetEngine, tables: result.tables, relations: result.relations },
      { engineId: targetEngine, name: result.name || fileName.replace(/\.[^.]+$/, "") || undefined }
    );
    push({ title: t("toast.imported"), description: t("toast.importedDesc", { tables: result.summary.tables }), variant: "success" });
    navigate("builder");
  };

  const requestImport = () => {
    if (hasSchema && schema?.tables?.length) setConfirmReplace(true);
    else doImport();
  };

  const engineOptions = ENGINE_LIST.map((e) => ({ value: e.id, label: e.label, group: e.family === "sql" ? "SQL" : "NoSQL" }));
  const formatOptions = [
    { value: "sql", label: t("import.formats.sql") },
    { value: "json", label: t("import.formats.json") },
    { value: "prisma", label: t("import.formats.prisma") },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-6">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center text-primary">
          <FileInput className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-xl font-bold">{t("import.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("import.subtitle")}</p>
        </div>
        {detected && (
          <Badge variant="default" className="ms-auto gap-1">
            <Wand2 className="h-3 w-3" />
            {t("import.detected")}: {t(`import.formats.${detected}`)}
          </Badge>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Source panel */}
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex gap-1 rounded-lg bg-muted p-1">
            {[
              { key: "file", icon: Upload, label: t("import.modeFile") },
              { key: "paste", icon: ClipboardPaste, label: t("import.modePaste") },
            ].map((m) => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors", mode === m.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}
                aria-pressed={mode === m.key}
              >
                <m.icon className="h-3.5 w-3.5" />
                {m.label}
              </button>
            ))}
          </div>

          {mode === "file" ? (
            <div
              className={cn("dropzone flex cursor-pointer flex-col items-center justify-center gap-2 px-4 py-12 text-center", over && "is-over")}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(true);
              }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setOver(false);
                readFile(e.dataTransfer.files?.[0]);
              }}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
            >
              <span className="flex h-12 w-12 items-center justify-center text-primary">
                <FileUp className="h-7 w-7" />
              </span>
              <div className="font-medium">{t("import.dropzone")}</div>
              <div className="text-xs text-muted-foreground">{t("import.dropHint")}</div>
              <div className="mt-1 flex gap-1.5">
                <Badge variant="muted" size="sm">.sql</Badge>
                <Badge variant="muted" size="sm">.json</Badge>
                <Badge variant="muted" size="sm">.prisma</Badge>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".sql,.json,.prisma,.txt"
                className="hidden"
                onChange={(e) => readFile(e.target.files?.[0])}
              />
            </div>
          ) : (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("import.pasteHint")}</span>
                {fileName && (
                  <Badge variant="muted" size="sm" className="gap-1">
                    {fileName}
                    <button onClick={() => { setFileName(""); setText(""); setResult(null); }} aria-label={t("common.clear")}>
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                )}
              </div>
              <Textarea
                value={text}
                onChange={(e) => { setText(e.target.value); setResult(null); setError(null); }}
                placeholder={t("import.pastePlaceholder")}
                className="mono h-64 resize-y text-xs leading-relaxed"
                spellCheck={false}
                aria-label={t("import.pastePlaceholder")}
              />
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">{t("import.format")}</span>
              <Select
                value={activeFormat || ""}
                onChange={(v) => setFormat(v || null)}
                options={[{ value: "", label: t("import.autoDetect") }, ...formatOptions]}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">{t("import.targetEngine")}</span>
              <Select
                value={engineId || ""}
                onChange={(v) => setEngineId(v || null)}
                options={[{ value: "", label: t("import.autoEngine") }, ...engineOptions]}
                searchable
              />
            </label>
          </div>

          <Button className="mt-4 w-full" onClick={doParse} disabled={parsing || !text.trim()}>
            {parsing ? <Spinner /> : <Sparkles className="h-4 w-4" />}
            {parsing ? t("import.parsing") : t("import.parse")}
          </Button>

          {error && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}

          {examples.length > 0 && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <Globe className="h-3 w-3" /> {t("import.examples")}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {examples.map((ex) => (
                  <button key={ex.id} onClick={() => loadExample(ex)} className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary">
                    {ex.filename}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Preview panel */}
        <section className="flex min-h-[420px] flex-col rounded-xl border border-border bg-card p-4">
          {!result ? (
            <EmptyState
              icon={FileJson}
              title={t("import.previewTitle")}
              description={t("import.previewHint")}
              className="flex-1"
            />
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {t("import.parsedOk")}
                </Badge>
                <Badge variant="muted">{result.summary.tables} {t("common.tables")}</Badge>
                <Badge variant="muted">{result.summary.columns} {t("common.columns")}</Badge>
                <Badge variant="muted">{result.summary.relations} {t("common.relationsCount")}</Badge>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pe-1">
                <div>
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("import.tablesFound")}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {result.tables.map((tb, i) => (
                      <span key={i} className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs">
                        <FileCode2 className="h-3 w-3 text-primary" />
                        <span className="mono">{tb.name}</span>
                        <span className="text-muted-foreground tnum">({tb.columns.length})</span>
                      </span>
                    ))}
                  </div>
                </div>
                {result.relations.length > 0 && (
                  <div>
                    <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("import.relationsFound")}</h3>
                    <ul className="space-y-1">
                      {result.relations.map((r, i) => (
                        <li key={i} className="flex items-center gap-1 rounded-md bg-muted/60 px-2 py-1 text-[11px]">
                          <span className="mono truncate">{r.sourceTable}.{r.sourceColumn}</span>
                          <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground rtl:rotate-180" />
                          <span className="mono truncate">{r.targetTable}.{r.targetColumn || "id"}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                  {engineId ? <EngineIcon engine={getEngine(engineId)} size="xs" /> : null}
                  <span className="truncate">{engineId ? getEngine(engineId)?.label : t("import.autoEngine")}</span>
                </div>
                <Button className="ms-auto" onClick={requestImport}>
                  {t("import.openInBuilder")}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </Button>
              </div>
            </>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={confirmReplace}
        onClose={() => setConfirmReplace(false)}
        onConfirm={doImport}
        title={t("confirm.replaceSchemaTitle")}
        body={t("confirm.replaceSchemaBody")}
        confirmLabel={t("import.openInBuilder")}
        cancelLabel={t("common.cancel")}
      />
    </div>
  );
}
