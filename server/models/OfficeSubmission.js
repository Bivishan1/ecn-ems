const mongoose = require("mongoose");

const officeSubmissionSchema = new mongoose.Schema(
  {
    office: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Office",
      required: true,
      unique: true,
    },

    status: {
      type: String,
      enum: ["draft", "submitted", "returned", "approved"],
      default: "draft",
    },

    submittedAt: {
      type: Date,
    },

    submittedByName: {
      type: String,
      trim: true,
    },

    submittedByContact: {
      type: String,
      trim: true,
    },

    remarks: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("OfficeSubmission", officeSubmissionSchema);