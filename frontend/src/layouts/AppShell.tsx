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
  Server,
  Activity,
  AlertCircle,
  HelpCircle,
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
    title: "RESEARCH",
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
  const { activeDatasetId, activeRunId } = useAuditContext();

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
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-primary/20 border border-accent-primary/40 text-accent-cyan shadow-md">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-wider text-txt-primary">SMELLSCOPE</h1>
                <p className="text-[10px] font-semibold tracking-wider text-accent-cyan uppercase">
                  Dataset Auditor
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-accent-primary/20 text-accent-cyan">
              <ShieldAlert className="h-5 w-5" />
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-md p-1.5 text-txt-muted hover:bg-bg-elevated hover:text-txt-primary transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-1">
              {!collapsed && (
                <p className="px-3 text-[10px] font-bold tracking-widest text-txt-muted uppercase">
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
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all group",
                      isActive
                        ? "bg-accent-primary text-white shadow-md shadow-accent-primary/20 font-semibold"
                        : "text-txt-secondary hover:bg-bg-elevated hover:text-txt-primary"
                    )}
                    title={collapsed ? item.name : undefined}
                  >
                    <span className={cn("transition-colors", isActive ? "text-white" : "text-txt-muted group-hover:text-accent-cyan")}>
                      {item.icon}
                    </span>
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Status Footer */}
        <div className="border-t border-border bg-bg-main/50 p-3 space-y-2">
          {!collapsed && (
            <>
              <div className="rounded-md bg-bg-card p-2 border border-border/80 text-[11px] space-y-1">
                <div className="flex items-center justify-between text-txt-muted">
                  <span>Dataset:</span>
                  <span className="font-mono text-txt-primary truncate max-w-[120px]" title={activeDatasetId || "None"}>
                    {activeDatasetId || "None"}
                  </span>
                </div>
                {activeRunId && (
                  <div className="flex items-center justify-between text-txt-muted">
                    <span>Run:</span>
                    <span className="font-mono text-accent-cyan truncate max-w-[120px]" title={activeRunId}>
                      {activeRunId.replace("run_", "")}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Connection Status Indicator */}
          <div className={cn("flex items-center gap-2 px-1 text-[11px]", collapsed ? "justify-center" : "")}>
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                backendOnline === true ? "bg-status-success animate-pulse" : backendOnline === false ? "bg-status-block" : "bg-txt-muted"
              )}
            />
            {!collapsed && (
              <span className="text-txt-muted flex items-center justify-between w-full">
                <span>{backendOnline ? "Local Core (v2.0)" : "Connecting..."}</span>
                <span className="font-mono text-[10px]">127.0.0.1</span>
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex flex-1 flex-col overflow-hidden bg-bg-workspace">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-border px-6 bg-bg-card/70 backdrop-blur-md z-20">
          <div className="flex items-center gap-4">
            <WorkflowBar />
          </div>

          <div className="flex items-center gap-4">
            {/* Scientific Auditor Notice */}
            <div className="hidden lg:flex items-center gap-2 rounded-full border border-accent-primary/30 bg-accent-primary/10 px-3 py-1 text-xs text-accent-cyan">
              <Activity className="h-3.5 w-3.5 text-accent-cyan" />
              <span>Scientific Auditor · NIDS Benchmark Trust</span>
            </div>

            {/* Help Button */}
            <button
              onClick={() => setShowHelpModal(true)}
              className="rounded-lg p-2 text-txt-muted hover:bg-bg-elevated hover:text-txt-primary transition-colors border border-transparent hover:border-border"
              title="Methodology & Help"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
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
          <div className="p-3 rounded-lg border border-border bg-bg-elevated/50">
            <h4 className="font-bold text-txt-primary mb-1">Core Capability Suite:</h4>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>UGT:</strong> Unassigned / Ghost Port Traffic leakage.</li>
              <li><strong>WL:</strong> 4-gram Window Length repetition anomalies.</li>
              <li><strong>HDF:</strong> High Dimension Feature dominance (single-feature shortcut).</li>
              <li><strong>PDD:</strong> Partition Distance Disparity via KMeans flow clustering.</li>
              <li><strong>TC:</strong> Temporal Concentration burst clustering.</li>
              <li><strong>Null-Calibrated SFI:</strong> Shortcut Fragility Index with Monte Carlo null distribution.</li>
              <li><strong>GGI:</strong> Generalisation Gap Index measuring cross-subtype vulnerability.</li>
            </ul>
          </div>
          <p>
            <strong>Scientific Disclaimer:</strong> SmellScope is designed strictly for offline auditing of intrusion detection system benchmark datasets. It does NOT monitor live network traffic or defend active networks.
          </p>
        </div>
      </Modal>
    </div>
  );
};
