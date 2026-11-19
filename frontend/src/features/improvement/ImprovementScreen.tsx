import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wrench,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Loader2,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuditContext } from "@/stores/AuditContext";
import { api } from "@/api/client";
import { cn } from "@/utils/cn";

type Rec = {
  id: string;
  category: string;
  severity: string;
  problem_name: string;
  detected: string;
  why_it_matters: string;
  affected_columns: string[];
  affected_records: number;
  evidence: Record<string, any>;
  suggested_correction: string;
  expected_benefit: string;
  potential_risk: string;
  is_reversible: boolean;
  rsm_tier: string;
  action_type: string;
  is_safe_under_rsm?: boolean;
  is_recommended?: boolean;
  is_high_priority?: boolean;
};

const SEVERITY_STYLES: Record<string, string> = {
  HIGH: "bg-red-500/20 text-red-400 border-red-500/30",
  MEDIUM: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  LOW: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const RSM_STYLES: Record<string, string> = {
  SAFE: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  WARN: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  REVIEW: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const CATEGORY_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  DATA_QUALITY: {
    label: "Data Quality",
    color: "text-blue-400 border-blue-500/30 bg-blue-500/10",
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
  },
  DATASET_DESIGN: {
    label: "Dataset Design",
    color: "text-purple-400 border-purple-500/30 bg-purple-500/10",
    icon: <ShieldAlert className="h-3.5 w-3.5" />,
  },
  SHORTCUT_FRAGILITY: {
    label: "Shortcut Fragility",
    color: "text-orange-400 border-orange-500/30 bg-orange-500/10",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
};

export const ImprovementScreen: React.FC = () => {
  const navigate = useNavigate();
  const { activeRunId, isHydrating, latestRunResult } = useAuditContext();

  const [recs, setRecs] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [warningAck, setWarningAck] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applySuccess, setApplySuccess] = useState<any | null>(null);

  const fetchRecs = useCallback(async () => {
    if (!activeRunId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getRecommendations(activeRunId);
      setRecs(res.recommendations || []);
    } catch (e: any) {
      setError(e.message || "Failed to load recommendations.");
    } finally {
      setLoading(false);
    }
  }, [activeRunId]);

  useEffect(() => {
    if (!isHydrating && activeRunId) {
      fetchRecs();
    }
  }, [isHydrating, activeRunId, fetchRecs]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Selection shortcuts only choose which recommendations are ticked; nothing is previewed or applied.
  const selectWhere = (predicate: (r: Rec) => boolean) => {
    setSelectedIds(new Set(recs.filter(predicate).map((r) => r.id)));
  };
  const safeCount = recs.filter((r) => r.is_safe_under_rsm).length;
  const recommendedCount = recs.filter((r) => r.is_recommended).length;
  const highPriorityCount = recs.filter((r) => r.is_high_priority).length;

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleGeneratePlan = async () => {
    if (!activeRunId || selectedIds.size === 0) return;
    const selected = recs.filter((r) => selectedIds.has(r.id));
    setPreviewLoading(true);
    setWarningAck(false);
    setPreviewData(null);
    setShowPreviewModal(true);
    try {
      const res = await api.createRepairPlanPreview(activeRunId, selected);
      setPreviewData(res);
    } catch (e: any) {
      setPreviewData({ error: e.message || "Preview failed." });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleApply = async () => {
    if (!activeRunId || !previewData?.preview_id) return;
    setApplyLoading(true);
    try {
      const approval = {
        approved: true,
        warning_ack: warningAck,
        approved_at: new Date().toISOString(),
      };
      const res = await api.applyRepairPlan(activeRunId, previewData.preview_id, approval);
      setApplySuccess(res.export_metadata);
      setShowPreviewModal(false);
      setTimeout(() => navigate("/comparison"), 1500);
    } catch (e: any) {
      setPreviewData((prev: any) => ({ ...prev, applyError: e.message }));
    } finally {
      setApplyLoading(false);
    }
  };

  const rsm = previewData?.rsm_report || {};
  const rsmStatus: string = rsm.status || "SAFE";
  const isBlocked = rsmStatus === "BLOCK";
  const isWarn = rsmStatus === "WARN";
  const canApply = !isBlocked && (!isWarn || warningAck);

  const grouped = recs.reduce<Record<string, Rec[]>>((acc, r) => {
    (acc[r.category] = acc[r.category] || []).push(r);
    return acc;
  }, {});

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
        icon={Wrench}
        title="Run an Audit First"
        description="Complete a scientific audit to generate intelligent repair recommendations for your dataset."
      >
        <Button variant="primary" onClick={() => navigate("/audit")}>
          Go to Audit <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Wrench className="h-5 w-5 text-accent-secondary" />
            <h1 className="text-lg font-bold text-txt-primary">Dataset Improvement Centre</h1>
          </div>
          <p className="text-sm text-txt-muted">
            Intelligent, evidence-based repair recommendations. Select the fixes you want, preview the safety
            assessment, then apply — all with locked test-set guarantees.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchRecs} disabled={loading} className="gap-1.5">
          <RotateCcw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Apply Success Banner */}
      {applySuccess && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-300">Repairs Applied Successfully</p>
            <p className="text-xs text-txt-muted mt-0.5">
              {applySuccess.filename} · {applySuccess.total_rows} rows · SHA-256:{" "}
              {applySuccess.sha256?.slice(0, 16)}…
            </p>
          </div>
          <span className="ml-auto text-xs text-txt-muted">Navigating to Comparison…</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex h-40 items-center justify-center gap-3 text-txt-muted">
          <Loader2 className="h-5 w-5 animate-spin text-accent-secondary" />
          <span className="text-sm">Analysing dataset…</span>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex items-center gap-3">
          <XCircle className="h-4 w-4 text-red-400 shrink-0" />
          <span className="text-sm text-red-300">{error}</span>
          <Button variant="ghost" size="sm" onClick={fetchRecs} className="ml-auto">
            Retry
          </Button>
        </div>
      )}

      {/* Empty / Clean */}
      {!loading && !error && recs.length === 0 && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/8 p-8 text-center space-y-2">
          <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
          <h3 className="font-bold text-txt-primary">No Actionable Improvements Identified</h3>
          <p className="text-sm text-txt-muted max-w-lg mx-auto">
            No actionable improvements were identified from the current audit evidence. The dataset exhibits good quality and low shortcut reliance across evaluated dimensions.
          </p>
        </div>
      )}

      {/* Selection shortcuts */}
      {!loading && !error && recs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" data-testid="selection-controls">
          <span className="text-xs font-semibold uppercase tracking-wide text-txt-muted">Quick select</span>
          <Button variant="outline" size="sm" disabled={safeCount === 0} onClick={() => selectWhere((r) => !!r.is_safe_under_rsm)}>
            Select all safe ({safeCount})
          </Button>
          <Button variant="outline" size="sm" disabled={recommendedCount === 0} onClick={() => selectWhere((r) => !!r.is_recommended)}>
            Select recommended ({recommendedCount})
          </Button>
          <Button variant="outline" size="sm" disabled={highPriorityCount === 0} onClick={() => selectWhere((r) => !!r.is_high_priority)}>
            Select high priority ({highPriorityCount})
          </Button>
          <Button variant="ghost" size="sm" disabled={selectedIds.size === 0} onClick={() => setSelectedIds(new Set())}>
            Clear selection
          </Button>
          <span className="text-[11px] text-txt-muted">Selecting does not change your data. Review the preview before applying.</span>
        </div>
      )}

      {/* Recommendation Groups */}
      {!loading && !error && recs.length > 0 && (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, items]) => {
            const meta = CATEGORY_META[category] || { label: category, color: "text-txt-muted", icon: null };
            return (
              <div key={category} className="space-y-3">
                {/* Category Header */}
                <div className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold", meta.color)}>
                  {meta.icon}
                  {meta.label}
                  <span className="ml-1 opacity-70">({items.length})</span>
                </div>

                {/* Recommendation Cards */}
                <div className="space-y-3">
                  {items.map((rec) => {
                    const isSelected = selectedIds.has(rec.id);
                    const isExpanded = expandedIds.has(rec.id);
                    return (
                      <div
                        key={rec.id}
                        className={cn(
                          "rounded-xl border transition-all duration-150",
                          isSelected
                            ? "border-accent-primary/60 bg-accent-primary/5"
                            : "border-border bg-bg-card"
                        )}
                      >
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            {/* Checkbox */}
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(rec.id)}
                              className="mt-0.5 h-4 w-4 rounded border-border bg-bg-elevated accent-accent-primary cursor-pointer"
                            />

                            <div className="flex-1 min-w-0 space-y-2">
                              {/* Top Row */}
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold text-txt-primary">{rec.problem_name}</span>
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                                    SEVERITY_STYLES[rec.severity] || SEVERITY_STYLES.LOW
                                  )}
                                >
                                  {rec.severity}
                                </span>
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                                    RSM_STYLES[rec.rsm_tier] || RSM_STYLES.SAFE
                                  )}
                                >
                                  RSM: {rec.rsm_tier}
                                </span>
                                {rec.is_reversible && (
                                  <span className="inline-flex items-center gap-0.5 rounded-full border border-slate-500/30 bg-slate-500/10 px-2 py-0.5 text-[10px] text-slate-400">
                                    <RotateCcw className="h-2.5 w-2.5" /> Reversible
                                  </span>
                                )}
                              </div>

                              {/* Detected */}
                              <p className="text-xs text-txt-muted leading-relaxed">{rec.detected}</p>

                              {/* Key Stats Row */}
                              <div className="flex flex-wrap gap-4 text-xs text-txt-muted">
                                {rec.affected_records > 0 && (
                                  <span>
                                    <strong className="text-txt-secondary">{rec.affected_records.toLocaleString()}</strong> affected records
                                  </span>
                                )}
                                {rec.affected_columns.length > 0 && (
                                  <span>
                                    Columns:{" "}
                                    <strong className="text-txt-secondary font-mono text-[10px]">
                                      {rec.affected_columns.slice(0, 3).join(", ")}
                                      {rec.affected_columns.length > 3 && ` +${rec.affected_columns.length - 3} more`}
                                    </strong>
                                  </span>
                                )}
                              </div>

                              {/* Why it matters / fix */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                <div className="rounded-lg bg-bg-elevated/60 p-2.5 space-y-1">
                                  <p className="text-[10px] font-semibold text-txt-muted uppercase tracking-wide">Why it matters</p>
                                  <p className="text-xs text-txt-secondary leading-relaxed">{rec.why_it_matters}</p>
                                </div>
                                <div className="rounded-lg bg-bg-elevated/60 p-2.5 space-y-1">
                                  <p className="text-[10px] font-semibold text-txt-muted uppercase tracking-wide">Suggested fix</p>
                                  <p className="text-xs text-txt-secondary leading-relaxed">{rec.suggested_correction}</p>
                                </div>
                              </div>

                              {/* Expandable Evidence */}
                              <button
                                onClick={() => toggleExpand(rec.id)}
                                className="flex items-center gap-1 text-[11px] text-txt-muted hover:text-txt-secondary transition-colors pt-1"
                              >
                                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                Advanced evidence
                              </button>

                              {isExpanded && (
                                <div className="rounded-lg border border-border bg-bg-elevated/40 p-3 space-y-2">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <span className="text-txt-muted">Expected benefit: </span>
                                      <span className="text-txt-secondary">{rec.expected_benefit}</span>
                                    </div>
                                    <div>
                                      <span className="text-txt-muted">Potential risk: </span>
                                      <span className="text-txt-secondary">{rec.potential_risk}</span>
                                    </div>
                                  </div>
                                  <pre className="text-[10px] text-txt-muted overflow-auto max-h-32 font-mono bg-bg-main/60 rounded p-2">
                                    {JSON.stringify(rec.evidence, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky Action Bar */}
      {recs.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-bg-sidebar/95 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
          <span className="text-sm text-txt-muted">
            {selectedIds.size === 0 ? "Select recommendations to fix" : `${selectedIds.size} repair${selectedIds.size !== 1 ? "s" : ""} selected`}
          </span>
          <div className="flex items-center gap-3">
            {selectedIds.size > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
            )}
            <Button
              variant="primary"
              size="md"
              disabled={selectedIds.size === 0}
              onClick={handleGeneratePlan}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Generate Repair Plan
            </Button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-bg-card shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 z-10 border-b border-border bg-bg-card px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-txt-primary">Repair Plan Preview</h2>
                <p className="text-xs text-txt-muted mt-0.5">Review changes and RSM safety assessment before applying</p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="rounded-lg p-1.5 text-txt-muted hover:bg-bg-elevated hover:text-txt-primary transition-colors"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {previewLoading && (
                <div className="flex h-32 items-center justify-center gap-3 text-txt-muted">
                  <Loader2 className="h-6 w-6 animate-spin text-accent-secondary" />
                  <span className="text-sm">Computing repair plan…</span>
                </div>
              )}

              {!previewLoading && previewData?.error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                  <p className="text-sm text-red-300">{previewData.error}</p>
                </div>
              )}

              {!previewLoading && previewData && !previewData.error && (
                <>
                  {/* RSM Status Banner */}
                  <div
                    className={cn(
                      "rounded-xl border p-4 flex items-start gap-3",
                      rsmStatus === "PASS" || rsmStatus === "SAFE"
                        ? "border-emerald-500/40 bg-emerald-500/10"
                        : rsmStatus === "WARN"
                        ? "border-amber-500/40 bg-amber-500/10"
                        : "border-red-500/40 bg-red-500/10"
                    )}
                  >
                    {rsmStatus === "PASS" || rsmStatus === "SAFE" ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : rsmStatus === "WARN" ? (
                      <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-bold text-txt-primary">
                        RSM Assessment: {rsmStatus}
                      </p>
                      {rsm.reason && <p className="text-xs text-txt-muted">{rsm.reason}</p>}
                      {rsm.warnings?.map((w: any, i: number) => (
                        <p key={i} className="text-xs text-amber-300">
                          ⚠ {typeof w === "string" ? w : w.message || JSON.stringify(w)}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Data Quality Delta */}
                  {previewData.data_quality_delta && (
                    <div className="rounded-xl border border-border bg-bg-elevated/60 p-4 space-y-3">
                      <h3 className="text-xs font-bold text-txt-primary uppercase tracking-wide">Data Quality Changes</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(previewData.data_quality_delta as Record<string, any>).map(([key, delta]) => (
                          <div key={key} className="flex items-center justify-between rounded-lg bg-bg-main/60 px-3 py-2">
                            <span className="text-xs text-txt-muted capitalize">{key.replace(/_/g, " ")}</span>
                            <span
                              className={cn(
                                "text-xs font-mono font-bold",
                                typeof delta === "number" && delta < 0
                                  ? "text-emerald-400"
                                  : typeof delta === "number" && delta > 0
                                  ? "text-red-400"
                                  : "text-txt-muted"
                              )}
                            >
                              {typeof delta === "number" && delta > 0 ? "+" : ""}
                              {String(delta)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Affected rows by class */}
                  {previewData.affected_rows_by_class && Object.keys(previewData.affected_rows_by_class).length > 0 && (
                    <div className="rounded-xl border border-border bg-bg-elevated/60 p-4 space-y-3">
                      <h3 className="text-xs font-bold text-txt-primary uppercase tracking-wide">Affected Rows by Class</h3>
                      <div className="space-y-1.5">
                        {Object.entries(previewData.affected_rows_by_class as Record<string, any>).map(([cls, count]) => {
                          const display =
                            typeof count === "object" && count !== null
                              ? `${count.after ?? count.before} rows${count.retention !== undefined ? ` (${(count.retention * 100).toFixed(0)}% retained)` : ""}`
                              : `${count} rows`;
                          return (
                            <div key={cls} className="flex items-center justify-between text-xs">
                              <span className="text-txt-secondary font-mono">{cls}</span>
                              <span className="text-txt-muted">{display}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Training size */}
                  {previewData.expected_train_size !== undefined && (
                    <p className="text-xs text-txt-muted">
                      Expected training set after repairs:{" "}
                      <strong className="text-txt-secondary">
                        {typeof previewData.expected_train_size === "object"
                          ? previewData.expected_train_size?.after ?? previewData.expected_train_size?.before
                          : previewData.expected_train_size}
                      </strong>{" "}
                      rows
                    </p>
                  )}

                  {/* Warning Ack */}
                  {isWarn && (
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={warningAck}
                        onChange={(e) => setWarningAck(e.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-amber-400"
                      />
                      <span className="text-xs text-amber-300 leading-relaxed">
                        I acknowledge the RSM warnings and accept responsibility for this repair decision.
                      </span>
                    </label>
                  )}

                  {/* Block reason */}
                  {isBlocked && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                      <p className="text-xs text-red-300 font-medium">
                        ✕ This repair plan has been blocked by RSM. No changes will be applied.
                      </p>
                      {rsm.block_reason && (
                        <p className="text-xs text-red-400 mt-1">{rsm.block_reason}</p>
                      )}
                    </div>
                  )}

                  {/* Apply Error */}
                  {previewData.applyError && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                      <p className="text-xs text-red-300">{previewData.applyError}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="ghost" onClick={() => setShowPreviewModal(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      disabled={!canApply || applyLoading}
                      onClick={handleApply}
                      className="gap-2"
                    >
                      {applyLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Approve & Apply Fixes
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
