import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  Database,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Play,
  RefreshCw,
  Sliders,
  Hash,
  Layers,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuditContext } from "@/stores/AuditContext";
import { api } from "@/api/client";
import { DatasetItem, DatasetMetadata, DatasetPreview, AuditStatus } from "@/types/api";
import { formatNumber } from "@/utils/cn";

export const IngestionScreen: React.FC = () => {
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
      console.error(err);
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

      const prev = await api.getDatasetPreview(id, 25);
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
            setActiveStage("OVERVIEW");
            navigate("/heatmap");
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
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-txt-primary flex items-center gap-2">
            <Database className="h-6 w-6 text-accent-primary" />
            Dataset Ingestion & Inspection
          </h2>
          <p className="text-sm text-txt-muted mt-1">
            Upload local intrusion benchmark datasets or select pre-calibrated sample benchmarks.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-status-block/40 bg-status-block/10 p-4 text-xs text-rose-300 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-status-block shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Upload & Selector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dataset Source Selection */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Benchmark Selector</CardTitle>
            <CardDescription>Select registered benchmark or upload a new file</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-txt-secondary mb-1.5 uppercase tracking-wider">
                Select Benchmark
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
              className="border-2 border-dashed border-border hover:border-accent-primary/60 rounded-xl p-6 text-center cursor-pointer transition-colors bg-bg-main/40 group"
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
              <Upload className="h-8 w-8 mx-auto text-txt-muted group-hover:text-accent-cyan transition-colors mb-2" />
              <p className="text-xs font-semibold text-txt-primary">
                {uploading ? "Uploading & computing SHA-256..." : "Click or drag benchmark file"}
              </p>
              <p className="text-[11px] text-txt-muted mt-1">Accepts .csv or .parquet (local only)</p>
            </div>

            {/* Audit Parameters */}
            <div className="space-y-3 pt-2 border-t border-border/80">
              <h4 className="text-xs font-bold uppercase tracking-wider text-txt-muted">
                Audit Configuration
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-txt-muted block mb-1">Label Column</label>
                  <input
                    type="text"
                    value={labelCol}
                    onChange={(e) => setLabelCol(e.target.value)}
                    className="w-full rounded border border-border bg-bg-elevated px-2 py-1 font-mono text-xs text-txt-primary"
                  />
                </div>
                <div>
                  <label className="text-txt-muted block mb-1">Benign Label</label>
                  <input
                    type="text"
                    value={benignLabel}
                    onChange={(e) => setBenignLabel(e.target.value)}
                    className="w-full rounded border border-border bg-bg-elevated px-2 py-1 font-mono text-xs text-txt-primary"
                  />
                </div>
                <div>
                  <label className="text-txt-muted block mb-1">Random Seed</label>
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(Number(e.target.value))}
                    className="w-full rounded border border-border bg-bg-elevated px-2 py-1 font-mono text-xs text-txt-primary"
                  />
                </div>
                <div>
                  <label className="text-txt-muted block mb-1">Max Rows/Class</label>
                  <input
                    type="number"
                    value={maxRows}
                    onChange={(e) => setMaxRows(Number(e.target.value))}
                    className="w-full rounded border border-border bg-bg-elevated px-2 py-1 font-mono text-xs text-txt-primary"
                  />
                </div>
              </div>
            </div>

            {/* Run Action */}
            <Button
              variant="primary"
              size="lg"
              className="w-full gap-2 mt-4"
              disabled={loading || auditRunning || !metadata}
              isLoading={auditRunning}
              onClick={handleRunAudit}
            >
              <Play className="h-4 w-4 fill-current" />
              {auditRunning ? "AUDIT IN PROGRESS..." : "RUN MULTI-CLASS AUDIT"}
            </Button>

            {auditRunning && auditStatus && (
              <div className="rounded-lg bg-bg-elevated p-3 border border-border space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-accent-cyan font-bold">Class: {auditStatus.current_class || "Init"}</span>
                  <span className="text-txt-muted">{auditStatus.progress_percent}%</span>
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

        {/* Dataset Metadata & Locked Split Overview */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Inspection & Cryptographic Fingerprint</CardTitle>
              {metadata && (
                <Badge variant="published">{metadata.schema_id}</Badge>
              )}
            </CardHeader>
            <CardContent>
              {metadata ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-bg-elevated border border-border/80">
                      <span className="text-txt-muted block text-[10px] uppercase">Loaded Flows</span>
                      <strong className="text-base font-mono text-txt-primary">{formatNumber(metadata.n_rows_loaded)}</strong>
                    </div>
                    <div className="p-3 rounded-lg bg-bg-elevated border border-border/80">
                      <span className="text-txt-muted block text-[10px] uppercase">Total Features</span>
                      <strong className="text-base font-mono text-txt-primary">{metadata.columns.length}</strong>
                    </div>
                    <div className="p-3 rounded-lg bg-bg-elevated border border-border/80">
                      <span className="text-txt-muted block text-[10px] uppercase">Distinct Classes</span>
                      <strong className="text-base font-mono text-txt-primary">{Object.keys(metadata.class_counts).length}</strong>
                    </div>
                    <div className="p-3 rounded-lg bg-bg-elevated border border-border/80">
                      <span className="text-txt-muted block text-[10px] uppercase">Dropped Inf/NaN</span>
                      <strong className="text-base font-mono text-txt-primary">{metadata.dropped_inf_nan}</strong>
                    </div>
                  </div>

                  <div className="rounded-lg bg-bg-elevated/40 p-3 border border-border/60 text-xs font-mono space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-txt-muted">SHA-256 Fingerprint:</span>
                      <span className="text-accent-cyan truncate max-w-[320px]">{metadata.sha256}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-txt-muted">Target Port Column:</span>
                      <span className="text-txt-primary">{metadata.column_roles.dst_port || "None detected"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-txt-muted">Timestamp Column:</span>
                      <span className="text-txt-primary">{metadata.column_roles.timestamp || "None detected"}</span>
                    </div>
                  </div>

                  {/* Class Distribution Bars */}
                  <div>
                    <h5 className="text-xs font-semibold text-txt-muted uppercase tracking-wider mb-2">
                      Class Distribution
                    </h5>
                    <div className="space-y-1.5">
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
                                className={`h-full rounded-full ${isBenign ? "bg-accent-cyan" : "bg-accent-primary"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-txt-muted">Select a dataset to view inspection.</div>
              )}
            </CardContent>
          </Card>

          {/* Locked Split Specification */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Lock className="h-4 w-4 text-status-warning" />
                Locked Split Protocol (Shared Contract v1.0 Section 2.5)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 text-xs text-center">
                <div className="p-3 rounded-lg bg-bg-elevated border border-border">
                  <span className="text-txt-muted block uppercase text-[10px]">Training Split</span>
                  <span className="text-lg font-mono font-bold text-accent-cyan">60.0%</span>
                  <span className="text-[10px] text-txt-muted block">Fit-only boundary</span>
                </div>
                <div className="p-3 rounded-lg bg-bg-elevated border border-border">
                  <span className="text-txt-muted block uppercase text-[10px]">Validation Split</span>
                  <span className="text-lg font-mono font-bold text-txt-secondary">20.0%</span>
                  <span className="text-[10px] text-txt-muted block">Calibration set</span>
                </div>
                <div className="p-3 rounded-lg bg-bg-elevated border border-border">
                  <span className="text-txt-muted block uppercase text-[10px]">Locked Test Split</span>
                  <span className="text-lg font-mono font-bold text-status-success">20.0%</span>
                  <span className="text-[10px] text-txt-muted block">Guarded test integrity</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bounded Preview Data Table */}
      {preview && preview.preview_rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Bounded Data Preview ({preview.preview_rows.length} of {formatNumber(preview.total_rows)} rows)
            </CardTitle>
            <CardDescription>First rows after inf/nan sanitization</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-bg-elevated">
                  {preview.columns.slice(0, 10).map((col) => (
                    <th key={col} className="p-2.5 font-semibold text-txt-secondary uppercase tracking-wider text-[10px]">
                      {col}
                    </th>
                  ))}
                  {preview.columns.length > 10 && <th className="p-2.5 text-txt-muted">...</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-mono">
                {preview.preview_rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-bg-elevated/40">
                    {preview.columns.slice(0, 10).map((col) => (
                      <td key={col} className="p-2.5 text-txt-secondary">
                        {row[col] !== null ? String(row[col]) : <span className="text-txt-muted">null</span>}
                      </td>
                    ))}
                    {preview.columns.length > 10 && <td className="p-2.5 text-txt-muted">...</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
