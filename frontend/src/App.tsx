import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuditProvider } from "@/stores/AuditContext";
import { AppShell } from "@/layouts/AppShell";
import { OverviewScreen } from "@/features/overview/OverviewScreen";
import { IngestionScreen } from "@/features/ingestion/IngestionScreen";
import { SmellMatrixScreen } from "@/features/heatmap/SmellMatrixScreen";
import { ShortcutDiagnosticsScreen } from "@/features/diagnostics/ShortcutDiagnosticsScreen";
import { RemediationScreen } from "@/features/remediation/RemediationScreen";
import { ReportsScreen } from "@/features/reports/ReportsScreen";

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
              <Route path="/" element={<Navigate to="/overview" replace />} />
              <Route path="/overview" element={<OverviewScreen />} />
              <Route path="/ingestion" element={<IngestionScreen />} />
              <Route path="/heatmap" element={<SmellMatrixScreen />} />
              <Route path="/diagnostics" element={<ShortcutDiagnosticsScreen />} />
              <Route path="/remediation" element={<RemediationScreen />} />
              <Route path="/reports" element={<ReportsScreen />} />
              <Route path="*" element={<Navigate to="/overview" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuditProvider>
    </QueryClientProvider>
  );
};

export default App;
