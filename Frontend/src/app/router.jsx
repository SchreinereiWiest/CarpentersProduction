import { Navigate, Route, Routes, useParams } from "react-router";

import CacheRefreshBoundary from "../shared/components/offline/CacheRefreshBoundary.jsx";
import OfflineStatusCenter from "../shared/components/offline/OfflineStatusCenter.jsx";
import DashboardPage from "../features/dashboard/pages/DashboardPage.jsx";
import LoginPage from "../features/auth/pages/LoginPage.jsx";
import ContactsPage from "../features/customers/pages/CustomersPage.jsx";
import NewContactPage from "../features/customers/pages/NewCustomerPage.jsx";
import ContactDetailsPage from "../features/customers/pages/CustomerDetailsPage.jsx";
import EditContactPage from "../features/customers/pages/EditCustomerPage.jsx";
import ProjectHomePage from "../features/projects/ProjectHomePage.jsx";
import ProjectOverviewPage from "../features/projects/ProjectOverviewPage.jsx";
import MeasurementPage from "../features/projects/measurement/MeasurementPage.jsx";
import PartListPage from "../features/projects/part-list/PartListPage.jsx";
import NestingPage from "../features/projects/nesting/NestingPage.jsx";
import CuttingPage from "../features/projects/cutting/CuttingPage.jsx";
import TimeTrackingPage from "../features/projects/time-tracking/TimeTrackingPage.jsx";
import LegacyProjectEditorPage from "../features/projects/legacy-editor/LegacyProjectEditorPage.jsx";
import ProjectSettingsPage from "../features/projects/settings/ProjectSettingsPage.jsx";
import CabinetEditorPage from "../features/projects/cabinet/CabinetEditorPage.jsx";
import CncEditorPage from "../features/projects/cnc/CncEditorPage.jsx";
import ProjectPurchasingPage from "../features/projects/purchasing/ProjectPurchasingPage.jsx";
import ProjectAttachmentsPage from "../features/projects/attachments/ProjectAttachmentsPage.jsx";
import CalculationPage from "../features/projects/calculation/CalculationPage.jsx";
import InventoryPage from "../features/inventory/home.jsx";
import EmployeesPage from "../features/employees/personal.jsx";
import PurchasingPage from "../features/purchasing/purchasing.jsx";
import CompanySettingsPage from "../features/company-settings/CompanySettingsPage.jsx";
import UserProfilePage from "../features/user-profile/UserProfilePage.jsx";
import OfflineMergePage from "../features/offline/OfflineMergeView.jsx";
import ManagementLayout from "../features/management/layout/managementLayout.jsx";
import ManagementOverview from "../features/management/operating/overview.jsx";
import ManagementHours from "../features/management/operating/hours.jsx";
import ManagementOperatingCosts from "../features/management/operating/operatingCosts.jsx";
import ManagementSetup from "../features/management/setup/setup.jsx";
import { ManagementDocuments } from "../features/management/documents/documents.jsx";
import ProtectedRoute from "./routing/ProtectedRoute.jsx";
import PublicRoute from "./routing/PublicRoute.jsx";

function LegacyCadRedirect() {
  const { projectId } = useParams();
  return <Navigate to={`/Projects/Aufmas/${projectId}`} replace />;
}

const protectedPage = (element, requiredRole = "user") => (
  <ProtectedRoute requiredRole={requiredRole}>{element}</ProtectedRoute>
);

export default function AppRouter() {
  return (
    <>
      <OfflineStatusCenter />
      <CacheRefreshBoundary>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/" element={protectedPage(<DashboardPage />, undefined)} />

          <Route path="/Management" element={protectedPage(<ManagementLayout />, "admin")}>
            <Route index element={<ManagementOverview />} />
            <Route path="Setup/:step" element={<ManagementSetup />} />
            <Route path="Hours" element={<ManagementHours />} />
            <Route path="Costs" element={<ManagementOperatingCosts />} />
            <Route path="CostAccounting" element={<Navigate to="/Management/Setup/Bab" replace />} />
            <Route path="Calculation" element={<Navigate to="/Management/Setup/Bab" replace />} />
            <Route path="Assets" element={<Navigate to="/Management/Setup/Assets" replace />} />
            <Route path="Settings" element={<Navigate to="/Management/Setup/Business" replace />} />
            <Route path="Transactions" element={<Navigate to="/Management" replace />} />
          </Route>
          <Route path="/Documents" element={protectedPage(<ManagementLayout sidebarSelected={3} />, "admin")}>
            <Route index element={<ManagementDocuments />} />
          </Route>

          <Route path="/Projects" element={protectedPage(<ProjectOverviewPage />)} />
          <Route path="/Projects/:projectId" element={protectedPage(<ProjectHomePage />)} />
          <Route path="/Projects/Aufmas/:projectId" element={protectedPage(<MeasurementPage />)} />
          <Route path="/Projects/CAD/:projectId" element={protectedPage(<LegacyCadRedirect />)} />
          <Route path="/Projects/List/:projectId" element={protectedPage(<PartListPage />)} />
          <Route path="/Projects/Nesting/:projectId" element={protectedPage(<NestingPage />)} />
          <Route path="/Projects/Cut/:projectId" element={protectedPage(<CuttingPage />)} />
          <Route path="/Projects/Time/:projectId" element={protectedPage(<TimeTrackingPage />)} />
          <Route path="/Projects/Create" element={protectedPage(<CabinetEditorPage />)} />
          <Route path="/Projects/Create/List" element={protectedPage(<LegacyProjectEditorPage />)} />
          <Route path="/Projects/Create/:id" element={protectedPage(<LegacyProjectEditorPage />)} />
          <Route path="/Projects/Settings/:projectId" element={protectedPage(<ProjectSettingsPage />)} />
          <Route path="/Projects/Cabinet/:projectId" element={protectedPage(<CabinetEditorPage />)} />
          <Route path="/Projects/Cnc/:projectId" element={protectedPage(<CncEditorPage />)} />
          <Route path="/Projects/Purchasing/:projectId" element={protectedPage(<ProjectPurchasingPage />)} />
          <Route path="/Projects/Attachments/:projectId" element={protectedPage(<ProjectAttachmentsPage />)} />
          <Route path="/Projects/Calculation/:projectId" element={protectedPage(<CalculationPage />)} />

          <Route path="/Storage" element={protectedPage(<InventoryPage />)} />
          <Route path="/Mitarbeiter" element={protectedPage(<EmployeesPage />)} />
          <Route path="/Purchasing" element={protectedPage(<PurchasingPage />)} />

          <Route path="/Kontakte" element={protectedPage(<ContactsPage />, "admin")} />
          <Route path="/Kontakte/new" element={protectedPage(<NewContactPage />, "admin")} />
          <Route path="/Kontakte/info/:userid" element={protectedPage(<ContactDetailsPage />, "admin")} />
          <Route path="/Kontakte/edit/:userid" element={protectedPage(<EditContactPage />, "admin")} />
          <Route path="/Kontakte/NewProject/:userId" element={protectedPage(<CabinetEditorPage />, "admin")} />

          <Route path="/CompanySettings" element={protectedPage(<CompanySettingsPage />, "adminOnly")} />
          <Route path="/User" element={protectedPage(<UserProfilePage />)} />
          <Route path="/Offline/Merge/:conflictKey" element={protectedPage(<OfflineMergePage />)} />
        </Routes>
      </CacheRefreshBoundary>
    </>
  );
}
