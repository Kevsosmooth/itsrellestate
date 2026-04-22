"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { useCallback, useRef } from "react";

interface RepeaterFieldProps<T extends Record<string, unknown>> {
  name: string;
  rows: (T & { id: number })[];
  onChange: (rows: (T & { id: number })[]) => void;
  createRow: () => T & { id: number };
  renderRow: (
    row: T & { id: number },
    index: number,
    onRowChange: (field: keyof T, value: T[keyof T]) => void,
  ) => React.ReactNode;
  rowLabel?: string;
  minRows?: number;
  maxRows?: number;
  addLabel?: string;
  className?: string;
}

export function RepeaterField<T extends Record<string, unknown>>({
  rows,
  onChange,
  createRow,
  renderRow,
  rowLabel = "Row",
  minRows = 0,
  maxRows = 20,
  addLabel,
  className,
}: RepeaterFieldProps<T>) {
  const liveRef = useRef<HTMLDivElement>(null);

  const handleAdd = useCallback(() => {
    if (rows.length >= maxRows) return;
    const newRow = createRow();
    onChange([...rows, newRow]);
    if (liveRef.current) {
      liveRef.current.textContent = `${rowLabel} ${rows.length + 1} added`;
    }
  }, [rows, maxRows, createRow, onChange, rowLabel]);

  const handleRemove = useCallback(
    (index: number) => {
      if (rows.length <= minRows) return;
      const updated = rows.filter((_, i) => i !== index);
      onChange(updated);
      if (liveRef.current) {
        liveRef.current.textContent = `${rowLabel} ${index + 1} removed`;
      }
    },
    [rows, minRows, onChange, rowLabel],
  );

  const handleRowChange = useCallback(
    (index: number, field: keyof T, value: T[keyof T]) => {
      const updated = rows.map((row, i) =>
        i === index ? { ...row, [field]: value } : row,
      );
      onChange(updated);
    },
    [rows, onChange],
  );

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div ref={liveRef} aria-live="polite" className="sr-only" />

      <AnimatePresence initial={false}>
        {rows.map((row, index) => (
          <motion.div
            key={row.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="relative rounded-xl border border-border bg-card p-4 md:p-5">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3 block">
                {rowLabel} {index + 1}
              </span>

              {rows.length > minRows && (
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  aria-label={`Remove ${rowLabel} ${index + 1}`}
                  className={cn(
                    "absolute top-3 right-3 flex items-center justify-center",
                    "w-9 h-9 rounded-lg text-text-muted hover:text-error",
                    "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  )}
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {renderRow(row, index, (field, value) =>
                handleRowChange(index, field, value),
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {rows.length < maxRows && (
        <button
          type="button"
          onClick={handleAdd}
          aria-label={addLabel ?? `Add ${rowLabel}`}
          className={cn(
            "inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl",
            "border border-dashed border-border text-sm font-medium text-text-secondary",
            "hover:border-primary/40 hover:text-primary transition-colors",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          )}
        >
          <Plus className="h-4 w-4" />
          {addLabel ?? `Add ${rowLabel}`}
        </button>
      )}
    </div>
  );
}
