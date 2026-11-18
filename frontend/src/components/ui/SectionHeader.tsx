import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

export interface SectionHeaderProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon: Icon,
  title,
  description,
  badge,
  actions,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80",
        className
      )}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="p-1.5 rounded-lg bg-bg-elevated border border-border text-accent-secondary">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <h2 className="text-xl font-bold tracking-tight text-txt-primary">{title}</h2>
          {badge && <div className="ml-1">{badge}</div>}
        </div>
        {description && (
          <p className="text-xs text-txt-muted max-w-2xl leading-relaxed">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
};
