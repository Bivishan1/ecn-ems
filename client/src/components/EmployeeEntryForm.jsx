import { useState } from "react";
import axiosInstance from "../api/axiosInstance";
import Toast from "./Toast";

const initialFormData = {
  firstName: "",
  middleName: "",
  lastName: "",
  voterNo: "",
  dob: "",
  address: "",
  phone: "",
  position: "",
  level: "",
  grade: "",
};

const EmployeeEntryForm = ({ onSaved }) => {
  const [formData, setFormData] = useState(initialFormData);
  const [isVoterVerified, setIsVoterVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verifiedVoter, setVerifiedVoter] = useState(null);

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
    const { name, value } = e.target;

    /**
     * If voterNo or dob changes after verification,
     * invalidate previous verification.
     */
    if (name === "voterNo" || name === "dob") {
      setIsVoterVerified(false);
        setIsVoterVerified(false);
  setVerifiedVoter(null);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const verifyVoter = async () => {
    closeToast();

    if (!formData.voterNo || !formData.dob) {
      showToast("error", "Voter number and date of birth are required");
      return;
    }

    try {
      setVerifying(true);

      const res = await axiosInstance.post("/employee/verify-voter", {
        voterNo: formData.voterNo,
        dob: formData.dob,
      });

if (res.data.verified) {
  setIsVoterVerified(true);

  const voter = res.data.voter || {};

  setVerifiedVoter(voter);

  const nameEnglishParts = voter.nameEnglish
    ? voter.nameEnglish.trim().split(/\s+/)
    : [];

  const firstNameFromApi = nameEnglishParts[0] || "";

  const lastNameFromApi =
    nameEnglishParts.length > 1
      ? nameEnglishParts[nameEnglishParts.length - 1]
      : "";

  const middleNameFromApi =
    nameEnglishParts.length > 2
      ? nameEnglishParts.slice(1, -1).join(" ")
      : "";

  setFormData((prev) => ({
    ...prev,

    firstName: prev.firstName || firstNameFromApi,
    middleName: prev.middleName || middleNameFromApi,
    lastName: prev.lastName || lastNameFromApi,

    address:
      prev.address ||
      [
        voter.provinceId,
        voter.districtId,
        voter.municipalityId,
        voter.wardNo ? `Ward No. ${voter.wardNo}` : "",
      ]
        .filter(Boolean)
        .join(", "),
  }));

  showToast("success", res.data.message || "Voter verified successfully");
}
else {
        setIsVoterVerified(false);
        showToast("error", res.data.message || "Voter verification failed");
      }
    } catch (err) {
      setIsVoterVerified(false);

      showToast(
        "error",
        err.response?.data?.message || "Voter verification failed"
      );
    } finally {
      setVerifying(false);
    }
  };

  const validateForm = () => {
    if (!formData.firstName || !formData.lastName) {
      return "First name and last name are required";
    }

    if (!formData.voterNo || !formData.dob) {
      return "Voter number and date of birth are required";
    }

    if (!formData.address) {
      return "Address is required";
    }

    if (!isVoterVerified) {
      return "Please verify voter number and date of birth before saving";
    }

    return "";
  };

  const saveEmployee = async (e) => {
    e.preventDefault();

    closeToast();

    const validationError = validateForm();

    if (validationError) {
      showToast("error", validationError);
      return;
    }

    try {
      setSaving(true);

      const res = await axiosInstance.post("/employee", formData);

      showToast("success", res.data.message || "Employee saved successfully");

      setFormData(initialFormData);
      setIsVoterVerified(false);

      if (onSaved) {
        onSaved();
      }
    } catch (err) {
      showToast(
        "error",
        err.response?.data?.message || "Failed to save employee record"
      );
    } finally {
      setSaving(false);
    }
  };

  if (name === "voterNo" || name === "dob") {
  setIsVoterVerified(false);
  setVerifiedVoter(null);
}

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <Toast type={toast.type} message={toast.message} onClose={closeToast} />

      <h2 className="text-lg font-semibold text-slate-800">
        Add Employee Record
      </h2>

      <p className="text-sm text-slate-500 mt-1">
        First verify voter number and date of birth, then save employee record.
      </p>

      <form onSubmit={saveEmployee} className="mt-5 space-y-5">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Voter Number
            </label>
            <input
              type="text"
              name="voterNo"
              value={formData.voterNo}
              onChange={handleChange}
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
              placeholder="Enter voter no"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Date of Birth
            </label>
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={verifyVoter}
              disabled={verifying || !formData.voterNo || !formData.dob}
              className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-semibold hover:bg-blue-700 disabled:bg-blue-300"
            >
              {verifying ? "Verifying..." : "Verify Voter"}
            </button>
          </div>
        </div>

        {isVoterVerified ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 text-sm font-medium">
            Voter verified. You can now enter and save employee details.
          </div>
        ) : (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-orange-700 text-sm font-medium">
            Employee save is locked until voter verification succeeds.
          </div>
        )}

        {/* verified voter succes preview message */}
        {verifiedVoter && (
  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm">
    <h3 className="font-semibold text-green-800 mb-2">
      Verified Voter Details
    </h3>

    <div className="grid md:grid-cols-2 gap-3 text-green-800">
      <p>
        <span className="font-medium">Voter No:</span>{" "}
        {verifiedVoter.voterNumber}
      </p>

      <p>
        <span className="font-medium">Name:</span> {verifiedVoter.fullName}
      </p>

      <p>
        <span className="font-medium">English Name:</span>{" "}
        {verifiedVoter.nameEnglish}
      </p>

      <p>
        <span className="font-medium">DOB:</span> {verifiedVoter.dob}
      </p>

      <p>
        <span className="font-medium">Gender:</span> {verifiedVoter.gender}
      </p>

      <p>
        <span className="font-medium">District:</span>{" "}
        {verifiedVoter.districtId}
      </p>

      <p>
        <span className="font-medium">Municipality:</span>{" "}
        {verifiedVoter.municipalityId}
      </p>

      <p>
        <span className="font-medium">Ward:</span> {verifiedVoter.wardNo}
      </p>

      <p className="md:col-span-2">
        <span className="font-medium">Registration Centre:</span>{" "}
        {verifiedVoter.regCentreLoc}
      </p>
    </div>
  </div>
)}
        {/* verified voter succes preview message closed */}



        <fieldset
          disabled={!isVoterVerified}
          className={!isVoterVerified ? "opacity-60" : ""}
        >
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                placeholder="First name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Middle Name
              </label>
              <input
                type="text"
                name="middleName"
                value={formData.middleName}
                onChange={handleChange}
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                placeholder="Middle name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                placeholder="Last name"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Address
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                placeholder="Address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Phone
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setFormData((prev) => ({ ...prev, phone: value }));
                }}
                maxLength={10}
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                placeholder="98XXXXXXXX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Position
              </label>
              <input
                type="text"
                name="position"
                value={formData.position}
                onChange={handleChange}
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                placeholder="Position"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Level
              </label>
              <input
                type="text"
                name="level"
                value={formData.level}
                onChange={handleChange}
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                placeholder="Level"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Grade
              </label>
              <input
                type="text"
                name="grade"
                value={formData.grade}
                onChange={handleChange}
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                placeholder="Grade"
              />
            </div>
          </div>
        </fieldset>

        <button
          type="submit"
          disabled={saving || !isVoterVerified}
          className="w-full bg-green-600 text-white rounded-lg py-2.5 font-semibold hover:bg-green-700 disabled:bg-green-300"
        >
          {saving ? "Saving..." : "Save Employee Record"}
        </button>
      </form>
    </div>
  );
};

export default EmployeeEntryForm;