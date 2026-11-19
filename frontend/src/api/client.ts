import {
  AuditLogEntry,
  AuditStartResponse,
  AuditStatus,
  CorrelationHeatmap,
  DatasetItem,
  DatasetMetadata,
  DatasetPreview,
  DatasetProfile,
  DatasetValidateResponse,
  FeatureImportanceHeatmap,
  FragilityGridResponse,
  HealthResponse,
  ModelCompatibilityResponse,
  ModelMetadata,
  ModelPredictResponse,
  RemediationPreview,
  ReportGenerateResponse,
  RunResult,
  SmellMatrixHeatmap,
  ViewsResponse,
} from "@/types/api";

const BASE_URL =
  typeof window !== "undefined" && window.location && window.location.origin && !window.location.origin.includes("localhost:0")
    ? `${window.location.origin}/api/v1`
    : "http://127.0.0.1:8000/api/v1";

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    let errorDetail = "API Error";
    try {
      const errJson = await res.json();
      if (errJson && typeof errJson.detail === "object" && errJson.detail.message) {
        errorDetail = errJson.detail.message;
      } else if (errJson.message) {
        errorDetail = errJson.message;
      } else if (typeof errJson.detail === "string") {
        errorDetail = errJson.detail;
      } else {
        errorDetail = JSON.stringify(errJson);
      }
    } catch {
      errorDetail = await res.text();
    }
    throw new Error(errorDetail);
  }

  return res.json();
}

