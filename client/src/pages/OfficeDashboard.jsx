import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import Toast from "../components/Toast";

const OfficeDashboard = () => {
  const navigate = useNavigate();

  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);

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
    const fetchOfficeProfile = async () => {
      try {
        setLoading(true);

        const profileRes = await axiosInstance.get("/office/me");

        setAccount(profileRes.data.account);
      } catch (err) {
        console.error(
          "Office dashboard error:",
          err.response?.data || err.message,
        );

        localStorage.removeItem("officeToken");
        localStorage.removeItem("officeAccount");

        showToast("error", err.response?.data?.message || "Session expired");

        setTimeout(() => {
          navigate("/ems/office");
        }, 1000);
      } finally {
        setLoading(false);
      }
    };
    fetchOfficeProfile();
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("officeToken");
    localStorage.removeItem("officeAccount");
    navigate("/ems/office");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Loading office dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <Toast type={toast.type} message={toast.message} onClose={closeToast} />

      <div className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Office Dashboard</h1>

          <p className="text-sm text-slate-500">Employee Record Entry Panel</p>
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
              <p className="font-medium">{account?.office?.officeCode}</p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Office Name</p>
              <p className="font-medium">{account?.office?.officeName}</p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Role</p>
              <p className="font-medium uppercase">{account?.role}</p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Responsible Person</p>
              <p className="font-medium">{account?.responsiblePersonName}</p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Contact Number</p>
              <p className="font-medium">{account?.contactNumber}</p>
            </div>

            <div>
              <p className="text-sm text-slate-500">This Office Login Count</p>
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

        <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
          <h3 className="font-semibold text-green-800">
            Next Module: Employee Entry
          </h3>

          <p className="text-green-700 mt-2">
            This office will enter its employee records here. Admin office will
            receive and manage submitted records.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-sm text-slate-500">Employees Entered</p>
            <p className="text-3xl font-bold text-slate-800 mt-2">0</p>
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-sm text-slate-500">Valid Records</p>
            <p className="text-3xl font-bold text-slate-800 mt-2">0</p>
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-sm text-slate-500">Submission Status</p>
            <p className="text-xl font-bold text-orange-600 mt-2">Pending</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfficeDashboard;
