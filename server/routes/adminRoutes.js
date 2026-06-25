const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const AdminUser = require("../models/AdminUser");
const Office = require("../models/Office");
const OfficeAccess = require("../models/OfficeAccess");
const OfficeLoginLog = require("../models/OfficeLoginLog");

const Employee = require("../models/Employee");
const OfficeSubmission = require("../models/OfficeSubmission");

const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

const generateAdminToken = (admin) => {
  return jwt.sign(
    {
      id: admin._id,
      role: "admin",
      authType: "admin",
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || "8h",
    }
  );
};

/**
 * POST /api/admin/login
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const admin = await AdminUser.findOne({
      email: email.toLowerCase(),
      isActive: true,
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, admin.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    admin.loginCount += 1;
    admin.lastLoginAt = new Date();
    await admin.save();

    const token = generateAdminToken(admin);

    res.json({
      success: true,
      message: "Admin login successful",
      token,
      account: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        officeName: admin.officeName,
        role: admin.role,
        authType: "admin",
        loginCount: admin.loginCount,
        lastLoginAt: admin.lastLoginAt,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);

    res.status(500).json({
      success: false,
      message: "Admin login failed",
    });
  }
});

/**
 * GET /api/admin/me
 */
router.get("/me", protect, adminOnly, async (req, res) => {
  res.json({
    success: true,
    account: {
      id: req.user._id,
      fullName: req.user.fullName,
      email: req.user.email,
      officeName: req.user.officeName,
      role: req.user.role,
      authType: "admin",
      loginCount: req.user.loginCount,
      lastLoginAt: req.user.lastLoginAt,
    },
  });
});

// all office emplooyee records
router.get("/all-offices-records", protect, adminOnly, async (req, res) => {
  try {
    const offices = await Office.find({
      isActive: true,
      role: "office",
    }).sort({ officeCode: 1 });

    const result = await Promise.all(
      offices.map(async (office) => {
        const officeAccess = await OfficeAccess.findOne({
          office: office._id,
          hasVerifiedOtp: true,
        });

        const submission = await OfficeSubmission.findOne({
          office: office._id,
        });

        const employeeCount = await Employee.countDocuments({
          office: office._id,
        });

        const verifiedEmployeeCount = await Employee.countDocuments({
          office: office._id,
          isVoterVerified: true,
        });

        return {
          officeId: office._id,
          officeCode: office.officeCode,
          officeName: office.officeName,

          isRegistered: !!officeAccess,
          registrationStatus: officeAccess ? "Registered" : "Not Registered",

          submissionStatus: submission?.status || "not_submitted",
          submittedAt: submission?.submittedAt || null,

          employeeCount,
          verifiedEmployeeCount,

          lastLoginAt: officeAccess?.lastLoginAt || null,
          loginCount: officeAccess?.loginCount || 0,
          responsiblePersonName:
            officeAccess?.lastResponsiblePersonName || "",
          contactNumber: officeAccess?.lastContactNumber || "",
        };
      })
    );

    res.json({
      success: true,
      offices: result,
    });
  } catch (error) {
    console.error("Fetch all offices records error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch all offices records.",
    });
  }
});

/**
 * GET /api/admin/dashboard-summary
 *
 * Admin office is NOT counted.
 * Only role: "office" is counted.
 */
router.get("/dashboard-summary", protect, adminOnly, async (req, res) => {
  try {
    const totalOffices = await Office.countDocuments({
      isActive: true,
      role: "office",
    });

    const verifiedNormalOffices = await OfficeAccess.aggregate([
      {
        $match: {
          hasVerifiedOtp: true,
        },
      },
      {
        $lookup: {
          from: "offices",
          localField: "office",
          foreignField: "_id",
          as: "officeData",
        },
      },
      {
        $unwind: "$officeData",
      },
      {
        $match: {
          "officeData.isActive": true,
          "officeData.role": "office",
        },
      },
      {
        $group: {
          _id: "$office",
        },
      },
    ]);

    const registeredOffices = verifiedNormalOffices.length;
    const pendingOffices = Math.max(totalOffices - registeredOffices, 0);

    const totalLoginEventsResult = await OfficeLoginLog.aggregate([
      {
        $lookup: {
          from: "offices",
          localField: "office",
          foreignField: "_id",
          as: "officeData",
        },
      },
      {
        $unwind: "$officeData",
      },
      {
        $match: {
          "officeData.isActive": true,
          "officeData.role": "office",
        },
      },
      {
        $count: "total",
      },
    ]);

    const totalLoginEvents =
      totalLoginEventsResult.length > 0 ? totalLoginEventsResult[0].total : 0;

    // count submitted records offices
    const submittedOfficeResult = await OfficeSubmission.aggregate([
  {
    $match: {
      status: "submitted",
    },
  },
  {
    $lookup: {
      from: "offices",
      localField: "office",
      foreignField: "_id",
      as: "officeData",
    },
  },
  {
    $unwind: "$officeData",
  },
  {
    $match: {
      "officeData.isActive": true,
      "officeData.role": "office",
    },
  },
  {
    $group: {
      _id: "$office",
    },
  },
  {
    $count: "count",
  },
]);

// const submittedOffices = submittedOfficeResult[0]?.count || 0;

// new submitted records count login 
const submittedOfficeIds = await OfficeSubmission.distinct("office", {
  status: "submitted",
});

const totalEmployees = await Employee.countDocuments({
  office: {
    $in: submittedOfficeIds,
  },
});

const verifiedEmployees = await Employee.countDocuments({
  office: {
    $in: submittedOfficeIds,
  },
  isVoterVerified: true,
});

const submittedOffices = submittedOfficeIds.length;


    res.json({
      success: true,
      summary: {
        totalOffices,
        registeredOffices,
        submittedOffices,
        pendingOffices,
        totalLoginEvents,
        totalEmployees,
        verifiedEmployees,

        totalEmployeesCollected: 0,
        duplicateRecords: 0,
        eligibleForPollingDuty: 0,
        totalPollingCenters: 0,
      },
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard summary",
    });
  }
});

