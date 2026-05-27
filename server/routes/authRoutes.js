const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Office = require("../models/Office");
const OfficeAccess = require("../models/OfficeAccess");
const OfficeLoginLog = require("../models/OfficeLoginLog");
const Otp = require("../models/Otp");
const sendEmail = require("../utils/sendEmail");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateToken = (officeAccess) => {
  return jwt.sign(
    {
       id: officeAccess._id,
      office: officeAccess.office._id || officeAccess.office,
      role: officeAccess.office.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "4h"
    }
  );
};

const isValidNepaliMobile = (number) => {
  return /^9[78]\d{8}$/.test(number);
};

const maskEmail = (email) => {
  if (!email) return "";

  const [name, domain] = email.split("@");

  if (!name || !domain) return email;

  const visiblePart = name.slice(0, 2);
  return `${visiblePart}${"*".repeat(Math.max(name.length - 2, 3))}@${domain}`;
};

/**
 * GET offices for dropdown
 * Important: officialEmail is NOT sent to frontend.
 */
router.get("/offices", async (req, res) => {
  try {
    const offices = await Office.find({ isActive: true })
      .select("officeCode officeName role isActive")
      .sort({ officeName: 1 });

    res.json({
      success: true,
      offices
    });
  } catch (error) {
    console.error("Fetch offices error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch offices"
    });
  }
});

/**
 * STEP 1:
 * Request OTP for office login.
 *
 * Body:
 * {
 *   "officeId": "...",
 *   "responsiblePersonName": "Ram Shrestha",
 *   "contactNumber": "9841234567"
 * }
 */
router.post("/request-office-otp", async (req, res) => {
  try {
    const { officeId, responsiblePersonName, contactNumber } = req.body;

    if (!officeId || !responsiblePersonName || !contactNumber) {
      return res.status(400).json({
        success: false,
        message: "Office, full name and contact number are required"
      });
    }

    if (!isValidNepaliMobile(contactNumber)) {
      return res.status(400).json({
        success: false,
        message: "Contact number must be a valid Nepali mobile number"
      });
    }

    const office = await Office.findOne({
      _id: officeId,
      isActive: true
    });

    if (!office) {
      return res.status(404).json({
        success: false,
        message: "Office not found or inactive"
      });
    }

    /**
     * Prevent multiple OTP requests within 60 seconds.
     * This protects even if user refreshes browser or opens another tab.
     */
    const latestOtp = await Otp.findOne({
      office: office._id,
      used: false
    }).sort({ createdAt: -1 });

    if (latestOtp) {
      const secondsSinceLastOtp = Math.floor(
        (Date.now() - latestOtp.createdAt.getTime()) / 1000
      );

      const cooldownSeconds = 60;

      if (secondsSinceLastOtp < cooldownSeconds) {
        const retryAfter = cooldownSeconds - secondsSinceLastOtp;

        return res.status(429).json({
          success: false,
          message: `Please wait ${retryAfter} seconds before requesting another OTP`,
          retryAfter
        });
      }
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    /**
     * Invalidate previous unused OTP after cooldown passes.
     * Only latest OTP should remain valid.
     */
    await Otp.deleteMany({
      office: office._id,
      used: false
    });

    await Otp.create({
      office: office._id,
      otpHash,
      responsiblePersonName,
      contactNumber,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    await sendEmail({
      to: office.officialEmail,
      subject: "Office Login OTP",
      html: `
        <h2>Election Staff Data Collection System</h2>
        <p>OTP for <strong>${office.officeName}</strong> login is:</p>
        <h1>${otp}</h1>
        <p>This OTP will expire in 10 minutes.</p>
        <p>Please do not share this OTP with unauthorized persons.</p>
      `
    });

    res.json({
      success: true,
      message: "OTP has been sent to the official email of selected office",
      maskedEmail: maskEmail(office.officialEmail),
      resendAfter: 60
    });
  } catch (error) {
    console.error("Request office OTP error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to send OTP"
    });
  }
});

/**
 * STEP 2:
 * Verify OTP and login.
 *
 * Body:
 * {
 *   "officeId": "...",
 *   "otp": "123456"
 * }
 */
router.post("/verify-office-otp", async (req, res) => {
  try {
    const { officeId, otp } = req.body;

    if (!officeId || !otp) {
      return res.status(400).json({
        success: false,
        message: "Office and OTP are required"
      });
    }

    const office = await Office.findOne({
      _id: officeId,
      isActive: true
    });

    if (!office) {
      return res.status(404).json({
        success: false,
        message: "Office not found or inactive"
      });
    }

    const otpRecord = await Otp.findOne({
      office: office._id,
      used: false
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "OTP not found. Please request a new OTP"
      });
    }

    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP"
      });
    }

    const isOtpMatch = await bcrypt.compare(otp, otpRecord.otpHash);

    if (!isOtpMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    otpRecord.used = true;
    await otpRecord.save();

    /**
     * Create or update OfficeAccess.
     * Every successful OTP verification increases loginCount.
     */
const officeAccess = await OfficeAccess.findOneAndUpdate(
  { office: office._id },
  {
    $set: {
      hasVerifiedOtp: true,
      lastVerifiedAt: new Date(),
      lastLoginAt: new Date(),
      lastResponsiblePersonName: otpRecord.responsiblePersonName,
      lastContactNumber: otpRecord.contactNumber
    },
    $inc: {
      loginCount: 1
    }
  },
  {
    new: true,
    upsert: true
  }
).populate("office", "officeCode officeName role isActive");

    /**
     * Every successful OTP verification is recorded as one login event.
     */
    await OfficeLoginLog.create({
      office: office._id,
      responsiblePersonName: otpRecord.responsiblePersonName,
      contactNumber: otpRecord.contactNumber,
      verifiedAt: new Date(),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"]
    });

   const token = generateToken(officeAccess);

res.json({
  success: true,
  message: "OTP verified successfully. Login successful.",
  token,
  account: {
    id: officeAccess._id,
    office: officeAccess.office,
    role: officeAccess.office.role,
    hasVerifiedOtp: officeAccess.hasVerifiedOtp,
    loginCount: officeAccess.loginCount,
    responsiblePersonName: officeAccess.lastResponsiblePersonName,
    contactNumber: officeAccess.lastContactNumber,
    lastLoginAt: officeAccess.lastLoginAt
  }
});
  } catch (error) {
    console.error("Verify office OTP error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to verify OTP"
    });
  }
});

