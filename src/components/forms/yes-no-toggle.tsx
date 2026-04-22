"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
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

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label={name}
      className={cn(
        "inline-flex rounded-full border p-1 gap-1 relative",
        error && value === "" ? "border-error/60" : "border-border",
        "bg-card",
        className,
      )}
    >
      {options.map((opt, idx) => {
        const isSelected = value === opt.key;
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
              "relative z-10 flex items-center justify-center min-h-[40px] min-w-[72px] px-5",
              "rounded-full text-sm font-medium transition-colors duration-200 cursor-pointer",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              isSelected
                ? opt.key === "yes"
                  ? "text-primary-foreground"
                  : "text-text-primary"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {isSelected && (
              <motion.div
                layoutId={`toggle-bg-${name}`}
                className={cn(
                  "absolute inset-0 rounded-full shadow-sm",
                  opt.key === "yes" ? "bg-primary" : "bg-surface",
                )}
                transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
              />
            )}
            <span className="relative z-10">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
