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
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    role: {
      type: String,
      enum: ["office"],
      default: "office"
    },
    status: {
      type: String,
      enum: ["pending", "active", "blocked"],
      default: "pending"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("OfficeAccount", officeAccountSchema);