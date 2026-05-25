import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";

const Signup = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState("form");
  const [offices, setOffices] = useState([]);

  const [formData, setFormData] = useState({
    officeId: "",
    fullName: "",
    email: "",
    contactNumber: "",
    password: "",
    confirmPassword: ""
  });

  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [officeLoading, setOfficeLoading] = useState(true);
  const [resendLoading, setResendLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadOffices = async () => {
      try {
        setOfficeLoading(true);
        const res = await axiosInstance.get("/auth/offices");
        setOffices(res.data.offices || []);
      } catch (err) {
        setError("Failed to load office list:", err.message);
      } finally {
        setOfficeLoading(false);
      }
    };
    loadOffices();
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const validateForm = () => {
    const {
      officeId,
      fullName,
      email,
      contactNumber,
      password,
      confirmPassword
    } = formData;

    if (
      !officeId ||
      !fullName ||
      !email ||
      !contactNumber ||
      !password ||
      !confirmPassword
    ) {
      return "All fields are required";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return "Please enter a valid email address";
    }

    const nepaliMobileRegex = /^9[78]\d{8}$/;

    if (!nepaliMobileRegex.test(contactNumber)) {
      return "Contact number must be a valid Nepali mobile number";
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%_]).{8,24}$/;

    if (!passwordRegex.test(password)) {
      return "Password must be 8-24 characters and include uppercase, lowercase, number and special character";
    }

    if (password !== confirmPassword) {
      return "Password and confirm password do not match";
    }

    return "";
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);

      const res = await axiosInstance.post("/auth/signup/request-otp", formData);

      setMessage(res.data.message);
      setStep("otp");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6 digit OTP");
      return;
    }

    try {
      setLoading(true);

      const res = await axiosInstance.post("/auth/signup/verify-otp", {
        email: formData.email,
        otp
      });

      setMessage(res.data.message);

      setTimeout(() => {
        navigate("/login");
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setMessage("");

    if (!formData.email) {
      setError("Email is required to resend OTP");
      return;
    }

    try {
      setResendLoading(true);

      const res = await axiosInstance.post("/auth/signup/resend-otp", {
        email: formData.email
      });

      setMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP");
    } finally {
      setResendLoading(false);
    }
  };

  const goBackToEdit = () => {
    setOtp("");
    setError("");
    setMessage("");
    setStep("form");
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800">
            Office Signup
          </h1>

          <p className="text-slate-500 mt-2">
            Election Staff Data Collection System
          </p>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          <div
            className={`h-2 w-24 rounded-full ${
              step === "form" || step === "otp" ? "bg-blue-600" : "bg-slate-200"
            }`}
          />
          <div
            className={`h-2 w-24 rounded-full ${
              step === "otp" ? "bg-blue-600" : "bg-slate-200"
            }`}
          />
        </div>

        {message && (
          <div className="mt-5 bg-green-100 text-green-700 px-4 py-3 rounded-lg">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-5 bg-red-100 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {step === "form" && (
          <form onSubmit={handleRequestOtp} className="mt-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Office Name
              </label>

              <select
                name="officeId"
                value={formData.officeId}
                onChange={handleChange}
                disabled={officeLoading}
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
              >
                <option value="">
                  {officeLoading ? "Loading offices..." : "-- Select Office --"}
                </option>

                {offices.map((office) => (
                  <option key={office._id} value={office._id}>
                    {office.officeCode} - {office.officeName}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Full Name
                </label>

                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Responsible employee full name"
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Email Address
                </label>

                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="office@example.com"
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Contact Number
              </label>

              <input
                type="text"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setFormData((prev) => ({
                    ...prev,
                    contactNumber: value
                  }));
                }}
                placeholder="98XXXXXXXX"
                maxLength={10}
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Password
                </label>

                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Example: Test@12345"
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <p className="text-xs text-slate-500 mt-1">
                  8-24 chars, uppercase, lowercase, number and special
                  character.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Confirm Password
                </label>

                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm password"
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || officeLoading}
              className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-semibold hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? "Sending OTP..." : "Register and Send OTP"}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="mt-6 space-y-5">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-sm text-slate-600">
                OTP has been sent to:
              </p>
              <p className="font-semibold text-slate-800">
                {formData.email}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Enter OTP
              </label>

              <input
                type="text"
                value={otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setOtp(value);
                }}
                maxLength={6}
                placeholder="123456"
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white rounded-lg py-2.5 font-semibold hover:bg-green-700 disabled:bg-green-300"
            >
              {loading ? "Verifying..." : "Verify and Complete Registration"}
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendLoading}
              className="w-full border border-slate-300 text-slate-700 rounded-lg py-2.5 font-semibold hover:bg-slate-50 disabled:bg-slate-100"
            >
              {resendLoading ? "Sending..." : "Resend OTP"}
            </button>

            <button
              type="button"
              onClick={goBackToEdit}
              className="w-full text-blue-600 font-semibold"
            >
              Edit registration details
            </button>
          </form>
        )}

        <p className="text-center text-sm mt-6">
          Already registered?{" "}
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="text-blue-600 font-semibold"
          >
            Login here
          </button>
        </p>
      </div>
    </div>
  );
};

export default Signup;