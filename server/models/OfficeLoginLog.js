const mongoose = require("mongoose");

const officeLoginLogSchema = new mongoose.Schema(
  {
    office: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Office",
      required: true
    },

    responsiblePersonName: {
      type: String,
      required: true,
      trim: true
    },

    contactNumber: {
      type: String,
      required: true,
      trim: true
    },

    verifiedAt: {
      type: Date,
      default: Date.now
    },

    ipAddress: {
      type: String
    },

    userAgent: {
      type: String
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("OfficeLoginLog", officeLoginLogSchema);