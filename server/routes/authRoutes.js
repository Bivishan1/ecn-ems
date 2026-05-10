const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Office = require("../models/Office");
const OfficeAccount = require("../models/OfficeAccount");
const Otp = require("../models/Otp");
const sendEmail = require("../utils/sendEmail");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateToken = (account) => {
  return jwt.sign(
    {
      id: account._id,
      role: account.role,
      office: account.office
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d"
    }
  );
};

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * GET offices for dropdown
 */
router.get("/offices", async (req, res) => {
  try {
    const offices = await Office.find({ isActive: true })
      .select("officeCode officeName district municipality")
      .sort({ district: 1, officeName: 1 });

    res.json({
      success: true,
      offices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch offices"
    });
  }
});

/**
 * SIGNUP STEP 1:
 * Office selects office, enters full name and email.
 * Then OTP is sent to email.
 */
router.post("/signup/request-otp", async (req, res) => {
  try {
    const { officeId, fullName, email } = req.body;

    if (!officeId || !fullName || !email) {
      return res.status(400).json({
        success: false,
        message: "Office, full name and email are required"
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address"
      });
    }

    const office = await Office.findById(officeId);

    if (!office || !office.isActive) {
      return res.status(404).json({
        success: false,
        message: "Office not found or inactive"
      });
    }

    const alreadyRegisteredOffice = await OfficeAccount.findOne({
      office: officeId
    });

    if (alreadyRegisteredOffice) {
      return res.status(409).json({
        success: false,
        message: "This office is already registered"
      });
    }

    const alreadyRegisteredEmail = await OfficeAccount.findOne({
      email: email.toLowerCase()
    });

    if (alreadyRegisteredEmail) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered"
      });
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    await Otp.deleteMany({
      email: email.toLowerCase(),
      purpose: "signup"
    });

    await Otp.create({
      email: email.toLowerCase(),
      otpHash,
      purpose: "signup",
      office: officeId,
      fullName,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    await sendEmail({
      to: email,
      subject: "Office Signup OTP Verification",
      html: `
        <h2>Election Staff Data Collection System</h2>
        <p>Your OTP for office registration is:</p>
        <h1>${otp}</h1>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      `
    });

    res.json({
      success: true,
      message: "OTP sent to email"
    });
  } catch (error) {
    console.error("Signup OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP"
    });
  }
});

/**
 * SIGNUP STEP 2:
 * Verify OTP and create office account.
 */
router.post("/signup/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required"
      });
    }

    const otpRecord = await Otp.findOne({
      email: email.toLowerCase(),
      purpose: "signup",
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
        message: "OTP has expired"
      });
    }

    const isMatch = await bcrypt.compare(otp, otpRecord.otpHash);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    const existingOffice = await OfficeAccount.findOne({
      office: otpRecord.office
    });

    if (existingOffice) {
      return res.status(409).json({
        success: false,
        message: "This office is already registered"
      });
    }

    const account = await OfficeAccount.create({
      office: otpRecord.office,
      fullName: otpRecord.fullName,
      email: email.toLowerCase(),
      isEmailVerified: true,
      status: "active"
    });

    otpRecord.used = true;
    await otpRecord.save();

    const populatedAccount = await OfficeAccount.findById(account._id).populate(
      "office"
    );

    const token = generateToken(populatedAccount);

    res.status(201).json({
      success: true,
      message: "Office registered successfully",
      token,
      account: {
        id: populatedAccount._id,
        fullName: populatedAccount.fullName,
        email: populatedAccount.email,
        role: populatedAccount.role,
        office: populatedAccount.office
      }
    });
  } catch (error) {
    console.error("Signup verify error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify OTP"
    });
  }
});

/**
 * LOGIN STEP 1:
 * Registered office user enters email.
 * System sends login OTP.
 */
router.post("/login/request-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Valid email is required"
      });
    }

    const account = await OfficeAccount.findOne({
      email: email.toLowerCase()
    }).populate("office");

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found. Please signup first"
      });
    }

    if (!account.isEmailVerified || account.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Account is not verified or active"
      });
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    await Otp.deleteMany({
      email: email.toLowerCase(),
      purpose: "login"
    });

    await Otp.create({
      email: email.toLowerCase(),
      otpHash,
      purpose: "login",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    await sendEmail({
      to: email,
      subject: "Login OTP",
      html: `
        <h2>Election Staff Data Collection System</h2>
        <p>Your login OTP is:</p>
        <h1>${otp}</h1>
        <p>This OTP will expire in 10 minutes.</p>
      `
    });

    res.json({
      success: true,
      message: "Login OTP sent to email"
    });
  } catch (error) {
    console.error("Login OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send login OTP"
    });
  }
});

/**
 * LOGIN STEP 2:
 * Verify login OTP and issue JWT.
 */
router.post("/login/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required"
      });
    }

    const otpRecord = await Otp.findOne({
      email: email.toLowerCase(),
      purpose: "login",
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
        message: "OTP has expired"
      });
    }

    const isMatch = await bcrypt.compare(otp, otpRecord.otpHash);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    const account = await OfficeAccount.findOne({
      email: email.toLowerCase()
    }).populate("office");

    if (!account || account.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Account is not active"
      });
    }

    otpRecord.used = true;
    await otpRecord.save();

    const token = generateToken(account);

    res.json({
      success: true,
      message: "Login successful",
      token,
      account: {
        id: account._id,
        fullName: account.fullName,
        email: account.email,
        role: account.role,
        office: account.office
      }
    });
  } catch (error) {
    console.error("Login verify error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify login OTP"
    });
  }
});

/**
 * Current logged-in office account
 */
router.get("/me", protect, async (req, res) => {
  res.json({
    success: true,
    account: {
      id: req.user._id,
      fullName: req.user.fullName,
      email: req.user.email,
      role: req.user.role,
      office: req.user.office
    }
  });
});

module.exports = router;