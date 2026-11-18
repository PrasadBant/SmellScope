import React from "react";
import { cn } from "@/utils/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "success"
    | "clean"
    | "warning"
    | "borderline"
    | "danger"
    | "critical"
    | "published"
    | "synthetic"
    | "cached"
    | "outline"
    | "secondary"
    | "categoryA"
    | "categoryB"
    | "categoryC"
    | "categoryD";
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "default",
  children,
  ...props
}) => {
  const variantStyles = {
    default: "bg-accent-primary/15 text-accent-secondary border-accent-primary/30",
    secondary: "bg-bg-elevated text-txt-secondary border-border",
    success: "bg-status-success/15 text-emerald-400 border-status-success/30",
    clean: "bg-status-success/15 text-emerald-400 border-status-success/30",
    warning: "bg-status-warning/15 text-amber-400 border-status-warning/30",
    borderline: "bg-status-warning/15 text-amber-400 border-status-warning/30",
    danger: "bg-status-block/15 text-rose-400 border-status-block/30",
    critical: "bg-status-block/15 text-rose-400 border-status-block/30",
    published: "bg-evidence-published/15 text-sky-400 border-evidence-published/30",
    synthetic: "bg-evidence-synthetic/15 text-purple-400 border-evidence-synthetic/30",
    cached: "bg-evidence-cached/15 text-orange-400 border-evidence-cached/30",
    outline: "bg-transparent text-txt-secondary border-border",
    categoryA: "bg-rose-950/40 text-rose-300 border-rose-800/60 font-mono",
    categoryB: "bg-emerald-950/40 text-emerald-300 border-emerald-800/60 font-mono",
    categoryC: "bg-amber-950/40 text-amber-300 border-amber-800/60 font-mono",
    categoryD: "bg-purple-950/40 text-purple-300 border-purple-800/60 font-mono",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border select-none tracking-wide",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
