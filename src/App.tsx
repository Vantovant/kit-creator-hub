import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import DashboardLayout from "@/app/dashboard/layout";
import DashboardPage from "@/app/dashboard/page";
import SubscribersPage from "@/app/dashboard/subscribers/page";
import BroadcastsPage from "@/app/dashboard/broadcasts/page";
import NewBroadcastPage from "@/app/dashboard/broadcasts/new/page";
import ABTestPage from "@/app/dashboard/broadcasts/ab-test/page";
import AutomationsPage from "@/app/dashboard/automations/page";
import AutomationBuilderPage from "@/app/dashboard/automations/builder/page";
import FormsPage from "@/app/dashboard/forms/page";
import TemplatesPage from "@/app/dashboard/templates/page";
import SegmentsPage from "@/app/dashboard/segments/page";
import IntegrationsPage from "@/app/dashboard/integrations/page";
import AnalyticsPage from "@/app/dashboard/analytics/page";
import SettingsPage from "@/app/dashboard/settings/page";
import WelcomeForm from "@/pages/WelcomeForm";
import AuthPage from "@/pages/AuthPage";
import UnsubscribePage from "@/pages/UnsubscribePage";
import { ProtectedRoute } from "@/components/dashboard/ProtectedRoute";

function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/forms/welcome" element={<WelcomeForm />} />
        <Route path="/unsubscribe" element={<UnsubscribePage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="subscribers" element={<SubscribersPage />} />
          <Route path="broadcasts" element={<BroadcastsPage />} />
          <Route path="broadcasts/new" element={<NewBroadcastPage />} />
          <Route path="broadcasts/ab-test" element={<ABTestPage />} />
          <Route path="automations" element={<AutomationsPage />} />
          <Route path="automations/builder" element={<AutomationBuilderPage />} />
          <Route path="forms" element={<FormsPage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="segments" element={<SegmentsPage />} />
          <Route path="integrations" element={<IntegrationsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </ThemeProvider>
  );
}

export default App;

