import { Navigate } from "react-router-dom";

const RoleBasedRoute = ({ children, allowedRole }) => {
  const token = localStorage.getItem("officeToken");
  const account = JSON.parse(localStorage.getItem("officeAccount") || "null");

  if (!token || !account) {
    if (allowedRole === "admin") {
      return <Navigate to="/ems/admin" replace />;
    }

    return <Navigate to="/ems/office" replace />;
  }

  if (account.role !== allowedRole) {
    if (account.role === "admin") {
      return <Navigate to="/ems/admin/dashboard" replace />;
    }

    if (account.role === "office") {
      return <Navigate to="/ems/office/dashboard" replace />;
    }

    return <Navigate to="/ems/office" replace />;
  }

  return children;
};

export default RoleBasedRoute;