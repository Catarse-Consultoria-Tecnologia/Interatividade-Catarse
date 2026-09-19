"use client";

import { motion } from "framer-motion";
import clsx from "clsx";

type StampVariant = "gold" | "confirm" | "alert" | "info";

const VARIANT_CLASS: Record<StampVariant, string> = {
  gold: "stamp-gold",
  confirm: "stamp-confirm",
  alert: "stamp-alert",
  info: "stamp-info",
};

export function Stamp({
  variant = "gold",
  children,
  className,
}: {
  variant?: StampVariant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 2, rotate: -14 }}
      animate={{ opacity: 1, scale: 1, rotate: -6 }}
      transition={{ duration: 0.42, ease: [0.2, 1.4, 0.4, 1] }}
      className={clsx(VARIANT_CLASS[variant], className)}
    >
      {children}
    </motion.span>
  );
}
