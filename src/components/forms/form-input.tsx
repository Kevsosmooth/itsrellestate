"use client";

import { cn } from "@/lib/utils";
import React from "react";

const baseInputClasses = cn(
  "w-full min-h-[48px] px-4 rounded-[10px] border border-border bg-card",
  "text-base text-text-primary placeholder:text-text-muted",
  "transition-colors duration-200",
  "hover:border-primary/40",
  "focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none",
  "aria-[invalid=true]:border-error aria-[invalid=true]:focus:border-error aria-[invalid=true]:focus:ring-error/20",
);

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  prefix?: string;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, prefix, ...props }, ref) => {
    if (prefix) {
      return (
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-base pointer-events-none">
            {prefix}
          </span>
          <input
            ref={ref}
            className={cn(baseInputClasses, "pl-8", className)}
            {...props}
          />
        </div>
      );
    }

    return (
      <input ref={ref} className={cn(baseInputClasses, className)} {...props} />
    );
  },
);
FormInput.displayName = "FormInput";

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: readonly { value: string; label: string }[];
  placeholder?: string;
}

export const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ className, options, placeholder, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          baseInputClasses,
          "appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat pr-10",
          className,
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  },
);
FormSelect.displayName = "FormSelect";
