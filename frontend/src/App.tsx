import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuditProvider } from "@/stores/AuditContext";
import { AppShell } from "@/layouts/AppShell";
import { HomeScreen } from "@/features/home/HomeScreen";
import { DatasetScreen } from "@/features/dataset/DatasetScreen";
import { AuditScreen } from "@/features/audit/AuditScreen";
import { FindingsScreen } from "@/features/findings/FindingsScreen";
import { RemediationScreen } from "@/features/remediation/RemediationScreen";
import { ReportsScreen } from "@/features/reports/ReportsScreen";
import { ImprovementScreen } from "@/features/improvement/ImprovementScreen";
import { ComparisonScreen } from "@/features/comparison/ComparisonScreen";
import { HistoryScreen } from "@/features/history/HistoryScreen";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
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
