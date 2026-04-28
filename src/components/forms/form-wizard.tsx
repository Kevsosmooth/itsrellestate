"use client";

import { cn } from "@/lib/utils";
import type { FormStepDef, ValidationErrors } from "@/lib/form-types";
import { saveFormState, loadFormState, clearFormState, formatRelativeTime } from "@/lib/form-storage";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import React, { useState, useCallback, useEffect, useRef } from "react";

interface FormWizardProps {
  steps: FormStepDef[];
  data: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
  onBulkRestore: (data: Record<string, unknown>) => void;
  renderStep: (stepIndex: number) => React.ReactNode;
  onSubmit: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  submitProgress?: string;
  submitError?: string;
  storageKey: string;
  title: string;
  className?: string;
  devAutofill?: {
    fill: () => Record<string, unknown>;
    jumpToStep: number;
    onAfterFill?: (filledData: Record<string, unknown>) => void;
  };
}

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

export function FormWizard({
  steps,
  data,
  onChange,
  onBulkRestore,
  renderStep,
  onSubmit,
  isSubmitting = false,
  submitLabel,
  submitProgress,
  submitError,
  storageKey,
  title,
  className,
  devAutofill,
}: FormWizardProps) {
  const isDev = process.env.NODE_ENV === "development";
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [savedTimestamp, setSavedTimestamp] = useState<number | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hasInteracted = useRef(false);
  const stepContentRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);

  const handleResume = useCallback(() => {
    const saved = loadFormState<Record<string, unknown>>(storageKey);
    if (saved) {
      onBulkRestore(saved.data);
      hasInteracted.current = true;
    }
    setShowResumeBanner(false);
  }, [storageKey, onBulkRestore]);

  const handleStartFresh = useCallback(() => {
    clearFormState(storageKey);
    setShowResumeBanner(false);
  }, [storageKey]);

  /* eslint-disable react-hooks/set-state-in-effect -- localStorage is client-only; reading at render time causes SSR/client hydration mismatch */
  useEffect(() => {
    const saved = loadFormState<Record<string, unknown>>(storageKey);
    if (saved) {
      setShowResumeBanner(true);
      setSavedTimestamp(saved.savedAt);
    }
  }, [storageKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (showResumeBanner || !hasInteracted.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveFormState(storageKey, data, currentStep);
    }, 500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [data, currentStep, storageKey, showResumeBanner]);

  const handleNext = useCallback(() => {
    const stepErrors = steps[currentStep].validate(data);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      const firstErrorKey = Object.keys(stepErrors)[0];
      const el = document.getElementById(firstErrorKey);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus();
      return;
    }
    setErrors({});
    setDirection(1);
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
    stepContentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    if (liveRef.current) {
      liveRef.current.textContent = `Step ${currentStep + 2} of ${steps.length}: ${steps[currentStep + 1]?.label ?? ""}`;
    }
  }, [currentStep, steps, data]);

  const handlePrev = useCallback(() => {
    setErrors({});
    setDirection(-1);
    setCurrentStep((s) => Math.max(s - 1, 0));
    stepContentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    if (liveRef.current) {
      liveRef.current.textContent = `Step ${currentStep} of ${steps.length}: ${steps[currentStep - 1]?.label ?? ""}`;
    }
  }, [currentStep, steps]);

  const handleSubmit = useCallback(() => {
    for (let i = 0; i < steps.length; i++) {
      const stepErrors = steps[i].validate(data);
      if (Object.keys(stepErrors).length > 0) {
        setDirection(i < currentStep ? -1 : 1);
        setCurrentStep(i);
        setErrors(stepErrors);
        stepContentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    setErrors({});
    onSubmit();
  }, [currentStep, steps, data, onSubmit]);

  const handleFieldChange = useCallback(
    (field: string, value: unknown) => {
      hasInteracted.current = true;
      onChange(field, value);
      if (errors[field]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [onChange, errors],
  );

  const isFinalStep = currentStep === steps.length - 1;

  return (
    <div
      role="form"
      aria-label={title}
      className={cn("flex flex-col gap-6", className)}
    >
      <div ref={liveRef} aria-live="polite" className="sr-only" />

      {isDev && devAutofill && (
        <div className="rounded-xl border-2 border-dashed border-warning/60 bg-warning/5 p-3 flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-text-secondary">
            <span className="font-bold text-warning">DEV MODE:</span> autofill all fields and jump to documents step.
          </p>
          <button
            type="button"
            onClick={() => {
              const filled = devAutofill.fill();
              onBulkRestore(filled);
              setCurrentStep(devAutofill.jumpToStep);
              setErrors({});
              hasInteracted.current = true;
              devAutofill.onAfterFill?.(filled);
            }}
            className="min-h-[36px] px-4 rounded-lg bg-warning text-text-primary text-xs font-semibold transition-colors hover:bg-warning/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warning"
          >
            Autofill
          </button>
        </div>
      )}

      <AnimatePresence>
        {showResumeBanner && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="text-sm text-text-primary flex-1">
                You have a saved draft from{" "}
                <span className="font-medium">
                  {savedTimestamp ? formatRelativeTime(savedTimestamp) : "recently"}
                </span>
                . Continue where you left off?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleResume}
                  className="min-h-[40px] px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Resume Draft
                </button>
                <button
                  type="button"
                  onClick={handleStartFresh}
                  className="min-h-[40px] px-4 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Start Fresh
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress indicator */}
      <div className="flex items-center justify-between gap-1 px-2">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;

          return (
            <React.Fragment key={step.id}>
              {idx > 0 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 rounded-full transition-colors duration-300",
                    idx <= currentStep ? "bg-primary" : "bg-border",
                  )}
                />
              )}

              <div className="flex flex-col items-center gap-1.5">
                <div
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={
                    isCompleted
                      ? `Step ${idx + 1}, ${step.label}, completed`
                      : `Step ${idx + 1}, ${step.label}`
                  }
                  className={cn(
                    "flex items-center justify-center shrink-0 transition-all duration-300",
                    "w-8 h-8 md:w-10 md:h-10 rounded-full text-xs md:text-sm font-semibold",
                    isCompleted && "bg-primary text-primary-foreground",
                    isCurrent &&
                      "bg-primary text-primary-foreground shadow-[0_0_0_4px_rgba(var(--color-primary-rgb),0.15)]",
                    !isCompleted && !isCurrent && "bg-card border-2 border-border text-text-muted",
                  )}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
                </div>

                <span
                  className={cn(
                    "hidden md:block text-xs whitespace-nowrap",
                    isCurrent && "font-medium text-primary",
                    isCompleted && "text-text-secondary",
                    !isCompleted && !isCurrent && "text-text-muted",
                  )}
                >
                  {step.shortLabel ?? step.label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Mobile step label */}
      <p className="md:hidden text-center text-sm font-medium text-text-primary -mt-3">
        {steps[currentStep].label}
      </p>

      {/* Step content */}
      <div ref={stepContentRef} className="min-h-[200px] min-w-0">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="min-w-0"
          >
            <WizardErrorContext.Provider value={{ errors, onChange: handleFieldChange }}>
              {renderStep(currentStep)}
            </WizardErrorContext.Provider>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Error summary */}
      {Object.keys(errors).length > 0 && (
        <div role="alert" aria-live="assertive" className="rounded-lg bg-error/5 border border-error/20 p-3">
          <p className="text-sm text-error font-medium">
            Please fix {Object.keys(errors).length} error{Object.keys(errors).length > 1 ? "s" : ""} before continuing.
          </p>
        </div>
      )}

      {/* Submit error */}
      {submitError && (
        <div role="alert" aria-live="assertive" className="rounded-lg bg-error/5 border border-error/20 p-4">
          <p className="text-sm font-medium text-error">
            Submission failed: {submitError}
          </p>
          <p className="text-xs text-text-muted mt-1">
            Please try again. If the problem continues, contact us for help.
          </p>
        </div>
      )}

      {/* Navigation */}
      <div
        className={cn(
          "flex items-center gap-3 pt-4",
          "md:border-t md:border-border",
          "fixed bottom-0 left-0 right-0 md:static",
          "bg-card md:bg-transparent border-t border-border md:border-t-0",
          "shadow-[0_-2px_8px_rgba(0,0,0,0.04)] md:shadow-none",
          "px-6 py-4 md:px-0 md:py-0",
          "pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-0",
          "z-50",
        )}
      >
        {currentStep > 0 && (
          <button
            type="button"
            onClick={handlePrev}
            className={cn(
              "min-h-[48px] px-6 rounded-xl border border-border",
              "text-sm font-semibold text-text-secondary",
              "hover:border-primary/40 hover:text-text-primary transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            )}
          >
            Previous
          </button>
        )}

        <div className="flex-1" />

        {isFinalStep ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={cn(
              "min-h-[48px] px-8 rounded-xl bg-primary text-primary-foreground",
              "text-sm font-semibold transition-all",
              "hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            )}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {submitProgress || "Submitting..."}
              </span>
            ) : (
              submitLabel || "Submit Application"
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            className={cn(
              "min-h-[48px] px-8 rounded-xl bg-primary text-primary-foreground",
              "text-sm font-semibold transition-all",
              "hover:bg-primary/90",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            )}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}

interface WizardErrorContextValue {
  errors: ValidationErrors;
  onChange: (field: string, value: unknown) => void;
}

const WizardErrorContext = React.createContext<WizardErrorContextValue>({
  errors: {},
  onChange: () => {},
});

export function useWizardContext() {
  return React.useContext(WizardErrorContext);
}
