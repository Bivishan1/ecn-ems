const mongoose = require("mongoose");

const adminUserSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true
    },

    officeName: {
      type: String,
      default: "प्रदेश निर्वाचन कार्यालय, मकवानपुर"
    },

    role: {
      type: String,
      enum: ["admin"],
      default: "admin"
    },

    isActive: {
      type: Boolean,
      default: true
    },

    loginCount: {
      type: Number,
      default: 0
    },

    lastLoginAt: {
      type: Date
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("AdminUser", adminUserSchema);