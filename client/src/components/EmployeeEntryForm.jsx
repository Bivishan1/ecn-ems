import { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import {getOfficeAddressFromOfficeName} from "../utils/helper";
import {getOfficeNameWithoutAddress} from "../utils/helper";

const initialFormData = {
  fullName: "",
  dob: "",
  voterNo: "",

  citizenshipNumber: "",
  citizenshipIssueDistrict: "",

  parentFullName: "",
  spouseFullName: "",

  officeFullName: "",
  officeAddress: "",

  homeDistrict: "",
  homePalika: "",
  homeWardNo: "",

  position: "",
  level: "",
  grade: "",
};

 

const createInitialFormData = (account) => {
  const officeFullName = account?.office?.officeName ?? "";

  return {
    ...initialFormData,
    officeFullName,
    officeAddress: getOfficeAddressFromOfficeName(officeFullName),
  };
};

const EmployeeEntryForm = ({ onSaved , account }) => {
  const [formData, setFormData] = useState(() =>  createInitialFormData(account));

  const [isVoterVerified, setIsVoterVerified] = useState(false);
  const [verifiedVoter, setVerifiedVoter] = useState(null);

  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState({
    type: "",
    message: "",
  });

const loggedInOfficeName = account?.office?.officeName || "";

const officeFullNameValue = getOfficeNameWithoutAddress(loggedInOfficeName);

// const officeFieldsLocked = true;

/**
 * Employee + home details are locked:
 * - before verification: because there is no verified data
 * - after verification: because data came from voter API
 */
// const fetchedFieldsLocked = true;

/**
 * Service details can be entered only after voter verification.
 */
// const serviceFieldsLocked = !isVoterVerified;

  const showToast = (type, message) => {
    setToast({ type, message });
  };

  const closeToast = () => {
    setToast({ type: "", message: "" });
  };

  useEffect(() => {
    if (!toast.message) return;

    const timer = setTimeout(() => {
      closeToast();
    }, 4000);

    return () => clearTimeout(timer);
  }, [toast.message]);

  const hasEnglishLetters = (value = "") => {
    return /[A-Za-z]/.test(value);
  };

  const isValidDateFormat = (value = "") => {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
  };

  // auto hyphen in DOB input field
  const formatDobInput = (value = "") => {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 8);

    if (digitsOnly.length <= 4) {
      return digitsOnly;
    }

    if (digitsOnly.length <= 6) {
      return `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4)}`;
    }

    return `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4, 6)}-${digitsOnly.slice(6, 8)}`;
  };

  // validating unicode input in the fields

  const unicodeOnlyFields = [
    { key: "fullName", label: "Full name" },
    { key: "citizenshipIssueDistrict", label: "Citizenship issue district" },
    { key: "parentFullName", label: "Parent full name" },
    { key: "spouseFullName", label: "Spouse full name" },
    { key: "officeFullName", label: "Office full name" },
    { key: "officeAddress", label: "Office address" },
    { key: "homeDistrict", label: "Home district" },
    { key: "homePalika", label: "Home palika" },
    { key: "position", label: "Position" },
  ];

  const validateUnicodeFields = () => {
    for (const field of unicodeOnlyFields) {
      const value = formData[field.key];

      if (value && hasEnglishLetters(value)) {
        return `${field.label} must be entered in Nepali Unicode only.`;
      }
    }

    return "";
  };

  const validateForm = () => {
    if (!formData.voterNo.trim()) {
      return "Voter number is required.";
    }

    if (!formData.dob.trim()) {
      return "Date of birth is required.";
    }

    if (!isValidDateFormat(formData.dob.trim())) {
      return "DOB must be in yyyy-mm-dd format.";
    }

    if (!isVoterVerified) {
      return "Please verify voter before saving employee record.";
    }

    if (!formData.fullName.trim()) {
      return "Full name is required.";
    }

    if (!formData.citizenshipNumber.trim()) {
      return "Citizenship number is requiredsss.";
    }

    if (!formData.citizenshipIssueDistrict.trim()) {
      return "Citizenship issue district is required.";
    }

    if (!formData.parentFullName.trim()) {
      return "Parent full name is required.";
    }

    if (!formData.officeFullName.trim()) {
      return "Office full name is required.";
    }

    if (!formData.officeAddress.trim()) {
      return "Office address is required.";
    }

    if (!formData.homeDistrict.trim()) {
      return "Home district is required.";
    }

    if (!formData.homePalika.trim()) {
      return "Home palika is required.";
    }


    if (!formData.homeWardNo.trim()) {
      return "Home ward number is required.";
    }

    const unicodeError = validateUnicodeFields();

    if (unicodeError) {
      return unicodeError;
    }

    return "";
  };

  const resetApiFilledFields = (override = {}) => {
    setVerifiedVoter(null);
    setIsVoterVerified(false);

    setFormData((prev) => ({
      ...prev,
      ...override,

      fullName: "",
      citizenshipNumber: "",
      citizenshipIssueDistrict: "",
      parentFullName: "",
      spouseFullName: "",

      homeDistrict: "",
      homePalika: "",
      homeWardNo: "",
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    closeToast();

    /**
     * If voter no or DOB changes after verification,
     * previous verification becomes invalid.
     */

    if (name === "dob") {
      const formattedDob = formatDobInput(value);

      resetApiFilledFields({
        dob: formattedDob,
      });

      return;
    }

    if (name === "voterNo") {
      resetApiFilledFields({
        voterNo: value,
      });

      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const verifyVoter = async () => {
    try {
      closeToast();

      if (!formData.voterNo.trim()) {
        showToast("error", "Please enter voter number first.");
        return;
      }

      if (!formData.dob.trim()) {
        showToast("error", "Please enter DOB first.");
        return;
      }

      if (!isValidDateFormat(formData.dob.trim())) {
        showToast("error", "DOB must be in yyyy-mm-dd format.");
        return;
      }

      setVerifying(true);

      const res = await axiosInstance.post("/employee/verify-voter", {
        voterNo: formData.voterNo.trim(),
        dob: formData.dob.trim(),
      });

      const voter = res.data.voter || {};

      setVerifiedVoter(voter);
      setIsVoterVerified(true);
      console.log("Voter verified status:", isVoterVerified);

      setFormData((prev) => ({
        ...prev,

        fullName: voter.fullName || prev.fullName,
        dob: voter.dob || prev.dob,
        voterNo: voter.voterNumber || prev.voterNo,

        citizenshipNumber: voter.citizenshipNumber || prev.citizenshipNumber,
        citizenshipIssueDistrict:
          voter.districtId || prev.citizenshipIssueDistrict,

        parentFullName: voter.fatherName || prev.parentFullName,
        spouseFullName: voter.spouseName || prev.spouseFullName,

        homeDistrict: voter.districtId || prev.homeDistrict,
        homePalika: voter.municipalityId || prev.homePalika,
        homeWardNo: voter.wardNo || prev.homeWardNo,
      }));

      showToast(
        "success",
        res.data.message ||
          "Voter verified successfully. Please review and edit fields if needed.",
      );
    } catch (err) {
      console.error("Verify voter error:", err.response?.data || err.message);

      resetApiFilledFields();

      showToast(
        "error",
        err.response?.data?.message || "Failed to verify voter.",
      );
    } finally {
      setVerifying(false);
    }
  };
 // Provide a fallback for the dependency


  // handle submit form

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      closeToast();

      const validationError = validateForm();

      if (validationError) {
        showToast("error", validationError);
        return;
      }

      setSaving(true);

      const payload = {
        fullName: formData.fullName.trim(),
        dob: formData.dob.trim(),
        voterNo: formData.voterNo.trim(),

        citizenshipNumber: formData.citizenshipNumber.trim(),
        citizenshipIssueDistrict: formData.citizenshipIssueDistrict.trim(),

        parentFullName: formData.parentFullName.trim(),
        spouseFullName: formData.spouseFullName.trim(),

        officeFullName: formData.officeFullName.trim(),
        officeAddress: formData.officeAddress.trim(),

        homeDistrict: formData.homeDistrict.trim(),
        homePalika: formData.homePalika.trim(),
        homeWardNo: formData.homeWardNo.trim(),

        position: formData.position.trim(),
        level: formData.level.trim(),
        grade: formData.grade.trim(),
      };

      const res = await axiosInstance.post("/employee", payload);

      showToast(
        "success",
        res.data.message || "Employee record saved successfully.",
      );

      
      setFormData(createInitialFormData(account));
      setIsVoterVerified(false);
      setVerifiedVoter(null);

      if (onSaved) {
        onSaved(res.data.employee);
      }
    } catch (err) {
      console.error("Save employee error:", err.response?.data || err.message);

      showToast(
        "error",
        err.response?.data?.message || "Failed to save employee record.",
      );
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed";

  const labelClass = "block text-sm font-medium text-slate-700";

  const canEditEmployeeFields = !isVoterVerified;

  return (
    <div className="relative bg-white rounded-2xl shadow p-6">
      {toast.message && (
        <div
          className={`fixed top-5 right-5 z-50 w-90 max-w-[90vw] rounded-xl border px-4 py-3 shadow-lg ${
            toast.type === "error"
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-green-50 text-green-700 border-green-200"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium">{toast.message}</p>

            <button
              type="button"
              onClick={closeToast}
              className="text-xl leading-none font-bold opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-800">
          Employee Record Entry
        </h2>

        <p className="text-sm text-slate-500 mt-1">
          First verify voter number and DOB. After successful verification, API
          details will autofill into the form and can still be edited before
          saving.
        </p>
      </div>

      <div className="mb-5 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-800 text-sm">
        <p className="font-semibold">Unicode Notice</p>

        <p className="mt-1">
          कृपया नाम, कार्यालयको नाम, ठेगाना, जिल्ला, पालिका र पद सम्बन्धी विवरण
          नेपाली Unicode मा मात्र लेख्नुहोस्। Roman English मा लेखेमा record
          save हुँदैन।
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="border border-slate-200 rounded-2xl p-5">
          <h3 className="font-semibold text-slate-800 mb-4">
            Voter Verification
          </h3>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Voter No.</label>
              <input
                type="text"
                name="voterNo"
                value={formData.voterNo}
                onChange={handleChange}
                placeholder="Enter voter number"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>DOB B.S. / yyyy-mm-dd</label>
              <input
                type="text"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                maxLength={10}
                placeholder="yyyy-mm-dd"
                className={inputClass}
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={verifyVoter}
                disabled={verifying || !formData.voterNo || !formData.dob}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-slate-400"
              >
                {verifying ? "Verifying..." : "Verify Voter"}
              </button>
            </div>
          </div>

          <div className="mt-4">
            {isVoterVerified ? (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 text-sm">
                Voter verified successfully. Employee detail fields are now
                unlocked and editable.
              </div>
            ) : (
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-orange-700 text-sm">
                Employee detail fields are locked until voter verification is
                completed.
              </div>
            )}
          </div>

          {verifiedVoter && (
            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm">
              <h4 className="font-semibold text-slate-800 mb-2">
                API Verification Preview
              </h4>

              <div className="grid md:grid-cols-3 gap-3 text-slate-700">
                <p>
                  <span className="font-medium">Name:</span>{" "}
                  {verifiedVoter.fullName || "N/A"}
                </p>

                <p>
                  <span className="font-medium">Voter No:</span>{" "}
                  {verifiedVoter.voterNumber || "N/A"}
                </p>

                <p>
                  <span className="font-medium">DOB:</span>{" "}
                  {verifiedVoter.dob || "N/A"}
                </p>

                <p>
                  <span className="font-medium">District:</span>{" "}
                  {verifiedVoter.districtId || "N/A"}
                </p>

                <p>
                  <span className="font-medium">Palika:</span>{" "}
                  {verifiedVoter.municipalityId || "N/A"}
                </p>

                <p>
                  <span className="font-medium">Ward:</span>{" "}
                  {verifiedVoter.wardNo || "N/A"}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="border border-slate-200 rounded-2xl p-5">
          <h3 className="font-semibold text-slate-800 mb-4">
            Employee Details
          </h3>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Full Name</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                disabled={!canEditEmployeeFields}
                placeholder="Voter API बाट autofill हुन्छ"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Citizenship No.</label>
              <input
                type="text"
                name="citizenshipNumber"
                value={formData.citizenshipNumber}
                onChange={handleChange}
                disabled={!canEditEmployeeFields}
                placeholder="API serialNo बाट autofill"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Citizenship Issue District</label>
              <input
                type="text"
                name="citizenshipIssueDistrict"
                value={formData.citizenshipIssueDistrict}
                onChange={handleChange}
                disabled={!canEditEmployeeFields}
                placeholder="API districtId बाट autofill"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Parent Full Name</label>
              <input
                type="text"
                name="parentFullName"
                value={formData.parentFullName}
                onChange={handleChange}
                disabled={!canEditEmployeeFields}
                placeholder="API fatherName बाट autofill"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Spouse Full Name</label>
              <input
                type="text"
                name="spouseFullName"
                value={formData.spouseFullName}
                onChange={handleChange}
                disabled={!canEditEmployeeFields}
                placeholder="Available भए API spouseName बाट autofill"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="border border-slate-200 rounded-2xl p-5">
          <h3 className="font-semibold text-slate-800 mb-4">
            Office and Home Details
          </h3>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Office Full Name</label>
              <input
                type="text"
                name="officeFullName"
                value={officeFullNameValue}
                onChange={handleChange}
                disabled={!canEditEmployeeFields}
                placeholder="कार्यालयको पूरा नाम"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Office Address</label>
              <input
                type="text"
                name="officeAddress"
                value={formData.officeAddress}
                onChange={handleChange}
                disabled={!canEditEmployeeFields}
                placeholder="कार्यालय ठेगाना"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Home District</label>
              <input
                type="text"
                name="homeDistrict"
                value={formData.homeDistrict}
                onChange={handleChange}
                disabled={!canEditEmployeeFields}
                placeholder="API districtId बाट autofill"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Home Palika</label>
              <input
                type="text"
                name="homePalika"
                value={formData.homePalika}
                onChange={handleChange}
                disabled={!canEditEmployeeFields}
                placeholder="API municipalityId बाट autofill"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Palika Ward No.</label>
              <input
                type="text"
                name="homeWardNo"
                value={formData.homeWardNo}
                onChange={handleChange}
                disabled={!canEditEmployeeFields}
                placeholder="API wardNo बाट autofill"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="border border-slate-200 rounded-2xl p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Service Details</h3>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Position</label>
              <input
                type="text"
                name="position"
                value={formData.position}
                onChange={handleChange}
                disabled={!canEditEmployeeFields}
                placeholder="पद"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Level</label>
              <input
                type="text"
                name="level"
                value={formData.level}
                onChange={handleChange}
                disabled={!canEditEmployeeFields}
                placeholder="तह"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Grade</label>
              <input
                type="text"
                name="grade"
                value={formData.grade}
                onChange={handleChange}
                disabled={!canEditEmployeeFields}
                placeholder="श्रेणी"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p className="text-sm text-slate-500">
            Save button is enabled only after voter verification.
          </p>

          <button
            type="submit"
            disabled={saving || !isVoterVerified}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-slate-400"
          >
            {saving ? "Saving..." : "Save Employee Record"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeEntryForm;
