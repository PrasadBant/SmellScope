import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Grid3X3,
  Table as TableIcon,
  Search,
  Filter,
  Download,
  Info,
  ArrowRight,
  TrendingDown,
  ExternalLink,
  ShieldAlert,
  SlidersHorizontal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { SectionHeader } from "@/components/ui/SectionHeader";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"ALL" | "CLEAN" | "BORDERLINE" | "CRITICAL">("ALL");
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

  const getHeuristicColor = (val: number | null, heur: HeuristicKey) => {
    if (val === null || val === undefined) {
      return "bg-bg-elevated/40 text-txt-muted border-border hover:border-border-active";
    }
    const info = HEURISTIC_DESCRIPTIONS[heur];
    if (val >= info.thresh * 1.5) {
      return "bg-rose-950/40 text-rose-300 border-rose-800/80 hover:bg-rose-900/60 shadow-sm";
    }
    if (val >= info.thresh) {
      return "bg-amber-950/40 text-amber-300 border-amber-800/80 hover:bg-amber-900/60 shadow-sm";
    }
    return "bg-emerald-950/40 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/60 shadow-sm";
  };

  const allClasses = latestRunResult?.classes || [];

  const filteredClasses = useMemo(() => {
    return allClasses.filter((c) => {
      // Search match
      if (searchQuery && !c.class.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Severity match
      if (severityFilter === "ALL") return true;

      // Check worst heuristic status
      const hasCritical = (["UGT", "WL", "HDF", "PDD", "TC"] as HeuristicKey[]).some((h) => {
        const val = c.paper[h];
        return val !== null && val >= HEURISTIC_DESCRIPTIONS[h].thresh * 1.5;
      });
      const hasBorderline = (["UGT", "WL", "HDF", "PDD", "TC"] as HeuristicKey[]).some((h) => {
        const val = c.paper[h];
        return val !== null && val >= HEURISTIC_DESCRIPTIONS[h].thresh && val < HEURISTIC_DESCRIPTIONS[h].thresh * 1.5;
      });

      if (severityFilter === "CRITICAL") return hasCritical || c.sfi.flag;
      if (severityFilter === "BORDERLINE") return hasBorderline && !hasCritical;
      if (severityFilter === "CLEAN") return !hasCritical && !hasBorderline && !c.sfi.flag;

      return true;
    });
  }, [allClasses, searchQuery, severityFilter]);

  const handleExportMatrix = () => {
    if (!latestRunResult) return;
    const exportData = {
      audit_run_id: latestRunResult.run_id,
      dataset: latestRunResult.dataset.schema_id,
      timestamp: new Date().toISOString(),
      classes: latestRunResult.classes.map((c) => ({
        class: c.class,
        n: c.n,
        heuristics: c.paper,
        sfi_top: c.sfi.sfi_top,
        flag: c.sfi.flag,
        top_features: c.sfi.top_features,
      })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smell_matrix_${latestRunResult.run_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <SectionHeader
        icon={Grid3X3}
        title="Cross-Class Smell Matrix"
        description="Inspect the 5 scientific heuristics (UGT, WL, HDF, PDD, TC) across all audited attack classes with optional published reference comparison."
        badge={<EvidenceBadge type={showPublished ? "published" : "measured"} />}
        actions={
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex rounded-lg border border-border bg-bg-card p-0.5">
              <button
                onClick={() => setViewMode("heatmap")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  viewMode === "heatmap"
                    ? "bg-accent-primary text-white shadow-sm"
                    : "text-txt-muted hover:text-txt-primary"
                }`}
              >
                <Grid3X3 className="h-3.5 w-3.5" />
                Heatmap
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  viewMode === "table"
                    ? "bg-accent-primary text-white shadow-sm"
                    : "text-txt-muted hover:text-txt-primary"
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
              className="text-xs py-1"
            >
              {showPublished ? "Compare Published [ON]" : "Compare Published"}
            </Button>

            {latestRunResult && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportMatrix}
                className="gap-1.5 text-xs py-1"
                title="Export matrix data as JSON"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            )}
          </div>
        }
      />

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl border border-border bg-bg-card shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-sm">
          <Search className="h-4 w-4 text-txt-muted shrink-0" />
          <input
            type="text"
            placeholder="Filter attack classes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-xs text-txt-primary focus:outline-none placeholder:text-txt-muted"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-txt-muted hover:text-txt-primary text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-[11px] uppercase tracking-wider text-txt-muted font-semibold hidden md:inline">
            Severity:
          </span>
          <div className="flex rounded-lg border border-border bg-bg-elevated p-0.5 text-xs">
            {(["ALL", "CLEAN", "BORDERLINE", "CRITICAL"] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-all ${
                  severityFilter === sev
                    ? "bg-accent-primary text-white font-bold shadow-sm"
                    : "text-txt-muted hover:text-txt-primary"
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>
      </div>

      {allClasses.length === 0 ? (
        <EmptyState
          title="No Heuristic Signals Available"
          description="Please ingest a dataset and execute a multi-class audit to view the cross-class smell matrix."
          actionLabel="Go to Ingestion"
          onAction={() => {
            setActiveStage("INGEST");
            navigate("/ingestion");
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Matrix View */}
          <div className="lg:col-span-3 space-y-4">
            <Card>
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between w-full">
                  <CardTitle className="text-sm">
                    Interactive Heuristic Matrix ({filteredClasses.length} of {allClasses.length} Classes)
                  </CardTitle>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> Clean
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <span className="h-2 w-2 rounded-full bg-amber-500" /> Moderate
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-400">
                      <span className="h-2 w-2 rounded-full bg-rose-500" /> Severe
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 overflow-x-auto scrollbar-thin">
                {viewMode === "heatmap" ? (
                  <div className="min-w-[620px] space-y-2">
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
                    {filteredClasses.map((cls) => (
                      <div
                        key={cls.class}
                        className="grid grid-cols-6 gap-2 items-center rounded-lg border border-border bg-bg-card p-2 transition-all hover:border-accent-primary/60 hover:bg-bg-elevated/40"
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
                      <tr className="border-b border-border bg-bg-elevated/70 text-[11px] uppercase tracking-wider text-txt-muted">
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
                            setActiveStage("DIAGNOSE");
                            navigate("/diagnostics");
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

            {/* Published Benchmark Table Card */}
            {showPublished && publishedData && (
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ExternalLink className="h-4 w-4 text-accent-secondary" />
                    Flood et al. EuroS&P 2024 Published Reference Values
                  </CardTitle>
                  <CardDescription>
                    Empirical heuristic baselines reported in Table 8 & Table 9 of the published literature.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto scrollbar-thin">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-bg-elevated/70 text-[11px] uppercase tracking-wider text-txt-muted">
                        <th className="p-2.5">Dataset</th>
                        <th className="p-2.5">Class</th>
                        <th className="p-2.5 font-mono text-center">PDD</th>
                        <th className="p-2.5 font-mono text-center">TC</th>
                        <th className="p-2.5 font-mono text-center">WL</th>
                        <th className="p-2.5 font-mono text-center">HDF</th>
                        <th className="p-2.5 font-mono text-center">UGT</th>
                        <th className="p-2.5">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 font-mono text-xs">
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
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Inspector & Thresholds */}
          <div className="space-y-4">
            <Card elevated>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Info className="h-4 w-4 text-accent-secondary" />
                  Metric Inspector
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                {hoveredCell ? (
                  <div className="space-y-3">
                    <div>
                      <span className="text-txt-muted text-[10px] uppercase font-semibold">Active Selection</span>
                      <h4 className="font-bold text-sm text-txt-primary">
                        {hoveredCell.cls} &bull; {hoveredCell.heur}
                      </h4>
                    </div>
                    <div className="p-3 rounded-lg bg-bg-card border border-border space-y-1">
                      <p className="font-semibold text-txt-primary">
                        {HEURISTIC_DESCRIPTIONS[hoveredCell.heur].name}
                      </p>
                      <p className="text-txt-muted text-[11px] leading-relaxed">
                        {HEURISTIC_DESCRIPTIONS[hoveredCell.heur].desc}
                      </p>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full gap-2 text-xs"
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
                  <p className="text-txt-muted py-6 text-center text-xs">
                    Hover over any heuristic cell in the matrix to inspect metric definitions and thresholds.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">Scientific Heuristic Thresholds</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs">
                {Object.entries(HEURISTIC_DESCRIPTIONS).map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between p-2 rounded-lg bg-bg-elevated/50 border border-border"
                  >
                    <div>
                      <span className="font-mono font-bold text-txt-primary">{k}</span>
                      <p className="text-[10px] text-txt-muted">{v.name}</p>
                    </div>
                    <span className="text-txt-secondary font-mono text-xs">&ge; {v.thresh}</span>
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
