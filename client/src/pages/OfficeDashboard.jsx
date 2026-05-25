import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

const OfficeDashboard = () => {
  const navigate = useNavigate();

  const [account, setAccount] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const res = await axiosInstance.get("/auth/me");
        if (isMounted) {
          setAccount(res.data.account);
        }
      } catch (error) {
        if (isMounted) {
          localStorage.removeItem("officeToken");
          localStorage.removeItem("officeAccount");
          navigate("/login");
        }
        else { 
                     console.error("Failed to load profile:", error);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("officeToken");
    localStorage.removeItem("officeAccount");
    navigate("/login");
  };

  if (!account) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-600">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
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

      <div className="p-6">
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-semibold text-slate-800">
            Logged-in Office Information
          </h2>

          <div className="mt-4 grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-slate-500">Responsible Person</p>
              <p className="font-medium">{account.fullName}</p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Email</p>
              <p className="font-medium">{account.email}</p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Contact Number</p>
              <p className="font-medium">{account.contactNumber}</p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Email Verification</p>
              <p className="font-medium">
                {account.isEmailVerified ? "Verified" : "Not Verified"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Office Code</p>
              <p className="font-medium">{account.office?.officeCode}</p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Office Name</p>
              <p className="font-medium">{account.office?.officeName}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h3 className="font-semibold text-blue-800">Next Module</h3>
          <p className="text-blue-700 mt-2">
            After this authentication section, we can add strict manual
            employee entry form with validation rules.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OfficeDashboard;