/**
 * GET /api/admin/registered-offices
 *
 * Only normal offices that verified OTP.
 */
router.get("/registered-offices", protect, adminOnly, async (req, res) => {
  try {
    const registeredOffices = await OfficeAccess.find({
      hasVerifiedOtp: true,
    })
      .populate("office", "officeCode officeName role isActive")
      .sort({ lastLoginAt: -1 });

    const normalRegisteredOffices = registeredOffices
      .filter((item) => {
        return (
          item.office &&
          item.office.isActive === true &&
          item.office.role === "office"
        );
      })
      .map((item) => ({
        accessId: item._id,
        office: item.office,
        loginCount: item.loginCount,
        hasVerifiedOtp: item.hasVerifiedOtp,
        lastVerifiedAt: item.lastVerifiedAt,
        lastLoginAt: item.lastLoginAt,
        lastResponsiblePersonName: item.lastResponsiblePersonName,
        lastContactNumber: item.lastContactNumber,
      }));

    res.json({
      success: true,
      offices: normalRegisteredOffices,
    });
  } catch (error) {
    console.error("Registered offices error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch registered offices",
    });
  }
});

/**
 * GET /api/admin/pending-offices
 *
 * Only normal offices that have not verified OTP.
 */
router.get("/pending-offices", protect, adminOnly, async (req, res) => {
  try {
    const verifiedNormalOffices = await OfficeAccess.aggregate([
      {
        $match: {
          hasVerifiedOtp: true,
        },
      },
      {
        $lookup: {
          from: "offices",
          localField: "office",
          foreignField: "_id",
          as: "officeData",
        },
      },
      {
        $unwind: "$officeData",
      },
      {
        $match: {
          "officeData.isActive": true,
          "officeData.role": "office",
        },
      },
      {
        $group: {
          _id: "$office",
        },
      },
    ]);

    const verifiedNormalOfficeIds = verifiedNormalOffices.map(
      (item) => item._id
    );

    const pendingOffices = await Office.find({
      isActive: true,
      role: "office",
      _id: {
        $nin: verifiedNormalOfficeIds,
      },
    })
      .select("officeCode officeName role isActive")
      .sort({ officeName: 1 });

    res.json({
      success: true,
      offices: pendingOffices,
    });
  } catch (error) {
    console.error("Pending offices error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch pending offices",
    });
  }
});

/**
 * GET /api/admin/all-offices
 *
 * Master list of normal offices only.
 */
router.get("/all-offices", protect, adminOnly, async (req, res) => {
  try {
    const offices = await Office.find({
      isActive: true,
      role: "office",
    })
      .select("officeCode officeName role isActive")
      .sort({ officeName: 1 });

    res.json({
      success: true,
      offices,
    });
  } catch (error) {
    console.error("All offices error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch all offices",
    });
  }
});

/**
 * GET /api/admin/office-login-logs
 *
 * Normal office OTP login logs only.
 */
router.get("/office-login-logs", protect, adminOnly, async (req, res) => {
  try {
    const logs = await OfficeLoginLog.find()
      .populate("office", "officeCode officeName role isActive")
      .sort({ verifiedAt: -1 })
      .limit(200);

    const normalOfficeLogs = logs.filter((log) => {
      return (
        log.office &&
        log.office.isActive === true &&
        log.office.role === "office"
      );
    });

    res.json({
      success: true,
      logs: normalOfficeLogs,
    });
  } catch (error) {
    console.error("Office login logs error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch office login logs",
    });
  }
});

module.exports = router;