"use client";

import { cn } from "@/lib/utils";
import { useCallback, useRef } from "react";

interface YesNoToggleProps {
  name: string;
  value: "yes" | "no" | "";
  onChange: (value: "yes" | "no") => void;
  labels?: [string, string];
  error?: boolean;
  className?: string;
}

export function YesNoToggle({
  name,
  value,
  onChange,
  labels = ["Yes", "No"],
  error,
  className,
}: YesNoToggleProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, option: "yes" | "no") => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const next = option === "yes" ? "no" : "yes";
        onChange(next);
        const buttons = containerRef.current?.querySelectorAll<HTMLButtonElement>(
          '[role="radio"]',
        );
        if (next === "yes") buttons?.[0]?.focus();
        else buttons?.[1]?.focus();
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        onChange(option);
      }
    },
    [onChange],
  );

  const options: Array<{ key: "yes" | "no"; label: string }> = [
    { key: "yes", label: labels[0] },
    { key: "no", label: labels[1] },
  ];

  const isErrored = !!error && value === "";

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label={name}
      className={cn("inline-flex flex-wrap gap-2", className)}
    >
      {options.map((opt, idx) => {
        const isSelected = value === opt.key;
        const selectedTone =
          opt.key === "yes"
            ? "bg-primary border-primary text-primary-foreground"
            : "bg-secondary border-secondary text-secondary-foreground";
        const idleTone = isErrored
          ? "bg-card border-error/60 text-text-secondary hover:text-text-primary hover:border-error"
          : "bg-card border-border text-text-secondary hover:text-text-primary hover:border-text-secondary/40";

        return (
          <button
            key={opt.key}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected || (value === "" && idx === 0) ? 0 : -1}
            onClick={() => onChange(opt.key)}
            onKeyDown={(e) => handleKeyDown(e, opt.key)}
            className={cn(
              "inline-flex items-center justify-center min-h-[44px] min-w-[88px] px-5",
              "rounded-full border text-sm font-medium cursor-pointer",
              "transition-colors duration-200",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              isSelected ? selectedTone : idleTone,
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
