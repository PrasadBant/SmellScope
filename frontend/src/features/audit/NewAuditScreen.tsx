import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Database,
  Upload,
  Play,
  CheckCircle2,
  AlertCircle,
  Hash,
  Layers,
  Lock,
  ArrowRight,
  Sliders,
  ChevronDown,
  ChevronUp,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import { FingerprintDisplay } from "@/components/ui/FingerprintDisplay";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useAuditContext } from "@/stores/AuditContext";
import { api } from "@/api/client";
import { DatasetItem, DatasetMetadata, DatasetPreview, AuditStatus } from "@/types/api";
import { formatNumber } from "@/utils/cn";

export const NewAuditScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    activeDatasetId,
    setActiveDatasetId,
    setActiveRunId,
    setActiveStage,
    setLatestRunResult,
  } = useAuditContext();

  const [availableDatasets, setAvailableDatasets] = useState<DatasetItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>(activeDatasetId || "cic2017_sample_planted");
  const [metadata, setMetadata] = useState<DatasetMetadata | null>(null);
  const [preview, setPreview] = useState<DatasetPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditStatus, setAuditStatus] = useState<AuditStatus | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form options
  const [labelCol, setLabelCol] = useState("Label");
  const [benignLabel, setBenignLabel] = useState("BENIGN");
  const [seed, setSeed] = useState(42);
  const [maxRows, setMaxRows] = useState(20000);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDatasetsList();
  }, []);

  const loadDatasetsList = async () => {
    try {
      const list = await api.listDatasets();
      setAvailableDatasets(list);
      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0].dataset_id);
      }
    } catch (err: any) {
      console.error("Failed to load dataset list", err);
    }
  };

  useEffect(() => {
    if (selectedId) {
      loadDatasetDetails(selectedId);
    }
  }, [selectedId]);

  const loadDatasetDetails = async (id: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const meta = await api.getDatasetMetadata(id);
      setMetadata(meta);
      setLabelCol(meta.label_col);
      setBenignLabel(meta.benign_label);

      const prev = await api.getDatasetPreview(id, 15);
      setPreview(prev);
      setActiveDatasetId(id);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load dataset details");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setErrorMsg(null);
    try {
      const res = await api.uploadDataset(file, labelCol, benignLabel);
      await loadDatasetsList();
      setSelectedId(res.dataset_id);
    } catch (err: any) {
      setErrorMsg(err.message || "File upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleRunAudit = async () => {
    if (!selectedId) return;
    setAuditRunning(true);
    setErrorMsg(null);

    try {
      const startRes = await api.startAudit({
        dataset_id: selectedId,
        seed,
        max_rows_per_class: maxRows,
      });

      const runId = startRes.run_id;
      setActiveRunId(runId);

      // Poll audit status until completion
      const pollInterval = setInterval(async () => {
        try {
          const st = await api.getAuditStatus(runId);
          setAuditStatus(st);

          if (st.status === "COMPLETED") {
            clearInterval(pollInterval);
            setAuditRunning(false);
            const results = await api.getAuditResults(runId);
            setLatestRunResult(results);
            setActiveStage("FINDINGS");
            navigate("/findings");
          } else if (st.status === "FAILED") {
            clearInterval(pollInterval);
            setAuditRunning(false);
            setErrorMsg(st.error_message || "Audit execution failed");
          }
        } catch (pollErr: any) {
          clearInterval(pollInterval);
          setAuditRunning(false);
          setErrorMsg(pollErr.message);
        }
      }, 1000);
    } catch (err: any) {
      setAuditRunning(false);
      setErrorMsg(err.message || "Failed to initiate audit");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <SectionHeader
        icon={Database}
        title="Dataset Ingestion & Scientific Audit"
        description="Select or upload a benchmark dataset, verify its schema and column roles, and run a stratified multi-class audit."
        badge={<EvidenceBadge type="measured" />}
      />

      {errorMsg && (
        <div className="rounded-xl border border-status-block/40 bg-status-block/10 p-3.5 text-xs text-rose-300 flex items-center gap-3">
          <AlertCircle className="h-4 w-4 text-status-block shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 3-Step Guided Audit Wizard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Step 1 & Step 3: Selection & Launch Controls */}
        <div className="space-y-4 lg:col-span-1">
          {/* Step 1: Dataset Source */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-xs uppercase tracking-wider text-txt-muted">
                Step 1 · Dataset Source
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-txt-secondary mb-1">
                  Choose Standard Benchmark:
                </label>
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-xs text-txt-primary focus:outline-none focus:border-accent-primary"
                >
                  {availableDatasets.map((ds) => (
                    <option key={ds.dataset_id} value={ds.dataset_id}>
                      {ds.name} ({ds.schema_id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Drag & Drop Upload Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-border hover:border-accent-primary/60 rounded-xl p-4 text-center cursor-pointer transition-colors bg-bg-main/50 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.parquet"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                  }}
                />
                <Upload className="h-6 w-6 mx-auto text-txt-muted group-hover:text-accent-secondary transition-colors mb-1" />
                <p className="text-xs font-semibold text-txt-primary">
                  {uploading ? "Registering Dataset..." : "Or upload custom dataset"}
                </p>
                <p className="text-[10px] text-txt-muted mt-0.5">.csv or .parquet (strictly local)</p>
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Configuration & Launch */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-xs uppercase tracking-wider text-txt-muted">
                Step 3 · Audit Parameters & Run
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-txt-muted">
                <span>Evaluation Strategy:</span>
                <span className="font-semibold text-txt-primary">60/20/20 Stratified Split</span>
              </div>
              <div className="flex items-center justify-between text-xs text-txt-muted">
                <span>Classifier Baseline:</span>
                <span className="font-semibold text-txt-primary">Random Forest (Balanced)</span>
              </div>

              {/* Collapsible Advanced Parameters */}
              <div className="pt-2 border-t border-border/80">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center justify-between w-full text-xs font-semibold text-txt-muted hover:text-txt-primary transition-colors py-1"
                >
                  <span className="uppercase tracking-wider text-[10px]">
                    Advanced Options {showAdvanced ? "▲" : "▼"}
                  </span>
                  <span className="text-[11px] text-accent-secondary">
                    {showAdvanced ? "Hide" : "Customize"}
                  </span>
                </button>

                {showAdvanced && (
                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 animate-in fade-in duration-200">
                    <div>
                      <label className="text-txt-muted block mb-1 text-[11px]">Label Column</label>
                      <input
                        type="text"
                        value={labelCol}
                        onChange={(e) => setLabelCol(e.target.value)}
                        className="w-full rounded border border-border bg-bg-elevated px-2 py-1 font-mono text-xs text-txt-primary"
                      />
                    </div>
                    <div>
                      <label className="text-txt-muted block mb-1 text-[11px]">Benign Label</label>
                      <input
                        type="text"
                        value={benignLabel}
                        onChange={(e) => setBenignLabel(e.target.value)}
                        className="w-full rounded border border-border bg-bg-elevated px-2 py-1 font-mono text-xs text-txt-primary"
                      />
                    </div>
                    <div>
                      <label className="text-txt-muted block mb-1 text-[11px]">Random Seed</label>
                      <input
                        type="number"
                        value={seed}
                        onChange={(e) => setSeed(Number(e.target.value))}
                        className="w-full rounded border border-border bg-bg-elevated px-2 py-1 font-mono text-xs text-txt-primary"
                      />
                    </div>
                    <div>
                      <label className="text-txt-muted block mb-1 text-[11px]">Max Rows/Class</label>
                      <input
                        type="number"
                        value={maxRows}
                        onChange={(e) => setMaxRows(Number(e.target.value))}
                        className="w-full rounded border border-border bg-bg-elevated px-2 py-1 font-mono text-xs text-txt-primary"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Primary Launch Button */}
              <Button
                variant="primary"
                size="lg"
                className="w-full gap-2 mt-2 font-bold"
                disabled={loading || auditRunning || !metadata}
                isLoading={auditRunning}
                onClick={handleRunAudit}
              >
                <Play className="h-4 w-4 fill-current" />
                {auditRunning ? "AUDITING IN PROGRESS..." : "RUN SCIENTIFIC AUDIT"}
              </Button>

              {auditRunning && auditStatus && (
                <div className="rounded-lg bg-bg-elevated p-3 border border-border space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-accent-secondary font-bold">
                      Class: {auditStatus.current_class || "Init"}
                    </span>
                    <span className="text-txt-primary font-bold">{auditStatus.progress_percent}%</span>
                  </div>
                  <div className="w-full bg-bg-main rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-accent-primary h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${auditStatus.progress_percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-txt-muted">
                    <span>Step {auditStatus.current_step}/{auditStatus.total_steps}</span>
                    <span>{auditStatus.elapsed_seconds}s elapsed</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Step 2: Instant Inspection & Split Protocol */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-xs uppercase tracking-wider text-txt-muted">
                Step 2 · Schema Inspection & Split Verification
              </CardTitle>
              {metadata && <Badge variant="published">{metadata.schema_id}</Badge>}
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {metadata ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="p-3 rounded-lg bg-bg-elevated border border-border">
                      <span className="text-txt-muted block text-[10px] uppercase font-semibold">Loaded Flows</span>
                      <strong className="text-base font-mono text-txt-primary">{formatNumber(metadata.n_rows_loaded)}</strong>
                    </div>
                    <div className="p-3 rounded-lg bg-bg-elevated border border-border">
                      <span className="text-txt-muted block text-[10px] uppercase font-semibold">Features</span>
                      <strong className="text-base font-mono text-txt-primary">{metadata.columns.length}</strong>
                    </div>
                    <div className="p-3 rounded-lg bg-bg-elevated border border-border">
                      <span className="text-txt-muted block text-[10px] uppercase font-semibold">Attack Classes</span>
                      <strong className="text-base font-mono text-txt-primary">{Object.keys(metadata.class_counts).length}</strong>
                    </div>
                    <div className="p-3 rounded-lg bg-bg-elevated border border-border">
                      <span className="text-txt-muted block text-[10px] uppercase font-semibold">Dropped Inf/NaN</span>
                      <strong className="text-base font-mono text-txt-primary">{metadata.dropped_inf_nan}</strong>
                    </div>
                  </div>

                  <div className="rounded-lg bg-bg-elevated/40 p-3 border border-border text-xs font-mono space-y-1.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-txt-muted">Dataset Fingerprint:</span>
                      <FingerprintDisplay hash={metadata.sha256} label="SHA-256" truncateLength={12} />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-txt-muted">Destination Port Column:</span>
                      <span className="text-txt-primary font-semibold">{metadata.column_roles.dst_port || "None detected"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-txt-muted">Timestamp Column:</span>
                      <span className="text-txt-primary font-semibold">{metadata.column_roles.timestamp || "None detected"}</span>
                    </div>
                  </div>

                  {/* Class Distribution Bars */}
                  <div>
                    <h5 className="text-[11px] font-semibold text-txt-muted uppercase tracking-wider mb-2">
                      Class Distribution
                    </h5>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin">
                      {Object.entries(metadata.class_counts).map(([cls, cnt]) => {
                        const pct = (cnt / metadata.n_rows_loaded) * 100;
                        const isBenign = cls === metadata.benign_label;
                        return (
                          <div key={cls} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-semibold text-txt-primary">{cls}</span>
                              <span className="font-mono text-txt-muted">
                                {formatNumber(cnt)} ({pct.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-bg-elevated rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${isBenign ? "bg-accent-secondary" : "bg-accent-primary"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Locked Split Protocol Card */}
                  <div className="grid grid-cols-3 gap-2.5 text-xs text-center pt-2 border-t border-border/80">
                    <div className="p-2.5 rounded-lg bg-bg-elevated border border-border">
                      <span className="text-txt-muted block uppercase text-[10px] font-bold">Training (60%)</span>
                      <span className="text-xs text-txt-muted block mt-0.5">Fit-only boundary</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-bg-elevated border border-border">
                      <span className="text-txt-muted block uppercase text-[10px] font-bold">Validation (20%)</span>
                      <span className="text-xs text-txt-muted block mt-0.5">Null calibration</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-bg-elevated border border-border">
                      <span className="text-txt-muted block uppercase text-[10px] font-bold text-status-success">Locked Test (20%)</span>
                      <span className="text-xs text-txt-muted block mt-0.5">Strictly guarded</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-xs text-txt-muted">Select a dataset to view inspection.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
