"use client";

import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import React from "react";

interface FormFieldProps {
  name: string;
  label: string;
  required?: boolean;
  error?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  name,
  label,
  required,
  error,
  description,
  children,
  className,
}: FormFieldProps) {
  const descId = description ? `${name}-desc` : undefined;
  const errorId = error ? `${name}-error` : undefined;
  const describedBy = [descId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={name} className="text-sm font-medium text-text-primary">
        {label}
        {required && <span className="text-error ml-0.5">*</span>}
        {required && <span className="sr-only"> (required)</span>}
      </label>

      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
          id: name,
          "aria-describedby": describedBy,
          ...(error ? { "aria-invalid": true } : {}),
          ...(required ? { "aria-required": true } : {}),
        });
      })}

      {description && (
        <span id={descId} className="text-xs text-text-muted">
          {description}
        </span>
      )}

      <AnimatePresence>
        {error && (
          <motion.span
            id={errorId}
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1 text-xs text-error overflow-hidden"
          >
            <AlertCircle className="h-3 w-3 shrink-0" />
            {error}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
