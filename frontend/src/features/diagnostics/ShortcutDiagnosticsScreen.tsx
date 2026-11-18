import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Microscope,
  TrendingDown,
  Layers,
  HelpCircle,
  AlertTriangle,
  Grid,
  Activity,
  CheckCircle2,
  Sliders,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MetricCard } from "@/components/ui/MetricCard";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useAuditContext } from "@/stores/AuditContext";
import { api } from "@/api/client";
import { ClassAuditResult, FragilityGridResponse } from "@/types/api";
import { formatPercent } from "@/utils/cn";
import { SfiDecayPlot } from "./SfiDecayPlot";

export const ShortcutDiagnosticsScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    activeRunId,
    selectedClass,
    setSelectedClass,
    setActiveStage,
    latestRunResult,
    setLatestRunResult,
  } = useAuditContext();

  const [activeTab, setActiveTab] = useState<"decay" | "grid" | "taxonomy">("decay");
  const [classData, setClassData] = useState<ClassAuditResult | null>(null);
  const [fragilityGridData, setFragilityGridData] = useState<FragilityGridResponse | null>(null);
  const [loadingGrid, setLoadingGrid] = useState(false);

  const availableClasses = latestRunResult?.classes || [];
  const activeClass = selectedClass || (availableClasses.length > 0 ? availableClasses[0].class : null);

  useEffect(() => {
    if (activeRunId && !latestRunResult) {
      api.getAuditResults(activeRunId).then(setLatestRunResult).catch(console.error);
    }
  }, [activeRunId]);

  useEffect(() => {
    if (activeClass && latestRunResult) {
      const match = latestRunResult.classes.find((c) => c.class === activeClass);
      if (match) {
        setClassData(match);
        if (activeRunId && match.sfi.top_features.length >= 2) {
          const f1 = match.sfi.top_features[0];
          const f2 = match.sfi.top_features[1];
          setLoadingGrid(true);
          api.getFragilityGrid(activeRunId, activeClass, [f1, f2])
            .then(setFragilityGridData)
            .catch(console.error)
            .finally(() => setLoadingGrid(false));
        }
      }
    }
  }, [activeClass, latestRunResult, activeRunId]);

  if (!latestRunResult || availableClasses.length === 0) {
    return (
      <EmptyState
        title="No Audit Diagnostics Available"
        description="Run an audit from Dataset Ingestion to inspect shortcut fragility curves and generalisation gaps."
        actionLabel="Go to Ingestion"
        onAction={() => {
          setActiveStage("INGEST");
          navigate("/ingestion");
        }}
      />
    );
  }

  const sfi = classData?.sfi;
  const ggi = classData?.ggi;
  const baseline = classData?.baseline;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <SectionHeader
        icon={Microscope}
        title="Shortcut Diagnostic Lab"
        description="Investigate null-calibrated Shortcut Fragility Index (SFI), perturbation decay dynamics, and generalisation gaps."
        badge={<EvidenceBadge type="synthetic" />}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setActiveStage("REMEDIATE");
              navigate("/remediation");
            }}
            className="gap-2 text-xs"
          >
            <Sliders className="h-3.5 w-3.5 text-accent-secondary" />
            Remediate Shortcuts
          </Button>
        }
      />

      {/* Class Selector Bar */}
      <div className="flex items-center gap-2 overflow-x-auto p-2 rounded-xl border border-border bg-bg-card scrollbar-thin">
        <span className="text-[11px] font-semibold text-txt-muted uppercase tracking-wider px-2 shrink-0">
          Target Class:
        </span>
        {availableClasses.map((c) => {
          const isSelected = activeClass === c.class;
          return (
            <button
              key={c.class}
              onClick={() => setSelectedClass(c.class)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                isSelected
                  ? "bg-accent-primary text-white shadow-sm shadow-accent-primary/20 border border-accent-primary/40 font-bold"
                  : "bg-bg-elevated/70 text-txt-secondary border border-border hover:bg-bg-elevated hover:text-txt-primary"
              }`}
            >
              <span>{c.class}</span>
              {c.sfi.flag && <span className="h-2 w-2 rounded-full bg-status-block shrink-0" />}
            </button>
          );
        })}
      </div>

      {classData && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              title="Baseline Test F1"
              value={baseline?.f1 !== null && baseline?.f1 !== undefined ? formatPercent(baseline.f1) : "N/A"}
              subtitle={`N=${classData.n} flows (Recall: ${baseline?.tpr !== null && baseline?.tpr !== undefined ? formatPercent(baseline.tpr) : "N/A"})`}
              evidenceType="measured"
              icon={<Activity className="h-4 w-4" />}
            />
            <MetricCard
              title="Shortcut Fragility Index (SFI)"
              value={sfi?.sfi_top !== null && sfi?.sfi_top !== undefined ? sfi.sfi_top.toFixed(3) : "N/A"}
              subtitle={sfi?.flag ? "Triggered suspicion criteria" : "Within null distribution bounds"}
              evidenceType="synthetic"
              icon={<TrendingDown className="h-4 w-4 text-status-warning" />}
            />
            <MetricCard
              title="Null Mean Fragility"
              value={sfi?.sfi_null_mean !== null && sfi?.sfi_null_mean !== undefined ? sfi.sfi_null_mean.toFixed(3) : "N/A"}
              subtitle={`z-score: ${sfi?.z !== null && sfi?.z !== undefined ? sfi.z.toFixed(2) : "N/A"} (${sfi?.n_null_draws || 100} draws)`}
              evidenceType="synthetic"
              icon={<Layers className="h-4 w-4 text-accent-secondary" />}
            />
            <MetricCard
              title="Generalisation Gap (GGI)"
              value={ggi?.gap !== null && ggi?.gap !== undefined ? ggi.gap.toFixed(3) : "N/A"}
              subtitle={`Random: ${ggi?.f1_random !== null && ggi?.f1_random !== undefined ? formatPercent(ggi.f1_random) : "N/A"} vs Group: ${ggi?.f1_grouped !== null && ggi?.f1_grouped !== undefined ? formatPercent(ggi.f1_grouped) : "N/A"}`}
              evidenceType="measured"
              icon={<AlertTriangle className="h-4 w-4 text-status-warning" />}
            />
          </div>

          {/* Diagnostic Tabs */}
          <div className="flex border-b border-border gap-4 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("decay")}
              className={`pb-2.5 transition-all relative ${
                activeTab === "decay"
                  ? "text-accent-secondary font-bold"
                  : "text-txt-muted hover:text-txt-primary"
              }`}
            >
              1. SFI Perturbation Curve
              {activeTab === "decay" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-secondary rounded" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("grid")}
              className={`pb-2.5 transition-all relative ${
                activeTab === "grid"
                  ? "text-accent-secondary font-bold"
                  : "text-txt-muted hover:text-txt-primary"
              }`}
            >
              2. 2D Joint Fragility Grid
              {activeTab === "grid" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-secondary rounded" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("taxonomy")}
              className={`pb-2.5 transition-all relative ${
                activeTab === "taxonomy"
                  ? "text-accent-secondary font-bold"
                  : "text-txt-muted hover:text-txt-primary"
              }`}
            >
              3. Feature Controllability Ranking
              {activeTab === "taxonomy" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-secondary rounded" />
              )}
            </button>
          </div>

          {/* Tab 1: SFI Decay Dynamics */}
          {activeTab === "decay" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader className="py-3 px-4">
                  <div>
                    <CardTitle className="text-sm">
                      Empirical SFI Decay Curve vs Monte Carlo Null Distribution
                    </CardTitle>
                    <CardDescription>
                      Perturbation delta δ ∈ [0, 1] applied to candidate shortcut feature vs 100 Monte Carlo null draws
                    </CardDescription>
                  </div>
                  <EvidenceBadge type="synthetic" />
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {sfi && sfi.fragility_curve.delta.length > 0 ? (
                    <>
                      <SfiDecayPlot
                        deltas={sfi.fragility_curve.delta}
                        recallTop={sfi.fragility_curve.recall_top}
                        recallNullMean={sfi.fragility_curve.recall_null_mean}
                        topFeatureName={sfi.top_features[0] || "Candidate"}
                      />

                      <div className="grid grid-cols-3 gap-2.5 text-xs font-mono">
                        <div className="rounded-lg p-2.5 bg-bg-elevated border border-border">
                          <span className="text-txt-muted block text-[10px] uppercase font-semibold">Excess Fragility</span>
                          <strong className={sfi.flag_conditions.excess_fragility ? "text-status-block" : "text-status-success"}>
                            {sfi.flag_conditions.excess_fragility ? "TRUE (Collapse)" : "FALSE (Stable)"}
                          </strong>
                        </div>
                        <div className="rounded-lg p-2.5 bg-bg-elevated border border-border">
                          <span className="text-txt-muted block text-[10px] uppercase font-semibold">HDF Precondition</span>
                          <strong className={sfi.flag_conditions.hdf_high ? "text-status-warning" : "text-status-success"}>
                            {sfi.flag_conditions.hdf_high ? "HIGH DOMINANCE" : "NORMAL"}
                          </strong>
                        </div>
                        <div className="rounded-lg p-2.5 bg-bg-elevated border border-border">
                          <span className="text-txt-muted block text-[10px] uppercase font-semibold">Category Risk</span>
                          <strong className="text-txt-primary">
                            {sfi.flag_conditions.category_eligible ? "HIGH (Cat A/B)" : "LOW (Context)"}
                          </strong>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="py-12 text-center text-xs text-txt-muted">
                      No fragility curve data available for this class.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Scientific Interpretation Card */}
              <Card elevated className="space-y-4">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-accent-secondary" />
                    Scientific Interpretation
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs text-txt-secondary leading-relaxed">
                  <div className="p-3 rounded-lg border border-border bg-bg-card space-y-1">
                    <strong className="text-txt-primary block text-xs">
                      Sensitivity Diagnostic, Not Causal Proof:
                    </strong>
                    <p className="text-[11px] text-txt-muted">
                      SFI quantifies how rapidly classifier recall collapses when candidate shortcut features are permuted relative to a Monte Carlo null distribution. A high SFI indicates disproportionate reliance.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-bg-card space-y-1">
                    <strong className="text-txt-primary block text-xs">
                      Controllability Risk (Category A):
                    </strong>
                    <p className="text-[11px] text-txt-muted">
                      If the candidate belongs to <strong>Category A</strong> (e.g. Destination Port, Ephemeral Port), an attacker can randomize this attribute during live attack without impacting exploit payloads, completely bypassing detection.
                    </p>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full gap-2 text-xs mt-2"
                    onClick={() => {
                      setActiveStage("REMEDIATE");
                      navigate("/remediation");
                    }}
                  >
                    Proceed to Remediation Lab <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tab 2: 2D Fragility Grid */}
          {activeTab === "grid" && (
            <Card>
              <CardHeader className="py-3 px-4">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Grid className="h-4 w-4 text-accent-secondary" />
                    2D Joint Feature Perturbation Grid
                  </CardTitle>
                  <CardDescription>
                    Joint vulnerability when perturbing top 2 shortcut features simultaneously
                  </CardDescription>
                </div>
                <EvidenceBadge type="synthetic" />
              </CardHeader>
              <CardContent className="p-4">
                {fragilityGridData ? (
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs text-txt-muted">
                      <span>Feature 1: <strong className="text-txt-primary">{fragilityGridData.features[0]}</strong></span>
                      <span>Feature 2: <strong className="text-txt-primary">{fragilityGridData.features[1]}</strong></span>
                    </div>

                    <div className="rounded-xl border border-border bg-bg-card p-4 overflow-x-auto scrollbar-thin">
                      <table className="w-full text-center text-xs font-mono border-collapse">
                        <thead>
                          <tr>
                            <th className="p-2 text-txt-muted font-sans text-xs">δ₁ \ δ₂</th>
                            {fragilityGridData.grid_delta[0]?.map((d, i) => (
                              <th key={i} className="p-2 text-txt-secondary font-semibold">{d.toFixed(1)}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {fragilityGridData.recall.map((row, rIdx) => (
                            <tr key={rIdx}>
                              <td className="p-2 text-txt-secondary font-bold">
                                {fragilityGridData.grid_delta[rIdx]?.[0]?.toFixed(1) || rIdx}
                              </td>
                              {row.map((val, cIdx) => {
                                const num = val ?? 0;
                                const isBaseline = rIdx === 0 && cIdx === 0;
                                const bg = isBaseline
                                  ? "bg-accent-primary/20 text-accent-secondary font-bold"
                                  : num < 0.5
                                  ? "bg-rose-950/50 text-rose-300"
                                  : "bg-emerald-950/40 text-emerald-300";
                                return (
                                  <td key={cIdx} className={`p-2 border border-border/40 ${bg}`}>
                                    {val !== null ? val.toFixed(2) : "N/A"}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-txt-muted">
                    {loadingGrid ? "Computing 2D fragility grid..." : "Requires at least 2 top features."}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tab 3: Feature Controllability Taxonomy Ranking */}
          {activeTab === "taxonomy" && (
            <Card>
              <CardHeader className="py-3 px-4">
                <div>
                  <CardTitle className="text-sm">Feature Controllability Taxonomy Ranking</CardTitle>
                  <CardDescription>
                    Features ranked by single-feature drop and classified into Category A/B/C/D
                  </CardDescription>
                </div>
                <EvidenceBadge type="measured" />
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {sfi && sfi.top_features.map((feat, idx) => {
                  const cat = sfi.categories[idx] || "UNMAPPED";
                  return (
                    <div
                      key={feat}
                      className="rounded-lg border border-border bg-bg-card p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-border-active transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-bold text-txt-primary">
                            #{idx + 1} {feat}
                          </span>
                          <Badge variant={`category${cat}` as any}>CAT {cat}</Badge>
                        </div>
                        <p className="text-xs text-txt-muted">
                          {cat === "A"
                            ? "Category A: Highly Controllable / Trivial Evasion Risk (e.g., Destination Port)"
                            : cat === "B"
                            ? "Category B: Semantic Feature / Behavior Dependent"
                            : "Category C/D: Environmental or Protocol Invariant"}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right font-mono text-xs">
                          <span className="text-txt-muted block text-[10px]">Fragility Index</span>
                          <strong className="text-txt-primary text-sm">
                            {sfi.sfi_top !== null ? sfi.sfi_top.toFixed(3) : "N/A"}
                          </strong>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setActiveStage("REMEDIATE");
                            navigate("/remediation");
                          }}
                          className="text-xs"
                        >
                          Suppress Feature
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
