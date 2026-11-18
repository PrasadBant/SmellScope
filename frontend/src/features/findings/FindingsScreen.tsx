import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Microscope,
  Grid3X3,
  TrendingDown,
  Layers,
  HelpCircle,
  AlertTriangle,
  Sliders,
  FileText,
  ArrowRight,
  ExternalLink,
  Table as TableIcon,
  Search,
  Activity,
  CheckCircle2,
  Info,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { MetricCard } from "@/components/ui/MetricCard";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useAuditContext } from "@/stores/AuditContext";
import { api } from "@/api/client";
import { ClassAuditResult, FragilityGridResponse } from "@/types/api";
import { formatPercent } from "@/utils/cn";
import { SfiDecayPlot } from "@/features/diagnostics/SfiDecayPlot";
import { METRIC_EXPLANATIONS } from "@/utils/explanations";

type HeuristicKey = "UGT" | "WL" | "HDF" | "PDD" | "TC";

export const FindingsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    activeRunId,
    selectedClass,
    setSelectedClass,
    setActiveStage,
    latestRunResult,
    setLatestRunResult,
    viewMode,
    setViewMode,
  } = useAuditContext();

  // Tab management (query param or state)
  const initialTab = searchParams.get("tab") || "matrix";
  const [activeTab, setActiveTab] = useState<"matrix" | "diagnostics" | "taxonomy">(
    initialTab === "diagnostics" ? "diagnostics" : "matrix"
  );

  const [classData, setClassData] = useState<ClassAuditResult | null>(null);
  const [fragilityGridData, setFragilityGridData] = useState<FragilityGridResponse | null>(null);
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [showPublished, setShowPublished] = useState(false);
  const [publishedData, setPublishedData] = useState<Record<string, any> | null>(null);
  const [matrixViewType, setMatrixViewType] = useState<"heatmap" | "table">("heatmap");
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredCell, setHoveredCell] = useState<{ cls: string; heur: HeuristicKey } | null>(null);

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

  useEffect(() => {
    if (showPublished && !publishedData) {
      api.getPublishedValues()
        .then((res) => setPublishedData(res.benchmarks))
        .catch((err) => console.error("Failed to load published values:", err));
    }
  }, [showPublished]);

  const getHeuristicColor = (val: number | null, heur: HeuristicKey) => {
    if (val === null || val === undefined) {
      return "bg-bg-elevated/40 text-txt-muted border-border";
    }
    const info = METRIC_EXPLANATIONS[heur];
    if (val >= info.threshold * 1.5) {
      return "bg-rose-950/40 text-rose-300 border-rose-800/80 hover:bg-rose-900/60";
    }
    if (val >= info.threshold) {
      return "bg-amber-950/40 text-amber-300 border-amber-800/80 hover:bg-amber-900/60";
    }
    return "bg-emerald-950/40 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/60";
  };

  const getPublishedValueForClass = (className: string, heur: HeuristicKey): number | null | undefined => {
    if (!publishedData) return undefined;
    const norm = className.toLowerCase().replace(/[\s_-]/g, "");
    for (const dsKey of Object.keys(publishedData)) {
      const classes = publishedData[dsKey]?.classes || {};
      for (const [k, v] of Object.entries<any>(classes)) {
        const clsNorm = (v.label || k).toLowerCase().replace(/[\s_-]/g, "");
        if (norm === clsNorm) {
          return v[heur];
        }
      }
    }
    return undefined;
  };

  const filteredClasses = useMemo(() => {
    return availableClasses.filter((c) =>
      c.class.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [availableClasses, searchQuery]);

  if (!latestRunResult || availableClasses.length === 0) {
    return (
      <EmptyState
        title="No Audit Findings Available"
        description="Run an audit first to explore cross-class smell matrices, null-calibrated SFI curves, and feature controllability risks."
        actionLabel="Go to New Audit"
        onAction={() => {
          setActiveStage("AUDIT");
          navigate("/audit");
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
        title="Audit Findings & Shortcut Diagnostics"
        description="Inspect the five scientific dataset smells, examine null-calibrated SFI fragility decay curves, and understand feature controllability risks."
        badge={<EvidenceBadge type="measured" />}
        actions={
          <div className="flex items-center gap-2">
            {/* View Mode Toggle: Basic vs Advanced */}
            <div className="flex rounded-lg border border-border bg-bg-card p-0.5 text-xs">
              <button
                onClick={() => setViewMode("basic")}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                  viewMode === "basic"
                    ? "bg-accent-primary text-white shadow-sm font-bold"
                    : "text-txt-muted hover:text-txt-primary"
                }`}
              >
                Basic View
              </button>
              <button
                onClick={() => setViewMode("advanced")}
                className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                  viewMode === "advanced"
                    ? "bg-accent-primary text-white shadow-sm font-bold"
                    : "text-txt-muted hover:text-txt-primary"
                }`}
              >
                Advanced View
              </button>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setActiveStage("REPORTS");
                navigate("/reports");
              }}
              className="text-xs"
            >
              Skip to Reports <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        }
      />

      {/* Target Attack Class Selector Bar */}
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

      {/* Top Level Findings Tabs */}
      <div className="flex border-b border-border gap-4 text-xs font-semibold">
        <button
          onClick={() => {
            setActiveTab("matrix");
            setSearchParams({ tab: "matrix" });
          }}
          className={`pb-2.5 transition-all relative ${
            activeTab === "matrix" ? "text-accent-secondary font-bold" : "text-txt-muted hover:text-txt-primary"
          }`}
        >
          1. Five Dataset Smells (Matrix)
          {activeTab === "matrix" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-secondary rounded" />
          )}
        </button>
        <button
          onClick={() => {
            setActiveTab("diagnostics");
            setSearchParams({ tab: "diagnostics" });
          }}
          className={`pb-2.5 transition-all relative ${
            activeTab === "diagnostics" ? "text-accent-secondary font-bold" : "text-txt-muted hover:text-txt-primary"
          }`}
        >
          2. Shortcut Diagnostics (SFI & GGI)
          {activeTab === "diagnostics" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-secondary rounded" />
          )}
        </button>
        <button
          onClick={() => {
            setActiveTab("taxonomy");
            setSearchParams({ tab: "taxonomy" });
          }}
          className={`pb-2.5 transition-all relative ${
            activeTab === "taxonomy" ? "text-accent-secondary font-bold" : "text-txt-muted hover:text-txt-primary"
          }`}
        >
          3. Feature Controllability Taxonomy
          {activeTab === "taxonomy" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-secondary rounded" />
          )}
        </button>
      </div>

      {/* TAB 1: SMELL MATRIX & THE FIVE HEURISTICS */}
      {activeTab === "matrix" && (
        <div className="space-y-4">
          {/* Beginner Explanation Cards for the 5 Smells */}
          {viewMode === "basic" && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {(["UGT", "WL", "HDF", "PDD", "TC"] as HeuristicKey[]).map((k) => {
                const info = METRIC_EXPLANATIONS[k];
                return (
                  <div key={k} className="p-3 rounded-lg border border-border bg-bg-card space-y-1">
                    <span className="font-mono font-bold text-accent-secondary text-xs">{k}</span>
                    <h5 className="font-semibold text-txt-primary text-xs leading-tight">{info.fullName}</h5>
                    <p className="text-[11px] text-txt-muted leading-relaxed line-clamp-3">{info.simpleDescription}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Matrix Card */}
          <Card>
            <CardHeader className="py-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <CardTitle className="text-sm">
                  Cross-Class Smell Matrix ({filteredClasses.length} Classes Evaluated)
                </CardTitle>
                <CardDescription>
                  Evaluates whether attack classes exhibit severe statistical or protocol anomalies.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={showPublished ? "cyan" : "outline"}
                  size="sm"
                  onClick={() => setShowPublished(!showPublished)}
                  className="text-xs py-1"
                >
                  {showPublished ? "Literature Comparison [ON]" : "Compare Published"}
                </Button>

                <div className="flex rounded-lg border border-border bg-bg-elevated p-0.5">
                  <button
                    onClick={() => setMatrixViewType("heatmap")}
                    className={`p-1 rounded ${matrixViewType === "heatmap" ? "bg-accent-primary text-white" : "text-txt-muted"}`}
                    title="Heatmap View"
                  >
                    <Grid3X3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setMatrixViewType("table")}
                    className={`p-1 rounded ${matrixViewType === "table" ? "bg-accent-primary text-white" : "text-txt-muted"}`}
                    title="Table View"
                  >
                    <TableIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 overflow-x-auto scrollbar-thin">
              {matrixViewType === "heatmap" ? (
                <div className="min-w-[620px] space-y-2">
                  <div className="grid grid-cols-6 gap-2 text-xs font-bold uppercase tracking-wider text-txt-muted p-2">
                    <span className="col-span-1">Attack Class</span>
                    {(["UGT", "WL", "HDF", "PDD", "TC"] as HeuristicKey[]).map((h) => (
                      <div key={h} className="text-center font-mono">
                        {h}
                      </div>
                    ))}
                  </div>

                  {filteredClasses.map((cls) => (
                    <div
                      key={cls.class}
                      className="grid grid-cols-6 gap-2 items-center rounded-lg border border-border bg-bg-card p-2 transition-all hover:border-accent-primary/50 hover:bg-bg-elevated/40"
                    >
                      <div className="col-span-1 flex flex-col">
                        <span className="font-bold text-xs text-txt-primary truncate" title={cls.class}>
                          {cls.class}
                        </span>
                        <span className="text-[10px] text-txt-muted font-mono">N={cls.n} flows</span>
                      </div>

                      {(["UGT", "WL", "HDF", "PDD", "TC"] as HeuristicKey[]).map((heur) => {
                        const val = cls.paper[heur];
                        const pubVal = showPublished ? getPublishedValueForClass(cls.class, heur) : undefined;
                        const colorClasses = getHeuristicColor(val, heur);
                        return (
                          <button
                            key={heur}
                            onMouseEnter={() => setHoveredCell({ cls: cls.class, heur })}
                            onClick={() => {
                              setSelectedClass(cls.class);
                              setActiveTab("diagnostics");
                              setSearchParams({ tab: "diagnostics" });
                            }}
                            className={`h-11 rounded border font-mono font-bold text-xs flex flex-col items-center justify-center transition-all ${colorClasses}`}
                          >
                            <span>{val !== null ? val.toFixed(3) : "N/A"}</span>
                            {pubVal !== undefined ? (
                              <span className="text-[9px] font-sans font-normal opacity-90 text-accent-secondary">
                                Ref: {pubVal !== null ? pubVal.toFixed(2) : "N/A"}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ) : (
                /* Table View */
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-bg-elevated/70 text-[11px] uppercase text-txt-muted">
                      <th className="p-2.5">Class</th>
                      <th className="p-2.5 font-mono">N</th>
                      <th className="p-2.5 font-mono text-center">UGT</th>
                      <th className="p-2.5 font-mono text-center">WL</th>
                      <th className="p-2.5 font-mono text-center">HDF</th>
                      <th className="p-2.5 font-mono text-center">PDD</th>
                      <th className="p-2.5 font-mono text-center">TC</th>
                      <th className="p-2.5 font-mono text-center">SFI</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-mono text-xs">
                    {filteredClasses.map((cls) => (
                      <tr
                        key={cls.class}
                        onClick={() => {
                          setSelectedClass(cls.class);
                          setActiveTab("diagnostics");
                          setSearchParams({ tab: "diagnostics" });
                        }}
                        className="hover:bg-bg-elevated/50 cursor-pointer transition-colors"
                      >
                        <td className="p-2.5 font-sans font-bold text-txt-primary">{cls.class}</td>
                        <td className="p-2.5 text-txt-secondary">{cls.n}</td>
                        <td className="p-2.5 text-center">{cls.paper.UGT !== null ? cls.paper.UGT.toFixed(3) : "N/A"}</td>
                        <td className="p-2.5 text-center">{cls.paper.WL !== null ? cls.paper.WL.toFixed(3) : "N/A"}</td>
                        <td className="p-2.5 text-center">{cls.paper.HDF !== null ? cls.paper.HDF.toFixed(3) : "N/A"}</td>
                        <td className="p-2.5 text-center">{cls.paper.PDD !== null ? cls.paper.PDD.toFixed(3) : "N/A"}</td>
                        <td className="p-2.5 text-center">{cls.paper.TC !== null ? cls.paper.TC.toFixed(3) : "N/A"}</td>
                        <td className="p-2.5 text-center font-bold text-accent-secondary">
                          {cls.sfi.sfi_top !== null ? cls.sfi.sfi_top.toFixed(3) : "N/A"}
                        </td>
                        <td className="p-2.5 font-sans">
                          <Badge variant={cls.sfi.flag ? "danger" : "success"}>
                            {cls.sfi.flag ? "FLAGGED" : "CLEAN"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: SHORTCUT DIAGNOSTICS (SFI & GGI) */}
      {activeTab === "diagnostics" && classData && (
        <div className="space-y-4">
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

          {/* SFI Decay Curve & Interpretation */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">
                  SFI Decay Curve vs Monte Carlo Null Distribution
                </CardTitle>
                <CardDescription>
                  Target Feature: <strong className="text-txt-primary">{sfi?.top_features[0] || "Candidate"}</strong>
                </CardDescription>
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

            {/* Beginner-friendly Interpretation Card */}
            <Card elevated className="space-y-4">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-accent-secondary" />
                  What Does This Finding Mean?
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs text-txt-secondary leading-relaxed">
                <div className="p-3 rounded-lg border border-border bg-bg-card space-y-1">
                  <strong className="text-txt-primary block text-xs">
                    Shortcut Fragility (SFI):
                  </strong>
                  <p className="text-[11px] text-txt-muted">
                    {METRIC_EXPLANATIONS.SFI.simpleDescription} If the blue line drops significantly below the orange null mean line, the model is overly reliant on this single feature.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-bg-card space-y-1">
                  <strong className="text-txt-primary block text-xs">
                    Generalisation Gap (GGI):
                  </strong>
                  <p className="text-[11px] text-txt-muted">
                    {METRIC_EXPLANATIONS.GGI.simpleDescription} A high gap indicates that test performance will drop when the attack changes slightly in the real world.
                  </p>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  className="w-full gap-2 text-xs font-bold mt-2"
                  onClick={() => {
                    setActiveStage("REMEDIATION");
                    navigate("/remediation");
                  }}
                >
                  Experiment with Remediation (Optional) <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: FEATURE TAXONOMY RANKING */}
      {activeTab === "taxonomy" && sfi && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Candidate Shortcut Features & Controllability</CardTitle>
            <CardDescription>
              Ranked by sensitivity and classified into Category A (Trivial Evasion), Category B (Semantic), and Category C/D (Context).
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {sfi.top_features.map((feat, idx) => {
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
                        ? "Category A: High Risk / Trivial Evasion (Attacker can easily change this without breaking the attack, e.g. Port)"
                        : cat === "B"
                        ? "Category B: Semantic Feature / Behavior Dependent (Harder for attacker to alter)"
                        : "Category C/D: Environmental or Context Invariant"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setActiveStage("REMEDIATION");
                        navigate("/remediation");
                      }}
                      className="text-xs"
                    >
                      Suppress in Remediation
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Bottom Action Footer */}
      <div className="p-4 rounded-xl border border-border bg-bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h4 className="text-xs font-bold text-txt-primary">Next Steps in your Audit Workflow</h4>
          <p className="text-[11px] text-txt-muted">
            You can experiment with safe dataset changes (optional) or skip directly to generating your final report.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setActiveStage("REMEDIATION");
              navigate("/remediation");
            }}
            className="text-xs gap-1.5"
          >
            <Sliders className="h-3.5 w-3.5 text-accent-secondary" />
            Remediation (Optional)
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setActiveStage("REPORTS");
              navigate("/reports");
            }}
            className="text-xs font-bold gap-1.5"
          >
            <FileText className="h-3.5 w-3.5" />
            Generate Report
          </Button>
        </div>
      </div>
    </div>
  );
};
