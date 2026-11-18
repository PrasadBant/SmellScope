import React, { useState } from "react";
import { Copy, Check, Hash } from "lucide-react";
import { cn } from "@/utils/cn";

export interface FingerprintDisplayProps {
  hash: string;
  label?: string;
  truncateLength?: number;
  className?: string;
}

export const FingerprintDisplay: React.FC<FingerprintDisplayProps> = ({
  hash,
  label = "SHA-256",
  truncateLength = 12,
  className,
}) => {
  const [copied, setCopied] = useState(false);

  const displayHash =
    hash.length > truncateLength * 2
      ? `${hash.slice(0, truncateLength)}...${hash.slice(-truncateLength)}`
      : hash;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-bg-main/60 border border-border text-xs font-mono select-none group",
        className
      )}
      title={`Full fingerprint: ${hash} (click icon to copy)`}
    >
      <div className="flex items-center gap-1 text-txt-muted text-[11px]">
        <Hash className="h-3 w-3 text-accent-secondary" />
        {label && <span className="font-semibold text-txt-secondary">{label}:</span>}
      </div>
      <span className="text-txt-primary truncate">{displayHash}</span>
      <button
        onClick={handleCopy}
        className="p-1 rounded text-txt-muted hover:text-accent-secondary hover:bg-bg-elevated transition-colors"
        title="Copy full cryptographic fingerprint"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-status-success" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
};
