import React from "react";
import { AlertTriangle, AlertCircle, X } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/utils/cn";

export interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "primary";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  children?: React.ReactNode;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  isLoading = false,
  onConfirm,
  children,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-xl border border-border bg-bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
        role="alertdialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "p-2.5 rounded-lg shrink-0",
              variant === "danger"
                ? "bg-status-block/15 text-status-block border border-status-block/30"
                : variant === "warning"
                ? "bg-status-warning/15 text-status-warning border border-status-warning/30"
                : "bg-accent-primary/15 text-accent-secondary border border-accent-primary/30"
            )}
          >
            {variant === "danger" ? (
              <AlertCircle className="h-6 w-6" />
            ) : (
              <AlertTriangle className="h-6 w-6" />
            )}
          </div>
          <div className="space-y-1.5 flex-1">
            <h3 className="text-base font-bold text-txt-primary">{title}</h3>
            <p className="text-xs text-txt-secondary leading-relaxed">{description}</p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-txt-muted hover:text-txt-primary p-1 rounded transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {children && <div className="text-xs text-txt-secondary">{children}</div>}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/80">
          <Button
            variant="ghost"
            size="sm"
            disabled={isLoading}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            size="sm"
            isLoading={isLoading}
            onClick={async () => {
              await onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
