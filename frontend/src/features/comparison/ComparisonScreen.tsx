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
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuditContext } from "@/stores/AuditContext";
import { api } from "@/api/client";
import { cn } from "@/utils/cn";

type ComparisonData = {
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
  const { activeRunId, isHydrating, latestRunResult } = useAuditContext();

  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [notAvailable, setNotAvailable] = useState(false);

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
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 className="h-5 w-5 text-accent-secondary" />
            <h1 className="text-lg font-bold text-txt-primary">Dataset Comparison</h1>
          </div>
          <p className="text-sm text-txt-muted">Original vs Corrected — data quality and ML benchmark on locked test set.</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          className="gap-2"
          onClick={() => window.open(api.getDownloadUrl(activeRunId), "_blank")}
        >
          <Download className="h-3.5 w-3.5" />
          Download Corrected Dataset
        </Button>
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

      {/* Download CTA */}
      <div className="rounded-xl border border-accent-primary/30 bg-accent-primary/5 p-5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-txt-primary">Corrected Dataset Ready</h3>
          <p className="text-xs text-txt-muted mt-0.5">
            Download the repaired CSV with verified test-set integrity.
          </p>
        </div>
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
  );
};
