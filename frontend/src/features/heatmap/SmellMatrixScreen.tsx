import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Grid3X3,
  Table as TableIcon,
  SlidersHorizontal,
  Info,
  ArrowRight,
  TrendingDown,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuditContext } from "@/stores/AuditContext";
import { api } from "@/api/client";
import { ClassAuditResult, RunResult } from "@/types/api";

type HeuristicKey = "UGT" | "WL" | "HDF" | "PDD" | "TC";

const HEURISTIC_DESCRIPTIONS: Record<HeuristicKey, { name: string; desc: string; thresh: number }> = {
  UGT: {
    name: "Unassigned/Ghost Traffic",
    desc: "Evaluates whether traffic targets unassigned or ghost port ranges.",
    thresh: 0.1,
  },
  WL: {
    name: "Window Length Anomaly",
    desc: "Measures 4-gram repetition and periodicity in packet lengths.",
    thresh: 0.3,
  },
  HDF: {
    name: "High Dimension Feature Dominance",
    desc: "Gini concentration of single-feature classification importances.",
    thresh: 0.6,
  },
  PDD: {
    name: "Partition Distance Disparity",
    desc: "Cluster disparity between benign and attack classes via KMeans.",
    thresh: 0.2,
  },
  TC: {
    name: "Temporal Concentration",
    desc: "Quantifies burst clustering within anomalous inter-arrival temporal windows.",
    thresh: 0.4,
  },
};

