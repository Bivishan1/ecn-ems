const mongoose = require("mongoose");

const officeAccountSchema = new mongoose.Schema(
  {
    office: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Office",
      required: true,
      unique: true
    },

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

    contactNumber: {
      type: String,
      required: true,
      trim: true
    },

    password: {
      type: String,
      required: true
    },

    isEmailVerified: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("OfficeAccount", officeAccountSchema);