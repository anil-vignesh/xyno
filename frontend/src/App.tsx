import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { EnvironmentProvider } from "@/contexts/EnvironmentContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import IntegrationsPage from "@/pages/IntegrationsPage";
import TemplatesPage from "@/pages/TemplatesPage";
import TemplateBuilderPage from "@/pages/TemplateBuilderPage";
import EventsPage from "@/pages/EventsPage";
import LogsPage from "@/pages/LogsPage";
import APIKeysPage from "@/pages/APIKeysPage";
import BrandComponentsPage from "@/pages/BrandComponentsPage";

function App() {
  return (
    <AuthProvider>
      <EnvironmentProvider>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/integrations" element={<IntegrationsPage />} />
                <Route path="/templates" element={<TemplatesPage />} />
                <Route path="/templates/new" element={<TemplateBuilderPage />} />
                <Route path="/templates/:id/edit" element={<TemplateBuilderPage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/logs" element={<LogsPage />} />
                <Route path="/api-keys" element={<APIKeysPage />} />
                <Route path="/brand-components" element={<BrandComponentsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </TooltipProvider>
      </EnvironmentProvider>
    </AuthProvider>
  );
}

export default App;
