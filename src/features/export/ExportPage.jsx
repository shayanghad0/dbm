import React, { useMemo, useState } from "react";
import { AlertTriangle, Check, ChevronDown, Copy, Download, FileCode2, FileJson, FileText, Braces, Database, Server, ShieldCheck } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { useBuilder } from "../builder/BuilderContext";
import { generateExport, formatsFor, mimeFor } from "../../generators";
import { copyToClipboard, downloadFile, escapeHtml, slugify, cn } from "../../lib/utils";
import { useToast } from "../../components/ui/toast";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { EmptyState } from "../../components/ui/empty-state";
import { EngineIcon } from "../../components/engine-icon";
import { useServerStatus } from "../../lib/use-server-status";

const FORMAT_ICONS = {
  sql: FileCode2,
  engine: Database,
  json: Braces,
  prisma: FileCode2,
  markdown: FileText,
};

export function ExportPage({ navigate }) {
  const { t } = useI18n();
  const { schema, engine, hasSchema } = useBuilder();
  const { push } = useToast();
  const serverStatus = useServerStatus();
  const formats = useMemo(() => (engine ? formatsFor(engine) : []), [engine]);
  const [format, setFormat] = useState(null);
  const [filename, setFilename] = useState("");
  const [copied, setCopied] = useState(false);

  // A format chosen for a previous engine may not exist for the current one
  // (e.g. Prisma → Oracle), so fall back to the first format the engine supports.
  const activeFormat = useMemo(() => {
    if (format && formats.some((f) => f.id === format)) return format;
    return formats[0]?.id || "json";
  }, [format, formats]);

  const result = useMemo(() => {
    if (!schema || !engine) return { content: "", error: null };
    try {
      return { content: generateExport(schema, engine, activeFormat), error: null };
    } catch (e) {
      return { content: "", error: e.message };
    }
  }, [schema, engine, activeFormat]);

  const issues = useMemo(() => (schema && engine ? engine.validate(schema) : []), [schema, engine]);
  const { content, error } = result;

  if (!hasSchema) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4">
        <EmptyState
          icon={Download}
          title={t("builder.noDatabaseTitle")}
          description={t("builder.noDatabaseHint")}
          action={<Button onClick={() => navigate("home")}>{t("nav.home")}</Button>}
          className="w-full border border-border bg-card"
        />
      </div>
    );
  }

  const ext = formats.find((f) => f.id === activeFormat)?.ext || "txt";
  const defaultName = `${slugify(schema.name || "database")}-schema.${ext}`;

  const doDownload = () => {
    if (!content) return;
    downloadFile(content, filename.trim() || defaultName, mimeFor(activeFormat));
    push({ title: t("toast.exported"), description: filename.trim() || defaultName, variant: "success" });
  };

  const doCopy = async () => {
    if (!content) return;
    const ok = await copyToClipboard(content);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      push({ title: t("toast.copied"), variant: "success" });
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-28 pt-6">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <EngineIcon engine={engine} size="md" />
        <div className="min-w-0">
          <h1 className="text-xl font-bold">{t("export.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("export.subtitle", { engine: engine.label })}</p>
        </div>
        <div className="ms-auto flex items-center gap-2">
          <Badge variant={serverStatus === "online" ? "success" : "muted"} className="gap-1">
            <Server className="h-3 w-3" />
            {t(serverStatus === "online" ? "export.apiOnline" : "export.apiOffline")}
          </Badge>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        {/* Format picker */}
        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-card p-3">
            <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("export.format")}</h2>
            <div className="grid gap-1.5">
              {formats.map((f) => {
                const Icon = FORMAT_ICONS[f.id] || FileText;
                const active = activeFormat === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFormat(f.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-2.5 text-start transition-colors",
                      active ? "border-primary/50 bg-primary/10" : "border-transparent hover:bg-accent/50"
                    )}
                    aria-pressed={active}
                  >
                    <span className={cn("flex h-8 w-8 items-center justify-center", active ? "text-primary" : "text-muted-foreground")}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {f.id === "engine" ? t("export.nativeFor", { engine: engine.label }) : t(`export.formats.${f.id}`)}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">{t(`export.formatDesc.${f.id}`)}</span>
                    </span>
                    {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-3">
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("export.filename")}</label>
            <div className="mt-2 flex items-center gap-1">
              <Input value={filename} onChange={(e) => setFilename(e.target.value)} placeholder={slugify(schema.name || "database") + "-schema"} className="h-8 text-xs" />
              <Badge variant="muted" size="sm">.{ext}</Badge>
            </div>
            <Button variant="glow" className="mt-3 w-full" onClick={doDownload} disabled={!content || !!error}>
              <Download className="h-4 w-4" />
              {t("export.download")}
            </Button>
          </section>

          <section className="rounded-xl border border-border bg-card p-3">
            <h2 className="mb-1 flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t("export.checks")}
            </h2>
            {issues.length === 0 ? (
              <p className="flex items-center gap-1.5 px-1 py-2 text-xs text-success">
                <Check className="h-3.5 w-3.5" /> {t("builder.noIssues")}
              </p>
            ) : (
              <ul className="max-h-44 space-y-1 overflow-y-auto">
                {issues.slice(0, 30).map((issue, i) => (
                  <li key={i} className="flex items-start gap-1.5 px-1 py-0.5 text-[11px] text-muted-foreground">
                    <AlertTriangle className={cn("mt-0.5 h-3 w-3 shrink-0", issue.level === "error" ? "text-destructive" : "text-warning")} />
                    {t(`validation.${issue.code}`, issue.params || {})}
                  </li>
                ))}
              </ul>
            )}
            {issues.some((i) => i.level === "error") && (
              <p className="mt-1 rounded-md bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive">{t("export.errorsNote")}</p>
            )}
          </section>
        </div>

        {/* Preview */}
        <section className="flex min-h-[420px] flex-col overflow-hidden rounded-xl border border-border bg-[#0d1117] dark:bg-[#0b0e14]">
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
            <span className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
            </span>
            <span className="mono text-[11px] text-zinc-400">{filename.trim() || defaultName}</span>
            <div className="ms-auto flex items-center gap-1">
              <Badge variant="muted" size="sm" className="border-0 bg-white/10 text-zinc-300 tnum">{content.split("\n").length} {t("export.lines")}</Badge>
              <Button variant="ghost" size="sm" className="h-7 text-zinc-300 hover:bg-white/10 hover:text-white" onClick={doCopy}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? t("common.copied") : t("export.copy")}
              </Button>
            </div>
          </div>
          {error ? (
            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-red-300">{error}</div>
          ) : (
            <pre className="code-highlight mono flex-1 overflow-auto p-4 text-[12px] leading-relaxed text-zinc-200">
              <code dangerouslySetInnerHTML={{ __html: highlight(content) }} />
            </pre>
          )}
        </section>
      </div>
    </div>
  );
}

/** Lightweight syntax highlighter for previews (comments, strings, numbers). */
function highlight(code) {
  const re = /(\/\/[^\n]*|--[^\n]*|#[^\n]*)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)|\b(\d+(?:\.\d+)?)\b/g;
  let out = "";
  let last = 0;
  let m;
  while ((m = re.exec(code))) {
    out += escapeHtml(code.slice(last, m.index));
    if (m[1]) out += `<span class="tok-com">${escapeHtml(m[1])}</span>`;
    else if (m[2]) out += `<span class="tok-str">${escapeHtml(m[2])}</span>`;
    else out += `<span class="tok-num">${escapeHtml(m[3])}</span>`;
    last = m.index + m[0].length;
  }
  out += escapeHtml(code.slice(last));
  return out;
}
