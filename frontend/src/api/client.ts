import {
  AuditStartResponse,
  AuditStatus,
  DatasetItem,
  DatasetMetadata,
  DatasetPreview,
  DatasetValidateResponse,
  FragilityGridResponse,
  HealthResponse,
  RemediationPreview,
  ReportGenerateResponse,
  RunResult,
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
      errorDetail = errJson.message || errJson.detail || JSON.stringify(errJson);
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
};
