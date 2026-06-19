const express = require("express");
const ExcelJS = require("exceljs");

const Employee = require("../models/Employee");
const OfficeSubmission = require("../models/OfficeSubmission");
const { protect, officeOnly, adminOnly } = require("../middleware/authMiddleware");
const { verifyVoterFromElectionApi } = require("../utils/verifyVoter");

const router = express.Router();

const clean = (value = "") => {
  return value.toString().trim();
};

const isValidDateFormat = (value = "") => {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
};

const hasEnglishLetters = (value = "") => {
  return /[A-Za-z]/.test(value);
};

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

const validateUnicodeFields = (body = {}) => {
  for (const field of unicodeOnlyFields) {
    const value = body[field.key];

    if (value && hasEnglishLetters(value)) {
      return `${field.label} must be entered in Nepali Unicode only.`;
    }
  }

  return "";
};

const buildVerifiedVoterDetails = (voter = {}) => {
  return {
    voterNumber: voter.voterNumber || "",
    serialNo: voter.serialNo || "",
    fullName: voter.fullName || "",
    nameEnglish: voter.nameEnglish || "",
    citizenshipNumber: voter.citizenshipNumber || "",
    dob: voter.dob || "",
    gender: voter.gender || "",
    age: voter.age || "",
    fatherName: voter.fatherName || "",
    motherName: voter.motherName || "",
    spouseName: voter.spouseName || "",
    provinceId: voter.provinceId || "",
    districtId: voter.districtId || "",
    municipalityId: voter.municipalityId || "",
    wardNo: voter.wardNo || "",
    pollingLocationId: voter.pollingLocationId || "",
    longitude: voter.longitude || "",
    latitude: voter.latitude || "",
    fConstituency: voter.fConstituency || "",
    sConstituency: voter.sConstituency || "",
    regCentreLoc: voter.regCentreLoc || "",
  };
};

const getApiErrorStatusCode = (status = "") => {
  if (status === "api_error" || status === "certificate_error") {
    return 503;
  }

  return 400;
};

/**
 * Office verifies voter before employee entry.
 * POST /api/employee/verify-voter
 */
router.post("/verify-voter", protect, officeOnly, async (req, res) => {
  try {
    const voterNo = clean(req.body.voterNo);
    const dob = clean(req.body.dob);

    if (!voterNo || !dob) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: "Voter number and date of birth are required.",
      });
    }

    if (!isValidDateFormat(dob)) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: "DOB must be in yyyy-mm-dd format.",
      });
    }

    const existingEmployee = await Employee.findOne({ voterNo });

    if (existingEmployee) {
      return res.status(409).json({
        success: false,
        verified: false,
        message: "This voter number has already been added as an employee record.",
      });
    }

    const verification = await verifyVoterFromElectionApi({
      voterNo,
      dob,
    });

    if (!verification.verified) {
      return res.status(getApiErrorStatusCode(verification.status)).json({
        success: false,
        verified: false,
        status: verification.status,
        message:
          verification.message ||
          "Voter record could not be verified from Election Commission database.",
        debug: verification.debug,
      });
    }

    return res.json({
      success: true,
      verified: true,
      status: "verified",
      message: "Voter verified successfully. You can continue employee entry.",
      voter: verification.data,
    });
  } catch (error) {
    console.error("Verify voter route error:", error);

    return res.status(500).json({
      success: false,
      verified: false,
      message: "Failed to verify voter.",
    });
  }
});

/**
 * Office saves employee record.
 * POST /api/employee
 */
