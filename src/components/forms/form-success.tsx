"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import Link from "next/link";

interface FormSuccessProps {
  type: "tenant" | "landlord";
  firstName: string;
  className?: string;
}

export function FormSuccess({
  type,
  firstName,
  className,
}: FormSuccessProps) {
  return (
    <div className={cn("flex flex-col items-center text-center gap-6 py-12", className)}>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
        className="flex items-center justify-center w-16 h-16 rounded-full bg-success/10"
      >
        <CheckCircle className="w-10 h-10 text-success" />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="text-2xl font-bold text-text-primary"
      >
        Application Submitted
      </motion.h2>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.3 }}
        className="flex flex-col gap-3 max-w-md"
      >
        <p className="text-base text-text-secondary leading-relaxed">
          {type === "tenant"
            ? `Thank you, ${firstName}. Your application has been received and will be reviewed within 24 hours.`
            : `Thank you, ${firstName}. Your property listing has been received and will be reviewed within 24 hours.`}
        </p>

        {type === "tenant" && (
          <div className="rounded-lg bg-primary/5 px-4 py-3 text-left">
            <p className="text-sm font-semibold text-text-primary mb-1">Check your email</p>
            <p className="text-sm text-text-secondary leading-relaxed">
              We have sent a $20 invoice from Stripe to complete your application. The link is
              valid for 30 days. Please check your spam folder if you do not see it.
            </p>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
      >
        <Link
          href="/"
          className={cn(
            "inline-flex items-center justify-center min-h-[48px] px-8 rounded-xl",
            "border border-border text-sm font-semibold text-text-secondary",
            "hover:border-primary/40 hover:text-primary transition-colors",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          )}
        >
          Return Home
        </Link>
      </motion.div>
    </div>
  );
}
