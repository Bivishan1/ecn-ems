import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import Toast from "../components/Toast";

const OfficeDashboard = () => {
  const navigate = useNavigate();

  const [account, setAccount] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState({
    type: "",
    message: ""
  });

  const showToast = (type, message) => {
    setToast({
      type,
      message
    });
  };

  const closeToast = () => {
    setToast({
      type: "",
      message: ""
    });
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        const profileRes = await axiosInstance.get("/auth/me");
        const summaryRes = await axiosInstance.get("/auth/dashboard-summary");

        setAccount(profileRes.data.account);
        setSummary(summaryRes.data.summary);
      } catch (err) {
        localStorage.removeItem("officeToken");
        localStorage.removeItem("officeAccount");

        showToast("error", "Session expired. Please login again.");
        console.error("Dashboard data fetch error:", err);

        setTimeout(() => {
          navigate("/login");
        }, 1000);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("officeToken");
    localStorage.removeItem("officeAccount");
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Loading dashboard...</p>
      </div>
    );
  }

  if (!account) {
    return null;
  }

  const cards = [
    {
      title: "Total Offices",
      value: summary?.totalOffices ?? 0
    },
    {
      title: "Registered Offices",
      value: summary?.registeredOffices ?? 0
    },
    {
      title: "Pending Offices",
      value: summary?.pendingOffices ?? 0
    },
    {
      title: "Total Login Count",
      value: summary?.totalLoginCount ?? 0
    },
    {
      title: "Total Employees Collected",
      value: summary?.totalEmployeesCollected ?? 0
    },
    {
      title: "Duplicate Records",
      value: summary?.duplicateRecords ?? 0
    },
    {
      title: "Eligible for Polling Duty",
      value: summary?.eligibleForPollingDuty ?? 0
    },
    {
      title: "Total Polling Centers",
      value: summary?.totalPollingCenters ?? 0
    }
  ];

  return (
    <div className="min-h-screen bg-slate-100">
      <Toast type={toast.type} message={toast.message} onClose={closeToast} />

      <div className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Office Dashboard
          </h1>

          <p className="text-sm text-slate-500">
            Election Staff Data Collection System
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
            Logged-in Office Information
          </h2>

          <div className="mt-4 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-slate-500">Office Code</p>
              <p className="font-medium">{account.office?.officeCode}</p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Office Name</p>
              <p className="font-medium">{account.office?.officeName}</p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Responsible Person</p>
              <p className="font-medium">{account.responsiblePersonName}</p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Contact Number</p>
              <p className="font-medium">{account.contactNumber}</p>
            </div>

            <div>
              <p className="text-sm text-slate-500">OTP Verified</p>
              <p className="font-medium">
                {account.hasVerifiedOtp ? "Yes" : "No"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">This Office Login Count</p>
              <p className="font-medium">{account.loginCount}</p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Last Login</p>
              <p className="font-medium">
                {account.lastLoginAt
                  ? new Date(account.lastLoginAt).toLocaleString()
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <div
              key={card.title}
              className="bg-white rounded-2xl shadow p-5 hover:shadow-md transition cursor-pointer"
            >
              <p className="text-sm text-slate-500">{card.title}</p>
              <p className="text-3xl font-bold text-slate-800 mt-2">
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h3 className="font-semibold text-blue-800">Next Module</h3>

          <p className="text-blue-700 mt-2">
            After this OTP-based office login is completed, we can add the
            strict manual employee entry form and validation rules.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OfficeDashboard;