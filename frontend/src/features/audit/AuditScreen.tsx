import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Play,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Layers,
  ChevronDown,
  ChevronUp,
  Sliders,
  HelpCircle,
  FileCheck,
  RefreshCw,
  ShieldCheck,
  Info,
  AlertOctagon,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { MetricCard } from "@/components/ui/MetricCard";
import { SfiDecayPlot } from "@/features/diagnostics/SfiDecayPlot";
import { useAuditContext } from "@/stores/AuditContext";
import { api } from "@/api/client";
import { METRIC_EXPLANATIONS, HeuristicKey } from "@/utils/explanations";
import { ClassAuditResult } from "@/types/api";

type AuditSubStep = "4_HEURISTICS" | "5_BASELINE" | "6_SFI" | "7_GGI" | "8_LOGS";

export const AuditScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    activeDatasetId,
    activeRunId,
    setActiveRunId,
    latestRunResult,
    setLatestRunResult,
    selectedClass,
    setSelectedClass,
    setActiveStage,
    auditConfig,
    viewMode,
  } = useAuditContext();

  const [currentStep, setCurrentStep] = useState<AuditSubStep>("4_HEURISTICS");
  const [auditRunning, setAuditRunning] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [logStageFilter, setLogStageFilter] = useState<string>("ALL");
  const [auditProgress, setAuditProgress] = useState<{
    status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED";
    step: number;
    total: number;
    percent: number;
    currentClass: string;
    elapsed: number;
  }>({ status: "PENDING", step: 0, total: 6, percent: 0, currentClass: "Initializing", elapsed: 0 });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showMathDetails, setShowMathDetails] = useState(false);
  const [showPublished, setShowPublished] = useState(false);
  const [publishedData, setPublishedData] = useState<Record<string, any> | null>(null);

  // Available classes in the current run result
  const availableClasses: ClassAuditResult[] = useMemo(() => {
    if (!latestRunResult || !latestRunResult.classes) return [];
    return latestRunResult.classes as unknown as ClassAuditResult[];
  }, [latestRunResult]);

  const activeClass = selectedClass || (availableClasses.length > 0 ? availableClasses[0].class : "PortScan");
  const classData = useMemo(() => {
    return availableClasses.find((c) => c.class === activeClass) || availableClasses[0];
  }, [availableClasses, activeClass]);

  // Load published EuroS&P values for comparison
  useEffect(() => {
    api.getPublishedValues()
      .then((res) => setPublishedData(res.benchmarks))
      .catch((err) => console.error("Failed to load published benchmark values:", err));
  }, []);

  // Fetch structured execution logs
  useEffect(() => {
    if (latestRunResult?.run_id) {
      api.getAuditLogs(latestRunResult.run_id)
        .then(setAuditLogs)
        .catch(() => {});
    }
  }, [latestRunResult?.run_id, currentStep]);

  const handleLaunchAudit = async () => {
    if (!activeDatasetId) return;
    setAuditRunning(true);
    setErrorMsg(null);
    setAuditProgress({
      status: "RUNNING",
      step: 1,
      total: 6,
      percent: 5,
      currentClass: selectedClass || "Initializing",
      elapsed: 0,
    });

    try {
      const startRes = await api.startAudit({
        dataset_id: activeDatasetId,
        seed: auditConfig?.seed ?? 42,
        max_rows_per_class: auditConfig?.maxRows ?? 20000,
      });

      const runId = startRes.run_id;
      setActiveRunId(runId);

      // Poll audit status until completion
      const pollInterval = setInterval(async () => {
        try {
          const st = await api.getAuditStatus(runId);
          setAuditProgress({
            status: st.status as any,
            step: st.current_step,
            total: st.total_steps,
            percent: st.progress_percent,
            currentClass: st.current_class || "Processing",
            elapsed: st.elapsed_seconds,
          });

          if (st.status === "COMPLETED") {
            clearInterval(pollInterval);
            setAuditRunning(false);
            const results = await api.getAuditResults(runId);
            setLatestRunResult(results);
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
      }, 700);
    } catch (err: any) {
      setAuditRunning(false);
      setErrorMsg(err.message || "Failed to start audit");
    }
  };

  const getHeuristicColor = (val: number | null, heur: HeuristicKey) => {
    if (val === null || val === undefined) return "bg-bg-elevated/40 text-txt-muted border-border";
    const info = METRIC_EXPLANATIONS[heur];
    if (val >= info.threshold * 1.5) return "bg-rose-950/40 text-rose-300 border-rose-800/80";
    if (val >= info.threshold) return "bg-amber-950/40 text-amber-300 border-amber-800/80";
    return "bg-emerald-950/40 text-emerald-300 border-emerald-800/80";
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header & Stage Stepper */}
      <div className="border-b border-border pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-accent-primary/10 border border-accent-primary/30 text-accent-secondary uppercase font-bold">
                Stage 02 · Audit
              </span>
              <span className="text-xs text-txt-muted">Smell Analysis, Baseline & Shortcut Diagnostics</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-txt-primary mt-1">
              Scientific Audit & Diagnosis
            </h1>
          </div>

          {/* Sub-step Selector (Steps 4 - 7) */}
          <div className="flex items-center rounded-lg border border-border bg-bg-card p-1 text-xs overflow-x-auto">
            <button
              onClick={() => setCurrentStep("4_HEURISTICS")}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all shrink-0 ${
                currentStep === "4_HEURISTICS"
                  ? "bg-accent-primary text-white shadow-sm"
                  : "text-txt-muted hover:text-txt-primary"
              }`}
            >
              Step 4 · Smells
            </button>
            <button
              onClick={() => setCurrentStep("5_BASELINE")}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all shrink-0 ${
                currentStep === "5_BASELINE"
                  ? "bg-accent-primary text-white shadow-sm"
                  : "text-txt-muted hover:text-txt-primary"
              }`}
            >
              Step 5 · Baseline
            </button>
            <button
              onClick={() => setCurrentStep("6_SFI")}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all shrink-0 ${
                currentStep === "6_SFI"
                  ? "bg-accent-primary text-white shadow-sm"
                  : "text-txt-muted hover:text-txt-primary"
              }`}
            >
              Step 6 · SFI
            </button>
            <button
              onClick={() => setCurrentStep("7_GGI")}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all shrink-0 ${
                currentStep === "7_GGI"
                  ? "bg-accent-primary text-white shadow-sm"
                  : "text-txt-muted hover:text-txt-primary"
              }`}
            >
              Step 7 · GGI
            </button>
            <button
              onClick={() => setCurrentStep("8_LOGS")}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all shrink-0 ${
                currentStep === "8_LOGS"
                  ? "bg-accent-primary text-white shadow-sm"
                  : "text-txt-muted hover:text-txt-primary"
              }`}
            >
              Step 8 · Audit Logs
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl border border-rose-800/80 bg-rose-950/40 text-rose-200 text-xs flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Audit Error</p>
            <p className="leading-relaxed">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Audit Launch / Re-run Banner */}
      <Card className="border-accent-primary/40 bg-accent-primary/5">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-txt-primary flex items-center gap-2">
                <Play className="h-4 w-4 text-accent-secondary fill-current" />
                {latestRunResult ? "Scientific Audit Active" : "Run Scientific Audit on Dataset"}
              </h3>
              <p className="text-xs text-txt-muted">
                Stratified 60/20/20 evaluation, 5 heuristic smell calculations, and Monte Carlo null calibration (N=100 draws).
              </p>
            </div>

            <Button
              variant={latestRunResult ? "secondary" : "primary"}
              size="md"
              className="gap-2 font-bold shrink-0"
              disabled={auditRunning || !activeDatasetId}
              isLoading={auditRunning}
              onClick={handleLaunchAudit}
            >
              <Play className="h-4 w-4 fill-current" />
              {auditRunning
                ? "AUDITING IN PROGRESS..."
                : latestRunResult
                ? "RE-RUN SCIENTIFIC AUDIT"
                : "RUN SCIENTIFIC AUDIT"}
            </Button>
          </div>

          {auditRunning && (
            <div className="rounded-lg bg-bg-card p-4 border border-border space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-accent-primary/20 text-accent-secondary border border-accent-primary/40">
                    {auditProgress.status}
                  </span>
                  <span className="text-txt-primary font-bold">
                    Class: {auditProgress.currentClass}
                  </span>
                </div>
                <span className="text-accent-secondary font-bold font-mono">{auditProgress.percent}%</span>
              </div>
              <div className="w-full bg-bg-elevated rounded-full h-2 overflow-hidden">
                <div
                  className="bg-accent-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(5, auditProgress.percent))}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-txt-muted font-mono">
                <span>Phase {auditProgress.step}/{auditProgress.total}</span>
                <span>{auditProgress.elapsed}s elapsed</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Target Attack Class Selector */}
      {availableClasses.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto p-2.5 rounded-xl border border-border bg-bg-card scrollbar-thin">
          <span className="text-[11px] font-semibold text-txt-muted uppercase tracking-wider px-2 shrink-0">
            Target Attack Class:
          </span>
          {availableClasses.map((c) => {
            const isSelected = activeClass === c.class;
            return (
              <button
                key={c.class}
                onClick={() => setSelectedClass(c.class)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  isSelected
                    ? "bg-accent-primary text-white shadow-sm border border-accent-primary/40 font-bold"
                    : "bg-bg-elevated/70 text-txt-secondary border border-border hover:bg-bg-elevated hover:text-txt-primary"
                }`}
              >
                <span>{c.class}</span>
                {c.sfi.flag && <span className="h-2 w-2 rounded-full bg-status-block shrink-0" />}
              </button>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4 — FIVE DATASET SMELL HEURISTICS                                    */}
      {/* ========================================================================= */}
      {currentStep === "4_HEURISTICS" && classData && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-border bg-bg-card flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-txt-primary">Check Dataset Design Smells</h3>
              <p className="text-xs text-txt-muted mt-1 leading-relaxed">
                These five research-based checks investigate possible weaknesses in benchmark dataset design.
              </p>
            </div>
            <Button
              variant={showPublished ? "cyan" : "outline"}
              size="sm"
              onClick={() => setShowPublished(!showPublished)}
              className="text-xs shrink-0"
            >
              {showPublished ? "Literature Comparison [ON]" : "Compare Published"}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {(["UGT", "WL", "HDF", "PDD", "TC"] as HeuristicKey[]).map((h) => {
              const info = METRIC_EXPLANATIONS[h];
              const val = classData.paper[h];
              const isHighRisk = val !== null && val >= info.threshold;
              const colorClass = getHeuristicColor(val, h);

              return (
                <Card key={h} className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-accent-secondary text-sm">{h}</span>
                    <Badge variant={isHighRisk ? "danger" : "success"}>
                      {isHighRisk ? "HIGH RISK" : "SAFE"}
                    </Badge>
                  </div>

                  <div>
                    <h5 className="font-semibold text-txt-primary text-xs leading-snug">{info.fullName}</h5>
                    <p className="text-[11px] text-txt-muted leading-relaxed line-clamp-2 mt-0.5">
                      {info.simpleDescription}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border/80 flex items-baseline justify-between">
                    <span className="text-[10px] text-txt-muted font-mono uppercase">Score</span>
                    <span className="text-lg font-bold font-mono text-txt-primary">
                      {val !== null && val !== undefined ? val.toFixed(3) : "N/A"}
                    </span>
                  </div>

                  <div className="text-[10px] text-txt-muted flex justify-between">
                    <span>Provenance:</span>
                    <span className="font-mono text-txt-secondary">[measured]</span>
                  </div>

                  {showPublished && publishedData && (
                    <div className="pt-1.5 border-t border-border/60 text-[10px] text-accent-secondary font-mono flex justify-between">
                      <span>EuroS&P 2024:</span>
                      <span>
                        {publishedData["cic-ids-2017"]?.classes?.[activeClass.toLowerCase()]?.[h]?.toFixed(3) || "Ref"}
                      </span>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Action Footer */}
          <div className="p-4 rounded-xl border border-border bg-bg-card flex items-center justify-between">
            <span className="text-xs text-txt-muted">
              Evaluated Class: <strong className="text-txt-primary font-mono">{activeClass}</strong> (N={classData.n} flows)
            </span>
            <Button
              variant="primary"
              size="md"
              className="gap-2 font-bold"
              onClick={() => setCurrentStep("5_BASELINE")}
            >
              CONTINUE TO BASELINE EVALUATION <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 5 — BASELINE RANDOM FOREST MODEL                                     */}
      {/* ========================================================================= */}
      {currentStep === "5_BASELINE" && classData && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-border bg-bg-card">
            <h3 className="text-base font-bold text-txt-primary">Establish Baseline Performance</h3>
            <p className="text-xs text-txt-muted mt-1 leading-relaxed">
              SmellScope trains a reference Random Forest model to understand how the dataset performs before any experimental changes.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="Baseline Accuracy"
              value={classData.baseline.acc !== null ? `${(classData.baseline.acc * 100).toFixed(1)}%` : "N/A"}
              subtitle="Locked holdout test accuracy"
              evidenceType="measured"
              icon={<CheckCircle2 className="h-4 w-4 text-accent-secondary" />}
            />
            <MetricCard
              title="Baseline Test F1"
              value={classData.baseline.f1 !== null ? `${(classData.baseline.f1 * 100).toFixed(1)}%` : "N/A"}
              subtitle={`Harmonic mean (N=${classData.baseline.n_test || classData.n})`}
              evidenceType="measured"
              icon={<Activity className="h-4 w-4 text-status-success" />}
            />
            <MetricCard
              title="Recall (TPR)"
              value={classData.baseline.tpr !== null ? `${(classData.baseline.tpr * 100).toFixed(1)}%` : "N/A"}
              subtitle="True positive rate on attack"
              evidenceType="measured"
              icon={<TrendingDown className="h-4 w-4 text-accent-primary" />}
            />
            <MetricCard
              title="Specificity (TNR)"
              value={classData.baseline.tnr !== null ? `${(classData.baseline.tnr * 100).toFixed(1)}%` : "N/A"}
              subtitle="True negative rate on benign"
              evidenceType="measured"
              icon={<ShieldCheck className="h-4 w-4 text-emerald-400" />}
            />
          </div>

          {/* Train vs. Validation vs. Locked Test Partition Separation */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Partition Metrics Breakdown (Train vs. Val vs. Locked Test)</span>
                <span className="text-[11px] font-normal text-txt-muted">
                  Strict holdout invariance: 60% Train, 20% Val, 20% Test
                </span>
              </CardTitle>
              <CardDescription>
                Never conflate training convergence with generalization. SmellScope evaluates all 3 partitions independently to detect memorization and split leaks.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Train Partition */}
                <div className="p-3.5 rounded-lg border border-border bg-bg-elevated space-y-2">
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <span className="text-xs font-bold text-txt-primary flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                      Train Split (60%)
                    </span>
                    <span className="text-[10px] text-txt-muted uppercase font-mono">Fitting Reference</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-txt-muted block">Accuracy</span>
                      <strong className="text-txt-primary">
                        {classData.baseline.train?.accuracy !== undefined && classData.baseline.train?.accuracy !== null
                          ? `${(classData.baseline.train.accuracy * 100).toFixed(1)}%`
                          : classData.baseline.acc !== null ? `${(classData.baseline.acc * 100).toFixed(1)}%` : "N/A"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-txt-muted block">Macro F1</span>
                      <strong className="text-txt-primary">
                        {classData.baseline.train?.macro_f1 !== undefined && classData.baseline.train?.macro_f1 !== null
                          ? `${(classData.baseline.train.macro_f1 * 100).toFixed(1)}%`
                          : classData.baseline.f1 !== null ? `${(classData.baseline.f1 * 100).toFixed(1)}%` : "N/A"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-txt-muted block">Recall (TPR)</span>
                      <strong className="text-txt-primary">
                        {classData.baseline.train?.tpr !== undefined && classData.baseline.train?.tpr !== null
                          ? `${(classData.baseline.train.tpr * 100).toFixed(1)}%`
                          : classData.baseline.tpr !== null ? `${(classData.baseline.tpr * 100).toFixed(1)}%` : "N/A"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-txt-muted block">ROC-AUC</span>
                      <strong className="text-txt-primary">
                        {classData.baseline.train?.roc_auc !== undefined && classData.baseline.train?.roc_auc !== null
                          ? classData.baseline.train.roc_auc.toFixed(3)
                          : "N/A"}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Validation Partition */}
                <div className="p-3.5 rounded-lg border border-border bg-bg-elevated space-y-2">
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <span className="text-xs font-bold text-txt-primary flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                      Validation Split (20%)
                    </span>
                    <span className="text-[10px] text-txt-muted uppercase font-mono">Tuning Reference</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-txt-muted block">Accuracy</span>
                      <strong className="text-txt-primary">
                        {classData.baseline.val?.accuracy !== undefined && classData.baseline.val?.accuracy !== null
                          ? `${(classData.baseline.val.accuracy * 100).toFixed(1)}%`
                          : "N/A"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-txt-muted block">Macro F1</span>
                      <strong className="text-txt-primary">
                        {classData.baseline.val?.macro_f1 !== undefined && classData.baseline.val?.macro_f1 !== null
                          ? `${(classData.baseline.val.macro_f1 * 100).toFixed(1)}%`
                          : "N/A"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-txt-muted block">Recall (TPR)</span>
                      <strong className="text-txt-primary">
                        {classData.baseline.val?.tpr !== undefined && classData.baseline.val?.tpr !== null
                          ? `${(classData.baseline.val.tpr * 100).toFixed(1)}%`
                          : "N/A"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-txt-muted block">ROC-AUC</span>
                      <strong className="text-txt-primary">
                        {classData.baseline.val?.roc_auc !== undefined && classData.baseline.val?.roc_auc !== null
                          ? classData.baseline.val.roc_auc.toFixed(3)
                          : "N/A"}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Locked Test Partition */}
                <div className="p-3.5 rounded-lg border border-status-success/40 bg-status-success/5 space-y-2">
                  <div className="flex items-center justify-between border-b border-status-success/30 pb-2">
                    <span className="text-xs font-bold text-status-success flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Locked Test Split (20%)
                    </span>
                    <span className="text-[10px] text-status-success/80 uppercase font-mono">Holdout Standard</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-txt-muted block">Accuracy</span>
                      <strong className="text-txt-primary">
                        {classData.baseline.test?.accuracy !== undefined && classData.baseline.test?.accuracy !== null
                          ? `${(classData.baseline.test.accuracy * 100).toFixed(1)}%`
                          : classData.baseline.acc !== null ? `${(classData.baseline.acc * 100).toFixed(1)}%` : "N/A"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-txt-muted block">Macro F1</span>
                      <strong className="text-status-success">
                        {classData.baseline.test?.macro_f1 !== undefined && classData.baseline.test?.macro_f1 !== null
                          ? `${(classData.baseline.test.macro_f1 * 100).toFixed(1)}%`
                          : classData.baseline.f1 !== null ? `${(classData.baseline.f1 * 100).toFixed(1)}%` : "N/A"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-txt-muted block">Recall (TPR)</span>
                      <strong className="text-txt-primary">
                        {classData.baseline.test?.tpr !== undefined && classData.baseline.test?.tpr !== null
                          ? `${(classData.baseline.test.tpr * 100).toFixed(1)}%`
                          : classData.baseline.tpr !== null ? `${(classData.baseline.tpr * 100).toFixed(1)}%` : "N/A"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-txt-muted block">Specificity (TNR)</span>
                      <strong className="text-txt-primary">
                        {classData.baseline.test?.tnr !== undefined && classData.baseline.test?.tnr !== null
                          ? `${(classData.baseline.test.tnr * 100).toFixed(1)}%`
                          : classData.baseline.tnr !== null ? `${(classData.baseline.tnr * 100).toFixed(1)}%` : "N/A"}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 100% ACCURACY — VERIFICATION REQUIRED DIAGNOSTIC PANEL */}
          {classData.baseline?.perfect_accuracy_investigation?.triggered && (
            <Card className="border-amber-500/40 bg-bg-card shadow-lg shadow-amber-950/20">
              <CardHeader className="py-3 px-4 border-b border-border/80 bg-amber-950/20">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-amber-400" />
                    <div>
                      <CardTitle className="text-sm font-bold text-txt-primary">
                        100% Accuracy — Verification Required
                      </CardTitle>
                      <CardDescription className="text-xs text-amber-300/80">
                        Rigorous scientific audit across 14 inspection areas to establish root cause.
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded text-xs font-bold font-mono uppercase tracking-wider border ${
                      classData.baseline.perfect_accuracy_investigation.case === "CASE_D"
                        ? "bg-emerald-950/80 border-emerald-500 text-emerald-300"
                        : classData.baseline.perfect_accuracy_investigation.case === "CASE_B"
                        ? "bg-rose-950/80 border-rose-500 text-rose-300"
                        : classData.baseline.perfect_accuracy_investigation.case === "CASE_A"
                        ? "bg-amber-950/80 border-amber-500 text-amber-300"
                        : "bg-purple-950/80 border-purple-500 text-purple-300"
                    }`}>
                      {classData.baseline.perfect_accuracy_investigation.case.replace("_", " ")}: {classData.baseline.perfect_accuracy_investigation.case_title}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Description & Actionable Recommendation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg border border-border bg-bg-elevated/70">
                    <span className="text-[10px] text-txt-muted uppercase font-bold block mb-1">
                      Scientific Assessment
                    </span>
                    <p className="text-xs text-txt-secondary leading-relaxed">
                      {classData.baseline.perfect_accuracy_investigation.description}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border border-accent-primary/30 bg-accent-primary/5">
                    <span className="text-[10px] text-accent-primary uppercase font-bold block mb-1">
                      Actionable Recommendation
                    </span>
                    <p className="text-xs text-txt-primary leading-relaxed">
                      {classData.baseline.perfect_accuracy_investigation.recommendation}
                    </p>
                  </div>
                </div>

                {/* Key Empirical Findings */}
                {classData.baseline.perfect_accuracy_investigation.findings?.length > 0 && (
                  <div className="p-3 rounded-lg border border-border bg-bg-card">
                    <span className="text-[10px] text-txt-muted uppercase font-bold block mb-2">
                      Key Findings & Evidentiary Indicators
                    </span>
                    <ul className="space-y-1.5 text-xs text-txt-secondary">
                      {classData.baseline.perfect_accuracy_investigation.findings.map((f, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-amber-400 mt-0.5">•</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 14-Dimension Inspection Matrix */}
                <div>
                  <span className="text-[10px] text-txt-muted uppercase font-bold block mb-2">
                    14-Dimension Diagnostic Inspection Matrix
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {Object.entries(classData.baseline.perfect_accuracy_investigation.areas_evaluated || {}).map(
                      ([key, dim]: [string, any]) => {
                        const statusColor =
                          dim.status === "PASS"
                            ? "bg-emerald-950/60 text-emerald-300 border-emerald-700/60"
                            : dim.status === "NORMAL"
                            ? "bg-blue-950/60 text-cyan-300 border-cyan-800/60"
                            : dim.status === "CONCERN"
                            ? "bg-amber-950/60 text-amber-300 border-amber-700/60"
                            : "bg-rose-950/60 text-rose-300 border-rose-700/60";

                        const formattedKey = key
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase());

                        return (
                          <div
                            key={key}
                            className="p-2.5 rounded-lg border border-border bg-bg-elevated/40 flex flex-col justify-between"
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-[11px] font-semibold text-txt-primary truncate">
                                {formattedKey}
                              </span>
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold border uppercase shrink-0 ${statusColor}`}
                              >
                                {dim.status}
                              </span>
                            </div>
                            <p className="text-[10px] text-txt-muted leading-tight line-clamp-2">
                              {dim.detail}
                            </p>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Model Configuration & Sealed Splitting Card */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Reference Classifier Configuration & Evaluation Protocol</CardTitle>
              <CardDescription>
                Trained strictly on training records only (60%). Test records (20%) never used for preprocessing, feature selection, or tuning.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded-lg border border-border bg-bg-elevated">
                  <span className="text-[10px] text-txt-muted block uppercase">Classifier Family</span>
                  <strong className="text-txt-primary text-xs mt-0.5 block">Random Forest (Balanced)</strong>
                </div>
                <div className="p-3 rounded-lg border border-border bg-bg-elevated">
                  <span className="text-[10px] text-txt-muted block uppercase">Tree Estimators</span>
                  <strong className="text-txt-primary text-xs mt-0.5 block">100 Trees (max_depth=None)</strong>
                </div>
                <div className="p-3 rounded-lg border border-border bg-bg-elevated">
                  <span className="text-[10px] text-txt-muted block uppercase">Random Seed</span>
                  <strong className="text-txt-primary text-xs mt-0.5 block">
                    Seed = {classData.meta?.seed ?? auditConfig?.seed ?? 42} (Deterministic)
                  </strong>
                </div>
                <div className="p-3 rounded-lg border border-border bg-bg-elevated">
                  <span className="text-[10px] text-txt-muted block uppercase">Partition Split</span>
                  <strong className="text-status-success text-xs mt-0.5 block">60/20/20 Stratified</strong>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Footer */}
          <div className="p-4 rounded-xl border border-border bg-bg-card flex items-center justify-between">
            <Button
              variant="outline"
              size="md"
              onClick={() => setCurrentStep("4_HEURISTICS")}
            >
              Back to Smells
            </Button>
            <Button
              variant="primary"
              size="md"
              className="gap-2 font-bold"
              onClick={() => setCurrentStep("6_SFI")}
            >
              CONTINUE TO SHORTCUT ANALYSIS <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 6 — SHORTCUT FRAGILITY INDEX (SFI)                                   */}
      {/* ========================================================================= */}
      {currentStep === "6_SFI" && classData && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-border bg-bg-card">
            <h3 className="text-base font-bold text-txt-primary">Investigate Shortcut Sensitivity</h3>
            <p className="text-xs text-txt-muted mt-1 leading-relaxed">
              SmellScope investigates how sensitive the model is to changes in selected features.
            </p>
          </div>

          {/* NA Reason Alert if SFI was not applicable */}
          {(classData.na_reasons?.["sfi"] || classData.na_reasons?.["sfi.recall_baseline"]) && (
            <div className="p-4 rounded-xl border border-amber-800/80 bg-amber-950/30 text-amber-200 text-xs flex items-start gap-3">
              <Info className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">SFI Evaluation Notice (Not Applicable)</p>
                <p className="leading-relaxed">
                  {classData.na_reasons["sfi"] || classData.na_reasons["sfi.recall_baseline"]}
                </p>
              </div>
            </div>
          )}

          {/* SFI Zero-finding State vs Flagged State Banner */}
          {!classData.sfi.flag && !(classData.na_reasons?.["sfi"] || classData.na_reasons?.["sfi.recall_baseline"]) && (
            <div className="p-4 rounded-xl border border-emerald-800/80 bg-emerald-950/30 text-emerald-200 text-xs flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">No Significant Shortcut Candidates Detected Under Current SFI Configuration</p>
                <p className="leading-relaxed">
                  Perturbation across candidate features did not trigger excessive recall collapse relative to the Monte Carlo null distribution (z = {classData.sfi.z !== null ? classData.sfi.z.toFixed(2) : "0.00"} &lt; 2.0). The model demonstrates gradual, graceful degradation rather than artificial shortcut dependency.
                </p>
              </div>
            </div>
          )}

          {classData.sfi.flag && (
            <div className="p-4 rounded-xl border border-rose-800/80 bg-rose-950/30 text-rose-200 text-xs flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Significant Shortcut Sensitivity Detected</p>
                <p className="leading-relaxed">
                  Model demonstrates excessive recall collapse upon perturbing feature "{classData.sfi.top_features[0]}" (z = {classData.sfi.z !== null ? classData.sfi.z.toFixed(2) : "N/A"} &ge; 2.0). This indicates severe predictive dependency on a dataset-specific artifact.
                </p>
              </div>
            </div>
          )}

          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="Shortcut Fragility Index (SFI)"
              value={classData.sfi.sfi_top !== null ? classData.sfi.sfi_top.toFixed(3) : "N/A"}
              subtitle={classData.sfi.flag ? "Suspicion criteria triggered" : "Within null bounds"}
              evidenceType="synthetic"
              icon={<TrendingDown className="h-4 w-4 text-status-warning" />}
            />
            <MetricCard
              title="Null Mean Fragility"
              value={classData.sfi.sfi_null_mean !== null ? classData.sfi.sfi_null_mean.toFixed(3) : "N/A"}
              subtitle={`z-score: ${classData.sfi.z !== null ? classData.sfi.z.toFixed(2) : "N/A"} (N=100 draws)`}
              evidenceType="synthetic"
              icon={<Layers className="h-4 w-4 text-accent-secondary" />}
            />
            <MetricCard
              title="Excess Fragility"
              value={classData.sfi.flag_conditions?.excess_fragility ? "DETECTED" : "NORMAL"}
              subtitle={classData.sfi.flag_conditions?.excess_fragility ? "Model collapses on perturbation" : "Gradual graceful degradation"}
              evidenceType="synthetic"
              icon={<Activity className="h-4 w-4 text-accent-primary" />}
            />
            <MetricCard
              title="Top Candidate Feature"
              value={classData.sfi.top_features[0] || "None"}
              subtitle={`Controllability Category ${classData.sfi.categories[0] || "N/A"}`}
              evidenceType="synthetic"
              icon={<Sliders className="h-4 w-4 text-emerald-400" />}
            />
          </div>

          {/* Evaluated Shortcut Candidates Table */}
          {classData.sfi.top_features.length > 0 && (
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">Evaluated Shortcut Feature Candidates & Statistical Evidence</CardTitle>
                <CardDescription>
                  Permutation importance ranking on validation partition, evaluated under controlled test-set perturbation.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-bg-elevated/70 border-b border-border text-[11px] text-txt-muted uppercase font-bold">
                    <tr>
                      <th className="p-3">Candidate Feature</th>
                      <th className="p-3">Controllability Category</th>
                      <th className="p-3 text-center">Observed SFI</th>
                      <th className="p-3 text-center">Null Mean (μ_null)</th>
                      <th className="p-3 text-center">z-Score</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono">
                    {classData.sfi.top_features.map((feat, idx) => {
                      const cat = classData.sfi.categories[idx] || "UNMAPPED";
                      const isTop = idx === 0;
                      return (
                        <tr key={feat} className={isTop ? "bg-accent-primary/5" : ""}>
                          <td className="p-3 font-semibold text-txt-primary flex items-center gap-2">
                            <span>{feat}</span>
                            {isTop && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-primary/20 text-accent-secondary border border-accent-primary/40 font-bold">
                                Top Candidate
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-txt-secondary">
                            Category {cat}
                          </td>
                          <td className="p-3 text-center text-txt-primary font-bold">
                            {isTop && classData.sfi.sfi_top !== null ? classData.sfi.sfi_top.toFixed(3) : "—"}
                          </td>
                          <td className="p-3 text-center text-txt-muted">
                            {classData.sfi.sfi_null_mean !== null ? classData.sfi.sfi_null_mean.toFixed(3) : "—"}
                          </td>
                          <td className="p-3 text-center text-txt-secondary font-bold">
                            {isTop && classData.sfi.z !== null ? classData.sfi.z.toFixed(2) : "—"}
                          </td>
                          <td className="p-3 text-center">
                            {isTop && classData.sfi.flag ? (
                              <Badge variant="danger">FLAGGED</Badge>
                            ) : (
                              <Badge variant="success">SAFE</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* SFI Decay Curve & Interactive Plotly Chart */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">
                SFI Decay Curve vs Monte Carlo Null Distribution
              </CardTitle>
              <CardDescription>
                Comparing model recall collapse under perturbation of candidate feature (
                <strong className="text-txt-primary">{classData.sfi.top_features[0] || "Candidate"}</strong>
                ) against 100 random feature draws.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {classData.sfi.fragility_curve.delta.length > 0 ? (
                <SfiDecayPlot
                  deltas={classData.sfi.fragility_curve.delta}
                  recallTop={classData.sfi.fragility_curve.recall_top}
                  recallNullMean={classData.sfi.fragility_curve.recall_null_mean}
                  topFeatureName={classData.sfi.top_features[0] || "Candidate"}
                />
              ) : (
                <div className="py-12 text-center text-xs text-txt-muted">
                  No decay curve data available for this class.
                </div>
              )}

              {/* Expandable Mathematical Details */}
              <div className="pt-2 border-t border-border">
                <button
                  onClick={() => setShowMathDetails(!showMathDetails)}
                  className="flex items-center justify-between w-full text-xs font-semibold text-txt-muted hover:text-txt-primary py-1"
                >
                  <span className="flex items-center gap-1.5">
                    <HelpCircle className="h-3.5 w-3.5 text-accent-secondary" />
                    Expandable Mathematical Details & Scientific Interpretation
                  </span>
                  {showMathDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showMathDetails && (
                  <div className="pt-3 text-xs text-txt-muted space-y-2 leading-relaxed bg-bg-elevated/40 p-3 rounded-lg mt-2">
                    <p>
                      <strong>Mathematical Formulation:</strong> Fragility Area = ∫₀¹ [Recall(M, D) - Recall(M, D̃_j(δ))] dδ, evaluated over perturbation levels δ ∈ [0, 1].
                    </p>
                    <p>
                      <strong>Null Distribution:</strong> 100 random feature subsets drawn with replacement from the non-shortcut feature pool to establish empirical null mean (μ_null) and standard deviation (σ_null).
                    </p>
                    <p>
                      <strong>Scientific Caveat:</strong> Feature sensitivity indicates high predictive reliance under tested conditions, but does not provide standalone causal proof of artificial data contamination without domain protocol validation.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Footer */}
          <div className="p-4 rounded-xl border border-border bg-bg-card flex items-center justify-between">
            <Button
              variant="outline"
              size="md"
              onClick={() => setCurrentStep("5_BASELINE")}
            >
              Back to Baseline
            </Button>
            <Button
              variant="primary"
              size="md"
              className="gap-2 font-bold"
              onClick={() => setCurrentStep("7_GGI")}
            >
              CONTINUE TO GENERALISATION ANALYSIS <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 7 — GENERALISATION GAP INDEX (GGI)                                   */}
      {/* ========================================================================= */}
      {currentStep === "7_GGI" && classData && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-border bg-bg-card">
            <h3 className="text-base font-bold text-txt-primary">Test Model Generalisation</h3>
            <p className="text-xs text-txt-muted mt-1 leading-relaxed">
              SmellScope examines whether performance remains consistent under the supported evaluation conditions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 space-y-2">
              <span className="text-[10px] uppercase font-bold text-txt-muted tracking-wider">
                Random IID Split F1
              </span>
              <p className="text-2xl font-bold font-mono text-txt-primary">
                {classData.ggi.f1_random !== null ? `${(classData.ggi.f1_random * 100).toFixed(1)}%` : "N/A"}
              </p>
              <span className="text-[11px] text-txt-muted leading-relaxed block">
                Standard stratified test split where attack instances are randomly mixed.
              </span>
            </Card>

            <Card className="p-4 space-y-2">
              <span className="text-[10px] uppercase font-bold text-txt-muted tracking-wider">
                Grouped / Subtype Split F1
              </span>
              <p className="text-2xl font-bold font-mono text-accent-secondary">
                {classData.ggi.f1_grouped !== null ? `${(classData.ggi.f1_grouped * 100).toFixed(1)}%` : "N/A"}
              </p>
              <span className="text-[11px] text-txt-muted leading-relaxed block">
                Evaluation on held-out attack tool variants or recording capture blocks.
              </span>
            </Card>

            <Card className="p-4 space-y-2">
              <span className="text-[10px] uppercase font-bold text-txt-muted tracking-wider">
                Generalisation Gap Index (GGI)
              </span>
              <p className="text-2xl font-bold font-mono text-status-warning">
                {classData.ggi.gap !== null ? classData.ggi.gap.toFixed(3) : "N/A"}
              </p>
              <span className="text-[11px] text-txt-muted leading-relaxed block">
                Performance drop: max(0, F1_random - F1_grouped).
              </span>
            </Card>
          </div>

          {/* GGI Interpretation Card */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">GGI Generalisation Evaluation & Provenance</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="p-3.5 rounded-lg border border-border bg-bg-elevated flex items-start gap-3">
                <Info className="h-4 w-4 text-accent-secondary shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-txt-primary">Interpretation & Scientific Benchmark Meaning</p>
                  <p className="text-txt-muted leading-relaxed">
                    {classData.ggi.gap === null || classData.ggi.gap === undefined
                      ? "GGI is N/A for this class because single attack tool variants cannot be partitioned into disjoint subtypes."
                      : classData.ggi.gap <= 0.05
                      ? "Robust Generalization (GGI <= 0.05): Model maintains consistent predictive performance across unseen tool variants."
                      : classData.ggi.gap <= 0.20
                      ? "Moderate Generalization Gap (0.05 < GGI < 0.20): Model exhibits minor sensitivity to attack variation."
                      : "Severe Generalization Collapse (GGI >= 0.20): Model relies heavily on specific testbed capture artifacts and fails on novel subtypes."}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-txt-muted font-mono pt-1">
                <span>Evidence Provenance: [measured]</span>
                <span>Grouping Strategy: {classData.ggi.grouping || "Subtype cluster partition"}</span>
              </div>
            </CardContent>
          </Card>

          {/* Action Footer */}
          <div className="p-4 rounded-xl border border-border bg-bg-card flex items-center justify-between">
            <Button
              variant="outline"
              size="md"
              onClick={() => setCurrentStep("6_SFI")}
            >
              Back to SFI
            </Button>
            <Button
              variant="primary"
              size="md"
              className="gap-2 font-bold"
              onClick={() => {
                setActiveStage("FINDINGS");
                navigate("/findings");
              }}
            >
              VIEW AUDIT FINDINGS <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SINGLE-CLASS DATASET MODE NOTICE (When no attack classes present)         */}
      {/* ========================================================================= */}
      {latestRunResult && (latestRunResult.is_single_class || availableClasses.length === 0) && currentStep !== "8_LOGS" && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl border border-cyan-500/40 bg-cyan-950/20 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="info">SINGLE-CLASS BENCHMARK MODE</Badge>
                <h4 className="text-sm font-bold text-txt-primary">
                  "{latestRunResult.dataset?.benign_label || "BENIGN"}"-Only Traffic Profile
                </h4>
              </div>
              <span className="text-xs font-mono text-cyan-300">
                Run ID: {latestRunResult.run_id}
              </span>
            </div>

            <p className="text-xs text-txt-secondary leading-relaxed">
              This dataset contains only one class. Technical Data Quality (<code className="font-mono text-cyan-300">S_DQ</code>) profiling, missing/infinite value scans, duplicate row detection, and feature distributions are fully active. Supervised classification ML benchmarks, Shortcut Fragility Index (SFI), Generalization Gap Index (GGI), and attack heuristics (UGT, WL, HDF, PDD, TC) are marked <strong className="text-txt-primary">NOT APPLICABLE</strong> because there is no attack class to distinguish from benign traffic.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <Card className="p-4 space-y-3 bg-bg-card/70 border-border">
                <h5 className="text-xs font-bold text-txt-primary uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Evaluated Diagnostics (Available)
                </h5>
                <ul className="space-y-1.5 text-xs text-txt-secondary font-mono text-[11px]">
                  <li className="flex items-center justify-between">
                    <span>Missing Values & Null Counts:</span>
                    <Badge variant="success">EVALUATED</Badge>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>IEEE 754 Infinite (+/-Inf):</span>
                    <Badge variant="success">EVALUATED</Badge>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Duplicate Flow Vectors:</span>
                    <Badge variant="success">EVALUATED</Badge>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Zero-Variance Constants:</span>
                    <Badge variant="success">EVALUATED</Badge>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Feature Quartile Distributions:</span>
                    <Badge variant="success">EVALUATED</Badge>
                  </li>
                </ul>
              </Card>

              <Card className="p-4 space-y-3 bg-bg-card/70 border-border">
                <h5 className="text-xs font-bold text-txt-primary uppercase tracking-wider flex items-center gap-2">
                  <Info className="h-4 w-4 text-txt-muted" />
                  Attack Diagnostics (Not Applicable)
                </h5>
                <ul className="space-y-1.5 text-xs text-txt-secondary font-mono text-[11px]">
                  <li className="flex items-center justify-between">
                    <span>UGT Ephemeral Port Heuristic:</span>
                    <Badge variant="default">NOT APPLICABLE</Badge>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>WL Packet Length Repetition:</span>
                    <Badge variant="default">NOT APPLICABLE</Badge>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>HDF Feature Dominance:</span>
                    <Badge variant="default">NOT APPLICABLE</Badge>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Shortcut Fragility Index (SFI):</span>
                    <Badge variant="default">NOT APPLICABLE</Badge>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Supervised ML Classification:</span>
                    <Badge variant="default">NOT APPLICABLE</Badge>
                  </li>
                </ul>
              </Card>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setActiveStage("FINDINGS");
                  navigate("/findings");
                }}
              >
                VIEW FINDINGS & SCORES <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => setCurrentStep("8_LOGS")}
              >
                Inspect Audit Execution Logs
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 8 — STRUCTURED AUDIT EXECUTION LOGS & TRACEABILITY                    */}
      {/* ========================================================================= */}
      {currentStep === "8_LOGS" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-border bg-bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-txt-primary">Audit Execution Logs & Traceability</h3>
              <p className="text-xs text-txt-muted mt-1 leading-relaxed">
                Chronological audit trial tracking ingestion, validation, partition splits, heuristic timings, and diagnostic results.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-txt-muted">Filter Stage:</span>
              <select
                value={logStageFilter}
                onChange={(e) => setLogStageFilter(e.target.value)}
                className="rounded border border-border bg-bg-elevated px-2.5 py-1 text-xs font-mono text-txt-primary focus:border-accent-primary focus:outline-none"
              >
                <option value="ALL">All Stages</option>
                <option value="INGESTION">INGESTION</option>
                <option value="VALIDATION">VALIDATION</option>
                <option value="SPLIT">SPLIT</option>
                <option value="CLASS_AUDIT">CLASS_AUDIT</option>
                <option value="COMPLETION">COMPLETION</option>
              </select>
            </div>
          </div>

          <Card className="overflow-hidden">
            <CardHeader className="py-3 px-4 border-b border-border bg-bg-elevated/40">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-txt-primary">
                  Execution Log Entries ({auditLogs.filter((l) => logStageFilter === "ALL" || l.stage === logStageFilter).length})
                </span>
                <span className="font-mono text-txt-muted text-[11px]">
                  Run ID: {latestRunResult?.run_id || activeRunId || "N/A"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              {auditLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-txt-muted">
                  No execution logs recorded yet. Launch a scientific audit to view the live execution trail.
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-bg-elevated/70 border-b border-border text-[11px] text-txt-muted uppercase font-bold">
                    <tr>
                      <th className="p-3">Timestamp (UTC)</th>
                      <th className="p-3">Stage</th>
                      <th className="p-3 text-center">Level</th>
                      <th className="p-3">Operation / Message</th>
                      <th className="p-3 text-right">Duration</th>
                      <th className="p-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono text-[11px]">
                    {auditLogs
                      .filter((l) => logStageFilter === "ALL" || l.stage === logStageFilter)
                      .map((log, idx) => (
                        <tr key={idx} className="hover:bg-bg-elevated/40 transition-colors">
                          <td className="p-3 text-txt-muted whitespace-nowrap">
                            {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "--"}
                          </td>
                          <td className="p-3 font-semibold text-accent-secondary">
                            {log.stage}
                          </td>
                          <td className="p-3 text-center">
                            <Badge
                              variant={
                                log.level === "ERROR"
                                  ? "danger"
                                  : log.level === "WARN"
                                  ? "warning"
                                  : "success"
                              }
                            >
                              {log.level}
                            </Badge>
                          </td>
                          <td className="p-3 text-txt-primary font-sans font-medium">
                            {log.operation}
                          </td>
                          <td className="p-3 text-right text-txt-muted whitespace-nowrap">
                            {log.duration_ms !== undefined ? `${log.duration_ms} ms` : "--"}
                          </td>
                          <td className="p-3 text-txt-secondary max-w-xs truncate text-[10px]">
                            {log.details ? JSON.stringify(log.details) : "--"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Action Footer */}
          <div className="p-4 rounded-xl border border-border bg-bg-card flex items-center justify-between">
            <Button
              variant="outline"
              size="md"
              onClick={() => setCurrentStep("4_HEURISTICS")}
            >
              Back to Overview
            </Button>
            <Button
              variant="primary"
              size="md"
              className="gap-2 font-bold"
              onClick={() => {
                setActiveStage("FINDINGS");
                navigate("/findings");
              }}
            >
              VIEW AUDIT FINDINGS <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
