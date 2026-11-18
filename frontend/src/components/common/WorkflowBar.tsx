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
  { id: "DATASET", num: "01", label: "DATASET", path: "/dataset" },
  { id: "AUDIT", num: "02", label: "AUDIT", path: "/audit" },
  { id: "FINDINGS", num: "03", label: "FINDINGS", path: "/findings" },
  { id: "REMEDIATION", num: "04", label: "REMEDIATION (OPT.)", path: "/remediation" },
  { id: "REPORTS", num: "05", label: "VERIFY & REPORT", path: "/reports" },
];

export const WorkflowBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeStage, setActiveStage, activeRunId, latestRunResult, activeDatasetId } = useAuditContext();

  // Sync active stage with pathname
  useEffect(() => {
    const p = location.pathname;
    if (p === "/" || p === "/overview" || p === "/home") {
      setActiveStage("HOME");
    } else if (p.startsWith("/dataset") || p.startsWith("/ingestion")) {
      setActiveStage("DATASET");
    } else if (p.startsWith("/audit")) {
      setActiveStage("AUDIT");
    } else if (p.startsWith("/findings") || p.startsWith("/heatmap") || p.startsWith("/diagnostics") || p.startsWith("/matrix")) {
      setActiveStage("FINDINGS");
    } else if (p.startsWith("/remediation")) {
      setActiveStage("REMEDIATION");
    } else if (p.startsWith("/reports") || p.startsWith("/export") || p.startsWith("/audit-log")) {
      setActiveStage("REPORTS");
    }
  }, [location.pathname]);

  const isStageActive = (st: StageConfig) => {
    const p = location.pathname;
    if (st.id === "DATASET" && (p.startsWith("/dataset") || p.startsWith("/ingestion"))) return true;
    if (st.id === "AUDIT" && p.startsWith("/audit")) return true;
    if (st.id === "FINDINGS" && (p.startsWith("/findings") || p.startsWith("/heatmap") || p.startsWith("/diagnostics") || p.startsWith("/matrix"))) return true;
    if (st.id === "REMEDIATION" && p.startsWith("/remediation")) return true;
    if (st.id === "REPORTS" && (p.startsWith("/reports") || p.startsWith("/export") || p.startsWith("/audit-log"))) return true;
    return false;
  };

  const isStageCompleted = (stageId: WorkflowStage) => {
    if (stageId === "DATASET" && activeDatasetId) return true;
    if (stageId === "AUDIT" && latestRunResult) return true;
    if (stageId === "FINDINGS" && latestRunResult) return true;
    return false;
  };

  return (
    <nav
      aria-label="Scientific Audit Workflow Stages"
      className="flex items-center gap-1 bg-bg-card/90 border border-border rounded-lg p-1 shadow-sm select-none"
    >
      {STAGES.map((st, idx) => {
        const isActive = isStageActive(st);
        const isCompleted = isStageCompleted(st.id);

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
                  : isCompleted
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
              <ArrowRight className="h-3 w-3 text-border shrink-0 opacity-60" />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
