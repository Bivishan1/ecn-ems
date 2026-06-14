const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    office: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Office",
      required: true,
      index: true,
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    middleName: {
      type: String,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    voterNo: {
      type: String,
      required: true,
      trim: true,
    },

    dob: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    position: {
      type: String,
      trim: true,
    },

    level: {
      type: String,
      trim: true,
    },

    grade: {
      type: String,
      trim: true,
    },

    isVoterVerified: {
      type: Boolean,
      default: false,
    },

    voterVerificationStatus: {
      type: String,
      enum: ["pending", "verified", "not_found", "mismatch", "api_error"],
      default: "pending",
    },

    voterVerifiedAt: {
      type: Date,
    },

    voterVerificationResponse: {
      type: Object,
      select: false,
    },
    verifiedVoterDetails: {
  voterNumber: String,
  serialNo: String,
  fullName: String,
  nameEnglish: String,
  citizenshipNumber: String,
  dob: String,
  gender: String,
  age: String,
  fatherName: String,
  motherName: String,
  spouseName: String,
  provinceId: String,
  districtId: String,
  municipalityId: String,
  wardNo: String,
  pollingLocationId: String,
  longitude: String,
  latitude: String,
  fConstituency: String,
  sConstituency: String,
  regCentreLoc: String,
},
  },
  { timestamps: true }
);

employeeSchema.index(
  {
    voterNo: 1,
  },
  {
    unique: true,
  }
);



module.exports = mongoose.model("Employee", employeeSchema);