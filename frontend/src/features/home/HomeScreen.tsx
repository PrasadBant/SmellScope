import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Play,
  Database,
  Microscope,
  Sliders,
  FileCheck,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Activity,
  History,
  Layers,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MetricCard } from "@/components/ui/MetricCard";
import { EvidenceBadge } from "@/components/ui/EvidenceBadge";
import { useAuditContext } from "@/stores/AuditContext";
import { api } from "@/api/client";
import { AuditStatus } from "@/types/api";
import { formatNumber, formatPercent } from "@/utils/cn";

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    activeDatasetId,
    activeRunId,
    setActiveRunId,
    setActiveStage,
    latestRunResult,
    setLatestRunResult,
    onboardingDismissed,
    setOnboardingDismissed,
  } = useAuditContext();

  const [audits, setAudits] = useState<AuditStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchAudits = async () => {
      try {
        const list = await api.listAudits();
        if (mounted) {
          setAudits(list);
          if (!activeRunId && list.length > 0) {
            const completed = list.find((a) => a.status === "COMPLETED") || list[0];
            setActiveRunId(completed.run_id);
          }
        }
        const targetRun = activeRunId || (list.length > 0 ? list[0].run_id : null);
        if (targetRun) {
          try {
            const res = await api.getAuditResults(targetRun);
            if (mounted) setLatestRunResult(res);
          } catch {
            // Pending
          }
        }
      } catch (err) {
        console.error("Failed to load audit records", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchAudits();
  }, [activeRunId]);

  const flaggedClasses = latestRunResult
    ? latestRunResult.classes.filter((c) => c.sfi.flag)
    : [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-bg-card via-bg-elevated to-bg-card p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent-primary/30 bg-accent-primary/10 px-3 py-1 text-xs font-semibold text-accent-secondary">
            <Sparkles className="h-3.5 w-3.5 text-accent-secondary" />
            <span>SMELLSCOPE 2.1 — BEGINNER-FRIENDLY SCIENTIFIC WORKSTATION</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-txt-primary">
            Understand whether your NIDS benchmark dataset can be trusted.
          </h1>

          <p className="text-xs md:text-sm text-txt-secondary leading-relaxed">
            SmellScope examines benchmark intrusion datasets for experimental design problems,
            artificial protocol leakage, and investigates whether machine-learning evaluation results
            depend on suspicious dataset-specific shortcuts.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                setActiveStage("AUDIT");
                navigate("/audit");
              }}
              className="gap-2 font-bold"
            >
              <Play className="h-4 w-4 fill-current" />
              START YOUR FIRST AUDIT
            </Button>

            {latestRunResult && (
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  setActiveStage("FINDINGS");
                  navigate("/findings");
                }}
                className="gap-2"
              >
                <Microscope className="h-4 w-4 text-accent-secondary" />
                View Current Findings
              </Button>
            )}
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-accent-primary/10 blur-3xl pointer-events-none" />
      </div>

      {/* 3 Simple Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="hover:border-accent-primary/50 transition-all cursor-pointer group p-1"
          onClick={() => {
            setActiveStage("AUDIT");
            navigate("/audit");
          }}
        >
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-lg bg-bg-elevated border border-border text-accent-secondary group-hover:bg-accent-primary/15 transition-colors">
                <Database className="h-5 w-5" />
              </div>
              <span className="text-xs font-mono font-bold text-txt-muted">STEP 1 & 2</span>
            </div>
            <h3 className="text-base font-bold text-txt-primary group-hover:text-accent-secondary transition-colors">
              1. Audit a Dataset
            </h3>
            <p className="text-xs text-txt-muted leading-relaxed">
              Upload local CSV/Parquet files or select pre-calibrated benchmarks to detect protocol leakage and experimental design flaws.
            </p>
          </CardContent>
        </Card>

        <Card
          className="hover:border-accent-primary/50 transition-all cursor-pointer group p-1"
          onClick={() => {
            setActiveStage("FINDINGS");
            navigate("/findings");
          }}
        >
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-lg bg-bg-elevated border border-border text-status-warning group-hover:bg-status-warning/15 transition-colors">
                <Microscope className="h-5 w-5" />
              </div>
              <span className="text-xs font-mono font-bold text-txt-muted">STEP 3</span>
            </div>
            <h3 className="text-base font-bold text-txt-primary group-hover:text-accent-secondary transition-colors">
              2. Investigate Findings
            </h3>
            <p className="text-xs text-txt-muted leading-relaxed">
              Explore the five dataset smells, examine null-calibrated SFI curves, and understand feature controllability risks.
            </p>
          </CardContent>
        </Card>

        <Card
          className="hover:border-accent-primary/50 transition-all cursor-pointer group p-1"
          onClick={() => {
            setActiveStage("REPORTS");
            navigate("/reports");
          }}
        >
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="p-2.5 rounded-lg bg-bg-elevated border border-border text-status-success group-hover:bg-status-success/15 transition-colors">
                <FileCheck className="h-5 w-5" />
              </div>
              <span className="text-xs font-mono font-bold text-txt-muted">STEP 4 & 5</span>
            </div>
            <h3 className="text-base font-bold text-txt-primary group-hover:text-accent-secondary transition-colors">
              3. Verify & Report
            </h3>
            <p className="text-xs text-txt-muted leading-relaxed">
              Verify models on locked test sets and download self-contained offline HTML audit reports with cryptographic lineage.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Optional First-Time Onboarding Checklist */}
      {!onboardingDismissed && (
        <Card className="border-accent-primary/30 bg-bg-card/90">
          <CardHeader className="py-3 px-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-status-success" />
              <CardTitle className="text-xs font-bold uppercase tracking-wider">
                First-Time Auditor Checklist
              </CardTitle>
            </div>
            <button
              onClick={() => setOnboardingDismissed(true)}
              className="text-txt-muted hover:text-txt-primary p-1 rounded text-xs flex items-center gap-1"
              title="Dismiss checklist"
            >
              <span>Dismiss</span>
              <X className="h-3.5 w-3.5" />
            </button>
          </CardHeader>
          <CardContent className="p-4 pt-1 grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
            <div className="p-2 rounded bg-bg-elevated/60 border border-border/60 flex items-center gap-2">
              <span className="h-4 w-4 rounded-full bg-status-success/20 text-status-success flex items-center justify-center text-[10px] font-bold">1</span>
              <span className="text-txt-secondary text-[11px]">Select Dataset</span>
            </div>
            <div className="p-2 rounded bg-bg-elevated/60 border border-border/60 flex items-center gap-2">
              <span className="h-4 w-4 rounded-full bg-status-success/20 text-status-success flex items-center justify-center text-[10px] font-bold">2</span>
              <span className="text-txt-secondary text-[11px]">Validate Schema</span>
            </div>
            <div className="p-2 rounded bg-bg-elevated/60 border border-border/60 flex items-center gap-2">
              <span className="h-4 w-4 rounded-full bg-accent-primary/20 text-accent-secondary flex items-center justify-center text-[10px] font-bold">3</span>
              <span className="text-txt-secondary text-[11px]">Configure Audit</span>
            </div>
            <div className="p-2 rounded bg-bg-elevated/60 border border-border/60 flex items-center gap-2">
              <span className="h-4 w-4 rounded-full bg-accent-primary/20 text-accent-secondary flex items-center justify-center text-[10px] font-bold">4</span>
              <span className="text-txt-secondary text-[11px]">Run Analysis</span>
            </div>
            <div className="p-2 rounded bg-bg-elevated/60 border border-border/60 flex items-center gap-2">
              <span className="h-4 w-4 rounded-full bg-txt-muted/20 text-txt-muted flex items-center justify-center text-[10px] font-bold">5</span>
              <span className="text-txt-secondary text-[11px]">Review Findings</span>
            </div>
            <div className="p-2 rounded bg-bg-elevated/60 border border-border/60 flex items-center gap-2">
              <span className="h-4 w-4 rounded-full bg-txt-muted/20 text-txt-muted flex items-center justify-center text-[10px] font-bold">6</span>
              <span className="text-txt-secondary text-[11px]">Export Report</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active / Recent Audit Summary (If available) */}
      {latestRunResult ? (
        <Card>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between w-full">
              <div className="space-y-0.5">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-accent-secondary" />
                  Most Recent Audit Summary
                </CardTitle>
                <CardDescription>
                  Run ID: <span className="font-mono text-txt-primary">{latestRunResult.run_id}</span>
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveStage("FINDINGS");
                    navigate("/findings");
                  }}
                  className="text-xs"
                >
                  Explore Findings <ArrowRight className="h-3 w-3" />
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setActiveStage("REPORTS");
                    navigate("/reports");
                  }}
                  className="text-xs"
                >
                  Generate Report
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-bg-elevated border border-border">
                <span className="text-txt-muted block text-[10px] uppercase font-semibold">Benchmark Dataset</span>
                <strong className="text-sm font-mono text-txt-primary">{latestRunResult.dataset.schema_id}</strong>
                <span className="text-[10px] text-txt-muted block mt-0.5">{formatNumber(latestRunResult.dataset.n_rows_loaded)} flows</span>
              </div>
              <div className="p-3 rounded-lg bg-bg-elevated border border-border">
                <span className="text-txt-muted block text-[10px] uppercase font-semibold">Audited Classes</span>
                <strong className="text-sm font-mono text-txt-primary">{latestRunResult.classes.length} attack classes</strong>
                <span className="text-[10px] text-txt-muted block mt-0.5">Split: {latestRunResult.split.split_hash.slice(0, 8)}...</span>
              </div>
              <div className="p-3 rounded-lg bg-bg-elevated border border-border">
                <span className="text-txt-muted block text-[10px] uppercase font-semibold">Shortcut Suspects</span>
                <strong className={`text-sm font-mono ${flaggedClasses.length > 0 ? "text-status-block" : "text-status-success"}`}>
                  {flaggedClasses.length > 0 ? `${flaggedClasses.length} classes flagged` : "0 flagged (Clean)"}
                </strong>
                <span className="text-[10px] text-txt-muted block mt-0.5">Null Monte Carlo checked</span>
              </div>
              <div className="p-3 rounded-lg bg-bg-elevated border border-border">
                <span className="text-txt-muted block text-[10px] uppercase font-semibold">Evaluation Status</span>
                <strong className="text-sm font-mono text-status-success">VERIFIED LOCKED</strong>
                <span className="text-[10px] text-txt-muted block mt-0.5">{latestRunResult.runtime.total_seconds}s runtime</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-txt-muted space-y-2">
            <Database className="h-8 w-8 mx-auto text-txt-muted/50" />
            <h4 className="text-sm font-semibold text-txt-primary">No Audits Run in this Session</h4>
            <p className="text-xs max-w-sm mx-auto">
              Click "Start Your First Audit" above to select a benchmark dataset and analyze it for statistical shortcuts.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Scientific Auditor Non-Detection Notice */}
      <div className="p-3.5 rounded-xl border border-border bg-bg-elevated/40 flex items-start gap-3 text-xs text-txt-muted leading-relaxed">
        <ShieldAlert className="h-4 w-4 text-accent-secondary shrink-0 mt-0.5" />
        <div>
          <strong className="text-txt-primary">Important Scientific Purpose:</strong> SmellScope is designed
          strictly as a scientific auditor of Network Intrusion Detection System benchmark datasets.
          It does <strong>NOT</strong> detect live cyberattacks or monitor active network traffic.
        </div>
      </div>
    </div>
  );
};
