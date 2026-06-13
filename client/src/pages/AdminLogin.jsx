import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import Toast from "../components/Toast";

const AdminLogin = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState({
    type: "",
    message: "",
  });

  const showToast = (type, message) => {
    setToast({ type, message });
  };

  const closeToast = () => {
    setToast({ type: "", message: "" });
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      return "Email and password are required";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(formData.email)) {
      return "Please enter a valid email address";
    }

    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    closeToast();

    const validationError = validateForm();

    if (validationError) {
      showToast("error", validationError);
      return;
    }

    try {
      setLoading(true);

      const res = await axiosInstance.post("/admin/login", {
        email: formData.email,
        password: formData.password,
      });

      localStorage.setItem("officeToken", res.data.token);
      localStorage.setItem("officeAccount", JSON.stringify(res.data.account));

      showToast("success", res.data.message || "Admin login successful");

      setTimeout(() => {
        navigate("/ems/admin/dashboard");
      }, 700);
    } catch (err) {
      showToast("error", err.response?.data?.message || "Admin login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-10">
      <Toast type={toast.type} message={toast.message} onClose={closeToast} />

      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800">Admin Login</h1>

          <p className="text-slate-500 mt-2">
            प्रदेश निर्वाचन कार्यालय, मकवानपुर
          </p>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-800 font-medium">
            Admin access is only for authorized Election Office users.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Admin Email
            </label>

            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="deo.makwanpur@election.gov.np"
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Password
            </label>

            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter admin password"
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-semibold hover:bg-blue-700 disabled:bg-blue-300"
          >
            {loading ? "Logging in..." : "Login as Admin"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => navigate("/ems/office")}
          className="mt-5 w-full text-blue-600 font-semibold"
        >
          Go to Office Login
        </button>
      </div>
    </div>
  );
};

export default AdminLogin;