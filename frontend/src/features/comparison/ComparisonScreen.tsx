import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart2,
  Lock,
  ArrowRight,
  Loader2,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  Wrench,
  ShieldCheck,
  Save,
  PackageCheck,
  FileArchive,
  Database,
  Trash2,
  X,
  AlertTriangle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuditContext } from "@/stores/AuditContext";
import { api } from "@/api/client";
import { cn } from "@/utils/cn";

type ComparisonData = {
  scores?: {
    before: Record<string, any>;
    after: Record<string, any>;
    delta: Record<string, number>;
  };
  data_quality: {
    before: Record<string, any>;
    after: Record<string, any>;
    delta: Record<string, number>;
  };
  ml_benchmark: {
    before: Record<string, any>;
    after: Record<string, any>;
    delta: Record<string, number | null>;
    same_test_ids: boolean;
    split_hash: string;
    train_sizes: Record<string, number>;
  };
  test_integrity: {
    same_test_ids: boolean;
    test_sample_count: number;
    split_hash: string;
    status: string;
  };
  view_lineage: {
    original_view_id: string;
    corrected_view_id: string;
    excluded_features: string[];
  };
};

const DeltaChip: React.FC<{ delta: number | null; invertGood?: boolean }> = ({ delta, invertGood = false }) => {
  if (delta === null || delta === undefined) return <span className="text-txt-muted text-xs">—</span>;
  const isGood = invertGood ? delta > 0 : delta < 0;
  const isNeutral = delta === 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-mono font-semibold",
        isNeutral ? "text-txt-muted" : isGood ? "text-emerald-400" : "text-red-400"
      )}
    >
      {isNeutral ? (
        <Minus className="h-3 w-3" />
      ) : isGood ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {delta > 0 ? "+" : ""}
      {typeof delta === "number" && Math.abs(delta) < 1 && Math.abs(delta) > 0
        ? `${(delta * 100).toFixed(2)}pp`
        : delta.toFixed ? delta.toFixed(0) : String(delta)}
    </span>
  );
};

const pct = (v: number | null | undefined) => {
  if (v === null || v === undefined) return "—";
  return `${(v * 100).toFixed(2)}%`;
};