router.post("/", protect, officeOnly, async (req, res) => {
  try {
    const voterNo = clean(req.body.voterNo);
    const dob = clean(req.body.dob);

    if (!voterNo || !dob) {
      return res.status(400).json({
        success: false,
        message: "Voter number and date of birth are required.",
      });
    }

    if (!isValidDateFormat(dob)) {
      return res.status(400).json({
        success: false,
        message: "DOB must be in yyyy-mm-dd format.",
      });
    }

    const requiredFields = [
      { key: "fullName", label: "Full name" },
      { key: "citizenshipNumber", label: "Citizenship number" },
      { key: "citizenshipIssueDistrict", label: "Citizenship issue district" },
      { key: "parentFullName", label: "Parent full name" },
      { key: "officeFullName", label: "Office full name" },
      { key: "officeAddress", label: "Office address" },
      { key: "homeDistrict", label: "Home district" },
      { key: "homePalika", label: "Home palika" },
      { key: "homeWardNo", label: "Home ward number" },
    ];

    for (const field of requiredFields) {
      if (!clean(req.body[field.key])) {
        return res.status(400).json({
          success: false,
          message: `${field.label} is requiredss.`,
        });
      }
    }

    const unicodeError = validateUnicodeFields(req.body);

    if (unicodeError) {
      return res.status(400).json({
        success: false,
        message: unicodeError,
      });
    }

    const existingEmployee = await Employee.findOne({ voterNo });

    if (existingEmployee) {
      return res.status(409).json({
        success: false,
        message: "This voter number has already been added as an employee record.",
      });
    }

    /**
     * Backend verifies again during save.
     * Frontend verification alone should not be trusted.
     */
    const verification = await verifyVoterFromElectionApi({
      voterNo,
      dob,
    });

    if (!verification.verified) {
      return res.status(getApiErrorStatusCode(verification.status)).json({
        success: false,
        status: verification.status,
        message:
          verification.message ||
          "Voter record could not be verified from Election Commission database.",
        debug: verification.debug,
      });
    }

    const voter = verification.data || {};

    const employee = await Employee.create({
      office: req.user.office._id,

      /**
       * These fields can be edited after autofill.
       * So we prefer req.body first, then fallback to API value.
       */
      fullName: clean(req.body.fullName) || voter.fullName || "",
      dob: voter.dob || dob,
      voterNo: voter.voterNumber || voterNo,

      citizenshipNumber: clean(req.body.citizenshipNumber) || voter.citizenshipNumber || "",
      citizenshipIssueDistrict:
        clean(req.body.citizenshipIssueDistrict) || voter.districtId || "",

      parentFullName: clean(req.body.parentFullName) || voter.fatherName || "",
      spouseFullName: clean(req.body.spouseFullName) || voter.spouseName || "",

      officeFullName: clean(req.body.officeFullName),
      officeAddress: clean(req.body.officeAddress),

      homeDistrict: clean(req.body.homeDistrict) || voter.districtId || "",
      homePalika: clean(req.body.homePalika) || voter.municipalityId || "",
      homeWardNo: clean(req.body.homeWardNo) || voter.wardNo || "",

      position: clean(req.body.position),
      level: clean(req.body.level),
      grade: clean(req.body.grade),

      isVoterVerified: true,
      voterVerificationStatus: "verified",
      voterVerifiedAt: new Date(),

      verifiedVoterDetails: buildVerifiedVoterDetails(voter),
      voterVerificationResponse: voter,
    });

    return res.status(201).json({
      success: true,
      message: "Employee record saved successfully.",
      employee,
    });
  } catch (error) {
    console.error("Save employee error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This voter number already exists in employee records.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to save employee record.",
    });
  }
});

/**
 * Office views its own employees.
 * GET /api/employee/my-office
 */
router.get("/my-office", protect, officeOnly, async (req, res) => {
  try {
    const employees = await Employee.find({
      office: req.user.office._id,
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      employees,
    });
  } catch (error) {
    console.error("Fetch office employees error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch employee records.",
    });
  }
});

/**
 * Office submits final records.
 * POST /api/employee/submit-office-records
 */