export const SmellMatrixScreen: React.FC = () => {
  const navigate = useNavigate();
  const { activeRunId, setSelectedClass, setActiveStage, latestRunResult, setLatestRunResult } = useAuditContext();

  const [viewMode, setViewMode] = useState<"heatmap" | "table">("heatmap");
  const [showPublished, setShowPublished] = useState(false);
  const [publishedData, setPublishedData] = useState<Record<string, any> | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ cls: string; heur: HeuristicKey } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeRunId && !latestRunResult) {
      loadRunResults(activeRunId);
    }
  }, [activeRunId]);

  useEffect(() => {
    if (showPublished && !publishedData) {
      api.getPublishedValues()
        .then((res) => setPublishedData(res.benchmarks))
        .catch((err) => console.error("Failed to load published benchmarks:", err));
    }
  }, [showPublished]);

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

  const loadRunResults = async (runId: string) => {
    setLoading(true);
    try {
      const res = await api.getAuditResults(runId);
      setLatestRunResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getHeuristicColor = (val: number | null, heur: HeuristicKey) => {
    if (val === null || val === undefined) return "bg-gray-800/80 text-gray-500 border-gray-700";
    const info = HEURISTIC_DESCRIPTIONS[heur];
    if (val >= info.thresh * 1.5) {
      return "bg-rose-950/70 text-rose-300 border-rose-800/80 hover:bg-rose-900/80";
    }
    if (val >= info.thresh) {
      return "bg-amber-950/70 text-amber-300 border-amber-800/80 hover:bg-amber-900/80";
    }
    return "bg-emerald-950/70 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/80";
  };

  const classes = latestRunResult?.classes || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-txt-primary flex items-center gap-2">
            <Grid3X3 className="h-6 w-6 text-accent-cyan" />
            Cross-Class Smell Matrix
          </h2>
          <p className="text-sm text-txt-muted mt-1">
            Evaluate 5 scientific heuristics (UGT, WL, HDF, PDD, TC) across all audited attack classes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-border bg-bg-card p-1">
            <button
              onClick={() => setViewMode("heatmap")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
                viewMode === "heatmap" ? "bg-accent-primary text-white shadow" : "text-txt-muted hover:text-txt-primary"
              }`}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              Heatmap
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
                viewMode === "table" ? "bg-accent-primary text-white shadow" : "text-txt-muted hover:text-txt-primary"
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" />
              Table
            </button>
          </div>

          <Button
            variant={showPublished ? "cyan" : "outline"}
            size="sm"
            onClick={() => setShowPublished(!showPublished)}
          >
            {showPublished ? "Showing Published Reference" : "Compare Published"}
          </Button>
        </div>
      </div>

      {classes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-txt-muted space-y-3">
            <ShieldAlert className="h-10 w-10 mx-auto text-txt-muted/50" />
            <h3 className="text-base font-bold text-txt-primary">No Audit Results Loaded</h3>
            <p className="text-xs max-w-md mx-auto">
              Please ingest a dataset and execute a multi-class audit to view heuristic signals.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setActiveStage("INGEST");
                navigate("/ingestion");
              }}
            >
              Go to Ingestion
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Matrix View */}
          <div className="lg:col-span-3 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <CardTitle className="text-sm">
                    Interactive Smell Matrix ({classes.length} Attack Classes)
                  </CardTitle>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Clean
                    </span>
                    <span className="flex items-center gap-1 text-amber-400">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Moderate
                    </span>
                    <span className="flex items-center gap-1 text-rose-400">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Severe Artifact
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {viewMode === "heatmap" ? (
                  <div className="min-w-[600px] space-y-2">
                    {/* Header Columns */}
                    <div className="grid grid-cols-6 gap-2 text-xs font-bold uppercase tracking-wider text-txt-muted p-2">
                      <span className="col-span-1">Attack Class</span>
                      {(["UGT", "WL", "HDF", "PDD", "TC"] as HeuristicKey[]).map((h) => (
                        <div key={h} className="text-center font-mono">
                          {h}
                        </div>
                      ))}
                    </div>

                    {/* Class Rows */}
                    {classes.map((cls) => (
                      <div
                        key={cls.class}
                        className="grid grid-cols-6 gap-2 items-center rounded-lg border border-border/60 bg-bg-elevated/20 p-2 transition-colors hover:border-accent-primary/60 hover:bg-bg-elevated/40"
                      >
                        <div className="col-span-1 flex flex-col">
                          <span className="font-bold text-xs text-txt-primary truncate" title={cls.class}>
                            {cls.class}
                          </span>
                          <span className="text-[10px] text-txt-muted font-mono">N={cls.n}</span>
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
                                setActiveStage("DIAGNOSE");
                                navigate("/diagnostics");
                              }}
                              className={`h-12 rounded border font-mono font-bold text-xs flex flex-col items-center justify-center transition-all ${colorClasses}`}
                            >
                              <span>{val !== null ? val.toFixed(3) : "N/A"}</span>
                              {pubVal !== undefined ? (
                                <span className="text-[9px] font-sans font-normal opacity-90 text-accent-cyan">
                                  Ref: {pubVal !== null ? pubVal.toFixed(2) : "N/A"}
                                </span>
                              ) : (
                                val === null && cls.na_reasons[`paper.${heur}`] && (
                                  <span className="text-[9px] font-sans opacity-75">reason</span>
                                )
                              )}
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
                      <tr className="border-b border-border bg-bg-elevated text-[11px] uppercase tracking-wider text-txt-muted">
                        <th className="p-3">Class</th>
                        <th className="p-3 font-mono">N</th>
                        <th className="p-3 font-mono">UGT</th>
                        <th className="p-3 font-mono">WL</th>
                        <th className="p-3 font-mono">HDF</th>
                        <th className="p-3 font-mono">PDD</th>
                        <th className="p-3 font-mono">TC</th>
                        <th className="p-3 font-mono">SFI (Top)</th>
                        <th className="p-3">Shortcut Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 font-mono">
                      {classes.map((cls) => (
                        <tr
                          key={cls.class}
                          onClick={() => {
                            setSelectedClass(cls.class);
                            setActiveStage("DIAGNOSE");
                            navigate("/diagnostics");
                          }}
                          className="hover:bg-bg-elevated/40 cursor-pointer"
                        >
                          <td className="p-3 font-sans font-bold text-txt-primary">{cls.class}</td>
                          <td className="p-3 text-txt-secondary">{cls.n}</td>
                          <td className="p-3">{cls.paper.UGT !== null ? cls.paper.UGT.toFixed(3) : "N/A"}</td>
                          <td className="p-3">{cls.paper.WL !== null ? cls.paper.WL.toFixed(3) : "N/A"}</td>
                          <td className="p-3">{cls.paper.HDF !== null ? cls.paper.HDF.toFixed(3) : "N/A"}</td>
                          <td className="p-3">{cls.paper.PDD !== null ? cls.paper.PDD.toFixed(3) : "N/A"}</td>
                          <td className="p-3">{cls.paper.TC !== null ? cls.paper.TC.toFixed(3) : "N/A"}</td>
                          <td className="p-3 font-bold text-accent-cyan">
                            {cls.sfi.sfi_top !== null ? cls.sfi.sfi_top.toFixed(3) : "N/A"}
                          </td>
                          <td className="p-3 font-sans">
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

            {showPublished && publishedData && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-accent-cyan" />
                    Flood et al. EuroS&P 2024 Published Reference Values
                  </CardTitle>
                  <CardDescription>
                    Empirical heuristic baselines reported in Table 8 & Table 9 of the published literature.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-bg-elevated text-[11px] uppercase tracking-wider text-txt-muted">
                          <th className="p-2.5">Dataset</th>
                          <th className="p-2.5">Class</th>
                          <th className="p-2.5 font-mono text-center">PDD</th>
                          <th className="p-2.5 font-mono text-center">TC</th>
                          <th className="p-2.5 font-mono text-center">WL</th>
                          <th className="p-2.5 font-mono text-center">HDF</th>
                          <th className="p-2.5 font-mono text-center">UGT</th>
                          <th className="p-2.5">Source Citation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 font-mono">
                        {Object.entries(publishedData).flatMap(([dsKey, dsVal]: [string, any]) =>
                          Object.entries(dsVal.classes || {}).map(([clsKey, clsVal]: [string, any]) => (
                            <tr key={`${dsKey}_${clsKey}`} className="hover:bg-bg-elevated/40">
                              <td className="p-2.5 font-sans font-bold text-txt-primary">{dsVal.dataset || dsKey}</td>
                              <td className="p-2.5 font-sans text-txt-primary">{clsVal.label || clsKey}</td>
                              <td className="p-2.5 text-center">{clsVal.PDD !== null ? clsVal.PDD.toFixed(2) : "—"}</td>
                              <td className="p-2.5 text-center">{clsVal.TC !== null ? clsVal.TC.toFixed(2) : "—"}</td>
                              <td className="p-2.5 text-center">{clsVal.WL !== null ? clsVal.WL.toFixed(2) : "—"}</td>
                              <td className="p-2.5 text-center">{clsVal.HDF !== null ? clsVal.HDF.toFixed(2) : "—"}</td>
                              <td className="p-2.5 text-center">{clsVal.UGT !== null ? clsVal.UGT.toFixed(2) : "—"}</td>
                              <td className="p-2.5 font-sans text-[11px] text-txt-muted">{clsVal.source || dsVal.source}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Hover Inspector & Heuristic Explanations */}
          <div className="space-y-4">
            <Card elevated>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="h-4 w-4 text-accent-cyan" />
                  Metric Inspector
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {hoveredCell ? (
                  <div className="space-y-3">
                    <div>
                      <span className="text-txt-muted text-[10px] uppercase">Selected Cell</span>
                      <h4 className="font-bold text-sm text-txt-primary">
                        {hoveredCell.cls} &bull; {hoveredCell.heur}
                      </h4>
                    </div>
                    <div className="p-3 rounded-lg bg-bg-card border border-border">
                      <p className="font-semibold text-txt-primary mb-1">
                        {HEURISTIC_DESCRIPTIONS[hoveredCell.heur].name}
                      </p>
                      <p className="text-txt-muted text-[11px] leading-relaxed">
                        {HEURISTIC_DESCRIPTIONS[hoveredCell.heur].desc}
                      </p>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => {
                        setSelectedClass(hoveredCell.cls);
                        setActiveStage("DIAGNOSE");
                        navigate("/diagnostics");
                      }}
                    >
                      Investigate {hoveredCell.cls} <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-txt-muted py-4 text-center">
                    Hover over any heuristic cell in the matrix to inspect metric definitions and thresholds.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Heuristic Thresholds</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {Object.entries(HEURISTIC_DESCRIPTIONS).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between p-2 rounded bg-bg-elevated/40 border border-border/60">
                    <span className="font-mono font-bold text-txt-primary">{k}</span>
                    <span className="text-txt-muted font-mono">&ge; {v.thresh} (Suspicious)</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
