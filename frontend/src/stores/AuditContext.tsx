import React, { createContext, useContext, useState, useEffect } from "react";
import { DatasetItem, RunResult, AuditStatus, DatasetMetadata, DatasetPreview, DatasetValidateResponse } from "@/types/api";
import { api } from "@/api/client";

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

export interface AuditConfig {
  seed: number;
  labelCol: string;
  benignLabel: string;
  maxRows: number;
}

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
  
  // Dataset Stage Caching & Validation
  datasetMetadata: DatasetMetadata | null;
  setDatasetMetadata: (meta: DatasetMetadata | null) => void;
  datasetPreview: DatasetPreview | null;
  setDatasetPreview: (prev: DatasetPreview | null) => void;
  datasetValidation: DatasetValidateResponse | null;
  setDatasetValidation: (val: DatasetValidateResponse | null) => void;

  // Validation & Audit Parameters
  auditConfig: AuditConfig;
  setAuditConfig: React.Dispatch<React.SetStateAction<AuditConfig>>;

  // Remediation Workflow Status (Decoupled & Optional)
  remediationSkipped: boolean;
  setRemediationSkipped: (skipped: boolean) => void;

  // User experience preferences
  viewMode: "basic" | "advanced";
  setViewMode: (mode: "basic" | "advanced") => void;
  onboardingDismissed: boolean;
  setOnboardingDismissed: (dismissed: boolean) => void;
  resetAuditState: () => void;
  isHydrating: boolean;
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

export const AuditProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeDatasetId, _setActiveDatasetId] = useState<string | null>(() => {
    return localStorage.getItem("smellscope_active_dataset") || null;
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
  const [isHydrating, setIsHydrating] = useState<boolean>(true);

  // Dataset Stage State
  const [datasetMetadata, setDatasetMetadata] = useState<DatasetMetadata | null>(null);
  const [datasetPreview, setDatasetPreview] = useState<DatasetPreview | null>(null);
  const [datasetValidation, setDatasetValidation] = useState<DatasetValidateResponse | null>(null);

  // Validation & Audit Parameters
  const [auditConfig, setAuditConfig] = useState<AuditConfig>(() => ({
    seed: 42,
    labelCol: "Label",
    benignLabel: "BENIGN",
    maxRows: 20000,
  }));

  // Remediation State
  const [remediationSkipped, setRemediationSkipped] = useState<boolean>(false);

  const [viewMode, setViewMode] = useState<"basic" | "advanced">(() => {
    return (localStorage.getItem("smellscope_view_mode") as "basic" | "advanced") || "basic";
  });

  const [onboardingDismissed, setOnboardingDismissed] = useState<boolean>(() => {
    return localStorage.getItem("smellscope_onboarding_dismissed") === "true";
  });

  // When dataset changes, invalidate stale audit results and downstream states
  const setActiveDatasetId = (id: string | null) => {
    if (id !== activeDatasetId) {
      setLatestRunResult(null);
      setActiveRunId(null);
      setActiveStatus(null);
      setDatasetMetadata(null);
      setDatasetPreview(null);
      setDatasetValidation(null);
      setRemediationSkipped(false);
    }
    _setActiveDatasetId(id);
  };

  const resetAuditState = () => {
    setLatestRunResult(null);
    setActiveRunId(null);
    setActiveStatus(null);
    setRemediationSkipped(false);
    localStorage.removeItem("smellscope_active_run");
  };

  useEffect(() => {
    if (activeDatasetId) {
      localStorage.setItem("smellscope_active_dataset", activeDatasetId);
    } else {
      localStorage.removeItem("smellscope_active_dataset");
    }
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

  // Global hydration of completed audit records on initial application load
  useEffect(() => {
    let cancelled = false;
    const hydrateActiveRun = async () => {
      try {
        let runIdToLoad = activeRunId;
        if (!runIdToLoad) {
          const list: AuditStatus[] = await api.listAudits();
          const completed = list.find((a: AuditStatus) => a.status === "COMPLETED") || list[0];
          if (completed) {
            runIdToLoad = completed.run_id;
          }
        }
        if (runIdToLoad && !latestRunResult) {
          const res = await api.getAuditResults(runIdToLoad);
          if (!cancelled) {
            setActiveRunId(runIdToLoad);
            setLatestRunResult(res);
          }
        }
      } catch (err) {
        // Ignore background hydration failures
      } finally {
        if (!cancelled) {
          setIsHydrating(false);
        }
      }
    };
    hydrateActiveRun();
    return () => {
      cancelled = true;
    };
  }, []);

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
        datasetMetadata,
        setDatasetMetadata,
        datasetPreview,
        setDatasetPreview,
        datasetValidation,
        setDatasetValidation,
        auditConfig,
        setAuditConfig,
        remediationSkipped,
        setRemediationSkipped,
        viewMode,
        setViewMode,
        onboardingDismissed,
        setOnboardingDismissed,
        resetAuditState,
        isHydrating,
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