router.post("/submit-office-records", protect, officeOnly, async (req, res) => {
  try {
    const officeId = req.user.office._id;

    const totalEmployees = await Employee.countDocuments({
      office: officeId,
    });

    const verifiedEmployees = await Employee.countDocuments({
      office: officeId,
      isVoterVerified: true,
    });

    if (totalEmployees === 0) {
      return res.status(400).json({
        success: false,
        message: "Please add at least one employee record before submitting.",
      });
    }

    if (totalEmployees !== verifiedEmployees) {
      return res.status(400).json({
        success: false,
        message: "All employee records must be voter verified before submission.",
      });
    }

    const submission = await OfficeSubmission.findOneAndUpdate(
      {
        office: officeId,
      },
      {
        $set: {
          status: "submitted",
          submittedAt: new Date(),
          submittedByName: req.user.lastResponsiblePersonName || "",
          submittedByContact: req.user.lastContactNumber || "",
        },
      },
      {
        new: true,
        upsert: true,
      }
    ).populate("office", "officeCode officeName");

    return res.json({
      success: true,
      message: "Office employee records submitted successfully.",
      submission,
    });
  } catch (error) {
    console.error("Submit office records error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit office records.",
    });
  }
});

/**
 * Admin gets submitted offices only.
 * GET /api/employee/admin/submitted-offices
 */
router.get("/admin/submitted-offices", protect, adminOnly, async (req, res) => {
  try {
    const submissions = await OfficeSubmission.find({
      status: "submitted",
    })
      .populate("office", "officeCode officeName role isActive")
      .sort({ submittedAt: -1 });

    const result = await Promise.all(
      submissions
        .filter((submission) => {
          return (
            submission.office &&
            submission.office.role === "office" &&
            submission.office.isActive === true
          );
        })
        .map(async (submission) => {
          const employeeCount = await Employee.countDocuments({
            office: submission.office._id,
          });

          const verifiedCount = await Employee.countDocuments({
            office: submission.office._id,
            isVoterVerified: true,
          });

          return {
            submissionId: submission._id,
            office: submission.office,
            status: submission.status,
            submittedAt: submission.submittedAt,
            submittedByName: submission.submittedByName,
            submittedByContact: submission.submittedByContact,
            employeeCount,
            verifiedCount,
          };
        })
    );

    return res.json({
      success: true,
      offices: result,
    });
  } catch (error) {
    console.error("Fetch submitted offices error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch submitted offices.",
    });
  }
});

/**
 * Optional admin route: all employees.
 * GET /api/employee/admin/all
 */
router.get("/admin/all", protect, adminOnly, async (req, res) => {
  try {
    const employees = await Employee.find()
      .populate("office", "officeCode officeName")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      employees,
    });
  } catch (error) {
    console.error("Fetch all employees error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch employee records.",
    });
  }
});

/**
 * Admin exports one office's employees.
 * GET /api/employee/admin/office/:officeId/export
 */
