const express = require("express");
const Employee = require("../models/Employee");
const {
  protect,
  officeOnly,
  adminOnly,
} = require("../middleware/authMiddleware");
const { verifyVoterFromElectionApi } = require("../utils/verifyVoter");

const router = express.Router();

const isValidNepaliMobile = (number) => {
  if (!number) return true;
  return /^9[78]\d{8}$/.test(number);
};

const validateRequiredEmployeeFields = (data) => {
  const requiredFields = [
    "firstName",
    "lastName",
    "voterNo",
    "dob",
    "address",
  ];

  for (const field of requiredFields) {
    if (!data[field] || !data[field].toString().trim()) {
      return `${field} is required`;
    }
  }

  return "";
};

/**
 * POST /api/employee/verify-voter
 *
 * Office user checks voterNo + dob before saving employee record.
 */
router.post("/verify-voter", protect, officeOnly, async (req, res) => {
  try {
    const { voterNo, dob } = req.body;

    if (!voterNo || !dob) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: "Voter number and date of birth are required",
      });
    }
    

    const cleanedVoterNo = voterNo.toString().trim();
    const cleanedDob = dob.toString().trim();

    const existingEmployee = await Employee.findOne({
      voterNo: cleanedVoterNo,
    }).populate("office", "officeCode officeName");

    if (existingEmployee) {
      return res.status(409).json({
        success: false,
        verified: false,
        status: "duplicate",
        message: "This voter number has already been entered in the system",
        existingOffice: existingEmployee.office,
      });
    }

    const verification = await verifyVoterFromElectionApi({
      voterNo: cleanedVoterNo,
      dob: cleanedDob,
    });

    // if (!verification.verified) {
    //   return res.status(400).json({
    //     success: false,
    //     verified: false,
    //     status: verification.status,
    //     message:
    //       verification.message ||
    //       "Voter record could not be verified from Election Commission database",
    //   });
    // }
    if (!verification.verified) {
  return res.status(400).json({
    success: false,
    verified: false,
    status: verification.status,
    message:
      verification.message ||
      "Voter record could not be verified from Election Commission database",
    debug: verification.debug,
  });
}

    res.json({
      success: true,
      verified: true,
      status: "verified",
      message: "Voter verified successfully. You can continue employee entry.",
      voter: verification.data,
    });
  } catch (error) {
    console.error("Verify voter route error:", error);

    res.status(500).json({
      success: false,
      verified: false,
      message: "Failed to verify voter",
    });
  }
});

/**
 * POST /api/employee
 *
 * Save employee only after voter verification succeeds.
 * Backend verifies again before saving.
 */
router.post("/", protect, officeOnly, async (req, res) => {
  try {
    const validationError = validateRequiredEmployeeFields(req.body);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    if (!isValidNepaliMobile(req.body.phone)) {
      return res.status(400).json({
        success: false,
        message: "Phone number must be a valid Nepali mobile number",
      });
    }

    const voterNo = req.body.voterNo.toString().trim();
    const dob = req.body.dob.toString().trim();

    const existingEmployee = await Employee.findOne({ voterNo });

    if (existingEmployee) {
      return res.status(409).json({
        success: false,
        message: "This voter number has already been entered in the system",
      });
    }

    /**
     * Verify again on save.
     * This prevents frontend bypass.
     */
    const verification = await verifyVoterFromElectionApi({
      voterNo,
      dob,
    });

    if (!verification.verified) {
      return res.status(400).json({
        success: false,
        message:
          verification.message ||
          "Employee cannot be saved because voter record is not verified",
      });
    }

    const employee = await Employee.create({
      office: req.user.office._id,

      firstName: req.body.firstName.trim(),
      middleName: req.body.middleName?.trim() || "",
      lastName: req.body.lastName.trim(),

      voterNo,
      dob,

      address: req.body.address.trim(),
      phone: req.body.phone?.trim() || "",
      position: req.body.position?.trim() || "",
      level: req.body.level?.trim() || "",
      grade: req.body.grade?.trim() || "",

      isVoterVerified: true,
      voterVerificationStatus: "verified",
      voterVerifiedAt: new Date(),

      /**
       * Store verified voter details returned from Election Commission API.
       * In schema, voterVerificationResponse has select:false.
       */
      voterVerificationResponse: verification.data || {},
    });

    res.status(201).json({
      success: true,
      message: "Employee record saved successfully",
      employee,
    });
  } catch (error) {
    console.error("Create employee error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate voter number. This employee already exists.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to save employee record",
    });
  }
});

/**
 * GET /api/employee/my-office
 *
 * Office user sees only their own records.
 */
router.get("/my-office", protect, officeOnly, async (req, res) => {
  try {
    const employees = await Employee.find({
      office: req.user.office._id,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      employees,
    });
  } catch (error) {
    console.error("Fetch office employees error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch employee records",
    });
  }
});

/**
 * GET /api/employee/admin/all
 *
 * Admin sees all office employee records.
 */
router.get("/admin/all", protect, adminOnly, async (req, res) => {
  try {
    const employees = await Employee.find()
      .populate("office", "officeCode officeName")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      employees,
    });
  } catch (error) {
    console.error("Fetch all employees error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch employee records",
    });
  }
});

module.exports = router;