import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { useAuditContext } from "@/stores/AuditContext";
import { api } from "@/api/client";
import { cn } from "@/utils/cn";
import { AuditStatus } from "@/types/api";

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  RUNNING: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  FAILED: "bg-red-500/20 text-red-400 border-red-500/30",
  PENDING: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

export const HistoryScreen: React.FC = () => {
  const navigate = useNavigate();
  const { setActiveRunId, activeRunId } = useAuditContext();

  const [runs, setRuns] = useState<AuditStatus[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRuns = () => {
    setLoading(true);
    api
      .listAudits()
      .then((list) => setRuns(list))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleSelectRun = (run: AuditStatus) => {
    if (run.status !== "COMPLETED") return;
    setActiveRunId(run.run_id);
    navigate("/findings");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-5 w-5 text-accent-secondary" />
            <h1 className="text-lg font-bold text-txt-primary">Audit History</h1>
          </div>
          <p className="text-sm text-txt-muted">All audit runs for this session. Click a completed run to load its findings.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchRuns} disabled={loading} className="gap-1.5">
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {loading && (
        <div className="flex h-40 items-center justify-center gap-3 text-txt-muted">
          <Loader2 className="h-5 w-5 animate-spin text-accent-secondary" />
          <span className="text-sm">Loading runs…</span>
        </div>
      )}

      {!loading && runs.length === 0 && (
        <EmptyState
          icon={Clock}
          title="No Audit Runs Yet"
          description="Run your first audit to see it listed here."
        >
          <Button variant="primary" onClick={() => navigate("/audit")}>
            Start Audit <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </EmptyState>
      )}

      {!loading && runs.length > 0 && (
        <div className="space-y-3">
          {[...runs].reverse().map((run) => {
            const isActive = run.run_id === activeRunId;
            const isCompleted = run.status === "COMPLETED";
            return (
              <div
                key={run.run_id}
                className={cn(
                  "rounded-xl border p-4 transition-all",
                  isActive
                    ? "border-accent-primary/60 bg-accent-primary/5"
                    : isCompleted
                    ? "border-border bg-bg-card hover:border-border/80 cursor-pointer"
                    : "border-border bg-bg-card opacity-70"
                )}
                onClick={() => isCompleted && handleSelectRun(run)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-txt-primary truncate">{run.run_id}</span>
                      {isActive && (
                        <span className="rounded-full bg-accent-primary/20 border border-accent-primary/40 px-2 py-0.5 text-[10px] font-semibold text-accent-secondary">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-txt-muted">
                      Dataset: <span className="text-txt-secondary">{run.dataset_id}</span>
                    </p>
                    {run.elapsed_seconds !== undefined && (
                      <p className="text-xs text-txt-muted">
                        Duration: <span className="text-txt-secondary">{run.elapsed_seconds}s</span>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase",
                        STATUS_STYLES[run.status] || STATUS_STYLES.PENDING
                      )}
                    >
                      {run.status}
                    </span>
                    {isCompleted && !isActive && (
                      <button className="flex items-center gap-1 text-[11px] text-accent-secondary hover:text-accent-primary transition-colors">
                        Load <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                    {run.status === "RUNNING" && (
                      <div className="flex items-center gap-1 text-xs text-blue-400">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {run.progress_percent?.toFixed(0)}%
                      </div>
                    )}
                    {run.status === "FAILED" && (
                      <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                    )}
                    {run.status === "COMPLETED" && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