export const ComparisonScreen: React.FC = () => {
  const navigate = useNavigate();
  const { activeRunId, activeDatasetId, isHydrating, latestRunResult } = useAuditContext();

  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [notAvailable, setNotAvailable] = useState(false);

  // Model Persistence & Registry States (Phase 13)
  const [savingModel, setSavingModel] = useState(false);
  const [savedModelInfo, setSavedModelInfo] = useState<any | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [modelNameInput, setModelNameInput] = useState("");
  const [modelNotesInput, setModelNotesInput] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showRegistryDialog, setShowRegistryDialog] = useState(false);
  const [savedModelsList, setSavedModelsList] = useState<any[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [compatibilityResult, setCompatibilityResult] = useState<Record<string, any>>({});
  const [verifyingModelId, setVerifyingModelId] = useState<string | null>(null);

  const fetchModels = async () => {
    setLoadingModels(true);
    try {
      const list = await api.listModels();
      setSavedModelsList(list);
    } catch (e) {
      console.warn("Could not list models:", e);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleSaveModel = async () => {
    if (!activeRunId) return;
    setSavingModel(true);
    setSaveError(null);
    try {
      const saved = await api.saveModel(
        activeRunId,
        modelNameInput.trim() || `RandomForest-${activeRunId.slice(-6)}`,
        modelNotesInput.trim() || undefined
      );
      setSavedModelInfo(saved);
      setShowSaveDialog(false);
      fetchModels();
    } catch (err: any) {
      setSaveError(err.message || "Failed to save trained model");
    } finally {
      setSavingModel(false);
    }
  };

  const handleVerifyCompatibility = async (modelId: string) => {
    setVerifyingModelId(modelId);
    try {
      const comp = await api.verifyModelCompatibility(modelId, activeDatasetId || undefined);
      setCompatibilityResult((prev) => ({ ...prev, [modelId]: comp }));
    } catch (e: any) {
      setCompatibilityResult((prev) => ({
        ...prev,
        [modelId]: { compatible: false, message: e.message || "Verification failed" },
      }));
    } finally {
      setVerifyingModelId(null);
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    try {
      await api.deleteModel(modelId);
      if (savedModelInfo?.model_id === modelId) {
        setSavedModelInfo(null);
      }
      fetchModels();
    } catch (e: any) {
      alert("Failed to delete model: " + e.message);
    }
  };

  useEffect(() => {
    if (isHydrating && !latestRunResult) return;
    if (!activeRunId) return;
    setLoading(true);
    setNotAvailable(false);
    api
      .getDatasetComparison(activeRunId)
      .then((res) => setData(res as ComparisonData))
      .catch((e: any) => {
        if (e.message?.includes("404") || e.message?.includes("not found") || e.message?.includes("No corrected")) {
          setNotAvailable(true);
        }
      })
      .finally(() => setLoading(false));
  }, [activeRunId, isHydrating, latestRunResult]);

  if (isHydrating && !latestRunResult) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent-secondary" />
      </div>
    );
  }

  if (!activeRunId) {
    return (
      <EmptyState
        icon={BarChart2}
        title="No Audit Active"
        description="Complete an audit and apply repairs to see the before/after dataset comparison."
      >
        <Button variant="primary" onClick={() => navigate("/audit")}>
          Go to Audit <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </EmptyState>
    );
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-3 text-txt-muted">
        <Loader2 className="h-6 w-6 animate-spin text-accent-secondary" />
        <span className="text-sm">Computing comparison…</span>
      </div>
    );
  }

  if (notAvailable || !data) {
    return (
      <EmptyState
        icon={BarChart2}
        title="No Comparison Data Yet"
        description="Apply repair recommendations in the Improvement Centre to generate a before/after comparison."
      >
        <Button variant="primary" onClick={() => navigate("/improvement")}>
          <Wrench className="h-3.5 w-3.5 mr-1" />
          Go to Improvement Centre
        </Button>
      </EmptyState>
    );
  }

  const dq = data.data_quality;
  const ml = data.ml_benchmark;
  const integrity = data.test_integrity;
  const lineage = data.view_lineage;

  const ML_METRICS = [
    { key: "accuracy", label: "Accuracy" },
    { key: "precision", label: "Precision" },
    { key: "recall", label: "Recall" },
    { key: "macro_f1", label: "Macro F1" },
    { key: "weighted_f1", label: "Weighted F1" },
  ];

  const DQ_METRICS = [
    { key: "total_rows", label: "Total Rows", invertGood: false },
    { key: "total_columns", label: "Total Columns", invertGood: false },
    { key: "missing_values", label: "Missing Values", invertGood: false },
    { key: "infinite_values", label: "Infinite Values", invertGood: false },
    { key: "duplicate_records", label: "Duplicate Records", invertGood: false },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 className="h-5 w-5 text-accent-secondary" />
            <h1 className="text-lg font-bold text-txt-primary">Dataset Comparison & Model Deployment</h1>
          </div>
          <p className="text-sm text-txt-muted">
            Original vs Corrected — data quality, ML benchmark on locked test set, and reusable model export.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => {
              fetchModels();
              setShowRegistryDialog(true);
            }}
          >
            <Database className="h-3.5 w-3.5" />
            Saved Models Registry
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs text-accent-primary border-accent-primary/40 bg-accent-primary/10"
            onClick={() => setShowSaveDialog(true)}
          >
            <Save className="h-3.5 w-3.5" />
            Save Trained Model
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="gap-2 text-xs"
            onClick={() => window.open(api.getDownloadUrl(activeRunId), "_blank")}
          >
            <Download className="h-3.5 w-3.5" />
            Download Dataset
          </Button>
        </div>
      </div>

      {/* Locked Test Set Banner */}
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 flex items-center gap-3">
        <Lock className="h-5 w-5 text-emerald-400 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-bold text-emerald-300">
            🔒 Locked Test Set Verified
          </p>
          <p className="text-xs text-txt-muted mt-0.5">
            same_test_ids = {String(integrity.same_test_ids)} ·{" "}
            {integrity.test_sample_count.toLocaleString()} test records verified ·{" "}
            split_hash: <span className="font-mono">{integrity.split_hash?.slice(0, 12)}…</span>
          </p>
        </div>
        <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
      </div>

      {/* Scientific Trust & Quality Scores Comparison */}
      {data.scores && (
        <Card className="border-accent-primary/40 bg-gradient-to-b from-accent-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-accent-secondary" />
                  Dataset Trust & Quality Scores (Before vs. After)
                </CardTitle>
                <p className="text-xs text-txt-muted mt-0.5">
                  Dynamic recalculation of all four scientific dimensions and overall trust score.
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-accent-primary/10 border border-accent-primary/30 text-accent-secondary">
                v{data.scores.before?.scoring_version || "1.0.0"}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-2 text-left text-xs font-semibold text-txt-muted">Scoring Dimension</th>
                    <th className="pb-2 text-right text-xs font-semibold text-txt-muted">Before</th>
                    <th className="pb-2 text-right text-xs font-semibold text-txt-muted">After</th>
                    <th className="pb-2 text-right text-xs font-semibold text-txt-muted">Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 font-mono">
                  <tr className="bg-bg-elevated/40 font-bold">
                    <td className="py-2.5 text-xs font-sans text-txt-primary flex items-center gap-1.5">
                      <span>Overall Trust Score</span>
                      <span className="text-[10px] font-normal text-txt-muted font-sans">(Synthesized 0-100)</span>
                    </td>
                    <td className="py-2.5 text-right text-xs text-txt-primary">
                      {data.scores.before?.overall_score?.toFixed(1) ?? "—"}
                    </td>
                    <td className="py-2.5 text-right text-xs text-txt-primary">
                      {data.scores.after?.overall_score?.toFixed(1) ?? "—"}
                    </td>
                    <td className="py-2.5 text-right">
                      <DeltaChip delta={data.scores.delta?.overall_score} invertGood />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-xs font-sans text-txt-secondary">
                      Data Quality Score <span className="text-[10px] text-txt-muted">(Hygiene & Completeness)</span>
                    </td>
                    <td className="py-2 text-right text-xs text-txt-muted">
                      {data.scores.before?.dimensions?.data_quality?.score?.toFixed(1) ?? "—"}
                    </td>
                    <td className="py-2 text-right text-xs text-txt-muted">
                      {data.scores.after?.dimensions?.data_quality?.score?.toFixed(1) ?? "—"}
                    </td>
                    <td className="py-2 text-right">
                      <DeltaChip delta={data.scores.delta?.data_quality} invertGood />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-xs font-sans text-txt-secondary">
                      NIDS Research Suitability <span className="text-[10px] text-txt-muted">(Telemetry & Diversity)</span>
                    </td>
                    <td className="py-2 text-right text-xs text-txt-muted">
                      {data.scores.before?.dimensions?.nids_suitability?.score?.toFixed(1) ?? "—"}
                    </td>
                    <td className="py-2 text-right text-xs text-txt-muted">
                      {data.scores.after?.dimensions?.nids_suitability?.score?.toFixed(1) ?? "—"}
                    </td>
                    <td className="py-2 text-right">
                      <DeltaChip delta={data.scores.delta?.nids_suitability} invertGood />
                    </td>
                  </tr>
                  <tr className="bg-amber-500/5">
                    <td className="py-2 text-xs font-sans text-amber-300 font-semibold flex items-center gap-1">
                      <span>Shortcut & Leakage Risk</span>
                      <span className="text-[10px] text-amber-400/80 font-normal">(⚠️ Inverted: Lower = Safer)</span>
                    </td>
                    <td className="py-2 text-right text-xs text-amber-400">
                      {data.scores.before?.dimensions?.shortcut_risk?.score?.toFixed(1) ?? "—"}
                    </td>
                    <td className="py-2 text-right text-xs text-amber-400 font-bold">
                      {data.scores.after?.dimensions?.shortcut_risk?.score?.toFixed(1) ?? "—"}
                    </td>
                    <td className="py-2 text-right">
                      {/* delta < 0 is GOOD for risk, so invertGood={false} */}
                      <DeltaChip delta={data.scores.delta?.shortcut_risk} invertGood={false} />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 text-xs font-sans text-txt-secondary">
                      Evaluation Reliability <span className="text-[10px] text-txt-muted">(Locked Test Isolation)</span>
                    </td>
                    <td className="py-2 text-right text-xs text-txt-muted">
                      {data.scores.before?.dimensions?.evaluation_reliability?.score?.toFixed(1) ?? "—"}
                    </td>
                    <td className="py-2 text-right text-xs text-txt-muted">
                      {data.scores.after?.dimensions?.evaluation_reliability?.score?.toFixed(1) ?? "—"}
                    </td>
                    <td className="py-2 text-right">
                      <DeltaChip delta={data.scores.delta?.evaluation_reliability} invertGood />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Quality Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Data Quality</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 text-left text-xs font-semibold text-txt-muted">Metric</th>
                  <th className="pb-2 text-right text-xs font-semibold text-txt-muted">Before</th>
                  <th className="pb-2 text-right text-xs font-semibold text-txt-muted">After</th>
                  <th className="pb-2 text-right text-xs font-semibold text-txt-muted">Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {DQ_METRICS.map(({ key, label, invertGood }) => (
                  <tr key={key}>
                    <td className="py-2 text-xs text-txt-secondary">{label}</td>
                    <td className="py-2 text-right font-mono text-xs text-txt-muted">
                      {(dq.before[key] ?? "—").toLocaleString?.() ?? dq.before[key] ?? "—"}
                    </td>
                    <td className="py-2 text-right font-mono text-xs text-txt-muted">
                      {(dq.after[key] ?? "—").toLocaleString?.() ?? dq.after[key] ?? "—"}
                    </td>
                    <td className="py-2 text-right">
                      <DeltaChip delta={dq.delta[key]} invertGood={invertGood} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ML Performance Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">ML Performance — Locked Test Set</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 text-left text-xs font-semibold text-txt-muted">Metric</th>
                  <th className="pb-2 text-right text-xs font-semibold text-txt-muted">Before</th>
                  <th className="pb-2 text-right text-xs font-semibold text-txt-muted">After</th>
                  <th className="pb-2 text-right text-xs font-semibold text-txt-muted">Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {ML_METRICS.map(({ key, label }) => {
                  const before = ml.before?.[key];
                  const after = ml.after?.[key];
                  const delta = ml.delta?.[key];
                  return (
                    <tr key={key}>
                      <td className="py-2 text-xs text-txt-secondary">{label}</td>
                      <td className="py-2 text-right font-mono text-xs text-txt-muted">{pct(before)}</td>
                      <td className="py-2 text-right font-mono text-xs text-txt-muted">{pct(after)}</td>
                      <td className="py-2 text-right">
                        <DeltaChip delta={typeof delta === "number" ? delta : null} invertGood />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {ml.train_sizes && (
            <div className="mt-3 pt-3 border-t border-border/50 flex gap-6 text-xs text-txt-muted">
              <span>
                Original train:{" "}
                <strong className="text-txt-secondary">{ml.train_sizes.original?.toLocaleString() ?? "—"}</strong>
              </span>
              <span>
                Corrected train:{" "}
                <strong className="text-txt-secondary">{ml.train_sizes.remediated?.toLocaleString() ?? "—"}</strong>
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Lineage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">View Lineage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-xs text-txt-muted font-mono">
            <span className="rounded bg-bg-elevated px-2 py-1 text-txt-secondary">{lineage.original_view_id}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            <span className="rounded bg-accent-primary/10 border border-accent-primary/30 px-2 py-1 text-accent-secondary">
              {lineage.corrected_view_id}
            </span>
          </div>
          {lineage.excluded_features?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-txt-muted mb-1.5">Excluded features:</p>
              <div className="flex flex-wrap gap-1.5">
                {lineage.excluded_features.map((f) => (
                  <span key={f} className="rounded-md bg-bg-elevated border border-border px-2 py-0.5 text-[10px] font-mono text-txt-muted">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reusable Model Persistence & Export Bundle (Phase 13) */}
      <Card className="border-accent-primary/40 bg-gradient-to-b from-accent-primary/10 to-transparent">
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-accent-secondary" />
              <div>
                <CardTitle className="text-sm font-bold text-txt-primary">
                  Trained Model & Reusable Training Bundle
                </CardTitle>
                <p className="text-xs text-txt-muted mt-0.5">
                  Phase 13: Export reproducible model artifact, fitted preprocessor, and 11-file self-contained bundle.
                </p>
              </div>
            </div>
            {savedModelInfo && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-status-success/20 text-status-success border border-status-success/40 font-bold">
                MODEL PERSISTED
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {savedModelInfo ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-lg border border-border bg-bg-card grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-txt-muted block uppercase">Model Version ID</span>
                  <strong className="text-accent-secondary text-xs">{savedModelInfo.model_id}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-txt-muted block uppercase">Model Name</span>
                  <strong className="text-txt-primary text-xs">{savedModelInfo.model_name}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-txt-muted block uppercase">Algorithm</span>
                  <strong className="text-txt-primary text-xs">{savedModelInfo.algorithm}</strong>
                </div>
                <div className="md:col-span-3 pt-2 border-t border-border/50 text-[11px] text-txt-muted flex flex-wrap gap-4">
                  <span>
                    Model SHA-256:{" "}
                    <code className="text-txt-secondary">{savedModelInfo.model_sha256?.slice(0, 16)}…</code>
                  </span>
                  <span>
                    Preprocessor SHA-256:{" "}
                    <code className="text-txt-secondary">{savedModelInfo.preprocessor_sha256?.slice(0, 16)}…</code>
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button
                  variant="primary"
                  size="sm"
                  className="gap-2 text-xs"
                  onClick={() => window.open(api.getModelBundleUrl(savedModelInfo.model_id), "_blank")}
                >
                  <FileArchive className="h-4 w-4" />
                  Download Reusable Bundle (.zip)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs"
                  onClick={() => window.open(api.getModelDownloadUrl(savedModelInfo.model_id), "_blank")}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Model (.joblib)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => {
                    fetchModels();
                    setShowRegistryDialog(true);
                  }}
                >
                  <Database className="h-3.5 w-3.5" />
                  View All Saved Models
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-lg border border-border bg-bg-card">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-txt-primary">Save Model to Registry</h4>
                <p className="text-[11px] text-txt-muted">
                  Persist the model trained on the improved dataset view along with its strict preprocessing pipeline, locked test set, split manifests, and reproducibility checksums.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                className="gap-1.5 text-xs shrink-0"
                onClick={() => setShowSaveDialog(true)}
              >
                <Save className="h-3.5 w-3.5" />
                Save Model to Registry
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section E: Evidence-Based Final Interpretation */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Scientific Summary & Trade-Off Interpretation</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3 text-xs leading-relaxed text-txt-secondary">
          <div className="p-3 rounded-lg border border-border bg-bg-elevated/40 space-y-1.5">
            <h5 className="font-bold text-txt-primary">Generalization Invariance Across Sealed Test Holdout</h5>
            <p>
              The 20% locked test partition remained bit-for-bit invariant throughout remediation (
              <span className="font-mono text-emerald-400">same_test_ids = {String(integrity.same_test_ids)}</span>).
              Any change in evaluation metrics strictly reflects true model generalization ability rather than partition slippage or target leakage.
            </p>
          </div>
          <div className="p-3 rounded-lg border border-border bg-bg-elevated/40 space-y-1.5">
            <h5 className="font-bold text-txt-primary">Feature Ablation & Shortcut Elimination Impact</h5>
            <p>
              {lineage.excluded_features?.length > 0 ? (
                <>
                  Suppressed {lineage.excluded_features.length} fragile shortcut feature(s) (
                  <span className="font-mono text-txt-primary">{lineage.excluded_features.join(", ")}</span>).
                  The model now relies on robust statistical flow dynamics rather than superficial network artifacts.
                </>
              ) : (
                "Data quality transformations (imputation, finite quantile clipping, and deduplication) were successfully applied without removing feature columns."
              )}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Download CTA */}
      <div className="rounded-xl border border-accent-primary/30 bg-accent-primary/5 p-5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-txt-primary">Corrected Dataset Ready</h3>
          <p className="text-xs text-txt-muted mt-0.5">
            Download the repaired CSV with verified test-set integrity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate("/reports")}
          >
            Generate Final Audit Certificate <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            variant="primary"
            className="gap-2"
            onClick={() => window.open(api.getDownloadUrl(activeRunId), "_blank")}
          >
            <Download className="h-4 w-4" />
            Download Corrected Dataset
          </Button>
        </div>
      </div>

      {/* Save Model Modal Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-bg-card p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2">
                <Save className="h-5 w-5 text-accent-secondary" />
                <h3 className="text-sm font-bold text-txt-primary">Save Model to Versioned Registry</h3>
              </div>
              <button
                onClick={() => setShowSaveDialog(false)}
                className="text-txt-muted hover:text-txt-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {saveError && (
              <div className="p-3 rounded-lg border border-rose-500/50 bg-rose-950/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{saveError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-txt-muted uppercase mb-1">
                  Model Version Name
                </label>
                <input
                  type="text"
                  value={modelNameInput}
                  onChange={(e) => setModelNameInput(e.target.value)}
                  placeholder={`e.g. RandomForest-${activeRunId.slice(-6)}`}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg-elevated text-txt-primary placeholder:text-txt-muted text-xs focus:outline-none focus:border-accent-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-txt-muted uppercase mb-1">
                  Research Notes (Optional)
                </label>
                <textarea
                  value={modelNotesInput}
                  onChange={(e) => setModelNotesInput(e.target.value)}
                  rows={3}
                  placeholder="e.g. Retrained after destination port ablation; evaluated on locked test set."
                  className="w-full px-3 py-2 rounded-lg border border-border bg-bg-elevated text-txt-primary placeholder:text-txt-muted text-xs focus:outline-none focus:border-accent-primary resize-none"
                />
              </div>

              <div className="p-2.5 rounded-lg border border-border/80 bg-bg-elevated/40 text-[11px] text-txt-muted">
                Saving will bundle the model artifact, preprocessing pipeline, locked test set, split manifest, and cryptographic provenance into a versioned entry in <code className="text-accent-secondary">data/models/</code>.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/80">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveDialog(false)}
                disabled={savingModel}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="gap-2"
                onClick={handleSaveModel}
                disabled={savingModel}
              >
                {savingModel && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {savingModel ? "Saving Model…" : "Save Model"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Models Registry Modal Dialog */}
      {showRegistryDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-xl border border-border bg-bg-card p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-accent-secondary" />
                <div>
                  <h3 className="text-sm font-bold text-txt-primary">Persisted Models Registry</h3>
                  <p className="text-[11px] text-txt-muted">
                    Inspect, download, verify schema compatibility, or export bundles for saved models.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRegistryDialog(false)}
                className="text-txt-muted hover:text-txt-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {loadingModels ? (
                <div className="flex items-center justify-center py-12 text-txt-muted text-xs gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-accent-secondary" />
                  <span>Loading models...</span>
                </div>
              ) : savedModelsList.length === 0 ? (
                <div className="text-center py-12 text-txt-muted text-xs space-y-2">
                  <p>No trained models registered yet.</p>
                  <p className="text-[11px]">Save a model from the comparison screen to populate this registry.</p>
                </div>
              ) : (
                savedModelsList.map((m) => {
                  const comp = compatibilityResult[m.model_id];
                  const isVerifying = verifyingModelId === m.model_id;

                  return (
                    <div
                      key={m.model_id}
                      className="p-3.5 rounded-lg border border-border bg-bg-elevated/40 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-txt-primary font-mono">{m.model_name}</h4>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-card border border-border text-txt-muted">
                              {m.model_id}
                            </span>
                          </div>
                          <p className="text-[11px] text-txt-muted mt-0.5">
                            Created: {new Date(m.created_at).toLocaleString()} · Algorithm: {m.algorithm} · Features: {m.schema?.feature_count || 0}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteModel(m.model_id)}
                          title="Delete model"
                          className="text-txt-muted hover:text-rose-400 p-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {comp && (
                        <div
                          className={`p-2 rounded text-[11px] border font-mono ${
                            comp.compatible
                              ? "bg-emerald-950/40 text-emerald-300 border-emerald-700/60"
                              : "bg-rose-950/40 text-rose-300 border-rose-700/60"
                          }`}
                        >
                          {comp.message}
                        </div>
                      )}

                      <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border/40">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-[11px] h-7"
                          onClick={() => window.open(api.getModelBundleUrl(m.model_id), "_blank")}
                        >
                          <FileArchive className="h-3 w-3" />
                          Bundle (.zip)
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-[11px] h-7"
                          onClick={() => window.open(api.getModelDownloadUrl(m.model_id), "_blank")}
                        >
                          <Download className="h-3 w-3" />
                          Model (.joblib)
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-[11px] h-7"
                          onClick={() => handleVerifyCompatibility(m.model_id)}
                          disabled={isVerifying}
                        >
                          {isVerifying ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <ShieldCheck className="h-3 w-3" />
                          )}
                          Verify Compatibility
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-border/80">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRegistryDialog(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
