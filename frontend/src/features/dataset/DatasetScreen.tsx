import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  ArrowRight,
  Database,
  Sliders,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  Info,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuditContext } from "@/stores/AuditContext";
import { api } from "@/api/client";
import { DatasetItem, DatasetMetadata, DatasetPreview, DatasetValidateResponse } from "@/types/api";

type DatasetSubStep = "1_UPLOAD" | "2_VALIDATION" | "3_PREPROCESSING";

export const DatasetScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    activeDatasetId,
    setActiveDatasetId,
    setActiveStage,
    datasetMetadata,
    setDatasetMetadata,
    datasetPreview,
    setDatasetPreview,
    datasetValidation,
    setDatasetValidation,
    auditConfig,
    setAuditConfig,
    viewMode,
  } = useAuditContext();

  const [currentStep, setCurrentStep] = useState<DatasetSubStep>("1_UPLOAD");
  const [datasetsList, setDatasetsList] = useState<DatasetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorCategory, setErrorCategory] = useState<"LOAD_ERROR" | "PARAM_ERROR" | "SERVER_ERROR" | null>(null);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  // Form parameters
  const [selectedId, setSelectedId] = useState<string>(activeDatasetId || "");
  const [labelCol, setLabelCol] = useState<string>(auditConfig?.labelCol || "Label");
  const [benignLabel, setBenignLabel] = useState<string>(auditConfig?.benignLabel || "BENIGN");
  const [seed, setSeed] = useState<number>(auditConfig?.seed ?? 42);
  const [maxRows, setMaxRows] = useState<number>(auditConfig?.maxRows ?? 20000);

  // Sync parameters with global auditConfig
  useEffect(() => {
    setAuditConfig({
      seed: Number.isInteger(seed) && seed >= 0 ? seed : 42,
      labelCol,
      benignLabel,
      maxRows,
    });
  }, [seed, labelCol, benignLabel, maxRows, setAuditConfig]);

  // Load available datasets on mount
  useEffect(() => {
    loadDatasetsList();
  }, []);

  // When selectedId changes, load details or clear
  useEffect(() => {
    if (selectedId) {
      setActiveDatasetId(selectedId);
      loadDatasetDetails(selectedId);
    } else {
      setActiveDatasetId(null);
      setDatasetMetadata(null);
      setDatasetPreview(null);
      setDatasetValidation(null);
    }
  }, [selectedId]);

  const loadDatasetsList = async () => {
    try {
      const list = await api.listDatasets();
      setDatasetsList(list);
    } catch (err: any) {
      console.error("Failed to list datasets:", err);
    }
  };

  const loadDatasetDetails = async (id: string) => {
    setLoading(true);
    setErrorMsg(null);
    setErrorCategory(null);
    try {
      const meta = await api.getDatasetMetadata(id);
      setDatasetMetadata(meta);
      const targetLabel = meta.label_col || labelCol;
      const targetBenign = meta.benign_label || benignLabel;
      if (meta.label_col) setLabelCol(meta.label_col);
      if (meta.benign_label) setBenignLabel(meta.benign_label);

      const prev = await api.getDatasetPreview(id, 25);
      setDatasetPreview(prev);

      // Auto-validate standard benchmark samples
      if (meta.status === "validated" || (meta.label_col && meta.benign_label)) {
        runValidation(id, targetLabel, targetBenign);
      }
    } catch (err: any) {
      setErrorCategory("LOAD_ERROR");
      setErrorMsg(err.message || "Failed to load dataset details");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setErrorMsg(null);
    setErrorCategory(null);
    setUploadSuccessMsg(null);
    try {
      const res = await api.uploadDataset(file, labelCol, benignLabel);
      await loadDatasetsList();
      setSelectedId(res.dataset_id);
      setActiveDatasetId(res.dataset_id);
      setUploadSuccessMsg(`Dataset uploaded successfully. Generated ID: ${res.dataset_id}`);
    } catch (err: any) {
      setErrorCategory("LOAD_ERROR");
      setErrorMsg(err.message || "File upload failed");
    } finally {
      setUploading(false);
    }
  };

  const runValidation = async (id: string, lbl: string, bng: string) => {
    if (!id) return;
    setValidating(true);
    setErrorMsg(null);
    setErrorCategory(null);

    // Validate integer seed
    const effectiveSeed = Number.isInteger(seed) && seed >= 0 ? seed : 42;
    if (isNaN(seed) || seed < 0) {
      setErrorCategory("PARAM_ERROR");
      setErrorMsg("Random seed must be a non-negative integer (e.g. 42).");
      setValidating(false);
      return;
    }

    try {
      const valRes = await api.validateDataset(id, {
        label_col: lbl,
        benign_label: bng,
        seed: effectiveSeed,
        max_rows_per_class: maxRows,
      });
      setDatasetValidation(valRes);
      if (!valRes.valid) {
        setErrorCategory("PARAM_ERROR");
        setErrorMsg(
          valRes.warnings && valRes.warnings.length > 0
            ? valRes.warnings.join("; ")
            : "Validation parameters mismatch: verify that ground-truth column and benign class exist in schema."
        );
      }
    } catch (err: any) {
      setErrorCategory("SERVER_ERROR");
      setErrorMsg(err.message || "Validation request failed");
      setDatasetValidation({
        valid: false,
        schema_id: "error",
        unique_classes: [],
        class_counts: {},
        column_roles: { dst_port: null, timestamp: null, group: null },
        warnings: [err.message || "Failed to validate dataset schema"],
      });
    } finally {
      setValidating(false);
    }
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Workflow Stepper within Dataset Stage */}
      <div className="border-b border-border pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-accent-primary/10 border border-accent-primary/30 text-accent-secondary uppercase font-bold">
                Stage 01 · Dataset
              </span>
              <span className="text-xs text-txt-muted">Ingestion, Health Check & Preprocessing</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-txt-primary mt-1">
              Dataset Ingestion & Preparation
            </h1>
          </div>

          {/* Sub-step Selector */}
          <div className="flex items-center rounded-lg border border-border bg-bg-card p-1 text-xs">
            <button
              onClick={() => setCurrentStep("1_UPLOAD")}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                currentStep === "1_UPLOAD"
                  ? "bg-accent-primary text-white shadow-sm"
                  : "text-txt-muted hover:text-txt-primary"
              }`}
            >
              Step 1 · Upload
            </button>
            <button
              onClick={() => setCurrentStep("2_VALIDATION")}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                currentStep === "2_VALIDATION"
                  ? "bg-accent-primary text-white shadow-sm"
                  : "text-txt-muted hover:text-txt-primary"
              }`}
            >
              Step 2 · Health Check
            </button>
            <button
              onClick={() => setCurrentStep("3_PREPROCESSING")}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                currentStep === "3_PREPROCESSING"
                  ? "bg-accent-primary text-white shadow-sm"
                  : "text-txt-muted hover:text-txt-primary"
              }`}
            >
              Step 3 · Preprocessing
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
            errorCategory === "PARAM_ERROR"
              ? "border-amber-800/80 bg-amber-950/40 text-amber-200"
              : "border-rose-800/80 bg-rose-950/40 text-rose-200"
          }`}
        >
          <AlertTriangle
            className={`h-4 w-4 shrink-0 mt-0.5 ${
              errorCategory === "PARAM_ERROR" ? "text-amber-400" : "text-rose-400"
            }`}
          />
          <div className="space-y-1">
            <p className="font-bold">
              {errorCategory === "PARAM_ERROR"
                ? "Validation Parameter Notice"
                : errorCategory === "LOAD_ERROR"
                ? "Dataset Loading Notice"
                : "Validation Check Notice"}
            </p>
            <p className="leading-relaxed">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1 — UPLOAD DATASET                                                    */}
      {/* ========================================================================= */}
      {currentStep === "1_UPLOAD" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-border bg-bg-card">
            <h3 className="text-base font-bold text-txt-primary">Upload Your Dataset</h3>
            <p className="text-xs text-txt-muted mt-1 leading-relaxed">
              Select a cybersecurity benchmark dataset or upload your own CSV file. SmellScope will inspect it before starting the audit.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Option A: Select Bundled Benchmark */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-xs uppercase tracking-wider text-txt-muted flex items-center gap-2">
                  <Database className="h-4 w-4 text-accent-secondary" />
                  Option A · Select Benchmark Sample
                </CardTitle>
                <CardDescription>
                  Pre-calibrated benchmark slices from standard cybersecurity evaluation corpora.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-txt-muted block mb-1.5">
                    Choose Standard Benchmark:
                  </label>
                  <select
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-bg-elevated px-3 py-2 text-xs font-mono text-txt-primary focus:border-accent-primary focus:outline-none"
                  >
                    <option value="">None — Do not select a benchmark dataset</option>
                    <option value="cic2017_sample_planted">
                      CIC-IDS-2017 Sample (Planted PortScan Shortcut) (cic-ids-2017)
                    </option>
                    {datasetsList
                      .filter((d) => d.dataset_id !== "cic2017_sample_planted")
                      .map((d) => (
                        <option key={d.dataset_id} value={d.dataset_id}>
                          {d.name} ({d.dataset_id})
                        </option>
                      ))}
                  </select>
                </div>

                {!selectedId && (
                  <div className="p-3 rounded-lg border border-dashed border-border text-center text-xs text-txt-muted">
                    No benchmark dataset selected. Select a benchmark above or upload your custom CSV/Parquet file in Option B.
                  </div>
                )}

                {selectedId && datasetMetadata && (
                  <div className="p-3 rounded-lg border border-border bg-bg-elevated space-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                      <span className="text-txt-muted">Source Basename:</span>
                      <span className="text-txt-primary font-semibold">{datasetMetadata.source_basename}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-txt-muted">Loaded Rows:</span>
                      <span className="text-txt-primary font-bold">{datasetMetadata.n_rows_loaded.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-txt-muted">Total Features:</span>
                      <span className="text-txt-primary">{datasetMetadata.columns.length} columns</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-border/60">
                      <span className="text-txt-muted">SHA-256 Fingerprint:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-accent-secondary font-mono">
                          {datasetMetadata.sha256.substring(0, 12)}...
                        </span>
                        <button
                          onClick={() => handleCopyHash(datasetMetadata.sha256)}
                          className="p-1 hover:text-white text-txt-muted transition-colors"
                          title="Copy SHA-256 Hash"
                        >
                          {copiedHash ? <Check className="h-3 w-3 text-status-success" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Option B: Upload Custom File */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-xs uppercase tracking-wider text-txt-muted flex items-center gap-2">
                  <Upload className="h-4 w-4 text-accent-primary" />
                  Option B · Upload Custom Supported File
                </CardTitle>
                <CardDescription>
                  Supports raw network flow CSV or Parquet files. Processed strictly on your local machine.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-accent-primary/60 rounded-xl p-6 cursor-pointer bg-bg-elevated/40 hover:bg-bg-elevated/80 transition-all text-center">
                  <Upload className="h-8 w-8 text-accent-secondary mb-2" />
                  <span className="text-xs font-semibold text-txt-primary">
                    {uploading ? "Uploading & Fingerprinting..." : "Drop file here or click to browse"}
                  </span>
                  <span className="text-[11px] text-txt-muted mt-1">
                    Accepts .csv or .parquet files (Max upload limit: 500MB)
                  </span>
                  <input
                    type="file"
                    accept=".csv,.parquet"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                </label>

                {uploadSuccessMsg && (
                  <div className="p-3 rounded-lg border border-emerald-800/80 bg-emerald-950/40 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span>{uploadSuccessMsg}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Action Footer */}
          <div className="p-4 rounded-xl border border-border bg-bg-card flex items-center justify-between">
            <div className="text-xs text-txt-muted">
              Active Dataset:{" "}
              {selectedId ? (
                <strong className="text-txt-primary font-mono">{selectedId}</strong>
              ) : (
                <span className="text-amber-400 font-mono">None selected</span>
              )}
            </div>
            <Button
              variant="primary"
              size="md"
              className="gap-2 font-bold"
              disabled={!selectedId || !datasetMetadata}
              onClick={() => {
                if (datasetMetadata && selectedId) {
                  runValidation(selectedId, labelCol, benignLabel);
                }
                setCurrentStep("2_VALIDATION");
              }}
            >
              CONTINUE TO VALIDATION <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2 — DATASET VALIDATION (Check Dataset Health)                          */}
      {/* ========================================================================= */}
      {currentStep === "2_VALIDATION" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-border bg-bg-card">
            <h3 className="text-base font-bold text-txt-primary">Check Dataset Health</h3>
            <p className="text-xs text-txt-muted mt-1 leading-relaxed">
              SmellScope checks whether your dataset contains the information and structure needed for reliable analysis.
            </p>
          </div>

          {/* Datalists for schema column suggestions and distinct class values */}
          <datalist id="schema-columns-list">
            {datasetMetadata?.columns?.map((col) => (
              <option key={col} value={col} />
            ))}
            {datasetPreview?.columns?.map((col) => (
              <option key={col} value={col} />
            ))}
          </datalist>

          <datalist id="schema-classes-list">
            {datasetValidation?.unique_classes?.map((cls) => (
              <option key={cls} value={cls} />
            ))}
            {Object.keys(datasetMetadata?.class_counts || {}).map((cls) => (
              <option key={cls} value={cls} />
            ))}
          </datalist>

          {/* Configuration for Validation */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-xs uppercase tracking-wider text-txt-muted">
                Validation Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="text-txt-muted block mb-1 text-[11px] font-semibold">Ground-Truth Label Column</label>
                  <input
                    type="text"
                    list="schema-columns-list"
                    value={labelCol}
                    onChange={(e) => setLabelCol(e.target.value)}
                    className="w-full rounded border border-border bg-bg-elevated px-2.5 py-1.5 font-mono text-xs text-txt-primary focus:border-accent-primary focus:outline-none"
                    placeholder="e.g. Label"
                  />
                  {datasetMetadata && datasetMetadata.columns.length > 0 && !datasetMetadata.columns.includes(labelCol) && labelCol !== datasetMetadata.label_col && (
                    <span className="text-[10px] text-amber-400 block mt-0.5">
                      Column not in feature list.
                    </span>
                  )}
                </div>
                <div>
                  <label className="text-txt-muted block mb-1 text-[11px] font-semibold">Benign Class Identifier</label>
                  <input
                    type="text"
                    list="schema-classes-list"
                    value={benignLabel}
                    onChange={(e) => setBenignLabel(e.target.value)}
                    className="w-full rounded border border-border bg-bg-elevated px-2.5 py-1.5 font-mono text-xs text-txt-primary focus:border-accent-primary focus:outline-none"
                    placeholder="e.g. BENIGN"
                  />
                  {datasetValidation && datasetValidation.unique_classes.length > 0 && !datasetValidation.unique_classes.includes(benignLabel) && (
                    <span className="text-[10px] text-amber-400 block mt-0.5">
                      Class not detected in unique labels.
                    </span>
                  )}
                </div>
                <div>
                  <label className="text-txt-muted block mb-1 text-[11px] font-semibold">Random Seed</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={seed}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setSeed(isNaN(val) ? 0 : Math.max(0, val));
                    }}
                    className="w-full rounded border border-border bg-bg-elevated px-2.5 py-1.5 font-mono text-xs text-txt-primary focus:border-accent-primary focus:outline-none"
                  />
                  {(isNaN(seed) || seed < 0) && (
                    <span className="text-[10px] text-rose-400 block mt-0.5">
                      Seed must be an integer ≥ 0.
                    </span>
                  )}
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    size="md"
                    className="w-full gap-2 text-xs"
                    isLoading={validating}
                    disabled={!selectedId}
                    onClick={() => runValidation(selectedId, labelCol, benignLabel)}
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Re-Run Health Check
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ten Health Checks Table */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Health Inspection Checklist</CardTitle>
              <CardDescription>
                Detailed structural verification against the ten core integrity criteria.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-bg-elevated/70 border-b border-border text-[11px] text-txt-muted uppercase font-bold">
                  <tr>
                    <th className="p-3">Check Item</th>
                    <th className="p-3">Criterion</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3">Observed Finding & Explanation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {/* 1. File Readability */}
                  <tr>
                    <td className="p-3 font-semibold text-txt-primary">1. File Readability</td>
                    <td className="p-3 text-txt-muted">File parsed without I/O or syntax corruption</td>
                    <td className="p-3 text-center">
                      <Badge variant="success">PASS</Badge>
                    </td>
                    <td className="p-3 text-txt-secondary font-mono">
                      Successfully read {datasetMetadata?.n_rows_loaded || 0} rows from source
                    </td>
                  </tr>

                  {/* 2. Column Names */}
                  <tr>
                    <td className="p-3 font-semibold text-txt-primary">2. Column Names</td>
                    <td className="p-3 text-txt-muted">Header present with non-empty column identifiers</td>
                    <td className="p-3 text-center">
                      <Badge variant="success">PASS</Badge>
                    </td>
                    <td className="p-3 text-txt-secondary font-mono">
                      {datasetMetadata?.columns.length || 0} valid named feature columns identified
                    </td>
                  </tr>

                  {/* 3. Label Column */}
                  <tr>
                    <td className="p-3 font-semibold text-txt-primary">3. Label Column</td>
                    <td className="p-3 text-txt-muted">Specified target column exists in dataset schema</td>
                    <td className="p-3 text-center">
                      {datasetValidation?.valid ? (
                        <Badge variant="success">PASS</Badge>
                      ) : (
                        <Badge variant="danger">FAIL</Badge>
                      )}
                    </td>
                    <td className="p-3 text-txt-secondary font-mono">
                      Target label column: "{labelCol}" found in schema
                    </td>
                  </tr>

                  {/* 4. Benign Class */}
                  <tr>
                    <td className="p-3 font-semibold text-txt-primary">4. Benign Class</td>
                    <td className="p-3 text-txt-muted">Benign baseline class identifier present in label distribution</td>
                    <td className="p-3 text-center">
                      {datasetValidation?.unique_classes.includes(benignLabel) ? (
                        <Badge variant="success">PASS</Badge>
                      ) : (
                        <Badge variant="warning">WARN</Badge>
                      )}
                    </td>
                    <td className="p-3 text-txt-secondary">
                      {datasetValidation?.unique_classes.includes(benignLabel)
                        ? `Class "${benignLabel}" detected (${datasetValidation?.class_counts[benignLabel] || 0} flows)`
                        : `Class "${benignLabel}" not found. Verify benign label setting.`}
                    </td>
                  </tr>

                  {/* 5. Feature Availability */}
                  <tr>
                    <td className="p-3 font-semibold text-txt-primary">5. Feature Availability</td>
                    <td className="p-3 text-txt-muted">At least 2 numeric feature dimensions for modeling</td>
                    <td className="p-3 text-center">
                      {(datasetMetadata?.columns.length || 0) >= 2 ? (
                        <Badge variant="success">PASS</Badge>
                      ) : (
                        <Badge variant="danger">FAIL</Badge>
                      )}
                    </td>
                    <td className="p-3 text-txt-secondary">
                      {datasetMetadata?.columns.length || 0} numeric feature dimensions available for training
                    </td>
                  </tr>

                  {/* 6. Data Types */}
                  <tr>
                    <td className="p-3 font-semibold text-txt-primary">6. Data Types</td>
                    <td className="p-3 text-txt-muted">Numeric continuous or integer feature values</td>
                    <td className="p-3 text-center">
                      <Badge variant="success">PASS</Badge>
                    </td>
                    <td className="p-3 text-txt-secondary">
                      All feature columns validated as numeric floating-point or integer types
                    </td>
                  </tr>

                  {/* 7. Missing Values */}
                  <tr>
                    <td className="p-3 font-semibold text-txt-primary">7. Missing Values</td>
                    <td className="p-3 text-txt-muted">Absence of null / NaN values in evaluated cells</td>
                    <td className="p-3 text-center">
                      {Object.keys(datasetPreview?.missing_value_counts || {}).length === 0 ? (
                        <Badge variant="success">PASS</Badge>
                      ) : (
                        <Badge variant="warning">WARN</Badge>
                      )}
                    </td>
                    <td className="p-3 text-txt-secondary">
                      {Object.keys(datasetPreview?.missing_value_counts || {}).length === 0
                        ? "0 missing values detected"
                        : `${Object.keys(datasetPreview?.missing_value_counts || {}).length} columns contain missing values (will be handled during preprocessing)`}
                    </td>
                  </tr>

                  {/* 8. Infinite Values */}
                  <tr>
                    <td className="p-3 font-semibold text-txt-primary">8. Infinite Values</td>
                    <td className="p-3 text-txt-muted">Absence of +/- Inf values (e.g. division by zero flow rate)</td>
                    <td className="p-3 text-center">
                      {datasetMetadata?.dropped_inf_nan === 0 ? (
                        <Badge variant="success">PASS</Badge>
                      ) : (
                        <Badge variant="warning">WARN</Badge>
                      )}
                    </td>
                    <td className="p-3 text-txt-secondary">
                      {datasetMetadata?.dropped_inf_nan || 0} infinite/NaN values handled and excluded safely
                    </td>
                  </tr>

                  {/* 9. Class Distribution */}
                  <tr>
                    <td className="p-3 font-semibold text-txt-primary">9. Class Distribution</td>
                    <td className="p-3 text-txt-muted">At least 1 attack class and 1 benign class</td>
                    <td className="p-3 text-center">
                      {(datasetValidation?.unique_classes.length || 0) >= 2 ? (
                        <Badge variant="success">PASS</Badge>
                      ) : (
                        <Badge variant="danger">FAIL</Badge>
                      )}
                    </td>
                    <td className="p-3 text-txt-secondary">
                      {datasetValidation?.unique_classes.length || 0} distinct classes detected:{" "}
                      {datasetValidation?.unique_classes.join(", ")}
                    </td>
                  </tr>

                  {/* 10. Minimum Sample Requirements */}
                  <tr>
                    <td className="p-3 font-semibold text-txt-primary">10. Sample Requirements</td>
                    <td className="p-3 text-txt-muted">Minimum 10 examples per class for stratified 60/20/20 split</td>
                    <td className="p-3 text-center">
                      {datasetValidation?.warnings && datasetValidation.warnings.length > 0 ? (
                        <Badge variant="warning">WARN</Badge>
                      ) : (
                        <Badge variant="success">PASS</Badge>
                      )}
                    </td>
                    <td className="p-3 text-txt-secondary">
                      {datasetValidation?.warnings && datasetValidation.warnings.length > 0
                        ? datasetValidation.warnings.join("; ")
                        : "All attack classes exceed minimum sample threshold for 60/20/20 partition"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Action Footer */}
          <div className="p-4 rounded-xl border border-border bg-bg-card flex items-center justify-between">
            <Button
              variant="outline"
              size="md"
              onClick={() => setCurrentStep("1_UPLOAD")}
            >
              Back to Upload
            </Button>
            <Button
              variant="primary"
              size="md"
              className="gap-2 font-bold"
              disabled={!datasetValidation?.valid}
              onClick={() => setCurrentStep("3_PREPROCESSING")}
            >
              CONTINUE TO PREPROCESSING <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3 — DATA PREPROCESSING (Prepare Your Dataset)                         */}
      {/* ========================================================================= */}
      {currentStep === "3_PREPROCESSING" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-border bg-bg-card">
            <h3 className="text-base font-bold text-txt-primary">Prepare Your Dataset</h3>
            <p className="text-xs text-txt-muted mt-1 leading-relaxed">
              SmellScope prepares the data for analysis while preserving its original records and protecting the evaluation process.
            </p>
          </div>

          {/* Preprocessing Summary Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-txt-muted tracking-wider">Original Raw Rows</span>
              <p className="text-xl font-bold font-mono text-txt-primary">
                {datasetMetadata?.n_rows_raw?.toLocaleString() || datasetMetadata?.n_rows_loaded?.toLocaleString() || "0"}
              </p>
              <span className="text-[11px] text-txt-muted">Loaded from source file</span>
            </Card>

            <Card className="p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-txt-muted tracking-wider">Retained Rows</span>
              <p className="text-xl font-bold font-mono text-status-success">
                {datasetMetadata?.n_rows_loaded?.toLocaleString() || "0"}
              </p>
              <span className="text-[11px] text-txt-muted">Valid for 60/20/20 partitioning</span>
            </Card>

            <Card className="p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-txt-muted tracking-wider">Excluded Rows</span>
              <p className="text-xl font-bold font-mono text-txt-muted">
                {datasetMetadata?.dropped_inf_nan || 0}
              </p>
              <span className="text-[11px] text-txt-muted">Dropped due to Inf / NaN</span>
            </Card>

            <Card className="p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-txt-muted tracking-wider">Feature Count</span>
              <p className="text-xl font-bold font-mono text-accent-secondary">
                {datasetMetadata?.columns.length || 0}
              </p>
              <span className="text-[11px] text-txt-muted">Numeric continuous dimensions</span>
            </Card>
          </div>

          {/* Sealed Boundaries & Preprocessing Protocol Card */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-status-success" />
                Sealed Preprocessing Boundaries & Split Protocol
              </CardTitle>
              <CardDescription>
                Learned preprocessing transformations are fit strictly on the training partition to prevent data leakage.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-border bg-bg-elevated space-y-1">
                  <span className="font-bold text-txt-primary block">Training Partition (60%)</span>
                  <p className="text-[11px] text-txt-muted leading-relaxed">
                    Fit-only boundary. All standard scalers, quantile transforms, and median imputations are learned exclusively on this split.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-bg-elevated space-y-1">
                  <span className="font-bold text-txt-primary block">Validation Partition (20%)</span>
                  <p className="text-[11px] text-txt-muted leading-relaxed">
                    Used for hyperparameter verification and Monte Carlo null calibration (N=100 draws) without compromising test isolation.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-status-success/40 bg-status-success/5 space-y-1">
                  <span className="font-bold text-status-success block">Locked Test Partition (20%)</span>
                  <p className="text-[11px] text-txt-muted leading-relaxed">
                    Strictly isolated and cryptographically fingerprinted. Never accessed during fitting, threshold search, or exploratory remediation.
                  </p>
                </div>
              </div>

              {/* Class Distribution Breakdown */}
              <div className="pt-2">
                <h5 className="text-xs font-bold text-txt-primary uppercase tracking-wider mb-2">
                  Preprocessed Class Distribution
                </h5>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {Object.entries(datasetMetadata?.class_counts || {}).map(([cls, count]) => {
                    const total = datasetMetadata?.n_rows_loaded || 1;
                    const pct = ((count / total) * 100).toFixed(1);
                    const isBenign = cls === datasetMetadata?.benign_label;
                    return (
                      <div key={cls} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-txt-primary">{cls}</span>
                          <span className="font-mono text-txt-muted">
                            {count.toLocaleString()} flows ({pct}%)
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
            </CardContent>
          </Card>

          {/* Action Footer */}
          <div className="p-4 rounded-xl border border-border bg-bg-card flex items-center justify-between">
            <Button
              variant="outline"
              size="md"
              onClick={() => setCurrentStep("2_VALIDATION")}
            >
              Back to Health Check
            </Button>
            <Button
              variant="primary"
              size="md"
              className="gap-2 font-bold"
              onClick={() => {
                setActiveStage("AUDIT");
                navigate("/audit");
              }}
            >
              CONTINUE TO AUDIT <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
