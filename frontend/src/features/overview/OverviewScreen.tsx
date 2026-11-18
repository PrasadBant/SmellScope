import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Play,
  History,
  ShieldCheck,
  AlertTriangle,
  Microscope,
  Database,
  ArrowRight,
  TrendingDown,
  FileText,
  Clock,
  Layers,
  Activity,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MetricCard } from "@/components/ui/MetricCard";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useAuditContext } from "@/stores/AuditContext";
import { api } from "@/api/client";
import { AuditStatus } from "@/types/api";
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
          if (!activeRunId && auditList.length > 0) {
            const completed = auditList.find((a) => a.status === "COMPLETED") || auditList[0];
            setActiveRunId(completed.run_id);
          }
        }

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

  const meanSfi =
    latestRunResult && latestRunResult.classes.length > 0
      ? (
          latestRunResult.classes.reduce(
            (acc, c) => acc + (c.sfi.sfi_top !== null ? c.sfi.sfi_top : 0),
            0
          ) / latestRunResult.classes.length
        ).toFixed(3)
      : "N/A";

  const maxGgi =
    latestRunResult && latestRunResult.classes.length > 0
      ? Math.max(
          ...latestRunResult.classes.map((c) => (c.ggi.gap !== null ? c.ggi.gap : 0))
        ).toFixed(3)
      : "N/A";

  if (loading && !latestRunResult) {
    return <LoadingState title="Loading Workstation Intelligence..." description="Retrieving local audit records and benchmark metrics" />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Executive Command Header */}
      <div className="rounded-xl border border-border bg-gradient-to-r from-bg-card via-bg-elevated to-bg-card p-5 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-accent-primary/15 text-accent-secondary border border-accent-primary/30">
                <Activity className="h-3 w-3 text-accent-secondary" />
                SMELLSCOPE 2.0 WORKSTATION
              </span>
              <EvidenceBadge type="measured" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-txt-primary">
              Scientific Dataset Trust Overview
            </h1>
            <p className="text-xs text-txt-secondary max-w-2xl leading-relaxed">
              Auditing benchmark dataset design flaws, statistical artifacts, and shortcut dependencies
              with null-calibrated diagnostics on stratified, locked evaluation splits.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setActiveStage("INGEST");
                navigate("/ingestion");
              }}
              className="gap-2"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Start New Audit
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const el = document.getElementById("audit-history-panel");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="gap-2"
            >
              <History className="h-3.5 w-3.5" />
              Audit Runs ({audits.length})
            </Button>
          </div>
        </div>
      </div>

      {/* 6 Compact KPI Panels */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          title="Active Benchmark"
          value={latestRunResult?.dataset.schema_id || activeDatasetId || "None"}
          subtitle={latestRunResult ? `${formatNumber(latestRunResult.dataset.n_rows_loaded)} flows` : "No dataset active"}
          evidenceType="measured"
          icon={<Database className="h-4 w-4" />}
        />
        <MetricCard
          title="Audited Classes"
          value={latestRunResult ? latestRunResult.classes.length : 0}
          subtitle={latestRunResult ? `Split: ${latestRunResult.split.split_hash.slice(0, 8)}...` : "Pending run"}
          evidenceType="measured"
          icon={<Layers className="h-4 w-4" />}
        />
        <MetricCard
          title="Shortcut Suspects"
          value={flaggedClasses.length}
          subtitle={
            flaggedClasses.length > 0
              ? `${flaggedClasses.map((c) => c.class).join(", ")}`
              : "0 shortcut flags"
          }
          evidenceType="synthetic"
          icon={<AlertTriangle className="h-4 w-4 text-status-warning" />}
        />
        <MetricCard
          title="Mean SFI Index"
          value={meanSfi}
          subtitle="Monte Carlo calibrated"
          evidenceType="synthetic"
          icon={<TrendingDown className="h-4 w-4 text-accent-secondary" />}
        />
        <MetricCard
          title="Max Generalisation Gap"
          value={maxGgi}
          subtitle="Cross-subtype collapse"
          evidenceType="measured"
          icon={<Activity className="h-4 w-4" />}
        />
        <MetricCard
          title="Audit Runtime"
          value={latestRunResult ? `${latestRunResult.runtime.total_seconds}s` : "0.0s"}
          subtitle="Locked test split"
          evidenceType="measured"
          icon={<Clock className="h-4 w-4" />}
        />
      </div>

      {/* Two-Column Research Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width): Key Vulnerability Findings */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="py-3 px-4">
              <div>
                <CardTitle className="text-sm">
                  <Microscope className="h-4 w-4 text-accent-secondary" />
                  Key Research Vulnerability Findings
                </CardTitle>
                <CardDescription>
                  Synthesized across null-calibrated SFI, 4-gram repetitions, and feature controllability taxonomy.
                </CardDescription>
              </div>
              {latestRunResult && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveStage("MATRIX");
                    navigate("/heatmap");
                  }}
                  className="gap-1.5 text-xs py-1"
                >
                  Smell Matrix <ArrowRight className="h-3 w-3" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {latestRunResult ? (
                latestRunResult.classes.map((cls) => {
                  const isFlagged = cls.sfi.flag;
                  const topFeature = cls.sfi.top_features[0] || "None";
                  const topCategory = cls.sfi.categories[0] || "UNMAPPED";

                  return (
                    <div
                      key={cls.class}
                      className="rounded-lg border border-border bg-bg-elevated/40 p-3.5 transition-all hover:border-border-active/60 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h4 className="font-bold text-sm text-txt-primary">{cls.class}</h4>
                          <Badge variant={isFlagged ? "danger" : "success"}>
                            {isFlagged ? "SHORTCUT SUSPECT" : "CLEAN BASELINE"}
                          </Badge>
                          <Badge variant={`category${topCategory}` as any}>
                            CAT {topCategory}: {topFeature}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-mono">
                          <span className="text-txt-muted">
                            SFI: <strong className="text-txt-primary">{cls.sfi.sfi_top !== null ? cls.sfi.sfi_top.toFixed(3) : "N/A"}</strong>
                          </span>
                          <span className="text-txt-muted">
                            F1: <strong className="text-txt-primary">{cls.baseline.f1 !== null ? formatPercent(cls.baseline.f1) : "N/A"}</strong>
                          </span>
                          <span className="text-txt-muted">
                            GGI: <strong className="text-txt-primary">{cls.ggi.gap !== null ? cls.ggi.gap.toFixed(3) : "N/A"}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Scientific Heuristics Micro-Grid */}
                      <div className="grid grid-cols-5 gap-1.5 text-center text-xs">
                        <div className="rounded bg-bg-card p-1.5 border border-border/60">
                          <span className="text-[9px] text-txt-muted uppercase font-bold">UGT</span>
                          <div className="font-mono text-xs font-semibold text-txt-primary">
                            {cls.paper.UGT !== null ? cls.paper.UGT.toFixed(3) : "N/A"}
                          </div>
                        </div>
                        <div className="rounded bg-bg-card p-1.5 border border-border/60">
                          <span className="text-[9px] text-txt-muted uppercase font-bold">WL</span>
                          <div className="font-mono text-xs font-semibold text-txt-primary">
                            {cls.paper.WL !== null ? cls.paper.WL.toFixed(3) : "N/A"}
                          </div>
                        </div>
                        <div className="rounded bg-bg-card p-1.5 border border-border/60">
                          <span className="text-[9px] text-txt-muted uppercase font-bold">HDF</span>
                          <div className="font-mono text-xs font-semibold text-txt-primary">
                            {cls.paper.HDF !== null ? cls.paper.HDF.toFixed(3) : "N/A"}
                          </div>
                        </div>
                        <div className="rounded bg-bg-card p-1.5 border border-border/60">
                          <span className="text-[9px] text-txt-muted uppercase font-bold">PDD</span>
                          <div className="font-mono text-xs font-semibold text-txt-primary">
                            {cls.paper.PDD !== null ? cls.paper.PDD.toFixed(3) : "N/A"}
                          </div>
                        </div>
                        <div className="rounded bg-bg-card p-1.5 border border-border/60">
                          <span className="text-[9px] text-txt-muted uppercase font-bold">TC</span>
                          <div className="font-mono text-xs font-semibold text-txt-primary">
                            {cls.paper.TC !== null ? cls.paper.TC.toFixed(3) : "N/A"}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-txt-muted pt-1">
                        <span className="text-[11px] truncate max-w-[400px]">
                          {cls.sfi.flag_conditions.excess_fragility
                            ? "Excess performance collapse detected under null feature permutation."
                            : "Within null Monte Carlo distribution bounds."}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedClass(cls.class);
                            setActiveStage("DIAGNOSE");
                            navigate("/diagnostics");
                          }}
                          className="text-accent-secondary hover:text-accent-primary font-semibold text-xs flex items-center gap-1 transition-colors shrink-0"
                        >
                          Investigate Class <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <EmptyState
                  title="No Audit Intelligence Loaded"
                  description="Select a benchmark dataset and execute an audit to view key vulnerability findings."
                  actionLabel="Configure Audit"
                  onAction={() => {
                    setActiveStage("INGEST");
                    navigate("/ingestion");
                  }}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1/3 width): Execution History & Quick Navigation */}
        <div className="space-y-4" id="audit-history-panel">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">
                <History className="h-4 w-4 text-txt-muted" />
                Audit Execution History
              </CardTitle>
              <CardDescription>Local-first cryptographic execution log</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5 max-h-[380px] overflow-y-auto scrollbar-thin">
              {audits.length > 0 ? (
                audits.map((a) => {
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
                      className={`cursor-pointer rounded-lg border p-2.5 transition-all select-none ${
                        isSelected
                          ? "border-accent-primary bg-accent-primary/10 shadow-sm"
                          : "border-border bg-bg-card hover:border-border-active hover:bg-bg-elevated/40"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-txt-primary truncate max-w-[130px]" title={a.run_id}>
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
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-txt-muted">
                        <span className="truncate max-w-[120px]">{a.dataset_id}</span>
                        <span>{a.elapsed_seconds}s</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-txt-muted">
                  No local audit runs recorded yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Workstation Shortcuts */}
          <Card elevated>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Research Workstation Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-start gap-2.5 text-xs"
                onClick={() => {
                  setActiveStage("MATRIX");
                  navigate("/heatmap");
                }}
              >
                <Layers className="h-3.5 w-3.5 text-accent-secondary" />
                Inspect Cross-Class Smell Matrix
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-start gap-2.5 text-xs"
                onClick={() => {
                  setActiveStage("DIAGNOSE");
                  navigate("/diagnostics");
                }}
              >
                <Microscope className="h-3.5 w-3.5 text-status-warning" />
                Shortcut Diagnostic Lab
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-start gap-2.5 text-xs"
                onClick={() => {
                  setActiveStage("REMEDIATE");
                  navigate("/remediation");
                }}
              >
                <ShieldCheck className="h-3.5 w-3.5 text-status-success" />
                Configure Safe Remediation (RSM)
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="w-full justify-start gap-2.5 text-xs"
                onClick={() => {
                  setActiveStage("VERIFY");
                  navigate("/reports");
                }}
              >
                <FileText className="h-3.5 w-3.5 text-accent-primary" />
                Generate Offline HTML Audit Report
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
