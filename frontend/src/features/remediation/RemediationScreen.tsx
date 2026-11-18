import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useAuditContext } from "@/stores/AuditContext";
import { api } from "@/api/client";
import { RemediationPreview, ViewsResponse, TrainingView, ChangeLogEntry } from "@/types/api";
import { formatNumber, formatPercent } from "@/utils/cn";

export const RemediationScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    activeDatasetId,
    activeRunId,
    latestRunResult,
    setLatestRunResult,
    setActiveStage,
  } = useAuditContext();

  const [viewsData, setViewsData] = useState<ViewsResponse | null>(null);
  const [selectedAction, setSelectedAction] = useState<"R1" | "R2">("R1");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [selectedRule, setSelectedRule] = useState<string>("quarantine_ephemeral_ports");
  const [featureSearch, setFeatureSearch] = useState<string>("");
  const [datasetFeatures, setDatasetFeatures] = useState<string[]>([]);
  const [preview, setPreview] = useState<RemediationPreview | null>(null);
  const [warningAck, setWarningAck] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [applying, setApplying] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (activeRunId) {
      loadViews(activeRunId);
    }
  }, [activeRunId]);

  useEffect(() => {
    const dsId = activeDatasetId || (latestRunResult ? latestRunResult.dataset.name : null);
    if (dsId) {
      api.getDatasetMetadata(dsId)
        .then((m) => {
          if (m?.columns) setDatasetFeatures(m.columns);
        })
        .catch(console.error);
    }
  }, [activeDatasetId, latestRunResult]);

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
      console.error("Failed to load views", err);
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
        text: `Remediation applied! Successfully advanced to training view ${res.view.view_id}.`,
      });
      setPreview(null);
      await loadViews(activeRunId);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to apply remediation." });
    } finally {
      setApplying(false);
    }
  };

  const executeRollback = async () => {
    if (!activeRunId || !rollbackTarget) return;
    setRollingBack(true);
    setMessage(null);

    try {
      const res = await api.rollback(activeRunId, rollbackTarget);
      setMessage({
        type: "success",
        text: `${res.message} (Restored to view ${res.restored_view.view_id})`,
      });
      await loadViews(activeRunId);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Rollback operation failed." });
    } finally {
      setRollingBack(false);
      setRollbackTarget(null);
    }
  };

  if (!activeRunId) {
    return (
      <EmptyState
        title="No Active Audit Run"
        description="Execute an audit first to enable remediation safeguards and counterfactual training views."
      />
    );
  }

  const candidateShortcuts = latestRunResult
    ? latestRunResult.classes.flatMap((c) => c.sfi.top_features)
    : [];
  const uniqueCandidateFeatures = Array.from(
    new Set([...candidateShortcuts, ...datasetFeatures])
  );

  const filteredCandidateFeatures = uniqueCandidateFeatures.filter((f) =>
    f.toLowerCase().includes(featureSearch.toLowerCase())
  );

  const activeView = viewsData?.active_view;
  const rsmReport = preview?.rsm_report;
  const isBlock = rsmReport?.status === "BLOCK";
  const isWarn = rsmReport?.status === "WARN";
  const canApply = preview && !isBlock && (!isWarn || warningAck);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <SectionHeader
        icon={Sliders}
        title="Remediation Lab & Remediation Safety Monitor (RSM)"
        description="Simulate and execute reversible counterfactual remediations (feature ablation & traffic quarantine) guarded by independent backend safety checks."
        badge={<EvidenceBadge type="target" />}
        actions={
          activeView && (
            <div className="flex items-center gap-2 text-xs font-mono bg-bg-card px-3 py-1.5 rounded-lg border border-border">
              <span className="text-txt-muted">Active View:</span>
              <strong className="text-accent-secondary">{activeView.view_id}</strong>
              <span className="text-txt-muted">({formatNumber(activeView.n_included)} train flows)</span>
            </div>
          )
        }
      />

      {/* Optional Stage Notice Banner */}
      <div className="rounded-xl border border-border bg-bg-card p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2.5 flex-wrap">
          <Badge variant="secondary">OPTIONAL WORKFLOW STAGE</Badge>
          <span className="text-xs text-txt-muted">
            Remediation is optional. You can skip this step and generate a report on your original benchmark dataset at any time.
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setActiveStage("REPORTS");
            navigate("/reports");
          }}
          className="text-xs shrink-0"
        >
          Skip to Reports &rarr;
        </Button>
      </div>

      {message && (
        <div
          className={`rounded-xl border p-3.5 text-xs flex items-center gap-3 ${
            message.type === "success"
              ? "border-status-success/40 bg-status-success/10 text-emerald-300"
              : "border-status-block/40 bg-status-block/10 text-rose-300"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-status-success shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 text-status-block shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* 3-Column Remediation Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1: Action Configuration */}
        <Card className="lg:col-span-1">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">1. Strategy Configuration</CardTitle>
            <CardDescription>Select counterfactual intervention method</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Strategy Selector Toggle */}
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <button
                onClick={() => {
                  setSelectedAction("R1");
                  setPreview(null);
                }}
                className={`py-2 px-3 rounded-lg border text-center transition-all ${
                  selectedAction === "R1"
                    ? "bg-accent-primary text-white border-accent-primary shadow-sm font-bold"
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
                    ? "bg-accent-primary text-white border-accent-primary shadow-sm font-bold"
                    : "bg-bg-elevated text-txt-secondary border-border hover:text-txt-primary"
                }`}
              >
                R2 Flow Quarantine
              </button>
            </div>

            {selectedAction === "R1" ? (
              /* R1 Feature Selection */
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-txt-muted block">
                    Candidate Features
                  </label>
                  <span className="text-[10px] text-accent-secondary font-mono">
                    {selectedFeatures.length} selected
                  </span>
                </div>

                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-bg-elevated text-xs">
                  <Search className="h-3.5 w-3.5 text-txt-muted shrink-0" />
                  <input
                    type="text"
                    placeholder="Search features..."
                    value={featureSearch}
                    onChange={(e) => setFeatureSearch(e.target.value)}
                    className="w-full bg-transparent text-xs text-txt-primary focus:outline-none placeholder:text-txt-muted"
                  />
                </div>

                <div className="max-h-52 overflow-y-auto space-y-1 rounded-lg border border-border bg-bg-main/50 p-2 text-xs scrollbar-thin">
                  {filteredCandidateFeatures.map((feat) => {
                    const isChecked = selectedFeatures.includes(feat);
                    const isShortcut = candidateShortcuts.includes(feat);
                    return (
                      <label
                        key={feat}
                        className="flex items-center justify-between p-1.5 rounded hover:bg-bg-elevated/70 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedFeatures([...selectedFeatures, feat]);
                              else setSelectedFeatures(selectedFeatures.filter((f) => f !== feat));
                            }}
                            className="rounded border-border text-accent-primary focus:ring-accent-primary bg-bg-elevated"
                          />
                          <span className="font-mono text-txt-primary truncate text-xs">{feat}</span>
                        </div>
                        {isShortcut && (
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-status-warning/15 text-status-warning border border-status-warning/30 font-semibold shrink-0">
                            Shortcut
                          </span>
                        )}
                      </label>
                    );
                  })}
                  {filteredCandidateFeatures.length === 0 && (
                    <p className="text-txt-muted py-3 text-center text-xs">No matching features found.</p>
                  )}
                </div>
              </div>
            ) : (
              /* R2 Quarantine Rule Selection */
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-txt-muted block">
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
                <p className="text-[11px] text-txt-muted leading-relaxed">
                  Quarantines candidate shortcut traffic exclusively within the training partition; test partition remains locked.
                </p>
              </div>
            )}

            <Button
              variant="primary"
              size="md"
              className="w-full gap-2 text-xs font-bold"
              isLoading={loadingPreview}
              onClick={handleGeneratePreview}
            >
              Generate What-If Preview & Check RSM
            </Button>
          </CardContent>
        </Card>

        {/* Col 2 & 3: What-If Impact & RSM Governance */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between w-full">
                <CardTitle className="text-sm">2. Remediation Safety Monitor (RSM) Authorization</CardTitle>
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
            <CardContent className="p-4">
              {preview ? (
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div
                    className={`rounded-xl border p-3.5 text-xs ${
                      isBlock
                        ? "border-status-block/60 bg-status-block/15 text-rose-300"
                        : isWarn
                        ? "border-status-warning/60 bg-status-warning/15 text-amber-300"
                        : "border-status-success/60 bg-status-success/15 text-emerald-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {isBlock ? (
                        <XCircle className="h-5 w-5 text-status-block shrink-0 mt-0.5" />
                      ) : isWarn ? (
                        <AlertTriangle className="h-5 w-5 text-status-warning shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-status-success shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1">
                        <strong className="block font-bold">
                          {isBlock
                            ? "OPERATION BLOCKED: Violates Non-Negotiable Safety Floor"
                            : isWarn
                            ? "SAFETY WARNING: High Class Attrition / Extensive Feature Ablation"
                            : "OPERATION AUTHORIZED: All Safety Guardrails Passed"}
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
                      <span className="text-[10px] text-txt-muted block uppercase font-semibold">Affected Rows</span>
                      <strong className="text-base text-txt-primary">
                        {formatNumber(preview.affected.n_rows)}
                      </strong>
                    </div>
                    <div className="p-3 rounded-lg bg-bg-elevated border border-border">
                      <span className="text-[10px] text-txt-muted block uppercase font-semibold">Train Size Before</span>
                      <strong className="text-base text-txt-secondary">
                        {formatNumber(preview.expected_train_size.before)}
                      </strong>
                    </div>
                    <div className="p-3 rounded-lg bg-bg-elevated border border-border">
                      <span className="text-[10px] text-txt-muted block uppercase font-semibold">Train Size After</span>
                      <strong className="text-base text-accent-secondary">
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
                    className="w-full gap-2 text-xs font-bold"
                    disabled={!canApply || applying}
                    isLoading={applying}
                    onClick={handleApplyRemediation}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {isBlock
                      ? "ACTION PROHIBITED BY RSM"
                      : isWarn && !warningAck
                      ? "ACKNOWLEDGEMENT REQUIRED TO PROCEED"
                      : "APPLY REMEDIATION TO TRAINING VIEW"}
                  </Button>
                </div>
              ) : (
                <div className="py-10 text-center text-xs text-txt-muted space-y-1">
                  <p className="font-medium text-txt-primary">No Simulation Preview Generated</p>
                  <p className="text-[11px]">Configure an intervention on the left and click "Generate What-If Preview" to execute RSM checks.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cryptographic Rollback & Lineage History */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-accent-secondary" />
            Cryptographic Training View Lineage & Rollback History
          </CardTitle>
          <CardDescription>
            Deterministic view hash lineage. Rollbacks are verified against parent view fingerprints.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {viewsData && viewsData.views.length > 0 ? (
            <>
              {/* Visual Chain */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                {viewsData.views.map((v, i) => {
                  const isCurrent = v.view_id === viewsData.active_view.view_id;
                  return (
                    <React.Fragment key={v.view_id}>
                      <div
                        className={`rounded-lg border px-3 py-1.5 ${
                          isCurrent
                            ? "border-accent-primary bg-accent-primary/20 text-white font-bold shadow-sm"
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
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-bg-elevated/70 text-[11px] uppercase text-txt-muted">
                        <th className="p-2.5">Log Entry</th>
                        <th className="p-2.5">Action</th>
                        <th className="p-2.5">Transition</th>
                        <th className="p-2.5">RSM Status</th>
                        <th className="p-2.5">Timestamp</th>
                        <th className="p-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-mono text-xs">
                      {viewsData.change_log.map((entry) => (
                        <tr key={entry.entry_id} className="hover:bg-bg-elevated/40 transition-colors">
                          <td className="p-2.5 text-txt-primary font-bold">{entry.entry_id}</td>
                          <td className="p-2.5">
                            <Badge variant="outline">{entry.action}: {entry.rule_name}</Badge>
                          </td>
                          <td className="p-2.5 text-txt-secondary">
                            {entry.parent_view_id} &rarr; {entry.new_view_id}
                          </td>
                          <td className="p-2.5">
                            <Badge variant={entry.rsm_status === "PASS" ? "success" : "warning"}>
                              {entry.rsm_status}
                            </Badge>
                          </td>
                          <td className="p-2.5 text-txt-muted">{entry.timestamp}</td>
                          <td className="p-2.5 text-right">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="gap-1.5 text-xs py-1"
                              isLoading={rollingBack && rollbackTarget === entry.entry_id}
                              onClick={() => setRollbackTarget(entry.entry_id)}
                            >
                              <RotateCcw className="h-3 w-3" /> Rollback
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-txt-muted text-center py-4">
                  Root baseline view active (view_0000). No historical interventions applied yet.
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-txt-muted text-center py-4">No view lineage recorded.</p>
          )}
        </CardContent>
      </Card>

      {/* Rollback Confirmation Modal */}
      <ConfirmationDialog
        open={!!rollbackTarget}
        onOpenChange={(open) => {
          if (!open) setRollbackTarget(null);
        }}
        title="Confirm Remediation Rollback"
        description="Are you sure you want to revert to the parent training view of this entry? All downstream modifications from this point will be reverted."
        confirmLabel="Rollback View"
        variant="warning"
        isLoading={rollingBack}
        onConfirm={executeRollback}
      >
        <div className="p-2.5 rounded bg-bg-elevated/60 border border-border font-mono text-xs text-txt-muted">
          Target Log Entry: <strong className="text-txt-primary">{rollbackTarget}</strong>
        </div>
      </ConfirmationDialog>
    </div>
  );
};
