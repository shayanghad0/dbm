import React from "react";
import { Check } from "lucide-react";
import { cn } from "../../lib/utils";

export function Checkbox({ checked, onChange, label, className, disabled, ariaLabel }) {
  return (
    <label className={cn("inline-flex items-center gap-1.5 select-none", disabled ? "opacity-50" : "cursor-pointer", className)}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={ariaLabel || label}
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) onChange?.(!checked);
        }}
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          checked ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card hover:bg-accent/60"
        )}
      >
        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
      </button>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </label>
  );
}
