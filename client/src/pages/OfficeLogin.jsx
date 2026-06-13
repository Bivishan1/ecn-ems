import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosInstance";
import Toast from "../components/Toast";

const OfficeLogin = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState("form");

  const [offices, setOffices] = useState([]);
  const [officeLoading, setOfficeLoading] = useState(false);

  const [formData, setFormData] = useState({
    officeId: "",
    responsiblePersonName: "",
    contactNumber: "",
  });

  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

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

  const getCooldownKey = (officeId) => {
    return `otpCooldown_${officeId}`;
  };

  const startCooldown = (officeId, seconds = 60) => {
    if (!officeId) return;

    const expiresAt = Date.now() + seconds * 1000;

    localStorage.setItem(getCooldownKey(officeId), String(expiresAt));
    setResendSeconds(seconds);
  };

      useEffect(() => {
      const loadCooldown = (officeId) => {
    if (!officeId) {
      setResendSeconds(0);
      return;
    }

    const savedExpiresAt = localStorage.getItem(getCooldownKey(officeId));

    if (!savedExpiresAt) {
      setResendSeconds(0);
      return;
    }

    const remainingSeconds = Math.ceil(
      (Number(savedExpiresAt) - Date.now()) / 1000
    );

    if (remainingSeconds > 0) {
      setResendSeconds(remainingSeconds);
    } else {
      localStorage.removeItem(getCooldownKey(officeId));
      setResendSeconds(0);
    }
  };
    loadCooldown(formData.officeId);
  }, [formData.officeId]);

    useEffect(() => {
  const fetchOffices = async () => {
    try {
      setOfficeLoading(true);

      const res = await axiosInstance.get("/office/offices");

      setOffices(res.data.offices || []);
    } catch (err) {
      showToast("error", "Failed to load office list", err);
    } finally {
      setOfficeLoading(false);
    }
  };
    fetchOffices();
  }, []);


  useEffect(() => {
    if (resendSeconds <= 0) {
      if (formData.officeId) {
        localStorage.removeItem(getCooldownKey(formData.officeId));
      }

      return;
    }

    const timer = setTimeout(() => {
      setResendSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [resendSeconds, formData.officeId]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const validateLoginForm = () => {
    const { officeId, responsiblePersonName, contactNumber } = formData;

    if (!officeId || !responsiblePersonName || !contactNumber) {
      return "Office, full name and contact number are required";
    }

    const nepaliMobileRegex = /^9[78]\d{8}$/;

    if (!nepaliMobileRegex.test(contactNumber)) {
      return "Contact number must be a valid Nepali mobile number";
    }

    return "";
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();

    closeToast();

    const validationError = validateLoginForm();

    if (validationError) {
      showToast("error", validationError);
      return;
    }

    if (resendSeconds > 0) {
      showToast(
        "error",
        `Please wait ${resendSeconds} seconds before requesting another OTP`
      );
      setStep("otp");
      return;
    }

    try {
      setLoading(true);

      const res = await axiosInstance.post("/office/request-otp", {
        officeId: formData.officeId,
        responsiblePersonName: formData.responsiblePersonName,
        contactNumber: formData.contactNumber,
      });

      const maskedEmail = res.data.maskedEmail
        ? ` (${res.data.maskedEmail})`
        : "";

      showToast("success", `${res.data.message}${maskedEmail}`);

      setStep("otp");
      startCooldown(formData.officeId, res.data.resendAfter || 60);
    } catch (err) {
      const retryAfter = err.response?.data?.retryAfter;

      if (retryAfter) {
        startCooldown(formData.officeId, retryAfter);
        setStep("otp");
      }

      showToast("error", err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    closeToast();

    if (!otp || otp.length !== 6) {
      showToast("error", "Please enter a valid 6 digit OTP");
      return;
    }

    try {
      setLoading(true);

      const res = await axiosInstance.post("/office/verify-otp", {
        officeId: formData.officeId,
        otp,
      });

      localStorage.setItem("officeToken", res.data.token);
      localStorage.setItem("officeAccount", JSON.stringify(res.data.account));

      showToast("success", res.data.message || "OTP verified successfully");

      setTimeout(() => {
        navigate("/ems/office/dashboard");
      }, 700);
    } catch (err) {
      showToast(
        "error",
        err.response?.data?.message || "OTP verification failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    closeToast();

    if (resendSeconds > 0) {
      showToast(
        "error",
        `Please wait ${resendSeconds} seconds before resending OTP`
      );
      return;
    }

    const validationError = validateLoginForm();

    if (validationError) {
      showToast("error", validationError);
      return;
    }

    try {
      setLoading(true);

      const res = await axiosInstance.post("/office/request-otp", {
        officeId: formData.officeId,
        responsiblePersonName: formData.responsiblePersonName,
        contactNumber: formData.contactNumber,
      });

      const maskedEmail = res.data.maskedEmail
        ? ` (${res.data.maskedEmail})`
        : "";

      showToast("success", `${res.data.message}${maskedEmail}`);

      startCooldown(formData.officeId, res.data.resendAfter || 60);
    } catch (err) {
      const retryAfter = err.response?.data?.retryAfter;

      if (retryAfter) {
        startCooldown(formData.officeId, retryAfter);
      }

      showToast("error", err.response?.data?.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  const goBackToEdit = () => {
    setOtp("");
    closeToast();
    setStep("form");
  };

  const selectedOffice = offices.find(
    (office) => office._id === formData.officeId
  );

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-10">
      <Toast type={toast.type} message={toast.message} onClose={closeToast} />

      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800">
            Office OTP Login
          </h1>

          <p className="text-slate-500 mt-2">
            Election Staff Data Collection System
          </p>
        </div>

        <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-sm text-slate-700">
            This login is only for normal offices. OTP will be sent to the
            official email of the selected office.
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
                  Responsible Person Full Name
                </label>

                <input
                  type="text"
                  name="responsiblePersonName"
                  value={formData.responsiblePersonName}
                  onChange={handleChange}
                  placeholder="Enter full name"
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                      contactNumber: value,
                    }));
                  }}
                  placeholder="98XXXXXXXX"
                  maxLength={10}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || officeLoading}
              className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-semibold hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/ems/admin")}
              className="w-full text-blue-600 font-semibold"
            >
              Go to Admin Login
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="mt-6 space-y-5">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-sm text-slate-600">Selected Office</p>

              <p className="font-semibold text-slate-800">
                {selectedOffice
                  ? `${selectedOffice.officeCode} - ${selectedOffice.officeName}`
                  : "Selected office"}
              </p>

              <p className="text-sm text-slate-600 mt-3">
                OTP has been sent to the official email of this office.
              </p>

              <p className="text-sm text-slate-600 mt-2">
                Responsible Person:{" "}
                <span className="font-medium text-slate-800">
                  {formData.responsiblePersonName}
                </span>
              </p>

              <p className="text-sm text-slate-600 mt-1">
                Contact Number:{" "}
                <span className="font-medium text-slate-800">
                  {formData.contactNumber}
                </span>
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
              {loading ? "Verifying..." : "Verify OTP and Login"}
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={loading || resendSeconds > 0}
              className="w-full border border-slate-300 text-slate-700 rounded-lg py-2.5 font-semibold hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
            >
              {resendSeconds > 0
                ? `Resend OTP after ${resendSeconds}s`
                : "Resend OTP"}
            </button>

            <button
              type="button"
              onClick={goBackToEdit}
              className="w-full text-blue-600 font-semibold"
            >
              Edit login details
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default OfficeLogin;