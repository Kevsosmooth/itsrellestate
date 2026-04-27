"use client";

import { cn } from "@/lib/utils";

interface PaymentStepProps {
  confirmed: boolean;
  onConfirmChange: (confirmed: boolean) => void;
  className?: string;
}

export function PaymentStep({
  confirmed,
  onConfirmChange,
  className,
}: PaymentStepProps) {
  return (
    <div className={cn("flex flex-col items-center gap-6", className)}>
      <div className="text-center">
        <p className="text-sm text-text-muted mb-1">Application Processing Fee</p>
        <p className="text-4xl font-bold text-text-primary">$20.00</p>
        <p className="text-xs text-text-muted mt-1">One-time, non-refundable</p>
      </div>

      <div className="w-full rounded-lg bg-surface p-4 text-sm text-text-secondary">
        <p className="font-semibold text-text-primary mb-2">How payment works</p>
        <ol className="list-decimal list-inside space-y-1.5">
          <li>Submit your application on the next step.</li>
          <li>You will receive an emailed invoice from Stripe.</li>
          <li>Click the link in the email to pay $20 securely.</li>
          <li>Your application enters review once payment is received.</li>
        </ol>
      </div>

      <p className="text-xs text-text-muted text-center">
        The invoice link will remain valid for 30 days. Check your spam folder if you do not
        see the email within a few minutes of submitting.
      </p>

      <label className="flex items-start gap-3 cursor-pointer w-full">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => onConfirmChange(e.target.checked)}
          className="mt-0.5 w-5 h-5 rounded accent-primary shrink-0"
        />
        <span className="text-sm text-text-primary leading-relaxed">
          I understand a $20 non-refundable processing fee is required and my application will
          be reviewed once payment is received.
        </span>
      </label>
    </div>
  );
}
