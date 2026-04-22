"use client";

import { AnimatePresence, motion } from "framer-motion";

interface ConditionalBlockProps {
  show: boolean;
  children: React.ReactNode;
}

export function ConditionalBlock({ show, children }: ConditionalBlockProps) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div className="flex flex-col gap-5 pt-2">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
