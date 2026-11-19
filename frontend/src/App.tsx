import React, { lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuditProvider } from "@/stores/AuditContext";
import { AppShell } from "@/layouts/AppShell";
import { HomeScreen } from "@/features/home/HomeScreen";

// Heavy screens are code-split so the first paint only downloads the shell and home screen.
const DatasetScreen = lazy(() => import("@/features/dataset/DatasetScreen").then((m) => ({ default: m.DatasetScreen })));
const AuditScreen = lazy(() => import("@/features/audit/AuditScreen").then((m) => ({ default: m.AuditScreen })));
const FindingsScreen = lazy(() => import("@/features/findings/FindingsScreen").then((m) => ({ default: m.FindingsScreen })));
const RemediationScreen = lazy(() => import("@/features/remediation/RemediationScreen").then((m) => ({ default: m.RemediationScreen })));
const ReportsScreen = lazy(() => import("@/features/reports/ReportsScreen").then((m) => ({ default: m.ReportsScreen })));
const ImprovementScreen = lazy(() => import("@/features/improvement/ImprovementScreen").then((m) => ({ default: m.ImprovementScreen })));
const ComparisonScreen = lazy(() => import("@/features/comparison/ComparisonScreen").then((m) => ({ default: m.ComparisonScreen })));
const HistoryScreen = lazy(() => import("@/features/history/HistoryScreen").then((m) => ({ default: m.HistoryScreen })));

// Warm the chunk cache once the first screen has rendered so navigation never waits on the network.
const prefetchScreens = () => {
  void import("@/features/dataset/DatasetScreen");
  void import("@/features/audit/AuditScreen");
  void import("@/features/findings/FindingsScreen");
  void import("@/features/improvement/ImprovementScreen");
  void import("@/features/comparison/ComparisonScreen");
  void import("@/features/reports/ReportsScreen");
  void import("@/features/remediation/RemediationScreen");
  void import("@/features/history/HistoryScreen");
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  useEffect(() => {
    const w = window as any;
    const handle = w.requestIdleCallback ? w.requestIdleCallback(prefetchScreens) : window.setTimeout(prefetchScreens, 800);
    return () => (w.cancelIdleCallback ? w.cancelIdleCallback(handle) : window.clearTimeout(handle));
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuditProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              {/* Home Starting Point */}
              <Route path="/" element={<HomeScreen />} />
              <Route path="/home" element={<Navigate to="/" replace />} />
              <Route path="/overview" element={<HomeScreen />} />

              {/* Primary 5-Stage Scientific Destinations */}
              {/* Stage 1: Dataset (Steps 1, 2, 3) */}
              <Route path="/dataset" element={<DatasetScreen />} />
              <Route path="/ingestion" element={<Navigate to="/dataset" replace />} />

              {/* Stage 2: Audit (Steps 4, 5, 6, 7) */}
              <Route path="/audit" element={<AuditScreen />} />

              {/* Stage 3: Findings (Step 8) */}
              <Route path="/findings" element={<FindingsScreen />} />
              <Route path="/heatmap" element={<Navigate to="/findings" replace />} />
              <Route path="/matrix" element={<Navigate to="/findings" replace />} />
              <Route path="/diagnostics" element={<Navigate to="/findings" replace />} />

              {/* Stage 4: Remediation (Steps 9, 10, 11) */}
              <Route path="/remediation" element={<RemediationScreen />} />

              {/* Improvement Centre (Dataset Repair) */}
              <Route path="/improvement" element={<ImprovementScreen />} />
              <Route path="/comparison" element={<ComparisonScreen />} />

              {/* Stage 5: Verify & Report (Steps 12, 13) */}
              <Route path="/reports" element={<ReportsScreen />} />
              <Route path="/export" element={<Navigate to="/reports" replace />} />
              <Route path="/audit-log" element={<Navigate to="/reports" replace />} />

              {/* History */}
              <Route path="/history" element={<HistoryScreen />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuditProvider>
    </QueryClientProvider>
  );
};

export default App;
