import React, { useEffect } from "react";
import { Home, Table2, GitBranch, Shapes, FileInput, FileOutput, Sparkles } from "lucide-react";
import { I18nProvider, useI18n } from "./lib/i18n";
import { ThemeProvider } from "./lib/theme";
import { ToastProvider } from "./components/ui/toast";
import { useHashRoute } from "./lib/router";
import { BuilderProvider, useBuilder } from "./features/builder/BuilderContext";
import { Topbar } from "./components/layout/topbar";
import { Dock } from "./components/ui/dock";
import { WelcomePage } from "./features/welcome/WelcomePage";
import { BuilderPage } from "./features/builder/BuilderPage";
import { DiagramPage } from "./features/diagram/DiagramPage";
import { ExportPage } from "./features/export/ExportPage";
import { ImportPage } from "./features/import/ImportPage";
import { TemplatesPage } from "./features/templates/TemplatesPage";
import { AiPage } from "./features/ai/AiPage";

function Shell() {
  const { t } = useI18n();
  const [route, navigate] = useHashRoute();
  const { hasSchema, undo, redo, canUndo, canRedo } = useBuilder();

  // Global undo/redo shortcuts (ignored inside form fields)
  useEffect(() => {
    const onKey = (e) => {
      const el = document.activeElement;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (typing) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((mod && e.key.toLowerCase() === "y") || (mod && e.shiftKey && e.key.toLowerCase() === "z")) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const pages = {
    home: <WelcomePage navigate={navigate} />,
    builder: <BuilderPage navigate={navigate} />,
    diagram: <DiagramPage navigate={navigate} />,
    templates: <TemplatesPage navigate={navigate} />,
    import: <ImportPage navigate={navigate} />,
    export: <ExportPage navigate={navigate} />,
    ai: <AiPage navigate={navigate} />,
  };

  const dockItems = [
    { key: "home", icon: Home, label: t("nav.home") },
    { separator: true },
    { key: "builder", icon: Table2, label: t("nav.tables") },
    { key: "diagram", icon: GitBranch, label: t("nav.diagram") },
    { separator: true },
    { key: "templates", icon: Shapes, label: t("nav.templates") },
    { key: "import", icon: FileInput, label: t("nav.import") },
    { key: "export", icon: FileOutput, label: t("nav.export") },
    { separator: true },
    { key: "ai", icon: Sparkles, label: t("nav.ai") },
  ];

  return (
    <div className="min-h-dvh">
      <Topbar route={route} navigate={navigate} />
      <main className="pt-14">{pages[route] || <WelcomePage navigate={navigate} />}</main>
      {hasSchema && route !== "home" && <Dock items={dockItems} active={route} onSelect={navigate} />}
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <ToastProvider>
          <BuilderProvider>
            <Shell />
          </BuilderProvider>
        </ToastProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
