import React, { useState, useEffect } from "react";
import {
  Microscope,
  TrendingDown,
  Layers,
  HelpCircle,
  AlertTriangle,
  Grid,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { useAuditContext } from "@/stores/AuditContext";
import { api } from "@/api/client";
import { ClassAuditResult, FragilityGridResponse } from "@/types/api";
import { formatPercent } from "@/utils/cn";
import { SfiDecayPlot } from "./SfiDecayPlot";

export const ShortcutDiagnosticsScreen: React.FC = () => {
  const { activeRunId, selectedClass, setSelectedClass, latestRunResult, setLatestRunResult } = useAuditContext();

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
        // Load 2D fragility grid if we have at least 2 top features
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
      <div className="max-w-7xl mx-auto py-16 text-center text-txt-muted space-y-3">
        <Microscope className="h-10 w-10 mx-auto text-txt-muted/50" />
        <h3 className="text-base font-bold text-txt-primary">No Audit Diagnostics Available</h3>
        <p className="text-xs">Run an audit from Ingestion to inspect shortcut fragility curves.</p>
      </div>
    );
  }

  const sfi = classData?.sfi;
  const ggi = classData?.ggi;
  const baseline = classData?.baseline;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header & Class Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-txt-primary flex items-center gap-2">
            <Microscope className="h-6 w-6 text-accent-cyan" />
            Shortcut Diagnostic Lab
          </h2>
          <p className="text-sm text-txt-muted mt-1">
            Investigate null-calibrated Shortcut Fragility Index (SFI), decay dynamics, and generalisation gaps.
          </p>
        </div>

        {/* Class Selector Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {availableClasses.map((c) => {
            const isSelected = activeClass === c.class;
            return (
              <button
                key={c.class}
                onClick={() => setSelectedClass(c.class)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-accent-primary text-white shadow-md shadow-accent-primary/25 border border-accent-primary/50"
                    : "bg-bg-elevated/70 text-txt-secondary border border-border hover:text-txt-primary"
                }`}
              >
                <span>{c.class}</span>
                {c.sfi.flag && <span className="h-2 w-2 rounded-full bg-status-block" />}
              </button>
            );
          })}
        </div>
      </div>

      {classData && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Baseline Test F1"
              value={baseline?.f1 !== null && baseline?.f1 !== undefined ? formatPercent(baseline.f1) : "N/A"}
              subtitle={`N=${classData.n} flows (Recall: ${baseline?.tpr !== null && baseline?.tpr !== undefined ? formatPercent(baseline.tpr) : "N/A"})`}
              icon={<Activity className="h-5 w-5" />}
            />
            <StatCard
              title="Shortcut Fragility Index (SFI)"
              value={sfi?.sfi_top !== null && sfi?.sfi_top !== undefined ? sfi.sfi_top.toFixed(3) : "N/A"}
              subtitle={sfi?.flag ? "Triggered suspicion criteria" : "Within null distribution bounds"}
              icon={<TrendingDown className="h-5 w-5 text-status-warning" />}
            />
            <StatCard
              title="Null Mean Fragility"
              value={sfi?.sfi_null_mean !== null && sfi?.sfi_null_mean !== undefined ? sfi.sfi_null_mean.toFixed(3) : "N/A"}
              subtitle={`z-score: ${sfi?.z !== null && sfi?.z !== undefined ? sfi.z.toFixed(2) : "N/A"} (${sfi?.n_null_draws || 100} draws)`}
              icon={<Layers className="h-5 w-5 text-accent-cyan" />}
            />
            <StatCard
              title="Generalisation Gap (GGI)"
              value={ggi?.gap !== null && ggi?.gap !== undefined ? ggi.gap.toFixed(3) : "N/A"}
              subtitle={`Random: ${ggi?.f1_random !== null && ggi?.f1_random !== undefined ? formatPercent(ggi.f1_random) : "N/A"} vs Group: ${ggi?.f1_grouped !== null && ggi?.f1_grouped !== undefined ? formatPercent(ggi.f1_grouped) : "N/A"}`}
              icon={<AlertTriangle className="h-5 w-5" />}
            />
          </div>

          {/* SFI Decay Curve & Ranking Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Interactive SFI Decay Chart */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm">
                  Empirical SFI Decay Curve vs Monte Carlo Null Distribution
                </CardTitle>
                <CardDescription>
                  Perturbation delta $\delta \in [0, 1]$ applied to candidate shortcut feature vs 100 Monte Carlo draws
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sfi && sfi.fragility_curve.delta.length > 0 ? (
                  <div className="space-y-4">
                    {/* Interactive Plotly SFI Decay Curve */}
                    <SfiDecayPlot
                      deltas={sfi.fragility_curve.delta}
                      recallTop={sfi.fragility_curve.recall_top}
                      recallNullMean={sfi.fragility_curve.recall_null_mean}
                      topFeatureName={sfi.top_features[0] || "Candidate"}
                    />

                    <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                      <div className="rounded p-2.5 bg-bg-card border border-border">
                        <span className="text-txt-muted block text-[10px] uppercase">Excess Fragility</span>
                        <strong className={sfi.flag_conditions.excess_fragility ? "text-status-block" : "text-status-success"}>
                          {sfi.flag_conditions.excess_fragility ? "TRUE (Anomalous Collapse)" : "FALSE"}
                        </strong>
                      </div>
                      <div className="rounded p-2.5 bg-bg-card border border-border">
                        <span className="text-txt-muted block text-[10px] uppercase">HDF Precondition</span>
                        <strong className={sfi.flag_conditions.hdf_high ? "text-status-warning" : "text-status-success"}>
                          {sfi.flag_conditions.hdf_high ? "HIGH DOMINANCE" : "NORMAL"}
                        </strong>
                      </div>
                      <div className="rounded p-2.5 bg-bg-card border border-border">
                        <span className="text-txt-muted block text-[10px] uppercase">Category Eligible</span>
                        <strong className="text-txt-primary">
                          {sfi.flag_conditions.category_eligible ? "YES (Cat A/B)" : "NO"}
                        </strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-txt-muted">
                    No fragility curve data available for this class.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Feature Controllability Taxonomy Ranking */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Candidate Shortcut Ranking</CardTitle>
                <CardDescription>Features ranked by single-feature drop</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {sfi && sfi.top_features.map((feat, idx) => {
                  const cat = sfi.categories[idx] || "UNMAPPED";
                  return (
                    <div
                      key={feat}
                      className="rounded-lg border border-border bg-bg-elevated/40 p-3 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-txt-primary truncate max-w-[150px]" title={feat}>
                          #{idx + 1} {feat}
                        </span>
                        <Badge variant={`category${cat}` as any}>CAT {cat}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-txt-muted font-mono">
                        <span>Fragility: {sfi.sfi_top !== null ? sfi.sfi_top.toFixed(3) : "N/A"}</span>
                        <span>{cat === "A" ? "High Risk Controllable" : cat === "B" ? "Semantic Feature" : "Context"}</span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* 2D Fragility Grid & Interpretation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 2D Fragility Grid */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Grid className="h-4 w-4 text-accent-cyan" />
                  2D Joint Feature Perturbation Grid
                </CardTitle>
                <CardDescription>
                  Joint vulnerability when perturbing top 2 shortcut features simultaneously
                </CardDescription>
              </CardHeader>
              <CardContent>
                {fragilityGridData ? (
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs text-txt-muted">
                      <span>Feature 1: <strong>{fragilityGridData.features[0]}</strong></span>
                      <span>Feature 2: <strong>{fragilityGridData.features[1]}</strong></span>
                    </div>

                    <div className="rounded-xl border border-border bg-bg-card p-4 overflow-x-auto">
                      <table className="w-full text-center text-xs font-mono border-collapse">
                        <thead>
                          <tr>
                            <th className="p-1 text-txt-muted">&delta;₁ \ &delta;₂</th>
                            {fragilityGridData.grid_delta[0]?.map((d, i) => (
                              <th key={i} className="p-1 text-txt-secondary">{d.toFixed(1)}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {fragilityGridData.recall.map((row, rIdx) => (
                            <tr key={rIdx}>
                              <td className="p-1 text-txt-secondary font-bold">
                                {fragilityGridData.grid_delta[rIdx]?.[0]?.toFixed(1) || rIdx}
                              </td>
                              {row.map((val, cIdx) => {
                                const num = val ?? 0;
                                const isBaseline = rIdx === 0 && cIdx === 0;
                                const bg = isBaseline
                                  ? "bg-accent-primary/20 text-accent-cyan font-bold"
                                  : num < 0.5
                                  ? "bg-rose-950/60 text-rose-300"
                                  : "bg-emerald-950/50 text-emerald-300";
                                return (
                                  <td key={cIdx} className={`p-1.5 border border-border/40 ${bg}`}>
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
                  <div className="py-8 text-center text-xs text-txt-muted">
                    {loadingGrid ? "Computing 2D fragility grid..." : "Requires at least 2 top features."}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Scientific Interpretation Panel */}
            <Card elevated>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-accent-primary" />
                  What Does This Finding Mean?
                </CardTitle>
                <CardDescription>Calibrated scientific interpretation guidelines</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-txt-secondary leading-relaxed">
                <div className="p-3 rounded-lg border border-border bg-bg-elevated/40">
                  <strong className="text-txt-primary block mb-1">Sensitivity Diagnostic, Not Causal Proof:</strong>
                  SFI quantifies how abruptly classifier recall degrades when candidate shortcut features are permuted relative to a Monte Carlo null distribution. A high SFI indicates that the model relies disproportionately on this feature, but does not independently prove whether the feature was maliciously crafted or synthetically generated.
                </div>

                <div className="p-3 rounded-lg border border-border bg-bg-elevated/40">
                  <strong className="text-txt-primary block mb-1">Controllability Risk (Category A vs B):</strong>
                  If the top feature belongs to <strong>Category A</strong> (e.g. Destination Port, Ephemeral Port), an attacker can easily randomize or alter this attribute in live deployment without impacting attack functionality, leading to total detection evasion.
                </div>

                <div className="p-3 rounded-lg border border-border bg-bg-elevated/40">
                  <strong className="text-txt-primary block mb-1">Subtype Sensitivity (GGI):</strong>
                  The Generalisation Gap Index evaluates whether the model learned invariant attack behaviors or merely overfitted to specific packet provenance batches.
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
