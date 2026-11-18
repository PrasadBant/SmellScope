import React from "react";
import { Database, LucideIcon } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/utils/cn";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Database,
  title,
  description,
  actionLabel,
  onAction,
  className,
  children,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-border/80 bg-bg-card/40 space-y-4",
        className
      )}
    >
      <div className="p-3.5 rounded-xl bg-bg-elevated border border-border text-txt-muted shadow-inner">
        <Icon className="h-8 w-8 text-txt-muted/70" />
      </div>
      <div className="space-y-1.5 max-w-md">
        <h3 className="text-base font-semibold text-txt-primary">{title}</h3>
        <p className="text-xs text-txt-muted leading-relaxed">{description}</p>
      </div>
      {children}
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
