import React, { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Modal } from "./modal";

/** Confirmation dialog used for destructive actions. */
export function ConfirmDialog({ open, onClose, onConfirm, title, body, confirmLabel, cancelLabel, danger = true }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onConfirm?.();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onConfirm]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? "destructive" : "default"}
            size="sm"
            onClick={() => {
              onConfirm?.();
              onClose?.();
            }}
            autoFocus
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        {danger && <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />}
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
    </Modal>
  );
}
