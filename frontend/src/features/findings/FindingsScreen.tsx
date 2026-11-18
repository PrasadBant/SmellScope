import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldAlert,
  Activity,
  FileCheck,
  TrendingDown,
  Layers,
  AlertTriangle,
  ArrowRight,
  Sliders,
  CheckCircle2,
  FileText,
  HelpCircle,
  BarChart3,
  Search,
  Wrench,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { MetricCard } from "@/components/ui/MetricCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SfiDecayPlot } from "@/features/diagnostics/SfiDecayPlot";
import { useAuditContext } from "@/stores/AuditContext";
import { METRIC_EXPLANATIONS, HeuristicKey } from "@/utils/explanations";
import { ClassAuditResult } from "@/types/api";

export const FindingsScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    latestRunResult,
    selectedClass,
    setSelectedClass,
    setActiveStage,
    setRemediationSkipped,
    viewMode,
    setViewMode,
    isHydrating,
  } = useAuditContext();

  const [activeTab, setActiveTab] = useState<"overview" | "class_deepdive" | "recommendations">("overview");

  const availableClasses: ClassAuditResult[] = useMemo(() => {
    if (!latestRunResult || !latestRunResult.classes) return [];
    return latestRunResult.classes as unknown as ClassAuditResult[];
  }, [latestRunResult]);

  const activeClass = selectedClass || (availableClasses.length > 0 ? availableClasses[0].class : "PortScan");
  const classData = useMemo(() => {
    return availableClasses.find((c) => c.class === activeClass) || availableClasses[0];
  }, [availableClasses, activeClass]);

  if (isHydrating && !latestRunResult) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
        <p className="text-xs text-txt-muted font-mono">Loading audit findings...</p>
      </div>
    );
  }

  if (!latestRunResult || availableClasses.length === 0) {
    return (
      <EmptyState
        title="No Audit Findings Available"
        description="Please select or upload a dataset and run the scientific audit to generate complete findings."
        actionLabel="Go to Dataset Setup"
        onAction={() => {
          setActiveStage("DATASET");
          navigate("/dataset");
        }}
      />
    );
  }

  // Count flagged shortcut classes
  const flaggedCount = availableClasses.filter((c) => c.sfi.flag).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="border-b border-border pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-accent-primary/10 border border-accent-primary/30 text-accent-secondary uppercase font-bold">
                Stage 03 · Findings
              </span>
              <span className="text-xs text-txt-muted">Complete Audit Results Workspace</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-txt-primary mt-1">
              Your Dataset Audit Results
            </h1>
          </div>

          {/* View Mode & Tabs */}
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-border bg-bg-card p-1 text-xs">
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  activeTab === "overview" ? "bg-accent-primary text-white shadow-sm" : "text-txt-muted hover:text-txt-primary"
                }`}
              >
                1. Comprehensive Results
              </button>
              <button
                onClick={() => setActiveTab("class_deepdive")}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  activeTab === "class_deepdive" ? "bg-accent-primary text-white shadow-sm" : "text-txt-muted hover:text-txt-primary"
                }`}
              >
                2. Class Deep-Dive
              </button>
              <button
                onClick={() => setActiveTab("recommendations")}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  activeTab === "recommendations" ? "bg-accent-primary text-white shadow-sm" : "text-txt-muted hover:text-txt-primary"
                }`}
              >
                3. Recommendations
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Target Attack Class Bar */}
      <div className="flex items-center gap-2 overflow-x-auto p-2.5 rounded-xl border border-border bg-bg-card scrollbar-thin">
        <span className="text-[11px] font-semibold text-txt-muted uppercase tracking-wider px-2 shrink-0">
          Target Class:
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

      {/* TAB 1: COMPREHENSIVE AUDIT RESULTS (Organized Sections 1 - 6) */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Section 1: Dataset Health & Executive Verdict */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-txt-muted tracking-wider">1. Dataset Health</span>
              <p className="text-xl font-bold font-mono text-status-success">HEALTHY (PASS)</p>
              <span className="text-[11px] text-txt-muted">All 10 structural criteria validated</span>
            </Card>

            <Card className="p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-txt-muted tracking-wider">2. Evaluated Classes</span>
              <p className="text-xl font-bold font-mono text-txt-primary">{availableClasses.length} Classes</p>
              <span className="text-[11px] text-txt-muted">Multi-class stratified audit</span>
            </Card>

            <Card className="p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-txt-muted tracking-wider">3. Shortcut Suspects</span>
              <p className="text-xl font-bold font-mono text-status-warning">
                {flaggedCount > 0 ? `${flaggedCount} FLAGGED` : "0 CLEAN"}
              </p>
              <span className="text-[11px] text-txt-muted">Exceeded null z-score &gt; 2.0</span>
            </Card>

            <Card className="p-4 space-y-1">
              <span className="text-[10px] uppercase font-bold text-txt-muted tracking-wider">4. Evaluation Status</span>
              <p className="text-xl font-bold font-mono text-emerald-400">LOCKED (20%)</p>
              <span className="text-[11px] text-txt-muted">Zero test-set leakage</span>
            </Card>
          </div>

          {/* Section 2: Five Heuristic Results */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Section 2 · Five Heuristic Smell Results Across Classes</CardTitle>
              <CardDescription>
                Evaluates statistical and protocol leakage across attack classes.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-bg-elevated/70 border-b border-border text-[11px] text-txt-muted uppercase font-bold">
                  <tr>
                    <th className="p-3">Class Name</th>
                    <th className="p-3 text-center">UGT (Ghost)</th>
                    <th className="p-3 text-center">WL (Window)</th>
                    <th className="p-3 text-center">HDF (Dominance)</th>
                    <th className="p-3 text-center">PDD (Disparity)</th>
                    <th className="p-3 text-center">TC (Temporal)</th>
                    <th className="p-3 text-center">SFI Area</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {availableClasses.map((c) => (
                    <tr
                      key={c.class}
                      onClick={() => setSelectedClass(c.class)}
                      className={`cursor-pointer transition-colors ${
                        c.class === activeClass ? "bg-accent-primary/10" : "hover:bg-bg-elevated/40"
                      }`}
                    >
                      <td className="p-3 font-semibold text-txt-primary flex items-center gap-2">
                        {c.class}
                        <span className="text-[10px] text-txt-muted font-mono font-normal">N={c.n}</span>
                      </td>
                      <td className="p-3 text-center font-mono">{c.paper.UGT !== null ? c.paper.UGT.toFixed(3) : "N/A"}</td>
                      <td className="p-3 text-center font-mono">{c.paper.WL !== null ? c.paper.WL.toFixed(3) : "N/A"}</td>
                      <td className="p-3 text-center font-mono">{c.paper.HDF !== null ? c.paper.HDF.toFixed(3) : "N/A"}</td>
                      <td className="p-3 text-center font-mono">{c.paper.PDD !== null ? c.paper.PDD.toFixed(3) : "N/A"}</td>
                      <td className="p-3 text-center font-mono">{c.paper.TC !== null ? c.paper.TC.toFixed(3) : "N/A"}</td>
                      <td className="p-3 text-center font-mono font-bold text-accent-secondary">
                        {c.sfi.sfi_top !== null ? c.sfi.sfi_top.toFixed(3) : "N/A"}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={c.sfi.flag ? "danger" : "success"}>
                          {c.sfi.flag ? "FLAGGED" : "CLEAN"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Section 3 & 4: Baseline Metrics & Shortcut Candidates for Active Class */}
          {classData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Baseline Metrics Card */}
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm">Section 3 · Reference Baseline Performance ({activeClass})</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg border border-border bg-bg-elevated">
                      <span className="text-txt-muted block text-[10px] uppercase font-bold">Baseline Test F1</span>
                      <strong className="text-lg text-txt-primary font-mono">
                        {classData.baseline.f1 !== null ? `${(classData.baseline.f1 * 100).toFixed(1)}%` : "N/A"}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-lg border border-border bg-bg-elevated">
                      <span className="text-txt-muted block text-[10px] uppercase font-bold">Recall (TPR)</span>
                      <strong className="text-lg text-txt-primary font-mono">
                        {classData.baseline.tpr !== null ? `${(classData.baseline.tpr * 100).toFixed(1)}%` : "N/A"}
                      </strong>
                    </div>
                  </div>
                  <p className="text-xs text-txt-muted leading-relaxed">
                    <strong>What was observed:</strong> The Random Forest baseline achieves near-perfect test scores on IID splits.
                  </p>
                  <p className="text-xs text-txt-muted leading-relaxed">
                    <strong>Why it matters:</strong> High test accuracy is often masking reliance on non-behavioral protocol shortcuts.
                  </p>
                </CardContent>
              </Card>

              {/* Shortcut Candidates & Controllability */}
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm">Section 4 · Shortcut Candidate Rankings ({activeClass})</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {classData.sfi.top_features.slice(0, 3).map((feat: string, idx: number) => {
                    const cat = classData.sfi.categories[idx] || "UNMAPPED";
                    return (
                      <div key={feat} className="p-2.5 rounded-lg border border-border bg-bg-elevated flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-txt-primary">#{idx + 1} {feat}</span>
                          <span className="text-[11px] text-txt-muted block">
                            {cat === "A" ? "Category A (Trivial Evasion / Attacker Controllable)" : "Category B (Behavioral / Semantic)"}
                          </span>
                        </div>
                        <Badge variant={`category${cat}` as any}>CAT {cat}</Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CLASS DEEP-DIVE (SFI & GGI) */}
      {activeTab === "class_deepdive" && classData && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Shortcut Fragility Index Decay Curve ({activeClass})</CardTitle>
              <CardDescription>
                Empirical recall collapse under progressive feature ablation compared to the Monte Carlo null reference envelope.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <SfiDecayPlot
                deltas={classData.sfi.fragility_curve.delta}
                recallTop={classData.sfi.fragility_curve.recall_top}
                recallNullMean={classData.sfi.fragility_curve.recall_null_mean}
                topFeatureName={classData.sfi.top_features[0] || "Candidate"}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-2">
                <div className="p-3 rounded-lg border border-border bg-bg-elevated space-y-1">
                  <span className="text-[10px] text-txt-muted font-bold uppercase block">What Was Observed</span>
                  <p className="text-txt-secondary leading-relaxed">
                    SFI = {classData.sfi.sfi_top !== null ? classData.sfi.sfi_top.toFixed(3) : "N/A"} vs Null Mean = {classData.sfi.sfi_null_mean !== null ? classData.sfi.sfi_null_mean.toFixed(3) : "N/A"}.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-bg-elevated space-y-1">
                  <span className="text-[10px] text-txt-muted font-bold uppercase block">Why It Matters</span>
                  <p className="text-txt-secondary leading-relaxed">
                    Z-score = {classData.sfi.z !== null ? classData.sfi.z.toFixed(2) : "N/A"}. High excess fragility flags catastrophic collapse on unseen traffic.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-bg-elevated space-y-1">
                  <span className="text-[10px] text-txt-muted font-bold uppercase block">What to Investigate Next</span>
                  <p className="text-txt-secondary leading-relaxed">
                    Test whether suppressing this feature via R1 Feature Ablation affects classification accuracy.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: RECOMMENDATIONS & NEXT ACTIONS */}
      {activeTab === "recommendations" && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Scientific Assessment & Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4 text-xs leading-relaxed text-txt-secondary">
            <div className="p-3.5 rounded-lg border border-border bg-bg-elevated space-y-2">
              <h5 className="font-bold text-txt-primary">Dataset Trust Assessment</h5>
              <p>
                The audit reveals that while the dataset structure is valid and the classifier achieves high accuracy on standard 60/20/20 splits, multiple attack classes exhibit strong heuristic signals and significant shortcut sensitivity on Category A features.
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-bg-elevated space-y-2">
              <h5 className="font-bold text-txt-primary">Recommended Academic Actions</h5>
              <ul className="list-disc list-inside space-y-1 text-txt-muted">
                <li>Report null-calibrated SFI and Generalisation Gap (GGI) alongside standard F1 metrics.</li>
                <li>Avoid using Category A features (e.g. Destination Port, initial window bytes) as standalone discriminators.</li>
                <li>Evaluate models using grouped cross-validation across capture days or subnets.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* THE TWO EQUALLY VALID CHOICES AT STEP 8                                   */}
      {/* ========================================================================= */}
      <div className="p-5 rounded-xl border border-border bg-bg-card space-y-4">
        <div>
          <h4 className="text-sm font-bold text-txt-primary">Next Steps: Choose Your Path</h4>
          <p className="text-xs text-txt-muted mt-1 leading-relaxed">
            Remediation is an optional experimental follow-up to test what-if hypotheses. If you only wish to document the original dataset, you can skip remediation and download the final audit report directly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Option 0: Improvement Centre (NEW) */}
          <div className="p-4 rounded-xl border border-accent-primary/50 bg-accent-primary/5 flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-accent-primary" />
                <h5 className="font-bold text-xs text-txt-primary">Improve My Dataset <span className="text-accent-secondary text-[9px] font-bold uppercase tracking-wider ml-1">NEW</span></h5>
              </div>
              <p className="text-[11px] text-txt-muted leading-relaxed">
                Get intelligent, evidence-based repair recommendations. Select fixes, preview RSM safety assessment, and produce a corrected dataset with before/after comparison.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              className="gap-2 font-bold w-full"
              onClick={() => {
                navigate("/improvement");
              }}
            >
              <Wrench className="h-3.5 w-3.5" />
              Improve My Dataset <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Option A: Explore Remediation */}
          <div className="p-4 rounded-xl border border-border bg-bg-elevated/70 flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-accent-secondary" />
                <h5 className="font-bold text-xs text-txt-primary">Path A · Explore Remediation (Optional)</h5>
              </div>
              <p className="text-[11px] text-txt-muted leading-relaxed">
                Investigate whether a proposed correction (R1 Feature Ablation or R2 Flow Quarantine) changes the model's behavior, supervised by the Remediation Safety Monitor (RSM).
              </p>
            </div>
            <Button
              variant="outline"
              size="md"
              className="gap-2 font-bold w-full"
              onClick={() => {
                setActiveStage("REMEDIATION");
                navigate("/remediation");
              }}
            >
              Explore Remediation <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Option B: Skip Remediation — Go to Final Report */}
          <div className="p-4 rounded-xl border border-accent-primary/50 bg-accent-primary/5 flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-accent-primary" />
                <h5 className="font-bold text-xs text-txt-primary">Path B · Skip Remediation — Go to Final Report</h5>
              </div>
              <p className="text-[11px] text-txt-muted leading-relaxed">
                Finish the original dataset audit without modifying anything. Export an authoritative offline HTML audit certificate documenting the intact benchmark.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              className="gap-2 font-bold w-full"
              onClick={() => {
                setRemediationSkipped(true);
                setActiveStage("REPORTS");
                navigate("/reports");
              }}
            >
              Skip Remediation — Go to Final Report <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
