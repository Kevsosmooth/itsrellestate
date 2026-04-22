"use client";

import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import { useMemo, useState, useCallback, useEffect } from "react";

interface PaymentStepProps {
  applicantName: string;
  confirmed: boolean;
  onConfirmChange: (confirmed: boolean) => void;
  onRefNumber?: (ref: string) => void;
  className?: string;
}

export function PaymentStep({
  applicantName,
  confirmed,
  onConfirmChange,
  onRefNumber,
  className,
}: PaymentStepProps) {
  const [copied, setCopied] = useState(false);

  const referenceNumber = useMemo(() => {
    const parts = applicantName.trim().split(/\s+/);
    const first = (parts[0] || "XXX").slice(0, 3).toUpperCase();
    const last = (parts[1] || "XXX").slice(0, 3).toUpperCase();
    const ts = String(Date.now()).slice(-6);
    return `${first}${last}-${ts}`;
  }, [applicantName]);

  useEffect(() => {
    onRefNumber?.(referenceNumber);
  }, [referenceNumber, onRefNumber]);

  const copyRef = useCallback(() => {
    navigator.clipboard.writeText(referenceNumber).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [referenceNumber]);

  const methods = [
    { name: "Zelle", description: "Payment details provided after review" },
    { name: "CashApp", description: "Payment details provided after review" },
    { name: "Venmo", description: "Payment details provided after review" },
  ];

  return (
    <div className={cn("flex flex-col items-center gap-6", className)}>
      <div className="text-center">
        <p className="text-sm text-text-muted mb-1">Application Processing Fee</p>
        <p className="text-4xl font-bold text-text-primary">$20.00</p>
        <p className="text-xs text-text-muted mt-1">One-time, non-refundable</p>
      </div>

      <div className="w-full flex flex-col items-center gap-2">
        <p className="text-xs text-text-muted uppercase tracking-wide font-semibold">
          Your Reference Number
        </p>
        <div className="flex items-center gap-2 rounded-lg bg-surface px-4 py-3">
          <span className="font-mono text-lg text-primary font-semibold">
            {referenceNumber}
          </span>
          <button
            type="button"
            onClick={copyRef}
            aria-label="Copy reference number"
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-md transition-colors",
              "text-text-muted hover:text-primary",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            )}
          >
            {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="w-full flex flex-col gap-3">
        <p className="text-sm font-medium text-text-primary">Accepted Payment Methods</p>
        {methods.map((method) => (
          <div
            key={method.name}
            className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center justify-center min-w-[48px] h-8 rounded-md bg-primary/10 px-3">
              <span className="text-xs font-bold text-primary">{method.name}</span>
            </div>
            <div>
              <p className="text-sm text-text-secondary">{method.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="w-full rounded-lg bg-surface p-4">
        <p className="text-sm text-text-secondary leading-relaxed">
          After submitting your application, send{" "}
          <span className="font-medium text-text-primary">$20.00</span> via any of the methods
          above. Include your reference number{" "}
          <span className="font-medium text-primary">{referenceNumber}</span> in the payment
          memo. Your application will be reviewed once payment is confirmed.
        </p>
      </div>

      <label className="flex items-start gap-3 cursor-pointer w-full">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => onConfirmChange(e.target.checked)}
          className="mt-0.5 w-5 h-5 rounded accent-primary shrink-0"
        />
        <span className="text-sm text-text-primary leading-relaxed">
          I understand a $20 non-refundable processing fee is required and my application will
          be reviewed once payment is confirmed.
        </span>
      </label>
    </div>
  );
}
