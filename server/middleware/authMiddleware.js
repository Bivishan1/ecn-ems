const jwt = require("jsonwebtoken");
const OfficeAccount = require("../models/OfficeAccount");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing"
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const account = await OfficeAccount.findById(decoded.id).populate("office");

    if (!account) {
      return res.status(401).json({
        success: false,
        message: "Account not found"
      });
    }

    if (account.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Account is not active"
      });
    }

    req.user = account;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
};

module.exports = { protect };