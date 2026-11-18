import React, { createContext, useContext, useState, useEffect } from "react";
import { DatasetItem, RunResult, AuditStatus } from "@/types/api";

export type WorkflowStage =
  | "HOME"
  | "DATASET"
  | "AUDIT"
  | "FINDINGS"
  | "REMEDIATION"
  | "REPORTS"
  // Legacy aliases for backward-compatibility
  | "INGEST"
  | "OVERVIEW"
  | "MATRIX"
  | "DIAGNOSE"
  | "REMEDIATE"
  | "VERIFY";

interface AuditContextType {
  activeDatasetId: string | null;
  setActiveDatasetId: (id: string | null) => void;
  activeRunId: string | null;
  setActiveRunId: (id: string | null) => void;
  selectedClass: string | null;
  setSelectedClass: (cls: string | null) => void;
  activeStage: WorkflowStage;
  setActiveStage: (stage: WorkflowStage) => void;
  latestRunResult: RunResult | null;
  setLatestRunResult: (res: RunResult | null) => void;
  activeStatus: AuditStatus | null;
  setActiveStatus: (st: AuditStatus | null) => void;
  // User experience preferences
  viewMode: "basic" | "advanced";
  setViewMode: (mode: "basic" | "advanced") => void;
  onboardingDismissed: boolean;
  setOnboardingDismissed: (dismissed: boolean) => void;
  resetAuditState: () => void;
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

export const AuditProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeDatasetId, _setActiveDatasetId] = useState<string | null>(() => {
    return localStorage.getItem("smellscope_active_dataset") || "cic2017_sample_planted";
  });
  const [activeRunId, setActiveRunId] = useState<string | null>(() => {
    return localStorage.getItem("smellscope_active_run") || null;
  });
  const [selectedClass, setSelectedClass] = useState<string | null>(() => {
    return localStorage.getItem("smellscope_selected_class") || "PortScan";
  });
  const [activeStage, setActiveStage] = useState<WorkflowStage>("HOME");
  const [latestRunResult, setLatestRunResult] = useState<RunResult | null>(null);
  const [activeStatus, setActiveStatus] = useState<AuditStatus | null>(null);

  const [viewMode, setViewMode] = useState<"basic" | "advanced">(() => {
    return (localStorage.getItem("smellscope_view_mode") as "basic" | "advanced") || "basic";
  });

  const [onboardingDismissed, setOnboardingDismissed] = useState<boolean>(() => {
    return localStorage.getItem("smellscope_onboarding_dismissed") === "true";
  });

  // When dataset changes, invalidate stale audit results
  const setActiveDatasetId = (id: string | null) => {
    if (id !== activeDatasetId) {
      setLatestRunResult(null);
      setActiveRunId(null);
      setActiveStatus(null);
    }
    _setActiveDatasetId(id);
  };

  const resetAuditState = () => {
    setLatestRunResult(null);
    setActiveRunId(null);
    setActiveStatus(null);
    localStorage.removeItem("smellscope_active_run");
  };

  useEffect(() => {
    if (activeDatasetId) localStorage.setItem("smellscope_active_dataset", activeDatasetId);
  }, [activeDatasetId]);

  useEffect(() => {
    if (activeRunId) localStorage.setItem("smellscope_active_run", activeRunId);
    else localStorage.removeItem("smellscope_active_run");
  }, [activeRunId]);

  useEffect(() => {
    if (selectedClass) localStorage.setItem("smellscope_selected_class", selectedClass);
  }, [selectedClass]);

  useEffect(() => {
    localStorage.setItem("smellscope_view_mode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem("smellscope_onboarding_dismissed", String(onboardingDismissed));
  }, [onboardingDismissed]);

  return (
    <AuditContext.Provider
      value={{
        activeDatasetId,
        setActiveDatasetId,
        activeRunId,
        setActiveRunId,
        selectedClass,
        setSelectedClass,
        activeStage,
        setActiveStage,
        latestRunResult,
        setLatestRunResult,
        activeStatus,
        setActiveStatus,
        viewMode,
        setViewMode,
        onboardingDismissed,
        setOnboardingDismissed,
        resetAuditState,
      }}
    >
      {children}
    </AuditContext.Provider>
  );
};

export const useAuditContext = () => {
  const context = useContext(AuditContext);
  if (!context) {
    throw new Error("useAuditContext must be used within an AuditProvider");
  }
  return context;
};
