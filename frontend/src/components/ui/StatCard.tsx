import React from "react";
import { cn } from "@/utils/cn";

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
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
  trend,
  className,
}) => {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-bg-card p-5 relative overflow-hidden transition-all hover:border-border-active/40 hover:shadow-lg hover:shadow-accent-primary/5",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-txt-muted">{title}</p>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-txt-primary">
            {value}
          </div>
          {subtitle && <p className="mt-1 text-xs text-txt-secondary">{subtitle}</p>}
        </div>
        {icon && (
          <div className="rounded-lg border border-border/80 bg-bg-elevated p-2 text-accent-cyan">
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 flex items-center text-xs font-medium">
          <span className={trend.isPositive ? "text-status-success" : "text-status-block"}>
            {trend.value}
          </span>
          <span className="ml-1.5 text-txt-muted">vs previous run</span>
        </div>
      )}
    </div>
  );
};
