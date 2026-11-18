import React from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
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
  { id: "DIAGNOSE", num: "03", label: "DIAGNOSE", path: "/diagnostics" },
  { id: "REMEDIATE", num: "04", label: "REMEDIATE", path: "/remediation" },
  { id: "VERIFY", num: "05", label: "VERIFY", path: "/reports" },
];

export const WorkflowBar: React.FC = () => {
  const navigate = useNavigate();
  const { activeStage, setActiveStage, activeRunId, latestRunResult } = useAuditContext();

  const stageOrder = ["INGEST", "OVERVIEW", "DIAGNOSE", "REMEDIATE", "VERIFY"];
  const currentIdx = stageOrder.indexOf(activeStage);

  const isStageCompleted = (stageId: WorkflowStage) => {
    if (stageId === "INGEST") return true; // dataset available
    if (stageId === "OVERVIEW" && activeRunId) return true;
    if (stageId === "DIAGNOSE" && latestRunResult) return true;
    return false;
  };

  return (
    <div className="flex items-center gap-1 bg-bg-card border border-border/80 rounded-lg p-1.5 shadow-inner">
      {STAGES.map((st, idx) => {
        const isActive = activeStage === st.id;
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
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold tracking-wider transition-all select-none",
                isActive
                  ? "bg-accent-primary text-white shadow-md shadow-accent-primary/25"
                  : isPast || isCompleted
                  ? "text-txt-secondary hover:text-txt-primary hover:bg-bg-elevated/60"
                  : "text-txt-muted hover:text-txt-secondary hover:bg-bg-elevated/40"
              )}
            >
              {isCompleted ? (
                <CheckCircle2 className={cn("h-3.5 w-3.5", isActive ? "text-white" : "text-status-success")} />
              ) : (
                <span className={cn("text-[10px] font-mono", isActive ? "text-white/80" : "text-txt-muted")}>
                  {st.num}
                </span>
              )}
              <span>{st.label}</span>
            </button>
            {idx < STAGES.length - 1 && (
              <span className="text-border px-0.5">
                <ArrowRight className="h-3 w-3" />
              </span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
