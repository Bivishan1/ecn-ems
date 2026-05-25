const mongoose = require("mongoose");

const officeSchema = new mongoose.Schema(
  {
    officeCode: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    officeName: {
      type: String,
      required: true,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Office", officeSchema);