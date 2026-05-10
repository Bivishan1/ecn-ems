require("dotenv").config();
const mongoose = require("mongoose");
const Office = require("./models/Office");

const offices = [
  {
    officeCode: "BAG-MAK-001",
    officeName: "मालपोत कार्यालय मकवानपुर",
    district: "मकवानपुर",
    municipality: "हेटौंडा उपमहानगरपालिका"
  },
  {
    officeCode: "BAG-MAK-002",
    officeName: "नापी कार्यालय मकवानपुर",
    district: "मकवानपुर",
    municipality: "हेटौंडा उपमहानगरपालिका"
  },
  {
    officeCode: "BAG-CHT-001",
    officeName: "मालपोत कार्यालय चितवन",
    district: "चितवन",
    municipality: "भरतपुर महानगरपालिका"
  }
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    await Office.deleteMany({});
    await Office.insertMany(offices);

    console.log("Office data seeded successfully");
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seed();