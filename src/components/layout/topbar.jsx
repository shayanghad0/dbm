import React, { useState } from "react";
import { Database, Home, Layers, Table2, GitBranch, Upload, Download, Sparkles, Undo2, Redo2, Menu, X, Cloud, CloudOff, Loader2, Boxes, Shapes, FileInput, FileOutput } from "lucide-react";
import { cn } from "../../lib/utils";
import { useI18n } from "../../lib/i18n";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { ThemeToggle } from "../ui/theme-toggle";
import { LanguageSwitcher } from "../language-switcher";
import { EngineIcon } from "../engine-icon";
import { useBuilder } from "../../features/builder/BuilderContext";

export function Topbar({ route, navigate }) {
  const { t } = useI18n();
  const { schema, engine, canUndo, canRedo, undo, redo, renameSchema, hasSchema } = useBuilder();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { key: "home", icon: Home, label: t("nav.home") },
    { key: "builder", icon: Table2, label: t("nav.tables") },
    { key: "diagram", icon: GitBranch, label: t("nav.diagram") },
    { key: "templates", icon: Shapes, label: t("nav.templates") },
    { key: "import", icon: FileInput, label: t("nav.import") },
    { key: "export", icon: FileOutput, label: t("nav.export") },
    { key: "ai", icon: Sparkles, label: t("nav.ai") },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border/80 bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-2 px-3 sm:gap-3 sm:px-4">
        {/* Brand */}
        <button
          onClick={() => navigate("home")}
          className="group flex items-center gap-2 rounded-xl px-1.5 py-1 transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("common.home")}
        >
          <span className="flex h-8 w-8 items-center justify-center text-primary">
            <Database className="h-5 w-5" />
          </span>
          <span className="hidden text-sm font-semibold tracking-tight sm:block">
            {t("app.nameFirst")} <span className="text-primary">{t("app.nameLast")}</span>
          </span>
        </button>

        {/* Project context */}
        {hasSchema ? (
          <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
            <span className="h-5 w-px bg-border/80" aria-hidden="true" />
            <div className="flex min-w-0 max-w-md items-center gap-2 rounded-lg border border-border/70 bg-card/40 px-2 py-1">
              <EngineIcon engine={engine} size="sm" />
              <input
                value={schema?.name || ""}
                onChange={(e) => renameSchema(e.target.value)}
                placeholder={t("common.untitledProject")}
                className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/70"
                aria-label={t("builder.projectName")}
              />
              {engine && (
                <span className="hidden shrink-0 text-[11px] text-muted-foreground lg:inline">{engine.label}</span>
              )}
            </div>
            <span className="hidden items-center gap-1.5 text-xs text-muted-foreground xl:inline-flex" aria-live="polite">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              {t("builder.autosaved")}
            </span>
          </div>
        ) : (
          <div className="hidden flex-1 md:block" />
        )}

        <div className="ms-auto flex items-center gap-1 sm:gap-1.5">
          {hasSchema && (
            <div className="hidden items-center rounded-lg border border-border/70 bg-card/30 p-0.5 sm:flex">
              <Button variant="ghost" size="iconSm" onClick={undo} disabled={!canUndo} title={t("builder.undo")} aria-label={t("builder.undo")}>
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="iconSm" onClick={redo} disabled={!canRedo} title={t("builder.redo")} aria-label={t("builder.redo")}>
                <Redo2 className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-card/30 p-0.5">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-card/30 hover:bg-accent md:hidden"
            onClick={() => setMenuOpen(true)}
            aria-label={t("common.menu")}
          >
            <Menu className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 end-0 flex w-[18rem] max-w-[85vw] flex-col border-s border-border bg-card p-4 shadow-2xl animate-slide-in-end">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold">{t("common.menu")}</span>
              <Button variant="ghost" size="iconSm" onClick={() => setMenuOpen(false)} aria-label={t("common.close")}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {hasSchema && (
              <div className="mb-4 rounded-xl border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2">
                  <EngineIcon engine={engine} size="sm" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{schema?.name || t("common.untitledProject")}</div>
                    {engine && <div className="text-xs text-muted-foreground">{engine.label}</div>}
                  </div>
                </div>
              </div>
            )}
            <nav className="flex flex-1 flex-col gap-1">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    navigate(item.key);
                    setMenuOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    route === item.key ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
