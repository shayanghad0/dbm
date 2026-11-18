import React, { useMemo, useState } from "react";
import { ArrowRight, Clock, Database, FileInput, Search, Shapes, Sparkles, Trash2, Table2 } from "lucide-react";
import { BackgroundPaths } from "../../components/ui/background-paths";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { SpotlightCard } from "../../components/ui/spotlight-card";
import { EmptyState } from "../../components/ui/empty-state";
import { EngineIcon } from "../../components/engine-icon";
import { listEngines } from "../../database-engines";
import { useI18n } from "../../lib/i18n";
import { cn, formatDate } from "../../lib/utils";
import { useBuilder } from "../builder/BuilderContext";
import { removeRecent, loadRecents } from "../../lib/storage";

export function WelcomePage({ navigate }) {
  const { t, isRtl, lang } = useI18n();
  const { schema, hasSchema, newSchema, load, renameSchema } = useBuilder();
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("all");
  const [recents, setRecents] = useState(loadRecents());

  const engines = useMemo(() => {
    return listEngines().filter((e) => {
      if (family !== "all" && e.family !== family) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return e.label.toLowerCase().includes(q) || (e.desc + e.descFa).toLowerCase().includes(q);
    });
  }, [query, family]);

  const openEngine = (engineId) => {
    newSchema(engineId);
    navigate("builder");
  };

  const openRecent = (recent) => {
    load(recent.schema);
    navigate("builder");
  };

  const continueSchema = () => {
    navigate("builder");
  };

  return (
    <BackgroundPaths>
      <div className="mx-auto max-w-5xl px-4 pb-28 pt-14 sm:pt-20">
        {/* Hero */}
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="default" className="mb-4 gap-1.5">
            <Sparkles className="h-3 w-3" />
            {t("welcome.badge")}
          </Badge>
          <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-5xl">
            {t("welcome.title")}
          </h1>
          <p className="mt-3 text-pretty text-muted-foreground sm:text-lg">{t("welcome.subtitle")}</p>

          {hasSchema && (
            <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-2">
              <Button size="lg" variant="glow" onClick={continueSchema}>
                <Table2 className="h-4 w-4" />
                {t("welcome.continue", { name: schema?.name || t("common.untitledProject") })}
                <ArrowRight className={cn("h-4 w-4", isRtl && "rotate-180")} />
              </Button>
            </div>
          )}
        </div>

        {/* Search + filters */}
        <div className="mx-auto mt-10 max-w-xl">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("welcome.search")}
              className="h-11 ps-9 text-base"
              aria-label={t("welcome.search")}
            />
          </div>
          <div className="mt-3 flex justify-center gap-1 rounded-full border border-border bg-card p-1 text-xs font-medium w-fit mx-auto">
            {[
              { key: "all", label: t("welcome.family.all") },
              { key: "sql", label: t("welcome.family.sql") },
              { key: "nosql", label: t("welcome.family.nosql") },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFamily(f.key)}
                className={cn("rounded-full px-4 py-1.5 transition-colors", family === f.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                aria-pressed={family === f.key}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Engine grid */}
        {engines.length === 0 ? (
          <EmptyState
            icon={Search}
            title={t("welcome.noResults")}
            description={t("welcome.noResultsHint")}
            className="mt-10"
          />
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {engines.map((engine, i) => (
              <SpotlightCard
                key={engine.id}
                hue={250}
                onClick={() => openEngine(engine.id)}
                className="flex flex-col items-center gap-3 text-center"
                style={{ animationDelay: `${i * 25}ms` }}
              >
                <EngineIcon engine={engine} size="lg" className="transition-transform duration-300 group-hover:scale-110" />
                <div>
                  <div className="font-semibold">{engine.label}</div>
                  <Badge variant={engine.family === "sql" ? "default" : "secondary"} size="sm" className="mt-1">
                    {engine.family === "sql" ? "SQL" : "NoSQL"}
                  </Badge>
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">{isRtl ? engine.descFa : engine.desc}</p>
              </SpotlightCard>
            ))}
          </div>
        )}

        {/* Recents + quick actions */}
        <div className="mt-14 grid gap-4 md:grid-cols-2">
          <section className="rounded-xl border border-border bg-card/60 p-4 backdrop-blur">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {t("welcome.recent")}
            </div>
            {recents.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">{t("welcome.noRecent")}</p>
            ) : (
              <ul className="space-y-2">
                {recents.map((r) => (
                  <li key={r.id} className="group flex items-center gap-3 rounded-lg border border-transparent px-2 py-1.5 transition-colors hover:border-border hover:bg-accent/40">
                    <EngineIcon engine={{ id: r.engine, color: "#64748b" }} size="xs" />
                    <button onClick={() => openRecent(r)} className="min-w-0 flex-1 text-start">
                      <span className="block truncate text-sm font-medium">{r.name || t("common.untitledProject")}</span>
                      <span className="text-[11px] text-muted-foreground">{r.tables} {t("common.tables")} · {formatDate(r.updatedAt, lang)}</span>
                    </button>
                    <Button
                      variant="ghost"
                      size="iconSm"
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRecents(removeRecent(r.id));
                      }}
                      aria-label={t("common.delete")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-4 backdrop-blur">
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              {t("welcome.quickStart")}
            </div>
            <QuickAction icon={Shapes} title={t("welcome.startTemplate")} desc={t("welcome.startTemplateDesc")} onClick={() => navigate("templates")} />
            <QuickAction icon={FileInput} title={t("welcome.startImport")} desc={t("welcome.startImportDesc")} onClick={() => navigate("import")} />
            <QuickAction icon={Database} title={t("welcome.startBlank")} desc={t("welcome.startBlankDesc")} onClick={() => openEngine("mysql")} />
          </section>
        </div>
      </div>
    </BackgroundPaths>
  );
}

function QuickAction({ icon: Icon, title, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 rounded-lg border border-border bg-background/60 p-3 text-start transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center text-primary transition-transform group-hover:scale-110">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">{desc}</span>
      </span>
      <ArrowRight className="ms-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
    </button>
  );
}
