import React, { useState, useEffect } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import {
  ShieldAlert,
  Database,
  LayoutDashboard,
  Microscope,
  Sliders,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  Activity,
  HelpCircle,
  Hash,
  Sparkles,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { useAuditContext } from "@/stores/AuditContext";
import { WorkflowBar } from "@/components/common/WorkflowBar";
import { api } from "@/api/client";
import { Modal } from "@/components/ui/Modal";

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  badge?: string;
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { name: "Home", path: "/", icon: <LayoutDashboard className="h-4 w-4" /> },
  { name: "Dataset", path: "/dataset", icon: <Database className="h-4 w-4" /> },
  { name: "Audit", path: "/audit", icon: <Activity className="h-4 w-4" /> },
  { name: "Findings", path: "/findings", icon: <Microscope className="h-4 w-4" /> },
  { name: "Remediation", path: "/remediation", icon: <Sliders className="h-4 w-4" />, badge: "OPTIONAL" },
  { name: "Verify & Report", path: "/reports", icon: <FileCheck className="h-4 w-4" /> },
];

export const AppShell: React.FC = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const { activeDatasetId, activeRunId, latestRunResult, viewMode, setViewMode } = useAuditContext();

  useEffect(() => {
    let mounted = true;
    const checkBackend = async () => {
      try {
        await api.getHealth();
        if (mounted) setBackendOnline(true);
      } catch {
        if (mounted) setBackendOnline(false);
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const isNavActive = (itemPath: string) => {
    const p = location.pathname;
    if (itemPath === "/") {
      return p === "/" || p === "/home" || p === "/overview";
    }
    if (itemPath === "/dataset") {
      return p.startsWith("/dataset") || p.startsWith("/ingestion");
    }
    if (itemPath === "/audit") {
      return p.startsWith("/audit");
    }
    if (itemPath === "/findings") {
      return p.startsWith("/findings") || p.startsWith("/heatmap") || p.startsWith("/diagnostics") || p.startsWith("/matrix");
    }
    if (itemPath === "/remediation") {
      return p.startsWith("/remediation");
    }
    if (itemPath === "/reports") {
      return p.startsWith("/reports") || p.startsWith("/export") || p.startsWith("/audit-log");
    }
    return p.startsWith(itemPath);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-main text-txt-primary">
      {/* Left Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r border-border bg-bg-sidebar transition-all duration-300 select-none z-30 shrink-0",
          collapsed ? "w-16" : "w-[240px]"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-3.5">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary/15 border border-accent-primary/40 text-accent-secondary shrink-0 shadow-sm">
                <ShieldAlert className="h-4.5 w-4.5" />
              </div>
              <div className="truncate">
                <h1 className="text-sm font-bold tracking-wider text-txt-primary leading-tight">
                  SMELLSCOPE
                </h1>
                <p className="text-[9px] font-medium tracking-tight text-accent-secondary uppercase truncate">
                  Dataset Auditor
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary/15 text-accent-secondary">
              <ShieldAlert className="h-4 w-4" />
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-md p-1 text-txt-muted hover:bg-bg-elevated hover:text-txt-primary transition-colors shrink-0"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Primary Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-4 scrollbar-thin">
          {!collapsed && (
            <p className="px-2.5 py-1 text-[10px] font-bold tracking-widest text-txt-muted/80 uppercase">
              WORKFLOW
            </p>
          )}
          {PRIMARY_NAV_ITEMS.map((item) => {
            const isActive = isNavActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-all group relative",
                  isActive
                    ? "bg-accent-primary/15 text-white font-semibold border border-accent-primary/30"
                    : "text-txt-secondary hover:bg-bg-elevated/70 hover:text-txt-primary"
                )}
                title={collapsed ? item.name : undefined}
              >
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-accent-primary rounded-r" />
                )}
                <div className="flex items-center gap-2.5 truncate">
                  <span
                    className={cn(
                      "transition-colors shrink-0",
                      isActive ? "text-accent-secondary" : "text-txt-muted group-hover:text-txt-primary"
                    )}
                  >
                    {item.icon}
                  </span>
                  {!collapsed && <span className="truncate">{item.name}</span>}
                </div>
                {!collapsed && item.badge && (
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-bg-elevated text-txt-muted border border-border">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Status Footer */}
        <div className="border-t border-border bg-bg-main/60 p-3 space-y-2">
          {!collapsed && (
            <div className="rounded-lg bg-bg-card p-2.5 border border-border text-[11px] space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between text-txt-muted">
                <span className="text-[10px] uppercase tracking-wider">Dataset</span>
                <span
                  className="font-mono text-txt-primary font-semibold truncate max-w-[110px]"
                  title={activeDatasetId || "None"}
                >
                  {activeDatasetId || "None"}
                </span>
              </div>
              {activeRunId && (
                <div className="flex items-center justify-between text-txt-muted">
                  <span className="text-[10px] uppercase tracking-wider">Active Run</span>
                  <span
                    className="font-mono text-accent-secondary font-semibold truncate max-w-[110px]"
                    title={activeRunId}
                  >
                    {activeRunId.replace("run_", "")}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Connection Status Indicator */}
          <div
            className={cn(
              "flex items-center gap-2 px-1 text-[11px]",
              collapsed ? "justify-center" : "justify-between"
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "h-2 w-2 rounded-full shrink-0",
                  backendOnline === true
                    ? "bg-status-success animate-pulse"
                    : backendOnline === false
                    ? "bg-status-block"
                    : "bg-txt-muted"
                )}
              />
              {!collapsed && (
                <span className="text-txt-muted text-[11px]">
                  {backendOnline ? "Local Core (v2.1)" : "Connecting..."}
                </span>
              )}
            </div>
            {!collapsed && (
              <span className="font-mono text-[10px] text-txt-muted/70">127.0.0.1</span>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex flex-1 flex-col overflow-hidden bg-bg-workspace">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-border px-6 bg-bg-card/80 backdrop-blur-md z-20 shrink-0">
          <div className="flex items-center gap-4 overflow-x-auto py-1">
            <WorkflowBar />
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="hidden sm:flex rounded-lg border border-border bg-bg-card p-0.5 text-xs">
              <button
                onClick={() => setViewMode("basic")}
                className={cn(
                  "px-2.5 py-1 rounded text-xs transition-all",
                  viewMode === "basic"
                    ? "bg-accent-primary text-white font-bold shadow-sm"
                    : "text-txt-muted hover:text-txt-primary"
                )}
              >
                Basic
              </button>
              <button
                onClick={() => setViewMode("advanced")}
                className={cn(
                  "px-2.5 py-1 rounded text-xs transition-all",
                  viewMode === "advanced"
                    ? "bg-accent-primary text-white font-bold shadow-sm"
                    : "text-txt-muted hover:text-txt-primary"
                )}
              >
                Advanced
              </button>
            </div>

            {/* Split Hash Badge */}
            {latestRunResult && (
              <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-bg-elevated border border-border text-[11px] font-mono text-txt-muted">
                <Hash className="h-3 w-3 text-accent-secondary" />
                <span>Split:</span>
                <span className="text-txt-primary font-semibold">
                  {latestRunResult.split.split_hash.slice(0, 8)}
                </span>
              </div>
            )}

            {/* Scientific Auditor Notice */}
            <div className="hidden lg:flex items-center gap-2 rounded-full border border-accent-primary/25 bg-accent-primary/10 px-3 py-1 text-xs text-accent-secondary">
              <Activity className="h-3.5 w-3.5 text-accent-secondary shrink-0" />
              <span className="font-medium">Scientific Auditor · NIDS Benchmark Trust</span>
            </div>

            {/* Help Button */}
            <button
              onClick={() => setShowHelpModal(true)}
              className="rounded-lg p-2 text-txt-muted hover:bg-bg-elevated hover:text-txt-primary transition-colors border border-transparent hover:border-border"
              title="Methodology & Documentation"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <Outlet />
        </main>

        {/* Scientific Disclaimer Footer Banner */}
        <footer className="border-t border-border bg-bg-card/95 px-6 py-2 text-[11px] text-txt-muted flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-3.5 w-3.5 text-accent-secondary shrink-0" />
            <span>
              SmellScope is a scientific benchmark dataset auditor, <strong>NOT</strong> an active
              intrusion detection system.
            </span>
          </div>
          <span className="hidden sm:inline font-mono text-[10px] text-txt-muted/70">
            Local-First Execution · Cryptographic Lineage · Zero Remote Telemetry
          </span>
        </footer>
      </div>

      {/* Methodology Help Modal */}
      <Modal
        open={showHelpModal}
        onOpenChange={setShowHelpModal}
        title="SmellScope 2.1 Scientific Auditor Guide"
        description="Dataset trust intelligence, shortcut diagnostics, and remediation methodology."
        maxWidth="xl"
      >
        <div className="space-y-4 text-xs text-txt-secondary leading-relaxed">
          <div className="p-3.5 rounded-lg border border-border bg-bg-elevated/50 space-y-2">
            <h4 className="font-bold text-txt-primary">Five Scientific Dataset Smells:</h4>
            <ul className="list-disc pl-4 space-y-1.5 text-txt-muted">
              <li>
                <strong className="text-txt-primary">UGT (Unclear Ground Truth):</strong> Checks whether the dataset's attack labels and underlying evidence are sufficiently clear.
              </li>
              <li>
                <strong className="text-txt-primary">WL (Wrong Labels / Repetition):</strong> Looks for suspicious, repetitive, or potentially incorrect packet length patterns.
              </li>
              <li>
                <strong className="text-txt-primary">HDF (Highly Dependent Features):</strong> Checks whether features are strongly related in ways that make the model's task artificially easy.
              </li>
              <li>
                <strong className="text-txt-primary">PDD (Poor Data Diversity):</strong> Looks for a lack of variation in network traffic characteristics.
              </li>
              <li>
                <strong className="text-txt-primary">TC (Traffic Collapse):</strong> Checks for unrealistic burst patterns in traffic composition or collection timing.
              </li>
              <li>
                <strong className="text-txt-primary">SFI (Shortcut Fragility Index):</strong> Measures how sensitive a model is to changes in selected features compared with a Monte Carlo null reference.
              </li>
              <li>
                <strong className="text-txt-primary">GGI (Generalisation Gap Index):</strong> Summarises performance drop between standard splits and held-out attack variations.
              </li>
            </ul>
          </div>

          <div className="p-3 rounded-lg border border-border bg-bg-card space-y-1">
            <h4 className="font-bold text-txt-primary">Remediation Safety Monitor (RSM):</h4>
            <p className="text-txt-muted">
              Enforces non-negotiable safety guardrails (G1–G5) on all counterfactual training views.
              Remediation is completely optional. All changes are verified on locked test sets and reversible.
            </p>
          </div>

          <p className="text-[11px] text-txt-muted">
            <strong>Important Scientific Notice:</strong> SmellScope does not monitor live traffic or
            block active cyberattacks. Its sole function is to assess the trustworthiness of machine-learning
            evaluations on static intrusion detection benchmark datasets.
          </p>
        </div>
      </Modal>
    </div>
  );
};
