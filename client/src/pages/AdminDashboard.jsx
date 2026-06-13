import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import Toast from "../components/Toast";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [account, setAccount] = useState(null);
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registeredOffices, setRegisteredOffices] = useState([]);
  const [pendingOffices, setPendingOffices] = useState([]);
  const [activeList, setActiveList] = useState("registered");

  const [toast, setToast] = useState({
    type: "",
    message: "",
  });

  const closeToast = () => {
    setToast({ type: "", message: "" });
  };

  const showToast = (type, message) => {
    setToast({ type, message });
  };

  useEffect(() => {
    const fetchAdminData = async () => {
  try {
    setLoading(true);

    const profileRes = await axiosInstance.get("/admin/me");
    const summaryRes = await axiosInstance.get("/admin/dashboard-summary");
    const logsRes = await axiosInstance.get("/admin/office-login-logs");
    const registeredRes = await axiosInstance.get("/admin/registered-offices");
    const pendingRes = await axiosInstance.get("/admin/pending-offices");

    setAccount(profileRes.data.account);
    setSummary(summaryRes.data.summary);
    setLogs(logsRes.data.logs || []);
    setRegisteredOffices(registeredRes.data.offices || []);
    setPendingOffices(pendingRes.data.offices || []);
  } catch (err) {
    console.error("Admin dashboard error:", err.response?.data || err.message);

    localStorage.removeItem("officeToken");
    localStorage.removeItem("officeAccount");

    showToast("error", err.response?.data?.message || "Session expired");

    setTimeout(() => {
      navigate("/ems/admin");
    }, 1000);
  } finally {
    setLoading(false);
  }
};
    fetchAdminData();
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("officeToken");
    localStorage.removeItem("officeAccount");
    navigate("/ems/admin");
  };

  // computed values
  // computed values
const verifiedRegisteredOffices = useMemo(() => {
  return registeredOffices.filter((item) => {
    return (
      item?.hasVerifiedOtp === true &&
      item?.office?.role === "office"
    );
  });
}, [registeredOffices]);

const optimizedPendingOffices = useMemo(() => {
  const verifiedOfficeIds = new Set(
    verifiedRegisteredOffices
      .map((item) => item.office?._id)
      .filter(Boolean)
  );

  return pendingOffices.filter((office) => {
    return office.role === "office" && !verifiedOfficeIds.has(office._id);
  });
}, [pendingOffices, verifiedRegisteredOffices]);

const totalSeededOffices =
  summary?.totalOffices ??
  verifiedRegisteredOffices.length + optimizedPendingOffices.length;

const totalRegisteredOffices =
  summary?.registeredOffices ?? verifiedRegisteredOffices.length;

const totalPendingOffices =
  summary?.pendingOffices ??
  Math.max(totalSeededOffices - totalRegisteredOffices, 0);
// computed values close
  // computed values close

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Loading admin dashboard...</p>
      </div>
    );
  }

