import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

export interface LoadingStateProps {
  title?: string;
  description?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  title = "Processing...",
  description,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-12 text-center rounded-xl border border-border/60 bg-bg-card/40 space-y-3",
        className
      )}
    >
      <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-txt-primary">{title}</h4>
        {description && <p className="text-xs text-txt-muted">{description}</p>}
      </div>
    </div>
  );
};
