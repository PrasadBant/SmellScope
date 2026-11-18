import React, { createContext, useContext, useState, useEffect } from "react";
import { DatasetItem, RunResult, AuditStatus } from "@/types/api";

export type WorkflowStage = "INGEST" | "OVERVIEW" | "DIAGNOSE" | "REMEDIATE" | "VERIFY";

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
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

export const AuditProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(() => {
    return localStorage.getItem("smellscope_active_dataset") || "cic2017_sample_planted";
  });
  const [activeRunId, setActiveRunId] = useState<string | null>(() => {
    return localStorage.getItem("smellscope_active_run") || null;
  });
  const [selectedClass, setSelectedClass] = useState<string | null>(() => {
    return localStorage.getItem("smellscope_selected_class") || "PortScan";
  });
  const [activeStage, setActiveStage] = useState<WorkflowStage>("OVERVIEW");
  const [latestRunResult, setLatestRunResult] = useState<RunResult | null>(null);
  const [activeStatus, setActiveStatus] = useState<AuditStatus | null>(null);

  useEffect(() => {
    if (activeDatasetId) localStorage.setItem("smellscope_active_dataset", activeDatasetId);
  }, [activeDatasetId]);

  useEffect(() => {
    if (activeRunId) localStorage.setItem("smellscope_active_run", activeRunId);
  }, [activeRunId]);

  useEffect(() => {
    if (selectedClass) localStorage.setItem("smellscope_selected_class", selectedClass);
  }, [selectedClass]);

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
      }}
    >
      {children}
    </AuditContext.Provider>
  );
};

export const useAuditContext = () => {
  const ctx = useContext(AuditContext);
  if (!ctx) {
    throw new Error("useAuditContext must be used within an AuditProvider");
  }
  return ctx;
};
