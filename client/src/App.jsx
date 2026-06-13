import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminLogin from "./pages/AdminLogin";
import OfficeLogin from "./pages/OfficeLogin";
import AdminDashboard from "./pages/AdminDashboard";
import OfficeDashboard from "./pages/OfficeDashboard";
import RoleBasedRoute from "./components/RoleBasedRoute";

const PublicRoute = ({ children }) => {
  const token = localStorage.getItem("officeToken");
  const account = JSON.parse(localStorage.getItem("officeAccount") || "null");

  if (token && account?.role === "admin") {
    return <Navigate to="/ems/admin/dashboard" replace />;
  }

  if (token && account?.role === "office") {
    return <Navigate to="/ems/office/dashboard" replace />;
  }

  return children;
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/ems/office" replace />} />

        <Route
          path="/ems/admin"
          element={
            <PublicRoute>
              <AdminLogin />
            </PublicRoute>
          }
        />

        <Route
          path="/ems/office"
          element={
            <PublicRoute>
              <OfficeLogin />
            </PublicRoute>
          }
        />

        <Route
          path="/ems/admin/dashboard"
          element={
            <RoleBasedRoute allowedRole="admin">
              <AdminDashboard />
            </RoleBasedRoute>
          }
        />

        <Route
          path="/ems/office/dashboard"
          element={
            <RoleBasedRoute allowedRole="office">
              <OfficeDashboard />
            </RoleBasedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/ems/office" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;