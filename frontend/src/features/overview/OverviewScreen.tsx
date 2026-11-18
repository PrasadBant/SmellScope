import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Play,
  History,
  ShieldCheck,
  AlertTriangle,
  Microscope,
  Database,
  ArrowUpRight,
  TrendingUp,
  FileText,
  Clock,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { useAuditContext } from "@/stores/AuditContext";
import { api } from "@/api/client";
import { AuditStatus, RunResult } from "@/types/api";
import { formatNumber, formatPercent } from "@/utils/cn";

export const OverviewScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    activeDatasetId,
    activeRunId,
    setActiveRunId,
    setActiveStage,
    setSelectedClass,
    latestRunResult,
    setLatestRunResult,
  } = useAuditContext();

  const [audits, setAudits] = useState<AuditStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchOverviewData = async () => {
      try {
        const auditList = await api.listAudits();
        if (mounted) {
          setAudits(auditList);
          // If no activeRunId but audits exist, select latest
          if (!activeRunId && auditList.length > 0) {
            const completed = auditList.find((a) => a.status === "COMPLETED") || auditList[0];
            setActiveRunId(completed.run_id);
          }
        }

        // Fetch latest run results if we have an active run
        const targetRun = activeRunId || (auditList.length > 0 ? auditList[0].run_id : null);
        if (targetRun) {
          try {
            const res = await api.getAuditResults(targetRun);
            if (mounted) setLatestRunResult(res);
          } catch {
            // In progress or not ready
          }
        }
      } catch (err) {
        console.error("Failed to load overview data", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchOverviewData();
  }, [activeRunId]);

  const flaggedClasses = latestRunResult
    ? latestRunResult.classes.filter((c) => c.sfi.flag)
    : [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Command Center Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-bg-card via-bg-elevated/70 to-bg-card p-8 shadow-2xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent-cyan/30 bg-accent-cyan/10 px-3 py-1 text-xs font-semibold text-accent-cyan">
            <span>SMELLSCOPE 2.0 WORKSTATION</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-txt-primary">
            Understand what your NIDS benchmark is really learning.
          </h1>
          <p className="text-sm lg:text-base text-txt-secondary leading-relaxed">
            Investigate benchmark dataset design flaws, statistical artifacts, shortcut dependencies,
            and the reliability of machine-learning evaluation with null-calibrated diagnostics.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                setActiveStage("INGEST");
                navigate("/ingestion");
              }}
              className="gap-2"
            >
              <Play className="h-4 w-4 fill-current" />
              START NEW AUDIT
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                const historyEl = document.getElementById("audit-history-section");
                historyEl?.scrollIntoView({ behavior: "smooth" });
              }}
              className="gap-2"
            >
              <History className="h-4 w-4" />
              VIEW AUDIT HISTORY
            </Button>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-72 w-72 rounded-full bg-accent-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute right-48 bottom-0 h-48 w-48 rounded-full bg-accent-cyan/10 blur-2xl pointer-events-none" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Benchmark Dataset"
          value={latestRunResult?.dataset.schema_id || activeDatasetId || "None"}
          subtitle={latestRunResult ? `${formatNumber(latestRunResult.dataset.n_rows_loaded)} flows evaluated` : "No dataset active"}
          icon={<Database className="h-5 w-5" />}
        />
        <StatCard
          title="Audited Attack Classes"
          value={latestRunResult ? latestRunResult.classes.length : 0}
          subtitle={latestRunResult ? `Split hash: ${latestRunResult.split.split_hash.slice(0, 8)}...` : "Pending audit execution"}
          icon={<Layers className="h-5 w-5" />}
        />
        <StatCard
          title="Shortcut Candidates"
          value={flaggedClasses.length}
          subtitle={
            flaggedClasses.length > 0
              ? `${flaggedClasses.map((c) => c.class).join(", ")} flagged`
              : "0 shortcut flags triggered"
          }
          icon={<AlertTriangle className="h-5 w-5 text-status-warning" />}
        />
        <StatCard
          title="Audit Runtime"
          value={latestRunResult ? `${latestRunResult.runtime.total_seconds}s` : "0.0s"}
          subtitle="Stratified locked test evaluation"
          icon={<Clock className="h-5 w-5" />}
        />
      </div>

      {/* Main Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Key Findings & Diagnostic Quick Jump */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>
                  <Microscope className="h-4 w-4 text-accent-cyan" />
                  Key Research Findings & Shortcut Suspicions
                </CardTitle>
                <CardDescription>
                  Evaluated via null-calibrated SFI, 4-gram repetition, and feature controllability taxonomy.
                </CardDescription>
              </div>
              {latestRunResult && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveStage("DIAGNOSE");
                    navigate("/diagnostics");
                  }}
                  className="gap-1.5"
                >
                  Diagnostics Lab <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {latestRunResult ? (
                <div className="space-y-4">
                  {latestRunResult.classes.map((cls) => {
                    const isFlagged = cls.sfi.flag;
                    const topFeature = cls.sfi.top_features[0] || "None";
                    const topCategory = cls.sfi.categories[0] || "UNMAPPED";

                    return (
                      <div
                        key={cls.class}
                        className="rounded-xl border border-border bg-bg-elevated/40 p-4 transition-all hover:border-border-active/60"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <h4 className="font-bold text-sm text-txt-primary">{cls.class}</h4>
                            <Badge variant={isFlagged ? "danger" : "success"}>
                              {isFlagged ? "SHORTCUT SUSPECT" : "CLEAN BASELINE"}
                            </Badge>
                            <Badge variant={`category${topCategory}` as any}>
                              CAT {topCategory}: {topFeature}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs font-mono">
                            <span className="text-txt-muted">
                              SFI: <strong className="text-txt-primary">{cls.sfi.sfi_top !== null ? cls.sfi.sfi_top.toFixed(3) : "N/A"}</strong>
                            </span>
                            <span className="text-txt-muted">
                              Base F1: <strong className="text-txt-primary">{cls.baseline.f1 !== null ? formatPercent(cls.baseline.f1) : "N/A"}</strong>
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-5 gap-2 text-center text-xs">
                          <div className="rounded bg-bg-card p-1.5 border border-border/50">
                            <span className="text-[10px] text-txt-muted uppercase">UGT</span>
                            <div className="font-mono font-semibold">{cls.paper.UGT !== null ? cls.paper.UGT.toFixed(3) : "N/A"}</div>
                          </div>
                          <div className="rounded bg-bg-card p-1.5 border border-border/50">
                            <span className="text-[10px] text-txt-muted uppercase">WL</span>
                            <div className="font-mono font-semibold">{cls.paper.WL !== null ? cls.paper.WL.toFixed(3) : "N/A"}</div>
                          </div>
                          <div className="rounded bg-bg-card p-1.5 border border-border/50">
                            <span className="text-[10px] text-txt-muted uppercase">HDF</span>
                            <div className="font-mono font-semibold">{cls.paper.HDF !== null ? cls.paper.HDF.toFixed(3) : "N/A"}</div>
                          </div>
                          <div className="rounded bg-bg-card p-1.5 border border-border/50">
                            <span className="text-[10px] text-txt-muted uppercase">PDD</span>
                            <div className="font-mono font-semibold">{cls.paper.PDD !== null ? cls.paper.PDD.toFixed(3) : "N/A"}</div>
                          </div>
                          <div className="rounded bg-bg-card p-1.5 border border-border/50">
                            <span className="text-[10px] text-txt-muted uppercase">TC</span>
                            <div className="font-mono font-semibold">{cls.paper.TC !== null ? cls.paper.TC.toFixed(3) : "N/A"}</div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-xs text-txt-muted">
                          <span>
                            {cls.sfi.flag_conditions.excess_fragility
                              ? "Excess performance collapse detected under null permutation."
                              : "No statistically anomalous fragility detected."}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedClass(cls.class);
                              setActiveStage("DIAGNOSE");
                              navigate("/diagnostics");
                            }}
                            className="text-accent-cyan hover:underline font-semibold"
                          >
                            Investigate Class &rarr;
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-txt-muted space-y-3">
                  <Database className="h-8 w-8 mx-auto text-txt-muted/60" />
                  <p className="text-sm font-medium">No active audit results loaded.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveStage("INGEST");
                      navigate("/ingestion");
                    }}
                  >
                    Select Benchmark & Run Audit
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Recent Audits & Dataset Health */}
        <div className="space-y-6" id="audit-history-section">
          <Card>
            <CardHeader>
              <CardTitle>
                <History className="h-4 w-4 text-txt-secondary" />
                Audit Execution History
              </CardTitle>
              <CardDescription>Local-first execution records</CardDescription>
            </CardHeader>
            <CardContent>
              {audits.length > 0 ? (
                <div className="space-y-3">
                  {audits.map((a) => {
                    const isSelected = activeRunId === a.run_id;
                    return (
                      <div
                        key={a.run_id}
                        onClick={async () => {
                          setActiveRunId(a.run_id);
                          try {
                            const res = await api.getAuditResults(a.run_id);
                            setLatestRunResult(res);
                          } catch {
                            // Ignored
                          }
                        }}
                        className={`cursor-pointer rounded-lg border p-3 transition-all ${
                          isSelected
                            ? "border-accent-primary bg-accent-primary/10 shadow-md"
                            : "border-border bg-bg-card hover:border-border-active/50"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="font-bold text-txt-primary truncate max-w-[140px]">
                            {a.run_id}
                          </span>
                          <Badge
                            variant={
                              a.status === "COMPLETED"
                                ? "success"
                                : a.status === "RUNNING"
                                ? "warning"
                                : a.status === "FAILED"
                                ? "danger"
                                : "outline"
                            }
                          >
                            {a.status}
                          </Badge>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-txt-muted">
                          <span>Dataset: {a.dataset_id}</span>
                          <span>{a.elapsed_seconds}s</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-txt-muted">
                  No previous audit runs recorded.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card elevated>
            <CardHeader>
              <CardTitle className="text-sm">Research Workstation Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => {
                  setActiveStage("OVERVIEW");
                  navigate("/heatmap");
                }}
              >
                <Layers className="h-4 w-4 text-accent-cyan" />
                Inspect Cross-Class Smell Matrix
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => {
                  setActiveStage("REMEDIATE");
                  navigate("/remediation");
                }}
              >
                <ShieldCheck className="h-4 w-4 text-status-success" />
                Configure Safe Remediation (RSM)
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => {
                  setActiveStage("VERIFY");
                  navigate("/reports");
                }}
              >
                <FileText className="h-4 w-4 text-accent-primary" />
                Generate Offline HTML Audit Report
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
