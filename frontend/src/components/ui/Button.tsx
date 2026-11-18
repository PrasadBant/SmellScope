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
      "inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-accent-primary/50 focus:ring-offset-1 focus:ring-offset-bg-main disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.99]";

    const variantStyles = {
      primary:
        "bg-accent-primary hover:bg-accent-primary/90 text-white shadow-md shadow-accent-primary/20 border border-accent-primary/40 font-semibold",
      secondary:
        "bg-bg-elevated hover:bg-bg-hover text-txt-primary border border-border shadow-sm",
      outline:
        "bg-transparent hover:bg-bg-elevated/60 text-txt-secondary hover:text-txt-primary border border-border hover:border-border-active",
      ghost:
        "bg-transparent hover:bg-bg-elevated/60 text-txt-secondary hover:text-txt-primary",
      danger:
        "bg-status-block hover:bg-status-block/90 text-white shadow-md shadow-status-block/20 border border-status-block/40 font-semibold",
      cyan:
        "bg-accent-secondary hover:bg-accent-secondary/90 text-bg-main font-semibold shadow-md shadow-accent-secondary/20",
    };

    const sizeStyles = {
      sm: "text-xs px-2.5 py-1.5 gap-1.5 rounded-md",
      md: "text-xs px-3.5 py-2 gap-2 rounded-lg font-medium",
      lg: "text-sm px-5 py-2.5 gap-2.5 rounded-lg font-semibold",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
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
