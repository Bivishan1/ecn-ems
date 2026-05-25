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

const isValidNepaliMobile = (number) => {
  return /^9[78]\d{8}$/.test(number);
};

const isStrongPassword = (password) => {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%_]).{8,24}$/.test(
    password
  );
};

/**
 * GET offices for signup dropdown
 */
router.get("/offices", async (req, res) => {
  try {
    const offices = await Office.find({ isActive: true })
      .select("officeCode officeName isActive")
      .sort({ officeName: 1 });

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
 * Validate signup details, store them temporarily in OTP collection,
 * send OTP, but do not create OfficeAccount yet.
 */
router.post("/signup/request-otp", async (req, res) => {
  try {
    const {
      officeId,
      fullName,
      email,
      contactNumber,
      password,
      confirmPassword
    } = req.body;

    if (
      !officeId ||
      !fullName ||
      !email ||
      !contactNumber ||
      !password ||
      !confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address"
      });
    }

    if (!isValidNepaliMobile(contactNumber)) {
      return res.status(400).json({
        success: false,
        message: "Contact number must be a valid Nepali mobile number"
      });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be 8-24 characters and include uppercase, lowercase, number and special character"
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Password and confirm password do not match"
      });
    }

    const office = await Office.findById(officeId);

    if (!office || !office.isActive) {
      return res.status(404).json({
        success: false,
        message: "Selected office not found or inactive"
      });
    }

    const existingOfficeAccount = await OfficeAccount.findOne({
      office: officeId
    });

    if (existingOfficeAccount) {
      return res.status(409).json({
        success: false,
        message: "This office has already signed up"
      });
    }

    const existingEmailAccount = await OfficeAccount.findOne({
      email: email.toLowerCase()
    });

    if (existingEmailAccount) {
      return res.status(409).json({
        success: false,
        message: "email already registered"
      });
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const passwordHash = await bcrypt.hash(password, 10);

    /**
     * Important:
     * We delete only pending OTP/signup request.
     * Since account is not created yet, same user can signup again
     * if they did not verify the previous OTP.
     */
    await Otp.deleteMany({
      email: email.toLowerCase(),
      purpose: "signup",
      used: false
    });

    await Otp.create({
      email: email.toLowerCase(),
      otpHash,
      purpose: "signup",
      office: officeId,
      fullName,
      contactNumber,
      passwordHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    await sendEmail({
      to: email,
      subject: "Verify Your Office Account",
      html: `
        <h2>Election Staff Data Collection System</h2>
        <p>Dear ${fullName},</p>
        <p>Your OTP for office account registration is:</p>
        <h1>${otp}</h1>
        <p>This OTP will expire in 10 minutes.</p>
        <p>Please do not share this OTP with anyone.</p>
      `
    });

    res.status(200).json({
      success: true,
      message: "OTP has been sent to your email. Please verify to complete registration.",
      email: email.toLowerCase()
    });
  } catch (error) {
    console.error("Signup request OTP error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to send signup OTP"
    });
  }
});

/**
 * SIGNUP STEP 2:
 * Verify OTP and create OfficeAccount only after successful OTP verification.
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

    const existingEmailAccount = await OfficeAccount.findOne({
      email: email.toLowerCase()
    });

    if (existingEmailAccount) {
      return res.status(409).json({
        success: false,
        message: "email already registered"
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
        message: "OTP not found. Please register again"
      });
    }

    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please register again"
      });
    }

    const isOtpMatch = await bcrypt.compare(otp, otpRecord.otpHash);

    if (!isOtpMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    const existingOfficeAccount = await OfficeAccount.findOne({
      office: otpRecord.office
    });

    if (existingOfficeAccount) {
      return res.status(409).json({
        success: false,
        message: "This office has already signed up"
      });
    }

    const account = await OfficeAccount.create({
      office: otpRecord.office,
      fullName: otpRecord.fullName,
      email: otpRecord.email,
      contactNumber: otpRecord.contactNumber,
      password: otpRecord.passwordHash,
      isEmailVerified: true
    });

    otpRecord.used = true;
    await otpRecord.save();

    const populatedAccount = await OfficeAccount.findById(account._id)
      .select("-password")
      .populate("office");

    res.status(201).json({
      success: true,
      message: "Registration verified successfully. You can now login.",
      account: populatedAccount
    });
  } catch (error) {
    console.error("Signup verify OTP error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "email already registered"
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to verify OTP"
    });
  }
});

/**
 * RESEND OTP:
 * Since details are not stored in OfficeAccount yet, resend uses pending OTP record.
 */
router.post("/signup/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Valid email is required"
      });
    }

    const existingEmailAccount = await OfficeAccount.findOne({
      email: email.toLowerCase()
    });

    if (existingEmailAccount) {
      return res.status(409).json({
        success: false,
        message: "email already registered"
      });
    }

    const pendingSignup = await Otp.findOne({
      email: email.toLowerCase(),
      purpose: "signup",
      used: false
    }).sort({ createdAt: -1 });

    if (!pendingSignup) {
      return res.status(404).json({
        success: false,
        message: "Pending signup not found. Please register again"
      });
    }

    const otp = generateOtp();
    pendingSignup.otpHash = await bcrypt.hash(otp, 10);
    pendingSignup.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await pendingSignup.save();

    await sendEmail({
      to: email,
      subject: "Resend OTP - Verify Your Office Account",
      html: `
        <h2>Election Staff Data Collection System</h2>
        <p>Your new OTP is:</p>
        <h1>${otp}</h1>
        <p>This OTP will expire in 10 minutes.</p>
      `
    });

    res.json({
      success: true,
      message: "New OTP sent to your email"
    });
  } catch (error) {
    console.error("Signup resend OTP error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to resend OTP"
    });
  }
});

/**
 * LOGIN:
 * Since OfficeAccount is created only after OTP verification,
 * any existing account is already verified.
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const account = await OfficeAccount.findOne({
      email: email.toLowerCase()
    }).populate("office");

    if (!account) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    if (!account.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: "email is not verified yet"
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, account.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const token = generateToken(account);

    res.json({
      success: true,
      message: "Login successful",
      token,
      account: {
        id: account._id,
        fullName: account.fullName,
        email: account.email,
        contactNumber: account.contactNumber,
        isEmailVerified: account.isEmailVerified,
        office: account.office
      }
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Login failed"
    });
  }
});

/**
 * CURRENT LOGGED-IN ACCOUNT
 */
router.get("/me", protect, async (req, res) => {
  res.json({
    success: true,
    account: {
      id: req.user._id,
      fullName: req.user.fullName,
      email: req.user.email,
      contactNumber: req.user.contactNumber,
      isEmailVerified: req.user.isEmailVerified,
      office: req.user.office
    }
  });
});

module.exports = router;