import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn, uid } from "../../lib/utils";
import { useI18n } from "../../lib/i18n";

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const { t } = useI18n();
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    ({ title, description, variant = "info", duration = 3500 }) => {
      const id = uid("toast_");
      setToasts((list) => [...list.slice(-3), { id, title, description, variant }]);
      setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss]);

  const icons = {
    success: <CheckCircle2 className="h-4 w-4 text-success" />,
    error: <XCircle className="h-4 w-4 text-destructive" />,
    info: <Info className="h-4 w-4 text-primary" />,
  };

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-24 end-4 z-[200] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex items-start gap-2 rounded-lg border border-border bg-popover/95 p-3 text-sm shadow-lg backdrop-blur animate-slide-in-end"
            )}
            role="status"
          >
            {icons[toast.variant] || icons.info}
            <div className="flex-1 min-w-0">
              <div className="font-medium">{toast.title}</div>
              {toast.description && <div className="mt-0.5 text-xs text-muted-foreground">{toast.description}</div>}
            </div>
            <button onClick={() => dismiss(toast.id)} className="rounded p-0.5 text-muted-foreground hover:text-foreground" aria-label={t("common.dismiss")}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
