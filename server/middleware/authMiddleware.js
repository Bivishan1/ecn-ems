const jwt = require("jsonwebtoken");
const AdminUser = require("../models/AdminUser");
const OfficeAccess = require("../models/OfficeAccess");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.authType === "admin") {
      const admin = await AdminUser.findById(decoded.id).select("-password");

      if (!admin || !admin.isActive) {
        return res.status(401).json({
          success: false,
          message: "Admin account not found or inactive",
        });
      }

      req.user = admin;
      req.role = "admin";
      req.authType = "admin";

      return next();
    }

    if (decoded.authType === "office") {
      const officeAccess = await OfficeAccess.findById(decoded.id).populate(
        "office",
        "officeCode officeName role isActive"
      );

      if (!officeAccess) {
        return res.status(401).json({
          success: false,
          message: "Office access record not found",
        });
      }

      if (!officeAccess.office || !officeAccess.office.isActive) {
        return res.status(403).json({
          success: false,
          message: "Office is inactive or not found",
        });
      }

      if (!officeAccess.hasVerifiedOtp) {
        return res.status(403).json({
          success: false,
          message: "OTP verification required",
        });
      }

      req.user = officeAccess;
      req.role = "office";
      req.authType = "office";

      return next();
    }

    return res.status(401).json({
      success: false,
      message: "Invalid token type",
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

const adminOnly = (req, res, next) => {
  if (req.role !== "admin" || req.authType !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access only",
    });
  }

  next();
};

const officeOnly = (req, res, next) => {
  if (req.role !== "office" || req.authType !== "office") {
    return res.status(403).json({
      success: false,
      message: "Office access only",
    });
  }

  next();
};

module.exports = { protect, adminOnly, officeOnly };