import {useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import Toast from "../components/Toast";
import EmployeeEntryForm from "../components/EmployeeEntryForm";

const OfficeDashboard = () => {
  const navigate = useNavigate();

  const [account, setAccount] = useState(null);
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [submittingRecords, setSubmittingRecords] = useState(false);

  const [showEmployeeForm, setShowEmployeeForm] = useState(true);
  const [submissionInfo, setSubmissionInfo] = useState(null);

  const [toast, setToast] = useState({
    type: "",
    message: "",
  });

  const closeToast = () => {
    setToast({
      type: "",
      message: "",
    });
  };

  const showToast = useCallback( (type, message) => {
    setToast({
      type,
      message,
    });
  }, []);

  const fetchOfficeProfile = useCallback ( async () => {
    try {
      const profileRes = await axiosInstance.get("/office/me");
      setAccount(profileRes.data.account);
    } catch (err) {
      console.error("Office profile error:", err.response?.data || err.message);

      localStorage.removeItem("officeToken");
      localStorage.removeItem("officeAccount");

      showToast("error", err.response?.data?.message || "Session expired");

      setTimeout(() => {
        navigate("/ems/office");
      }, 1000);
    }
  }, [navigate, showToast]);

  const fetchOfficeEmployees = useCallback( async () => {
    try {
      setEmployeeLoading(true);

      const res = await axiosInstance.get("/employee/my-office");
  console.log('employees response:',res.data.employees);
      setEmployees(res.data.employees || []);
    
    } catch (err) {
      console.error("Fetch employee error:", err.response?.data || err.message);

      showToast(
        "error",
        err.response?.data?.message || "Failed to fetch employee records"
      );
    } finally {
      setEmployeeLoading(false);
    }
  }, [showToast]);

    useEffect(() => {
  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      await fetchOfficeProfile();
      await fetchOfficeEmployees();
    } finally {
      setLoading(false);
    }
  };


    fetchDashboardData();
  }, [fetchOfficeEmployees, fetchOfficeProfile]);

  const handleEmployeeSaved = () => {
    fetchOfficeEmployees();
    setShowEmployeeForm(false);
    setSubmissionInfo(null);

    showToast("success", "Employee list updated successfully");
  };

  const submitOfficeRecords = async () => {
    const confirmSubmit = window.confirm(
      "Are you sure you want to submit all employee records? After submission, admin will be able to review this office's records."
    );

    if (!confirmSubmit) return;

    try {
      setSubmittingRecords(true);

      const res = await axiosInstance.post("/employee/submit-office-records");

      setSubmissionInfo(res.data.submission || null);

      showToast(
        "success",
        res.data.message || "Office employee records submitted successfully"
      );
    } catch (err) {
      console.error("Submit records error:", err.response?.data || err.message);

      showToast(
        "error",
        err.response?.data?.message || "Failed to submit office records"
      );
    } finally {
      setSubmittingRecords(false);
    }
  };

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

  const totalEmployees = employees.length;

  const verifiedEmployees = employees.filter(
    (employee) => employee.isVoterVerified === true
  ).length;

  const unverifiedEmployees = totalEmployees - verifiedEmployees;

  const latestEmployee =
    employees.length > 0
      ? employees.reduce((latest, current) =>
          new Date(current.createdAt) > new Date(latest.createdAt)
            ? current
            : latest
        )
      : null;

  const canSubmitRecords =
    totalEmployees > 0 && totalEmployees === verifiedEmployees;

  const submissionStatusText = submissionInfo
    ? "Submitted"
    : totalEmployees > 0
      ? "Records Added"
      : "No Records Yet";

  const submissionStatusClass = submissionInfo
    ? "text-green-700"
    : totalEmployees > 0
      ? "text-blue-700"
      : "text-orange-600";

  return (
    <div className="min-h-screen bg-slate-100">
      <Toast type={toast.type} message={toast.message} onClose={closeToast} />

      <div className="bg-white shadow px-6 py-4 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            Office Dashboard
          </h1>

          <p className="text-sm text-slate-500">
            Employee Record Entry Panel
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowEmployeeForm((prev) => !prev)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            {showEmployeeForm ? "Hide Entry Form" : "Add Employee"}
          </button>

          <button
            type="button"
            onClick={submitOfficeRecords}
            disabled={!canSubmitRecords || submittingRecords}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-slate-400"
          >
            {submittingRecords ? "Submitting..." : "Submit Records"}
          </button>

          <button
            type="button"
            onClick={logout}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Logout
          </button>
        </div>
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

        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-sm text-slate-500">Employees Entered</p>
            <p className="text-3xl font-bold text-slate-800 mt-2">
              {totalEmployees}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-sm text-slate-500">Verified Voter Records</p>
            <p className="text-3xl font-bold text-green-700 mt-2">
              {verifiedEmployees}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-sm text-slate-500">Unverified Records</p>
            <p className="text-3xl font-bold text-red-600 mt-2">
              {unverifiedEmployees}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow p-5">
            <p className="text-sm text-slate-500">Submission Status</p>
            <p className={`text-xl font-bold mt-2 ${submissionStatusClass}`}>
              {submissionStatusText}
            </p>

            {submissionInfo?.submittedAt && (
              <p className="text-xs text-slate-500 mt-1">
                {new Date(submissionInfo.submittedAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {!canSubmitRecords && totalEmployees > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 text-orange-700">
            <h3 className="font-semibold">Submission Blocked</h3>

            <p className="text-sm mt-1">
              All employee records must be voter verified before final
              submission.
            </p>
          </div>
        )}

        {canSubmitRecords && !submissionInfo && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-green-700">
            <h3 className="font-semibold">Ready to Submit</h3>

            <p className="text-sm mt-1">
              All employee records are verified. You can now submit records to
              admin.
            </p>
          </div>
        )}

        {submissionInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-blue-700">
            <h3 className="font-semibold">Records Submitted</h3>

            <p className="text-sm mt-1">
              Your office employee records have been submitted to admin for
              review.
            </p>
          </div>
        )}

        {latestEmployee && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <h3 className="font-semibold text-blue-800">
              Latest Employee Entry
            </h3>

            <p className="text-blue-700 mt-2">
              {latestEmployee.fullName} was added on{" "}
              {latestEmployee.createdAt
                ? new Date(latestEmployee.createdAt).toLocaleString()
                : "N/A"}
              .
            </p>
          </div>
        )}

        {showEmployeeForm && <EmployeeEntryForm onSaved={handleEmployeeSaved} />}

        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                Employee Records
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                These records are submitted by your office only.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchOfficeEmployees}
              disabled={employeeLoading}
              className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 disabled:bg-slate-400"
            >
              {employeeLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="py-3 pr-4">Full Name</th>
                  <th className="py-3 pr-4">DOB</th>
                  <th className="py-3 pr-4">Voter No</th>
                  <th className="py-3 pr-4">Citizenship / District</th>
                  <th className="py-3 pr-4">Parent Name</th>
                  <th className="py-3 pr-4">Spouse Name</th>
                  <th className="py-3 pr-4">Office Full Name</th>
                  <th className="py-3 pr-4">Office Address</th>
                  <th className="py-3 pr-4">Home</th>
                  <th className="py-3 pr-4">Position</th>
                  <th className="py-3 pr-4">Verification</th>
                  <th className="py-3 pr-4">Added At</th>
                </tr>
              </thead>

              <tbody>
                {employeeLoading ? (
                  <tr>
                    <td colSpan="12" className="py-4 text-slate-500">
                      Loading employee records...
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="py-4 text-slate-500">
                      No employee records added yet.
                    </td>
                  </tr>
                ) : (
                  employees.map((employee) => (
                    <tr key={employee._id} className="border-b">
                      <td className="py-3 pr-4">
                        {employee.fullName || "N/A"}
                      </td>

                      <td className="py-3 pr-4">{employee.dob || "N/A"}</td>

                      <td className="py-3 pr-4">
                        {employee.voterNo || "N/A"}
                      </td>

                      <td className="py-3 pr-4">
                        {employee.citizenshipNumber ||
    employee.verifiedVoterDetails?.citizenshipNumber ||
    employee.citizenshipNo || "N/A"} /{" "}
                        {employee.citizenshipIssueDistrict || "N/A"}
                      </td>

                      <td className="py-3 pr-4">
                        {employee.parentFullName || "N/A"}
                      </td>

                      <td className="py-3 pr-4">
                        {employee.spouseFullName || "N/A"}
                      </td>

                      <td className="py-3 pr-4">
                        {employee.officeFullName || "N/A"}
                      </td>

                      <td className="py-3 pr-4">
                        {employee.officeAddress || "N/A"}
                      </td>

                      <td className="py-3 pr-4">
                        {employee.homeDistrict || "N/A"},{" "}
                        {employee.homePalika || "N/A"} -{" "}
                        {employee.homeWardNo || "N/A"}
                      </td>

                      <td className="py-3 pr-4">
                        {employee.position || "N/A"}
                      </td>

                      <td className="py-3 pr-4">
                        {employee.isVoterVerified ? (
                          <span className="text-green-700 font-medium">
                            Verified
                          </span>
                        ) : (
                          <span className="text-orange-600 font-medium">
                            Pending
                          </span>
                        )}
                      </td>

                      <td className="py-3 pr-4">
                        {employee.createdAt
                          ? new Date(employee.createdAt).toLocaleString()
                          : "N/A"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
          <h3 className="font-semibold text-green-800">
            Employee Entry Rule
          </h3>

          <p className="text-green-700 mt-2">
            Employee records can be saved only after voter number and date of
            birth are verified from the voter database.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OfficeDashboard;