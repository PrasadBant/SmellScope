import React from "react";
import { cn } from "@/utils/cn";
import { EvidenceBadge, EvidenceType } from "./EvidenceBadge";

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  evidenceType?: EvidenceType;
  icon?: React.ReactNode;
  delta?: {
    value: string | number;
    isPositive?: boolean;
    label?: string;
  };
  tooltip?: string;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  evidenceType,
  icon,
  delta,
  tooltip,
  className,
}) => {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-bg-card p-4 relative overflow-hidden transition-all hover:border-border-active/50 hover:bg-bg-elevated/40",
        className
      )}
      title={tooltip}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-txt-muted">
              {title}
            </span>
            {evidenceType && <EvidenceBadge type={evidenceType} />}
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-txt-primary">
            {value}
          </div>
          {subtitle && (
            <p className="text-xs text-txt-secondary line-clamp-1" title={subtitle}>
              {subtitle}
            </p>
          )}
        </div>
        {icon && (
          <div className="rounded-lg border border-border bg-bg-elevated p-2 text-accent-secondary shrink-0">
            {icon}
          </div>
        )}
      </div>

      {delta && (
        <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center text-xs font-mono">
          <span
            className={cn(
              "font-bold",
              delta.isPositive ? "text-status-success" : "text-status-block"
            )}
          >
            {delta.value}
          </span>
          <span className="ml-1.5 text-txt-muted text-[11px]">
            {delta.label || "vs baseline"}
          </span>
        </div>
      )}
    </div>
  );
};
