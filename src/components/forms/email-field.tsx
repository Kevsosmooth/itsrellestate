"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { suggestEmail } from "@/lib/email-suggestion";
import { FormField } from "./form-field";
import { FormInput } from "./form-input";

interface EmailFieldProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  description?: string;
  placeholder?: string;
  autoComplete?: string;
  className?: string;
}

/**
 * Email input that offers a "did you mean?" correction when the domain looks
 * misspelled. The suggestion is evaluated on blur (when the person leaves the
 * field) and one tap fills in the fix. Wraps the shared FormField + FormInput so
 * it stays consistent with every other field on the apply forms.
 */
export function EmailField({
  name,
  label,
  value,
  onChange,
  required,
  error,
  description,
  placeholder = "you@example.com",
  autoComplete = "email",
  className,
}: EmailFieldProps) {
  const [suggestion, setSuggestion] = useState<string | null>(null);

  function acceptSuggestion() {
    if (!suggestion) return;
    onChange(suggestion);
    setSuggestion(null);
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <FormField
        name={name}
        label={label}
        required={required}
        error={error}
        description={description}
      >
        <FormInput
          type="email"
          inputMode="email"
          autoComplete={autoComplete}
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            // Clear a stale suggestion the moment they start correcting it.
            if (suggestion) setSuggestion(null);
          }}
          onBlur={() => setSuggestion(suggestEmail(value))}
        />
      </FormField>

      <div aria-live="polite">
        <AnimatePresence>
          {suggestion && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <button
                type="button"
                onClick={acceptSuggestion}
                className={cn(
                  "inline-flex min-h-[44px] items-center text-left text-sm text-text-secondary",
                  "rounded-[10px] transition-colors duration-200",
                  "hover:text-primary",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                )}
              >
                <span>
                  Did you mean{" "}
                  <span className="font-semibold text-primary underline underline-offset-2">
                    {suggestion}
                  </span>
                  ?
                </span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
