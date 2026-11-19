import React, { useEffect } from "react";
import { Home, Table2, GitBranch, Shapes, FileInput, FileOutput, Sparkles } from "lucide-react";
import { I18nProvider, useI18n } from "./lib/i18n";
import { ThemeProvider } from "./lib/theme";
import { ToastProvider } from "./components/ui/toast";
import { useHashRoute } from "./lib/router";
import { BuilderProvider, useBuilder } from "./features/builder/BuilderContext";
import { Topbar } from "./components/layout/topbar";
import { Dock } from "./components/ui/dock";
import { AppFooter } from "./components/layout/footer";
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

  useEffect(() => {
    const appName = t("app.name") || "DB Easy Builder";
    const sectionLabels = {
      home: null,
      builder: t("nav.tables"),
      diagram: t("nav.diagram"),
      templates: t("nav.templates"),
      import: t("nav.import"),
      export: t("nav.export"),
      ai: t("nav.ai"),
    };
    const section = sectionLabels[route];
    document.title = section ? `${section} | ${appName}` : `${appName} — Visual Database Designer (No SQL Required)`;

    const descriptions = {
      home: "DB Easy Builder is a visual database designer for 13 engines. Create tables and relationships, import existing schemas, and export production-ready SQL, Prisma, JSON, and documentation without writing SQL.",
      builder: "Design and edit database tables, columns, and relationships visually in DB Easy Builder.",
      diagram: "Visualize your database schema and relationships with an interactive diagram in DB Easy Builder.",
      templates: "Start from ready-made database templates and customize schemas quickly in DB Easy Builder.",
      import: "Import existing SQL, JSON, or Prisma schemas into DB Easy Builder to visualize and edit them.",
      export: "Export your database design to SQL, Prisma, JSON, Markdown, and engine-specific formats with DB Easy Builder.",
      ai: "Use the AI assistant in DB Easy Builder to help generate and refine database schemas.",
    };
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", descriptions[route] || descriptions.home);
  }, [route, t]);

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

  const dockVisible = hasSchema && route !== "home";

  return (
    <div className="min-h-dvh">
      <Topbar route={route} navigate={navigate} />
      <main className="pt-14">{pages[route] || <WelcomePage navigate={navigate} />}</main>
      <AppFooter dockVisible={dockVisible} />
      {dockVisible && <Dock items={dockItems} active={route} onSelect={navigate} />}
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
