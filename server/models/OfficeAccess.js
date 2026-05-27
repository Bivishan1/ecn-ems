const mongoose = require("mongoose");

const officeAccessSchema = new mongoose.Schema(
  {
    office: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Office",
      required: true,
      unique: true
    },

    hasVerifiedOtp: {
      type: Boolean,
      default: false
    },

    loginCount: {
      type: Number,
      default: 0
    },

    lastVerifiedAt: {
      type: Date
    },

    lastLoginAt: {
      type: Date
    },

    lastResponsiblePersonName: {
      type: String,
      trim: true
    },

    lastContactNumber: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("OfficeAccess", officeAccessSchema);