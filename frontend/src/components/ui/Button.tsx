import React from "react";
import { cn } from "@/utils/cn";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "cyan";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-main disabled:opacity-50 disabled:cursor-not-allowed select-none";

    const variantStyles = {
      primary:
        "bg-accent-primary hover:bg-accent-primary/90 text-white shadow-lg shadow-accent-primary/20 focus:ring-accent-primary border border-accent-primary/40",
      secondary:
        "bg-bg-elevated hover:bg-border/60 text-txt-primary border border-border focus:ring-border active:scale-[0.98]",
      outline:
        "bg-transparent hover:bg-bg-elevated/50 text-txt-secondary hover:text-txt-primary border border-border focus:ring-accent-primary",
      ghost:
        "bg-transparent hover:bg-bg-elevated/40 text-txt-secondary hover:text-txt-primary focus:ring-accent-primary",
      danger:
        "bg-status-block hover:bg-status-block/90 text-white shadow-lg shadow-status-block/20 focus:ring-status-block border border-status-block/40",
      cyan:
        "bg-accent-cyan hover:bg-accent-cyan/90 text-bg-main font-semibold shadow-lg shadow-accent-cyan/20 focus:ring-accent-cyan",
    };

    const sizeStyles = {
      sm: "text-xs px-2.5 py-1.5 gap-1.5",
      md: "text-sm px-4 py-2 gap-2",
      lg: "text-base px-5 py-2.5 gap-2.5 font-semibold",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