export const api = {
  // System Health
  getHealth: () => request<HealthResponse>("/health"),

  // Datasets
  listDatasets: () => request<DatasetItem[]>("/datasets"),
  getDatasetMetadata: (id: string) => request<DatasetMetadata>(`/datasets/${id}`),
  getDatasetProfile: (id: string) => request<DatasetProfile>(`/datasets/${id}/profile`),
  getDatasetPreview: (id: string, limit = 50) => request<DatasetPreview>(`/datasets/${id}/preview?limit=${limit}`),
  validateDataset: (id: string, req: { label_col: string; benign_label: string; max_rows_per_class?: number; seed?: number }) =>
    request<DatasetValidateResponse>(`/datasets/${id}/validate`, {
      method: "POST",
      body: JSON.stringify(req),
    }),
  uploadDataset: async (file: File, label_col?: string, benign_label?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (label_col) formData.append("label_col", label_col);
    if (benign_label) formData.append("benign_label", benign_label);

    const res = await fetch(`${BASE_URL}/datasets/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Upload failed");
    }
    return res.json();
  },

  // Audits
  startAudit: (req: { dataset_id: string; classes?: string[]; seed?: number; max_rows_per_class?: number }) =>
    request<AuditStartResponse>("/audits", {
      method: "POST",
      body: JSON.stringify(req),
    }),
  listAudits: () => request<AuditStatus[]>("/audits"),
  getAuditStatus: (runId: string) => request<AuditStatus>(`/audits/${runId}`),
  getAuditResults: (runId: string) => request<RunResult>(`/audits/${runId}/results`),
  getClassDiagnostics: (runId: string, classId: string) =>
    request<any>(`/audits/${runId}/classes/${classId}/diagnostics`),
  getAuditLogs: (runId: string) => request<AuditLogEntry[]>(`/audits/${runId}/logs`),
  getSmellMatrixHeatmap: (runId: string) => request<SmellMatrixHeatmap>(`/audits/${runId}/heatmaps/smell-matrix`),
  getFeatureImportanceHeatmap: (runId: string) => request<FeatureImportanceHeatmap>(`/audits/${runId}/heatmaps/feature-importance`),
  getCorrelationHeatmap: (runId: string, maxFeatures = 12) =>
    request<CorrelationHeatmap>(`/audits/${runId}/heatmaps/correlations?max_features=${maxFeatures}`),
  getFragilityGrid: (runId: string, cls: string, features: [string, string]) =>
    request<FragilityGridResponse>(`/audits/${runId}/fragility-grid`, {
      method: "POST",
      body: JSON.stringify({ class: cls, features }),
    }),

  // Remediation
  previewRemediation: (runId: string, action: string, params: Record<string, any>) =>
    request<RemediationPreview>(`/audits/${runId}/remediations/preview`, {
      method: "POST",
      body: JSON.stringify({ action, params }),
    }),
  applyRemediation: (runId: string, previewId: string, approval: { approved: boolean; warning_ack: boolean; approved_at: string }) =>
    request<{ view: any; change_log_entry: any }>(`/audits/${runId}/remediations/apply`, {
      method: "POST",
      body: JSON.stringify({ preview_id: previewId, approval }),
    }),
  getRemediationViews: (runId: string) => request<ViewsResponse>(`/audits/${runId}/views`),
  rollback: (runId: string, targetEntryId: string) =>
    request<{ restored_view: any; message: string; integrity_verified: boolean }>(`/audits/${runId}/rollback`, {
      method: "POST",
      body: JSON.stringify({ target_entry_id: targetEntryId }),
    }),
  rebenchmark: (runId: string, targetClass?: string) =>
    request<any>(`/audits/${runId}/rebenchmark`, {
      method: "POST",
      body: JSON.stringify({ target_class: targetClass }),
    }),

  // Reports
  generateReport: (runId: string, includeRebenchmark = true) =>
    request<ReportGenerateResponse>(`/audits/${runId}/reports`, {
      method: "POST",
      body: JSON.stringify({ include_rebenchmark: includeRebenchmark }),
    }),

  // Benchmarks Reference Values
  getPublishedValues: () => request<{ benchmarks: Record<string, any> }>("/benchmarks/published-values"),

  // Improvement Centre
  getRecommendations: (runId: string) =>
    request<{ run_id: string; recommendations: any[]; generated_at: string }>(`/audits/${runId}/recommendations`),

  getDatasetScores: (runId: string) => request<any>(`/audits/${runId}/scores`),

  createRepairPlanPreview: (runId: string, selectedRecs: any[]) =>
    request<any>(`/audits/${runId}/repair-plan/preview`, {
      method: "POST",
      body: JSON.stringify({ selected_recs: selectedRecs }),
    }),

  applyRepairPlan: (runId: string, previewId: string, approval: any) =>
    request<{ view: any; change_log_entry: any; export_metadata: any }>(`/audits/${runId}/repair-plan/apply`, {
      method: "POST",
      body: JSON.stringify({ preview_id: previewId, approval }),
    }),

  getDatasetComparison: (runId: string, targetClass?: string) =>
    request<any>(`/audits/${runId}/comparison${targetClass ? `?target_class=${encodeURIComponent(targetClass)}` : ""}`),

  getDownloadUrl: (runId: string) => `${BASE_URL}/audits/${runId}/export/dataset`,

  // Model Persistence & Registry (Phase 13)
  listModels: () => request<ModelMetadata[]>("/models"),

  saveModel: (runId: string, modelName?: string, notes?: string) =>
    request<any>("/models/save", {
      method: "POST",
      body: JSON.stringify({ run_id: runId, model_name: modelName, notes }),
    }),

  getModelDetails: (modelId: string) => request<ModelMetadata>(`/models/${modelId}`),

  verifyModelCompatibility: (modelId: string, datasetId?: string, labelCol?: string) =>
    request<ModelCompatibilityResponse>(`/models/${modelId}/verify-compatibility`, {
      method: "POST",
      body: JSON.stringify({ dataset_id: datasetId, label_col: labelCol }),
    }),

  predictWithModel: (modelId: string, datasetId?: string, limit = 50) =>
    request<ModelPredictResponse>(`/models/${modelId}/predict`, {
      method: "POST",
      body: JSON.stringify({ dataset_id: datasetId, limit }),
    }),

  deleteModel: (modelId: string) =>
    request<{ status: string; model_id: string }>(`/models/${modelId}`, {
      method: "DELETE",
    }),

  getModelDownloadUrl: (modelId: string) => `${BASE_URL}/models/${modelId}/download`,
  getModelBundleUrl: (modelId: string) => `${BASE_URL}/models/${modelId}/bundle`,
};
