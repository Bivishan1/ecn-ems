const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },

    otpHash: {
      type: String,
      required: true
    },

    purpose: {
      type: String,
      enum: ["signup"],
      default: "signup"
    },

    office: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Office",
      required: true
    },

    fullName: {
      type: String,
      required: true,
      trim: true
    },

    contactNumber: {
      type: String,
      required: true,
      trim: true
    },

    passwordHash: {
      type: String,
      required: true
    },

    expiresAt: {
      type: Date,
      required: true
    },

    used: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Otp", otpSchema);