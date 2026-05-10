import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import { useNavigate } from "react-router-dom";

const Signup = () => {
  const navigate = useNavigate();

  const [offices, setOffices] = useState([]);
  const [officeId, setOfficeId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchOffices = async () => {
      try {
        const res = await axiosInstance.get("/auth/offices");
        setOffices(res.data.offices);
      } catch (err) {
        setError("Failed to load office list", err);
      }
    };

    fetchOffices();
  }, []);

  const requestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!officeId || !fullName || !email) {
      setError("Please fill all required fields");
      return;
    }

    try {
      setLoading(true);

      const res = await axiosInstance.post("/auth/signup/request-otp", {
        officeId,
        fullName,
        email
      });

      setMessage(res.data.message);
      setOtpSent(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!otp) {
      setError("Please enter OTP");
      return;
    }

    try {
      setLoading(true);

      const res = await axiosInstance.post("/auth/signup/verify-otp", {
        email,
        otp
      });

      localStorage.setItem("officeToken", res.data.token);
      localStorage.setItem("officeAccount", JSON.stringify(res.data.account));

      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-slate-800 text-center">
          Office Signup
        </h1>

        <p className="text-center text-slate-500 mt-2">
          Election Staff Data Collection System
        </p>

        {message && (
          <div className="mt-4 bg-green-100 text-green-700 px-4 py-3 rounded-lg">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-100 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {!otpSent ? (
          <form onSubmit={requestOtp} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Select Office
              </label>
              <select
                value={officeId}
                onChange={(e) => setOfficeId(e.target.value)}
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Office --</option>
                {offices.map((office) => (
                  <option key={office._id} value={office._id}>
                    {office.officeName} - {office.district}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Employee Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter responsible employee full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="office@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white rounded-lg py-2 font-semibold hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Enter OTP
              </label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="123456"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white rounded-lg py-2 font-semibold hover:bg-green-700 disabled:bg-green-300"
            >
              {loading ? "Verifying..." : "Verify and Signup"}
            </button>
          </form>
        )}

        <p className="text-center text-sm mt-6">
          Already registered?{" "}
          <button
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