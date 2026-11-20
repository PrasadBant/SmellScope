import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldAlert,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  RotateCcw,
  Info,
  Lock,
  Layers,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuditContext } from "@/stores/AuditContext";
import { api } from "@/api/client";
import { RsmSafetyCheck, RsmSafetyRecord, canApplyPlan } from "@/components/rsm/RsmSafetyCheck";
import { RemediationPreview, ViewsResponse } from "@/types/api";

type RemediationSubStep = "9_PREVIEW" | "10_RSM" | "11_APPLY";

export const RemediationScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    activeRunId,
    setActiveStage,
    setRemediationSkipped,
    latestRunResult,
    selectedClass,
    isHydrating,
  } = useAuditContext();

  const [currentStep, setCurrentStep] = useState<RemediationSubStep>("9_PREVIEW");
  const [actionType] = useState<"R1">("R1");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(["Init_Win_bytes_backward"]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<RemediationPreview | null>(null);
  const [viewsData, setViewsData] = useState<ViewsResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [warningAck, setWarningAck] = useState(false);

  // Load active view state
  useEffect(() => {
    if (activeRunId) {
      loadViews(activeRunId);
    }
  }, [activeRunId]);

  const loadViews = async (runId: string) => {
    try {
      const v = await api.getRemediationViews(runId);
      setViewsData(v);
    } catch (err: any) {
      console.error("Failed to load views:", err);
    }
  };

  const [appliedRecord, setAppliedRecord] = useState<any | null>(null);

  const handleGeneratePreview = async () => {
    if (!activeRunId) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const params =
      actionType === "R1"
        ? { features: selectedFeatures }
        : { condition: "outlier_zscore > 3.0", filter_mode: "quarantine" };

    try {
      const p = await api.previewRemediation(activeRunId, actionType, params);
      setPreview(p);
      setCurrentStep("10_RSM");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to generate remediation preview");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyRemediation = async () => {
    if (!activeRunId || !preview) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      // Backend re-runs RSM and verifies the exact previewed plan; plan_hash binds this request to it.
      const res = await api.applyRemediation(
        activeRunId,
        preview.preview_id,
        { approved: true, warning_ack: warningAck, approved_at: new Date().toISOString() },
        preview.plan_hash || undefined
      );
      setAppliedRecord(res.change_log_entry?.rsm_record || null);
      await loadViews(activeRunId);
      setSuccessMsg("Remediation applied successfully to training view.");
      setRemediationSkipped(false);
      setCurrentStep("11_APPLY");
    } catch (err: any) {
      const rejected = err?.status === 403 || err?.status === 409;
      setErrorMsg(
        rejected
          ? `${err?.code === "E_STALE_PREVIEW" ? "This preview is out of date. Go back and generate a new preview." : "Your proposed improvement was not applied because it violated the safety policy."} ${err.message}`
          : err.message || "Failed to apply remediation"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (entryId: string) => {
    if (!activeRunId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      await api.rollback(activeRunId, entryId);
      await loadViews(activeRunId);
      setSuccessMsg("Rollback executed successfully. Previous training view restored.");
    } catch (err: any) {
      setErrorMsg(err.message || "Rollback failed");
    } finally {
      setLoading(false);
    }
  };

  if (isHydrating && (!activeRunId || !latestRunResult)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
        <p className="text-xs text-txt-muted font-mono">Loading remediation workspace...</p>
      </div>
    );
  }

  if (!activeRunId || !latestRunResult) {
    return (
      <EmptyState
        title="Audit Results Required for Remediation"
        description="Please complete an audit first before exploring experimental remediation views."
        actionLabel="Go to Audit Setup"
        onAction={() => {
          setActiveStage("AUDIT");
          navigate("/audit");
        }}
      />
    );
  }

  const rsmReport = preview?.rsm_report;
  const canApply = canApplyPlan(rsmReport as any, warningAck, preview?.test_integrity as any);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Prominent Optional Activity Notice */}
      <div className="p-4 rounded-xl border border-sky-800/80 bg-sky-950/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-900/60 border border-sky-700/60 text-sky-300 font-bold uppercase">
              OPTIONAL EXPERIMENTAL ACTIVITY
            </span>
            <span className="text-xs text-slate-300 font-semibold">Stage 04 · Remediation Lab</span>
          </div>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Remediation is an experimental follow-up to test whether changing a suspected dataset characteristic affects model evaluation. It does not automatically prove dataset quality has improved.
          </p>
        </div>

        <button
          onClick={() => {
            setRemediationSkipped(true);
            setActiveStage("REPORTS");
            navigate("/reports");
          }}
          className="text-xs text-sky-400 hover:text-white flex items-center gap-1 font-semibold shrink-0 transition-colors"
        >
          Skip to Reports &rarr;
        </button>
      </div>

      {/* Sub-step Selector */}
      <div className="flex items-center rounded-lg border border-border bg-bg-card p-1 text-xs">
        <button
          onClick={() => setCurrentStep("9_PREVIEW")}
          className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
            currentStep === "9_PREVIEW"
              ? "bg-accent-primary text-white shadow-sm"
              : "text-txt-muted hover:text-txt-primary"
          }`}
        >
          Step 9 · Preview
        </button>
        <button
          onClick={() => setCurrentStep("10_RSM")}
          disabled={!preview}
          className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
            currentStep === "10_RSM"
              ? "bg-accent-primary text-white shadow-sm"
              : "text-txt-muted hover:text-txt-primary disabled:opacity-40"
          }`}
        >
          Step 10 · Safety Check (RSM)
        </button>
        <button
          onClick={() => setCurrentStep("11_APPLY")}
          disabled={!viewsData?.change_log?.length}
          className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
            currentStep === "11_APPLY"
              ? "bg-accent-primary text-white shadow-sm"
              : "text-txt-muted hover:text-txt-primary disabled:opacity-40"
          }`}
        >
          Step 11 · Applied Lineage
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl border border-rose-800/80 bg-rose-950/40 text-rose-200 text-xs flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Remediation Alert</p>
            <p className="leading-relaxed">{errorMsg}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl border border-emerald-800/80 bg-emerald-950/40 text-emerald-300 text-xs flex items-center gap-3">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 9 — REMEDIATION PREVIEW (Explore Possible Improvements)               */}
      {/* ========================================================================= */}
      {currentStep === "9_PREVIEW" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-border bg-bg-card">
            <h3 className="text-base font-bold text-txt-primary">Explore Possible Improvements</h3>
            <p className="text-xs text-txt-muted mt-1 leading-relaxed">
              Preview a possible correction and see how it may affect the training data before applying anything. Preview does not modify the original dataset or locked test records.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Operation Selector */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">Select Supported Remediation Action</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4 text-xs">
                <div className="p-3.5 rounded-xl border border-accent-primary bg-accent-primary/10 text-txt-primary">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">R1 Feature Ablation</span>
                    <Badge variant="success">SUPPORTED</Badge>
                  </div>
                  <span className="text-[11px] text-txt-muted block mt-1">
                    Remove verified candidate shortcut features from the training partition to test model generalisation.
                  </span>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="font-semibold text-txt-primary block">Candidate Shortcut Features to Ablate:</label>
                  <div className="space-y-1.5 font-mono">
                    {["Init_Win_bytes_backward", "Destination Port", "Flow_Duration"].map((feat) => {
                      const isChecked = selectedFeatures.includes(feat);
                      return (
                        <label key={feat} className="flex items-center gap-2 p-2 rounded bg-bg-elevated border border-border cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedFeatures([...selectedFeatures, feat]);
                              else setSelectedFeatures(selectedFeatures.filter((f) => f !== feat));
                            }}
                            className="rounded border-border text-accent-primary"
                          />
                          <span className="text-txt-primary">{feat}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* View State Card */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">Current Training View & Provenance</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs font-mono">
                <div className="flex justify-between p-2 rounded bg-bg-elevated border border-border">
                  <span className="text-txt-muted">Active View ID:</span>
                  <span className="text-accent-secondary font-bold">{viewsData?.active_view?.view_id || "view_0000"}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-bg-elevated border border-border">
                  <span className="text-txt-muted">Parent View ID:</span>
                  <span className="text-txt-primary">{viewsData?.active_view?.parent_view_id || "None (Root Baseline)"}</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-bg-elevated border border-border">
                  <span className="text-txt-muted">Excluded Features:</span>
                  <span className="text-txt-secondary">{viewsData?.active_view?.excluded_features?.length || 0} features</span>
                </div>
                <div className="p-3 rounded-lg border border-border bg-bg-elevated/40 text-[11px] text-txt-muted font-sans leading-relaxed">
                  <Lock className="h-3.5 w-3.5 text-status-success inline mr-1" />
                  <strong>Locked Test Invariant:</strong> The 20% test partition is strictly sealed and preserved bit-for-bit across all views.
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Footer */}
          <div className="p-4 rounded-xl border border-border bg-bg-card flex items-center justify-between">
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                setActiveStage("FINDINGS");
                navigate("/findings");
              }}
            >
              Cancel and Return to Findings
            </Button>
            <Button
              variant="primary"
              size="md"
              className="gap-2 font-bold"
              isLoading={loading}
              onClick={handleGeneratePreview}
            >
              CONTINUE TO SAFETY CHECK <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 10 — REMEDIATION SAFETY MONITOR (RSM)                                 */}
      {/* ========================================================================= */}
      {currentStep === "10_RSM" && preview && rsmReport && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-border bg-bg-card">
            <h3 className="text-base font-bold text-txt-primary">Check Remediation Safety</h3>
            <p className="text-xs text-txt-muted mt-1 leading-relaxed">
              Before applying this change, SmellScope checks whether the proposed operation could damage dataset integrity or evaluation validity.
            </p>
          </div>

          <RsmSafetyCheck
            report={rsmReport as any}
            testIntegrity={preview?.test_integrity as any}
            acknowledged={warningAck}
            onAcknowledgedChange={setWarningAck}
          />

          {/* Plan summary (counts come from the backend preview) */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-2.5 rounded bg-bg-card border border-border">
              <span className="text-[10px] text-txt-muted block uppercase">Action</span>
              <strong className="text-txt-primary">{preview?.action}</strong>
            </div>
            <div className="p-2.5 rounded bg-bg-card border border-border">
              <span className="text-[10px] text-txt-muted block uppercase">Training rows after plan</span>
              <strong className="text-txt-primary">
                {preview?.expected_train_size?.after?.toLocaleString()} of {preview?.expected_train_size?.before?.toLocaleString()}
              </strong>
            </div>
            <div className="p-2.5 rounded bg-bg-card border border-border">
              <span className="text-[10px] text-txt-muted block uppercase">Issues found</span>
              <strong className={rsmReport?.blocks?.length ? "text-status-block" : "text-status-success"}>
                {rsmReport?.blocks?.length ?? 0} blocks, {rsmReport?.warnings?.length ?? 0} warnings
              </strong>
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-4 rounded-xl border border-border bg-bg-card flex items-center justify-between">
            <Button
              variant="outline"
              size="md"
              onClick={() => setCurrentStep("9_PREVIEW")}
            >
              Back to Preview
            </Button>
            <Button
              variant="primary"
              size="md"
              className="gap-2 font-bold"
              disabled={!canApply}
              isLoading={loading}
              onClick={handleApplyRemediation}
            >
              {rsmReport?.status === "WARN" ? "APPLY DESPITE WARNINGS" : "APPLY APPROVED REMEDIATION"} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 11 — APPLY APPROVED REMEDIATION (Lineage & Rollback)                  */}
      {/* ========================================================================= */}
      {currentStep === "11_APPLY" && viewsData && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-border bg-bg-card">
            <h3 className="text-base font-bold text-txt-primary">Apply Approved Changes</h3>
            <p className="text-xs text-txt-muted mt-1 leading-relaxed">
              Remediation applied successfully. The training view has been updated while preserving raw source data, locked test identifiers, and cryptographic audit lineage.
            </p>
          </div>

          {appliedRecord && <RsmSafetyRecord record={appliedRecord} />}

          {/* Lineage Table */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Cryptographic View Lineage & Rollback Ledger</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-bg-elevated/70 border-b border-border text-[11px] text-txt-muted uppercase font-bold">
                  <tr>
                    <th className="p-3">View ID</th>
                    <th className="p-3">Parent View</th>
                    <th className="p-3">Action Details</th>
                    <th className="p-3">Excluded Features</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono">
                  {viewsData.views.map((v) => (
                    <tr key={v.view_id} className="hover:bg-bg-elevated/40">
                      <td className="p-3 font-bold text-accent-secondary">{v.view_id}</td>
                      <td className="p-3 text-txt-muted">{v.parent_view_id || "Root"}</td>
                      <td className="p-3 text-txt-secondary font-sans">{v.view_id === "view_0000" ? "Original Benchmark" : "Ablated Features"}</td>
                      <td className="p-3 text-txt-muted">{v.excluded_features?.join(", ") || "None"}</td>
                      <td className="p-3 text-right">
                        {v.view_id !== viewsData.active_view.view_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs gap-1 py-0.5"
                            onClick={() => handleRollback(v.view_id)}
                          >
                            <RotateCcw className="h-3 w-3" /> Rollback
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Action Footer */}
          <div className="p-4 rounded-xl border border-border bg-bg-card flex items-center justify-between">
            <span className="text-xs text-txt-muted">
              Active View: <strong className="text-accent-secondary font-mono">{viewsData.active_view.view_id}</strong>
            </span>
            <Button
              variant="primary"
              size="md"
              className="gap-2 font-bold"
              onClick={() => {
                setActiveStage("REPORTS");
                navigate("/reports");
              }}
            >
              RE-BENCHMARK MODEL <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
