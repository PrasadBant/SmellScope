import React from "react";
import { cn } from "@/utils/cn";
import { EvidenceBadge, EvidenceType } from "./EvidenceBadge";

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  evidenceType?: EvidenceType;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  evidenceType,
  trend,
  className,
}) => {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-bg-card p-4 relative overflow-hidden transition-all hover:border-border-active/50 hover:bg-bg-elevated/40",
        className
      )}
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

      {trend && (
        <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center text-xs font-mono">
          <span
            className={cn(
              "font-bold",
              trend.isPositive ? "text-status-success" : "text-status-block"
            )}
          >
            {trend.value}
          </span>
          <span className="ml-1.5 text-txt-muted text-[11px]">vs previous run</span>
        </div>
      )}
    </div>
  );
};
