import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuditProvider } from "@/stores/AuditContext";
import { AppShell } from "@/layouts/AppShell";
import { HomeScreen } from "@/features/home/HomeScreen";
import { NewAuditScreen } from "@/features/audit/NewAuditScreen";
import { FindingsScreen } from "@/features/findings/FindingsScreen";
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
              {/* Primary 5-Stage Scientific Destinations */}
              <Route path="/" element={<HomeScreen />} />
              <Route path="/home" element={<Navigate to="/" replace />} />
              <Route path="/overview" element={<HomeScreen />} />

              <Route path="/audit" element={<NewAuditScreen />} />
              <Route path="/ingestion" element={<NewAuditScreen />} />

              <Route path="/findings" element={<FindingsScreen />} />
              <Route path="/heatmap" element={<FindingsScreen />} />
              <Route path="/matrix" element={<FindingsScreen />} />
              <Route path="/diagnostics" element={<FindingsScreen />} />

              <Route path="/remediation" element={<RemediationScreen />} />
              <Route path="/reports" element={<ReportsScreen />} />
              <Route path="/export" element={<Navigate to="/reports" replace />} />
              <Route path="/audit-log" element={<Navigate to="/reports" replace />} />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuditProvider>
    </QueryClientProvider>
  );
};

export default App;
