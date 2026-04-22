"use client";

import { cn } from "@/lib/utils";
import { useCallback, useRef } from "react";

interface PillSelectProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  allowDeselect?: boolean;
  columns?: 2 | 3 | 4;
  error?: boolean;
  className?: string;
}

export function PillSelect({
  name,
  value,
  onChange,
  options,
  allowDeselect = false,
  columns = 2,
  error,
  className,
}: PillSelectProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, idx: number) => {
      let nextIdx = idx;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        nextIdx = (idx + 1) % options.length;
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        nextIdx = (idx - 1 + options.length) % options.length;
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        const opt = options[idx];
        if (allowDeselect && opt.value === value) {
          onChange("");
        } else {
          onChange(opt.value);
        }
        return;
      } else {
        return;
      }

      const buttons = containerRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="radio"]',
      );
      buttons?.[nextIdx]?.focus();
    },
    [options, value, onChange, allowDeselect],
  );

  const colClass =
    columns === 2
      ? "grid-cols-2 md:grid-cols-3"
      : columns === 3
        ? "grid-cols-2 md:grid-cols-3"
        : "grid-cols-3 md:grid-cols-4";

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label={name}
      className={cn("grid gap-2", colClass, className)}
    >
      {options.map((opt, idx) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected || (value === "" && idx === 0) ? 0 : -1}
            onClick={() => {
              if (allowDeselect && isSelected) {
                onChange("");
              } else {
                onChange(opt.value);
              }
            }}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={cn(
              "flex items-center justify-center min-h-[44px] px-4 py-2 rounded-full",
              "border text-sm font-medium cursor-pointer transition-all duration-200",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              isSelected
                ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary/30"
                : cn(
                    "border-border bg-card text-text-secondary",
                    "hover:border-primary/40 hover:text-text-primary",
                    error && !value && "border-error/40",
                  ),
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
