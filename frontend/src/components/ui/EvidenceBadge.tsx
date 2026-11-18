import React from "react";
import { cn } from "@/utils/cn";

export type EvidenceType = "published" | "measured" | "synthetic" | "cached" | "target" | "mock";

interface EvidenceBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  type: EvidenceType;
  label?: string;
  className?: string;
}

const EVIDENCE_CONFIG: Record<
  EvidenceType,
  { label: string; bg: string; text: string; border: string; desc: string }
> = {
  published: {
    label: "[published]",
    bg: "bg-evidence-published/10",
    text: "text-evidence-published",
    border: "border-evidence-published/30",
    desc: "From published peer-reviewed NIDS benchmark literature",
  },
  measured: {
    label: "[measured]",
    bg: "bg-status-success/10",
    text: "text-status-success",
    border: "border-status-success/30",
    desc: "Directly measured from current dataset partition",
  },
  synthetic: {
    label: "[synthetic]",
    bg: "bg-evidence-synthetic/10",
    text: "text-evidence-synthetic",
    border: "border-evidence-synthetic/30",
    desc: "Derived from synthetic shortcut validation or perturbation",
  },
  cached: {
    label: "[cached]",
    bg: "bg-evidence-cached/10",
    text: "text-evidence-cached",
    border: "border-evidence-cached/30",
    desc: "Retrieved from local cache (identical split hash)",
  },
  target: {
    label: "[target]",
    bg: "bg-accent-primary/10",
    text: "text-accent-secondary",
    border: "border-accent-primary/30",
    desc: "Audited target model under test",
  },
  mock: {
    label: "[mock]",
    bg: "bg-txt-muted/10",
    text: "text-txt-muted",
    border: "border-txt-muted/30",
    desc: "Simulated baseline or synthetic dummy data",
  },
};

export const EvidenceBadge: React.FC<EvidenceBadgeProps> = ({
  type,
  label,
  className,
  ...props
}) => {
  const config = EVIDENCE_CONFIG[type] || EVIDENCE_CONFIG.measured;
  const displayText = label || config.label;

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold border select-none transition-colors",
        config.bg,
        config.text,
        config.border,
        className
      )}
      title={config.desc}
      {...props}
    >
      {displayText}
    </span>
  );
};
