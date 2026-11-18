import React, { useState, useEffect } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import {
  ShieldAlert,
  Database,
  LayoutDashboard,
  Grid3X3,
  Microscope,
  Sliders,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  Activity,
  HelpCircle,
  Hash,
  ExternalLink,
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
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "WORKSPACE",
    items: [
      { name: "Overview", path: "/overview", icon: <LayoutDashboard className="h-4 w-4" /> },
      { name: "Dataset Ingestion", path: "/ingestion", icon: <Database className="h-4 w-4" /> },
    ],
  },
  {
    title: "RESEARCH ANALYSIS",
    items: [
      { name: "Smell Matrix", path: "/heatmap", icon: <Grid3X3 className="h-4 w-4" /> },
      { name: "Shortcut Diagnostics", path: "/diagnostics", icon: <Microscope className="h-4 w-4" /> },
    ],
  },
  {
    title: "EXPERIMENTATION",
    items: [
      { name: "Remediation Lab", path: "/remediation", icon: <Sliders className="h-4 w-4" /> },
      { name: "Verification & Reports", path: "/reports", icon: <FileCheck className="h-4 w-4" /> },
    ],
  },
];

export const AppShell: React.FC = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const { activeDatasetId, activeRunId, latestRunResult } = useAuditContext();

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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-main text-txt-primary">
      {/* Left Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r border-border bg-bg-sidebar transition-all duration-300 select-none z-30 shrink-0",
          collapsed ? "w-16" : "w-[250px]"
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

        {/* Navigation Sections */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-2.5 py-4 scrollbar-thin">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              {!collapsed && (
                <p className="px-2.5 py-1 text-[10px] font-bold tracking-widest text-txt-muted/80 uppercase">
                  {section.title}
                </p>
              )}
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all group relative",
                      isActive
                        ? "bg-accent-primary/15 text-white font-semibold border border-accent-primary/30"
                        : "text-txt-secondary hover:bg-bg-elevated/70 hover:text-txt-primary"
                    )}
                    title={collapsed ? item.name : undefined}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-accent-primary rounded-r" />
                    )}
                    <span
                      className={cn(
                        "transition-colors",
                        isActive ? "text-accent-secondary" : "text-txt-muted group-hover:text-txt-primary"
                      )}
                    >
                      {item.icon}
                    </span>
                    {!collapsed && <span className="truncate">{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Status Footer */}
        <div className="border-t border-border bg-bg-main/60 p-3 space-y-2">
          {!collapsed && (
            <div className="rounded-lg bg-bg-card p-2.5 border border-border text-[11px] space-y-1.5 shadow-sm">
              <div className="flex items-center justify-between text-txt-muted">
                <span className="text-[10px] uppercase tracking-wider">Dataset</span>
                <span
                  className="font-mono text-txt-primary font-semibold truncate max-w-[120px]"
                  title={activeDatasetId || "None"}
                >
                  {activeDatasetId || "None"}
                </span>
              </div>
              {activeRunId && (
                <div className="flex items-center justify-between text-txt-muted">
                  <span className="text-[10px] uppercase tracking-wider">Active Run</span>
                  <span
                    className="font-mono text-accent-secondary font-semibold truncate max-w-[120px]"
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
                  {backendOnline ? "Local Core (v2.0)" : "Connecting..."}
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
            {/* Active split hash / run status badge */}
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
            <div className="hidden md:flex items-center gap-2 rounded-full border border-accent-primary/25 bg-accent-primary/10 px-3 py-1 text-xs text-accent-secondary">
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
            Local-First Execution · Cryptographic Audit Lineage · Zero Remote Telemetry
          </span>
        </footer>
      </div>

      {/* Methodology Help Modal */}
      <Modal
        open={showHelpModal}
        onOpenChange={setShowHelpModal}
        title="SmellScope 2.0 Scientific Auditor Guide"
        description="Dataset trust intelligence, shortcut diagnostics, and remediation methodology."
        maxWidth="xl"
      >
        <div className="space-y-4 text-xs text-txt-secondary leading-relaxed">
          <div className="p-3.5 rounded-lg border border-border bg-bg-elevated/50 space-y-2">
            <h4 className="font-bold text-txt-primary">Scientific Diagnostic Capabilities:</h4>
            <ul className="list-disc pl-4 space-y-1.5 text-txt-muted">
              <li>
                <strong className="text-txt-primary">UGT (Unassigned/Ghost Traffic):</strong> Detects
                attacks exploiting port numbers unassigned by IANA or silent on the receiver.
              </li>
              <li>
                <strong className="text-txt-primary">WL (Window Length Anomaly):</strong> Measures
                packet length periodicity and 4-gram repetition artifacts.
              </li>
              <li>
                <strong className="text-txt-primary">HDF (High Dimension Feature Dominance):</strong> Gini
                concentration of single-feature classification importances.
              </li>
              <li>
                <strong className="text-txt-primary">PDD (Partition Distance Disparity):</strong> Cluster
                disparity between benign and attack classes in KMeans feature space.
              </li>
              <li>
                <strong className="text-txt-primary">TC (Temporal Concentration):</strong> Quantifies
                burst clustering within anomalous inter-arrival temporal windows.
              </li>
              <li>
                <strong className="text-txt-primary">Null-Calibrated SFI:</strong> Shortcut Fragility
                Index evaluated against a Monte Carlo null distribution to prevent false alarms.
              </li>
              <li>
                <strong className="text-txt-primary">GGI (Generalisation Gap Index):</strong> Measures
                performance collapse across cross-subtype test splits.
              </li>
            </ul>
          </div>

          <div className="p-3 rounded-lg border border-border bg-bg-card space-y-1">
            <h4 className="font-bold text-txt-primary">Remediation Safety Monitor (RSM):</h4>
            <p className="text-txt-muted">
              Enforces non-negotiable safety guardrails (G1–G5) on all counterfactual training views.
              Prevents class collapse, feature erasure, and test contamination. Every remediation is
              cryptographically hashed and fully reversible.
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
