import React, { useState, useEffect } from "react";
import {
  Sliders,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  FileText,
  Lock,
  ArrowRight,
  Database,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuditContext } from "@/stores/AuditContext";
import { api } from "@/api/client";
import { RemediationPreview, ViewsResponse, TrainingView, ChangeLogEntry } from "@/types/api";
import { formatNumber, formatPercent } from "@/utils/cn";

export const RemediationScreen: React.FC = () => {
  const { activeRunId, latestRunResult, setLatestRunResult, setActiveStage } = useAuditContext();

  const [viewsData, setViewsData] = useState<ViewsResponse | null>(null);
  const [selectedAction, setSelectedAction] = useState<"R1" | "R2">("R1");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [selectedRule, setSelectedRule] = useState<string>("quarantine_ephemeral_ports");
  const [preview, setPreview] = useState<RemediationPreview | null>(null);
  const [warningAck, setWarningAck] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [applying, setApplying] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (activeRunId) {
      loadViews(activeRunId);
    }
  }, [activeRunId]);

  // Set default features from candidate shortcuts
  useEffect(() => {
    if (latestRunResult && latestRunResult.classes.length > 0 && selectedFeatures.length === 0) {
      const shortcuts = latestRunResult.classes.flatMap((c) => c.sfi.top_features);
      if (shortcuts.length > 0) {
        setSelectedFeatures([shortcuts[0]]);
      }
    }
  }, [latestRunResult]);

  const loadViews = async (runId: string) => {
    try {
      const res = await api.getRemediationViews(runId);
      setViewsData(res);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleGeneratePreview = async () => {
    if (!activeRunId) return;
    setLoadingPreview(true);
    setMessage(null);
    setWarningAck(false);

    try {
      const params =
        selectedAction === "R1"
          ? { features: selectedFeatures }
          : { rule: selectedRule };

      const res = await api.previewRemediation(activeRunId, selectedAction, params);
      setPreview(res);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to generate preview." });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleApplyRemediation = async () => {
    if (!activeRunId || !preview) return;
    setApplying(true);
    setMessage(null);

    try {
      const res = await api.applyRemediation(activeRunId, preview.preview_id, {
        approved: true,
        warning_ack: warningAck,
        approved_at: new Date().toISOString(),
      });

      setMessage({
        type: "success",
        text: `Remediation applied! Advanced to view ${res.view.view_id}.`,
      });
      setPreview(null);
      await loadViews(activeRunId);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to apply remediation." });
    } finally {
      setApplying(false);
    }
  };

  const handleRollback = async (entryId: string) => {
    if (!activeRunId) return;
    setRollingBack(true);
    setMessage(null);

    try {
      const res = await api.rollback(activeRunId, entryId);
      setMessage({
        type: "success",
        text: `${res.message} (Restored ${res.restored_view.view_id})`,
      });
      await loadViews(activeRunId);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Rollback failed." });
    } finally {
      setRollingBack(false);
    }
  };

  if (!activeRunId) {
    return (
      <div className="max-w-7xl mx-auto py-16 text-center text-txt-muted space-y-3">
        <Sliders className="h-10 w-10 mx-auto text-txt-muted/50" />
        <h3 className="text-base font-bold text-txt-primary">No Active Audit Run</h3>
        <p className="text-xs">Execute an audit first to enable remediation safeguards.</p>
      </div>
    );
  }

  const allColumns = latestRunResult
    ? Object.keys(latestRunResult.dataset.class_counts).length > 0
      ? latestRunResult.classes.flatMap((c) => c.sfi.top_features)
      : []
    : [];
  const uniqueCandidateFeatures = Array.from(new Set(allColumns));

  const activeView = viewsData?.active_view;
  const rsmReport = preview?.rsm_report;
  const isBlock = rsmReport?.status === "BLOCK";
  const isWarn = rsmReport?.status === "WARN";
  const canApply = preview && !isBlock && (!isWarn || warningAck);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-txt-primary flex items-center gap-2">
            <Sliders className="h-6 w-6 text-accent-primary" />
            Remediation Lab & Remediation Safety Monitor (RSM)
          </h2>
          <p className="text-sm text-txt-muted mt-1">
            Experiment with reversible feature ablation (R1) and flow quarantine (R2) guarded by independent backend safety checks.
          </p>
        </div>

        {activeView && (
          <div className="flex items-center gap-2 text-xs font-mono bg-bg-elevated px-3 py-1.5 rounded-lg border border-border">
            <span className="text-txt-muted">Active View:</span>
            <strong className="text-accent-cyan">{activeView.view_id}</strong>
            <span className="text-txt-muted">({formatNumber(activeView.n_included)} train rows)</span>
          </div>
        )}
      </div>

      {message && (
        <div
          className={`rounded-xl border p-4 text-xs flex items-center gap-3 ${
            message.type === "success"
              ? "border-status-success/40 bg-status-success/10 text-emerald-300"
              : "border-status-block/40 bg-status-block/10 text-rose-300"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-status-success shrink-0" />
          ) : (
            <XCircle className="h-5 w-5 text-status-block shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Grid: Action Config & What-If Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Configuration Controls */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Remediation Action</CardTitle>
            <CardDescription>Select counterfactual intervention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Action Type Toggle */}
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <button
                onClick={() => {
                  setSelectedAction("R1");
                  setPreview(null);
                }}
                className={`py-2 px-3 rounded-lg border text-center transition-all ${
                  selectedAction === "R1"
                    ? "bg-accent-primary text-white border-accent-primary shadow"
                    : "bg-bg-elevated text-txt-secondary border-border hover:text-txt-primary"
                }`}
              >
                R1 Feature Ablation
              </button>
              <button
                onClick={() => {
                  setSelectedAction("R2");
                  setPreview(null);
                }}
                className={`py-2 px-3 rounded-lg border text-center transition-all ${
                  selectedAction === "R2"
                    ? "bg-accent-primary text-white border-accent-primary shadow"
                    : "bg-bg-elevated text-txt-secondary border-border hover:text-txt-primary"
                }`}
              >
                R2 Flow Quarantine
              </button>
            </div>

            {selectedAction === "R1" ? (
              /* R1 Feature Selection */
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-txt-muted block">
                  Select Features to Ablate
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-lg border border-border bg-bg-main/50 p-2 text-xs">
                  {uniqueCandidateFeatures.map((feat) => {
                    const isChecked = selectedFeatures.includes(feat);
                    return (
                      <label
                        key={feat}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-bg-elevated cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedFeatures([...selectedFeatures, feat]);
                            else setSelectedFeatures(selectedFeatures.filter((f) => f !== feat));
                          }}
                          className="rounded border-border text-accent-primary focus:ring-accent-primary bg-bg-elevated"
                        />
                        <span className="font-mono text-txt-primary truncate">{feat}</span>
                      </label>
                    );
                  })}
                  {uniqueCandidateFeatures.length === 0 && (
                    <p className="text-txt-muted py-2 text-center">No candidate features found.</p>
                  )}
                </div>
              </div>
            ) : (
              /* R2 Quarantine Rule Selection */
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-txt-muted block">
                  Quarantine Heuristic Rule
                </label>
                <select
                  value={selectedRule}
                  onChange={(e) => setSelectedRule(e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-xs text-txt-primary focus:outline-none"
                >
                  <option value="quarantine_ephemeral_ports">
                    Quarantine Ephemeral Ports (&gt; 49151)
                  </option>
                  <option value="quarantine_zero_window">
                    Quarantine Zero TCP Window (Win = 0)
                  </option>
                </select>
                <p className="text-[11px] text-txt-muted">
                  Quarantines candidate shortcut traffic exclusively within the training partition.
                </p>
              </div>
            )}

            <Button
              variant="cyan"
              size="md"
              className="w-full gap-2"
              isLoading={loadingPreview}
              onClick={handleGeneratePreview}
            >
              Generate What-If Preview & Check RSM
            </Button>
          </CardContent>
        </Card>

        {/* Right: What-If Impact & Independent RSM Governance */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle className="text-sm">
                  Remediation Safety Monitor (RSM) Authorization
                </CardTitle>
                {rsmReport && (
                  <Badge
                    variant={
                      rsmReport.status === "PASS"
                        ? "success"
                        : rsmReport.status === "WARN"
                        ? "warning"
                        : "danger"
                    }
                  >
                    RSM {rsmReport.status}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {preview ? (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div
                    className={`rounded-xl border p-4 text-xs ${
                      isBlock
                        ? "border-status-block/60 bg-status-block/15 text-rose-300"
                        : isWarn
                        ? "border-status-warning/60 bg-status-warning/15 text-amber-300"
                        : "border-status-success/60 bg-status-success/15 text-emerald-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {isBlock ? (
                        <XCircle className="h-5 w-5 text-status-block shrink-0" />
                      ) : isWarn ? (
                        <AlertTriangle className="h-5 w-5 text-status-warning shrink-0" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-status-success shrink-0" />
                      )}
                      <div className="space-y-1">
                        <strong className="block font-bold">
                          {isBlock
                            ? "OPERATION BLOCKED: Violates Dataset Safety Floor"
                            : isWarn
                            ? "SAFETY WARNING: High Class Attrition / Excessive Ablation"
                            : "OPERATION AUTHORIZED: Safety Checks Passed"}
                        </strong>
                        <p className="text-[11px] opacity-90">{preview.reason}</p>

                        {/* List Warnings / Blocks */}
                        {rsmReport?.blocks.map((b, i) => (
                          <p key={i} className="text-[11px] font-mono text-rose-300 font-semibold">
                            &bull; [{b.code}] {b.message}
                          </p>
                        ))}
                        {rsmReport?.warnings.map((w, i) => (
                          <p key={i} className="text-[11px] font-mono text-amber-300 font-semibold">
                            &bull; [{w.code}] {w.message}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Impact Summary */}
                  <div className="grid grid-cols-3 gap-3 text-xs text-center font-mono">
                    <div className="p-3 rounded-lg bg-bg-elevated border border-border">
                      <span className="text-[10px] text-txt-muted block uppercase">Affected Rows</span>
                      <strong className="text-base text-txt-primary">
                        {formatNumber(preview.affected.n_rows)}
                      </strong>
                    </div>
                    <div className="p-3 rounded-lg bg-bg-elevated border border-border">
                      <span className="text-[10px] text-txt-muted block uppercase">Train Size Before</span>
                      <strong className="text-base text-txt-secondary">
                        {formatNumber(preview.expected_train_size.before)}
                      </strong>
                    </div>
                    <div className="p-3 rounded-lg bg-bg-elevated border border-border">
                      <span className="text-[10px] text-txt-muted block uppercase">Train Size After</span>
                      <strong className="text-base text-accent-cyan">
                        {formatNumber(preview.expected_train_size.after)}
                      </strong>
                    </div>
                  </div>

                  {/* Warning Acknowledgement Checkbox */}
                  {isWarn && (
                    <label className="flex items-center gap-2 p-3 rounded-lg border border-status-warning/40 bg-status-warning/10 text-xs text-amber-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={warningAck}
                        onChange={(e) => setWarningAck(e.target.checked)}
                        className="rounded border-status-warning text-status-warning focus:ring-status-warning"
                      />
                      <span>
                        I acknowledge the RSM warnings and confirm this counterfactual ablation is intentional.
                      </span>
                    </label>
                  )}

                  {/* Apply Button */}
                  <Button
                    variant={isBlock ? "danger" : "primary"}
                    size="lg"
                    className="w-full gap-2"
                    disabled={!canApply || applying}
                    isLoading={applying}
                    onClick={handleApplyRemediation}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {isBlock
                      ? "ACTION PROHIBITED BY RSM"
                      : isWarn && !warningAck
                      ? "ACKNOWLEDGEMENT REQUIRED"
                      : "APPLY REMEDIATION TO TRAINING VIEW"}
                  </Button>
                </div>
              ) : (
                <div className="py-10 text-center text-xs text-txt-muted">
                  Configure an action on the left and click "Generate What-If Preview" to inspect safety checks.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cryptographic Rollback & Lineage History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-accent-cyan" />
            Cryptographic Training View Lineage & Rollback History
          </CardTitle>
          <CardDescription>
            Every view is hashed deterministically. Rollback verifies identical parent view_hash.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {viewsData && viewsData.views.length > 0 ? (
            <div className="space-y-4">
              {/* Visual Chain */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                {viewsData.views.map((v, i) => {
                  const isCurrent = v.view_id === viewsData.active_view.view_id;
                  return (
                    <React.Fragment key={v.view_id}>
                      <div
                        className={`rounded-lg border px-3 py-1.5 ${
                          isCurrent
                            ? "border-accent-primary bg-accent-primary/20 text-white font-bold"
                            : "border-border bg-bg-elevated text-txt-muted"
                        }`}
                      >
                        {v.view_id} ({v.n_included} rows)
                      </div>
                      {i < viewsData.views.length - 1 && (
                        <ArrowRight className="h-3 w-3 text-txt-muted" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Change Log Table */}
              {viewsData.change_log.length > 0 ? (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-bg-elevated text-[11px] uppercase text-txt-muted">
                      <th className="p-3">Log Entry</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Transition</th>
                      <th className="p-3">RSM Status</th>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3 text-right">Rollback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-mono">
                    {viewsData.change_log.map((entry) => (
                      <tr key={entry.entry_id} className="hover:bg-bg-elevated/40">
                        <td className="p-3 text-txt-primary font-bold">{entry.entry_id}</td>
                        <td className="p-3">
                          <Badge variant="outline">{entry.action}: {entry.rule_name}</Badge>
                        </td>
                        <td className="p-3 text-txt-secondary">
                          {entry.parent_view_id} &rarr; {entry.new_view_id}
                        </td>
                        <td className="p-3">
                          <Badge variant={entry.rsm_status === "PASS" ? "success" : "warning"}>
                            {entry.rsm_status}
                          </Badge>
                        </td>
                        <td className="p-3 text-txt-muted">{entry.timestamp}</td>
                        <td className="p-3 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="gap-1.5"
                            isLoading={rollingBack}
                            onClick={() => handleRollback(entry.entry_id)}
                          >
                            <RotateCcw className="h-3 w-3" /> Rollback
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-txt-muted text-center py-4">
                  Root view active (view_0000). No remediations applied yet.
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-txt-muted text-center py-4">No view lineage recorded.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
