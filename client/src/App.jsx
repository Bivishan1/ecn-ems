import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import OfficeLogin from "./pages/OfficeLogin";
import OfficeDashboard from "./pages/OfficeDashboard";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("officeToken");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const token = localStorage.getItem("officeToken");

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route
          path="/login"
          element={
            <PublicRoute>
              <OfficeLogin />
            </PublicRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <OfficeDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;