/**
 * Get current logged-in office access profile.
 */
router.get("/me", protect, async (req, res) => {
  res.json({
    success: true,
    account: {
      id: req.user._id,
      office: req.user.office,
      role: req.user.office.role,
      hasVerifiedOtp: req.user.hasVerifiedOtp,
      loginCount: req.user.loginCount,
      responsiblePersonName: req.user.lastResponsiblePersonName,
      contactNumber: req.user.lastContactNumber,
      lastLoginAt: req.user.lastLoginAt
    }
  });
});

/**
 * Dashboard summary.
 * Later, when you add employee and polling center models,
 * you can extend this route.
 */
router.get("/dashboard-summary", async (req, res) => {
  try {
    const totalOffices = await Office.countDocuments({ isActive: true });

    const registeredOffices = await OfficeAccess.countDocuments({
      hasVerifiedOtp: true
    });

    const pendingOffices = totalOffices - registeredOffices;

    const totalLoginEvents = await OfficeLoginLog.countDocuments();

    const loginCountResult = await OfficeAccess.aggregate([
      {
        $group: {
          _id: null,
          totalLoginCount: { $sum: "$loginCount" }
        }
      }
    ]);

    const totalLoginCount =
      loginCountResult.length > 0 ? loginCountResult[0].totalLoginCount : 0;

    res.json({
      success: true,
      summary: {
        totalOffices,
        registeredOffices,
        pendingOffices,
        totalLoginEvents,
        totalLoginCount,

        // Placeholder values for future modules
        totalEmployeesCollected: 0,
        duplicateRecords: 0,
        eligibleForPollingDuty: 0,
        totalPollingCenters: 0
      }
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard summary"
    });
  }
});

/**
 * Office login logs.
 * This lets admin see how many times each office verified OTP.
 */
router.get("/office-login-logs", async (req, res) => {
  try {
    const logs = await OfficeLoginLog.find()
      .populate("office", "officeCode officeName")
      .sort({ verifiedAt: -1 })
      .limit(200);

    res.json({
      success: true,
      logs
    });
  } catch (error) {
    console.error("Office login logs error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch office login logs"
    });
  }
});

module.exports = router;