const cards = [
  {
    title: "Total Offices",
    value: totalSeededOffices,
    action: () => setActiveList("all"),
  },
  {
    title: "Registered Offices",
    value: totalRegisteredOffices,
    action: () => setActiveList("registered"),
  },
  {
    title: "Pending Offices",
    value: totalPendingOffices,
    action: () => setActiveList("pending"),
  },
  {
    title: "Total Login Events",
    value: summary?.totalLoginEvents ?? 0,
  },
  {
    title: "Total Employees Collected",
    value: summary?.totalEmployeesCollected ?? 0,
  },
  {
    title: "Duplicate Records",
    value: summary?.duplicateRecords ?? 0,
  },
  {
    title: "Eligible for Polling Duty",
    value: summary?.eligibleForPollingDuty ?? 0,
  },
  {
    title: "Total Polling Centers",
    value: summary?.totalPollingCenters ?? 0,
  },
];

  return (
    <div className="min-h-screen bg-slate-100">
      <Toast type={toast.type} message={toast.message} onClose={closeToast} />

      <div className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Admin Dashboard</h1>

          <p className="text-sm text-slate-500">
            Province Election Office Management Panel
          </p>
        </div>

        <button
          onClick={logout}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
        >
          Logout
        </button>
      </div>

      <div className="p-6 space-y-6">
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold text-slate-800">
            Admin Office Information
          </h2>

        <div className="mt-4 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div>
    <p className="text-sm text-slate-500">Admin Name</p>
    <p className="font-medium">{account?.fullName}</p>
  </div>

  <div>
    <p className="text-sm text-slate-500">Email</p>
    <p className="font-medium">{account?.email}</p>
  </div>

  <div>
    <p className="text-sm text-slate-500">Office Name</p>
    <p className="font-medium">{account?.officeName}</p>
  </div>

  <div>
    <p className="text-sm text-slate-500">Role</p>
    <p className="font-medium uppercase text-blue-700">{account?.role}</p>
  </div>

  <div>
    <p className="text-sm text-slate-500">Auth Type</p>
    <p className="font-medium uppercase">{account?.authType}</p>
  </div>

  <div>
    <p className="text-sm text-slate-500">Admin Login Count</p>
    <p className="font-medium">{account?.loginCount}</p>
  </div>

  <div>
    <p className="text-sm text-slate-500">Last Login</p>
    <p className="font-medium">
      {account?.lastLoginAt
        ? new Date(account.lastLoginAt).toLocaleString()
        : "N/A"}
    </p>
  </div>
</div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <button
              key={card.title}
              type="button"
              onClick={card.action}
              className="bg-white rounded-2xl shadow p-5 hover:shadow-md transition text-left"
            >
              <p className="text-sm text-slate-500">{card.title}</p>
              <p className="text-3xl font-bold text-slate-800 mt-2">
                {card.value}
              </p>
            </button>
          ))}
        </div>

        {/* office login logs */}
 <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold text-slate-800">
            Recent Office OTP Login Logs
          </h2>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="py-3 pr-4">Office</th>
                  <th className="py-3 pr-4">Responsible Person</th>
                  <th className="py-3 pr-4">Contact</th>
                  <th className="py-3 pr-4">Verified At</th>
                  <th className="py-3 pr-4">IP Address</th>
                </tr>
              </thead>

              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-4 text-slate-500">
                      No login logs found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id} className="border-b">
                      <td className="py-3 pr-4">
                        {log.office?.officeCode} - {log.office?.officeName}
                      </td>

                      <td className="py-3 pr-4">
                        {log.responsiblePersonName}
                      </td>

                      <td className="py-3 pr-4">{log.contactNumber}</td>

                      <td className="py-3 pr-4">
                        {log.verifiedAt
                          ? new Date(log.verifiedAt).toLocaleString()
                          : "N/A"}
                      </td>

                      <td className="py-3 pr-4">{log.ipAddress || "N/A"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {/* office login logs closed */}

        {activeList === "registered" && (
  <div className="bg-white rounded-2xl shadow p-6">
    <h2 className="text-lg font-semibold text-slate-800">
      Registered Offices
    </h2>

    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b text-left text-slate-500">
            <th className="py-3 pr-4">Office</th>
            <th className="py-3 pr-4">Role</th>
            <th className="py-3 pr-4">Login Count</th>
            <th className="py-3 pr-4">Last Person</th>
            <th className="py-3 pr-4">Contact</th>
            <th className="py-3 pr-4">Last Login</th>
          </tr>
        </thead>

        <tbody>
          {verifiedRegisteredOffices.length === 0 ? (
            <tr>
              <td colSpan="6" className="py-4 text-slate-500">
                No registered offices yet.
              </td>
            </tr>
          ) : (
            verifiedRegisteredOffices.map((item) => (
              <tr key={item.accessId} className="border-b">
                <td className="py-3 pr-4">
                  {item.office?.officeCode} - {item.office?.officeName}
                </td>

                <td className="py-3 pr-4 uppercase">
                  {item.office?.role}
                </td>

                <td className="py-3 pr-4">{item.loginCount}</td>

                <td className="py-3 pr-4">
                  {item.lastResponsiblePersonName || "N/A"}
                </td>

                <td className="py-3 pr-4">
                  {item.lastContactNumber || "N/A"}
                </td>

                <td className="py-3 pr-4">
                  {item.lastLoginAt
                    ? new Date(item.lastLoginAt).toLocaleString()
                    : "N/A"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
)}

{activeList === "pending" && (
  <div className="bg-white rounded-2xl shadow p-6">
    <h2 className="text-lg font-semibold text-slate-800">
      Pending Offices
    </h2>

    <p className="text-sm text-slate-500 mt-1">
      These offices exist in the master list but have not verified OTP yet.
    </p>

    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b text-left text-slate-500">
            <th className="py-3 pr-4">Office Code</th>
            <th className="py-3 pr-4">Office Name</th>
            <th className="py-3 pr-4">Role</th>
            <th className="py-3 pr-4">Status</th>
          </tr>
        </thead>

        <tbody>
          {optimizedPendingOffices.length === 0 ? (
            <tr>
              <td colSpan="4" className="py-4 text-slate-500">
                No pending offices.
              </td>
            </tr>
          ) : (
            optimizedPendingOffices.map((office) => (
              <tr key={office._id} className="border-b">
                <td className="py-3 pr-4">{office.officeCode}</td>

                <td className="py-3 pr-4">{office.officeName}</td>

                <td className="py-3 pr-4 uppercase">{office.role}</td>

                <td className="py-3 pr-4">
                  <span className="text-orange-600 font-medium">
                    Not verified yet
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
)}

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h3 className="font-semibold text-blue-800">Admin Capability</h3>

          <p className="text-blue-700 mt-2">
            This dashboard will later manage all office submissions, employee
            records, duplicate checks, eligibility analysis, and report exports.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