router.get(
  "/admin/office/:officeId/export",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const { officeId } = req.params;

      const employees = await Employee.find({
        office: officeId,
      })
        .populate("office", "officeCode officeName")
        .sort({ createdAt: -1 });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Office Employee Records");

      worksheet.columns = [
        { header: "Office Code", key: "officeCode", width: 18 },
        { header: "Office Name", key: "officeName", width: 35 },
        { header: "Full Name", key: "fullName", width: 30 },
        { header: "DOB", key: "dob", width: 15 },
        { header: "Voter No", key: "voterNo", width: 15 },
        { header: "Citizenship No", key: "citizenshipNumber", width: 20 },
        { header: "Issue District", key: "citizenshipIssueDistrict", width: 22 },
        { header: "Parent Full Name", key: "parentFullName", width: 30 },
        { header: "Spouse Full Name", key: "spouseFullName", width: 30 },
        { header: "Office Full Name", key: "officeFullName", width: 35 },
        { header: "Office Address", key: "officeAddress", width: 30 },
        { header: "Home District", key: "homeDistrict", width: 20 },
        { header: "Home Palika", key: "homePalika", width: 25 },
        { header: "Ward No", key: "homeWardNo", width: 12 },
        { header: "Position", key: "position", width: 20 },
        { header: "Level", key: "level", width: 12 },
        { header: "Grade", key: "grade", width: 12 },
        { header: "Verified", key: "verified", width: 12 },
        { header: "Created At", key: "createdAt", width: 22 },
      ];

      employees.forEach((employee) => {
        worksheet.addRow({
          officeCode: employee.office?.officeCode || "",
          officeName: employee.office?.officeName || "",
          fullName: employee.fullName || "",
          dob: employee.dob || "",
          voterNo: employee.voterNo || "",
          citizenshipNumber: employee.citizenshipNumber || employee.verifiedVoterDetails?.citizenshipNumber ||
  employee.citizenshipNo || "",
          citizenshipIssueDistrict: employee.citizenshipIssueDistrict || "",
          parentFullName: employee.parentFullName || "",
          spouseFullName: employee.spouseFullName || "",
          officeFullName: employee.officeFullName || "",
          officeAddress: employee.officeAddress || "",
          homeDistrict: employee.homeDistrict || "",
          homePalika: employee.homePalika || "",
          homeWardNo: employee.homeWardNo || "",
          position: employee.position || "",
          level: employee.level || "",
          grade: employee.grade || "",
          verified: employee.isVoterVerified ? "Yes" : "No",
          createdAt: employee.createdAt
            ? new Date(employee.createdAt).toLocaleString()
            : "",
        });
      });

      worksheet.getRow(1).font = { bold: true };

      const officeCode = employees[0]?.office?.officeCode || "office";

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${officeCode}-employee-records.xlsx`
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Export office employee records error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to export office employee records.",
      });
    }
  }
);

/**
 * Admin views one office's employee records.
 * GET /api/employee/admin/office/:officeId
 */
router.get("/admin/office/:officeId", protect, adminOnly, async (req, res) => {
  try {
    const { officeId } = req.params;

    const employees = await Employee.find({
      office: officeId,
    })
      .populate("office", "officeCode officeName")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      employees,
    });
  } catch (error) {
    console.error("Fetch office employee records error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch office employee records.",
    });
  }
});

/**
 * Admin edits selected employee.
 * PUT /api/employee/admin/:employeeId
 */
router.put("/admin/:employeeId", protect, adminOnly, async (req, res) => {
  try {
    const { employeeId } = req.params;

    const unicodeError = validateUnicodeFields(req.body);

    if (unicodeError) {
      return res.status(400).json({
        success: false,
        message: unicodeError,
      });
    }

    const allowedUpdates = {
      fullName: req.body.fullName,
      citizenshipNumber: req.body.citizenshipNumber,
      citizenshipIssueDistrict: req.body.citizenshipIssueDistrict,
      parentFullName: req.body.parentFullName,
      spouseFullName: req.body.spouseFullName,
      officeFullName: req.body.officeFullName,
      officeAddress: req.body.officeAddress,
      homeDistrict: req.body.homeDistrict,
      homePalika: req.body.homePalika,
      homeWardNo: req.body.homeWardNo,
      position: req.body.position,
      level: req.body.level,
      grade: req.body.grade,
    };

    Object.keys(allowedUpdates).forEach((key) => {
      if (allowedUpdates[key] === undefined) {
        delete allowedUpdates[key];
      } else {
        allowedUpdates[key] = clean(allowedUpdates[key]);
      }
    });

    const employee = await Employee.findByIdAndUpdate(
      employeeId,
      {
        $set: allowedUpdates,
      },
      {
        new: true,
      }
    ).populate("office", "officeCode officeName");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee record not found.",
      });
    }

    return res.json({
      success: true,
      message: "Employee record updated successfully.",
      employee,
    });
  } catch (error) {
    console.error("Update employee record error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update employee record.",
    });
  }
});

/**
 * Admin deletes selected employee.
 * DELETE /api/employee/admin/:employeeId
 */
router.delete("/admin/:employeeId", protect, adminOnly, async (req, res) => {
  try {
    const { employeeId } = req.params;

    const employee = await Employee.findByIdAndDelete(employeeId);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee record not found.",
      });
    }

    return res.json({
      success: true,
      message: "Employee record deleted successfully.",
    });
  } catch (error) {
    console.error("Delete employee record error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete employee record.",
    });
  }
});

module.exports = router;