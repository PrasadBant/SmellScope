import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/utils/cn";
import { WorkflowStage, useAuditContext } from "@/stores/AuditContext";

interface StageConfig {
  id: WorkflowStage;
  num: string;
  label: string;
  path: string;
}

const STAGES: StageConfig[] = [
  { id: "INGEST", num: "01", label: "INGEST", path: "/ingestion" },
  { id: "OVERVIEW", num: "02", label: "OVERVIEW", path: "/overview" },
  { id: "MATRIX", num: "03", label: "MATRIX", path: "/heatmap" },
  { id: "DIAGNOSE", num: "04", label: "DIAGNOSE", path: "/diagnostics" },
  { id: "REMEDIATE", num: "05", label: "REMEDIATE", path: "/remediation" },
  { id: "VERIFY", num: "06", label: "VERIFY", path: "/reports" },
];

export const WorkflowBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeStage, setActiveStage, activeRunId, latestRunResult } = useAuditContext();

  // Sync active stage with pathname
  useEffect(() => {
    const current = STAGES.find((s) => s.path === location.pathname);
    if (current && current.id !== activeStage) {
      setActiveStage(current.id);
    }
  }, [location.pathname]);

  const stageOrder: WorkflowStage[] = ["INGEST", "OVERVIEW", "MATRIX", "DIAGNOSE", "REMEDIATE", "VERIFY"];
  const currentIdx = stageOrder.indexOf(activeStage);

  const isStageCompleted = (stageId: WorkflowStage) => {
    if (stageId === "INGEST") return true; // dataset available
    if (stageId === "OVERVIEW" && activeRunId) return true;
    if (stageId === "MATRIX" && latestRunResult) return true;
    if (stageId === "DIAGNOSE" && latestRunResult) return true;
    return false;
  };

  return (
    <nav
      aria-label="Audit Workflow Stages"
      className="flex items-center gap-1 bg-bg-card/90 border border-border rounded-lg p-1 shadow-sm select-none"
    >
      {STAGES.map((st, idx) => {
        const isActive = activeStage === st.id || location.pathname === st.path;
        const isCompleted = isStageCompleted(st.id);
        const isPast = idx < currentIdx;

        return (
          <React.Fragment key={st.id}>
            <button
              onClick={() => {
                setActiveStage(st.id);
                navigate(st.path);
              }}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wider transition-all select-none",
                isActive
                  ? "bg-accent-primary text-white shadow-sm shadow-accent-primary/20 border border-accent-primary/30 font-bold"
                  : isPast || isCompleted
                  ? "text-txt-secondary hover:text-txt-primary hover:bg-bg-elevated/70"
                  : "text-txt-muted hover:text-txt-secondary hover:bg-bg-elevated/40"
              )}
            >
              {isCompleted ? (
                <CheckCircle2
                  className={cn("h-3 w-3", isActive ? "text-white" : "text-status-success")}
                />
              ) : (
                <span
                  className={cn(
                    "text-[10px] font-mono",
                    isActive ? "text-white/80" : "text-txt-muted"
                  )}
                >
                  {st.num}
                </span>
              )}
              <span>{st.label}</span>
            </button>
            {idx < STAGES.length - 1 && (
              <span className="text-border px-0.5">
                <ArrowRight className="h-2.5 w-2.5 text-txt-muted/40" />
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
