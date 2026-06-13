require("dotenv").config();

const mongoose = require("mongoose");
const Office = require("./models/Office");

const offices = [
  {
     officeCode: "BAG-MAK-ADMIN",
    officeName: "प्रदेश निर्वाचन कार्यालय, मकवानपुर",
    officialEmail: "deo.makwanpur@election.gov.np",
    role: "admin",
    isActive: true
  },
  {
    officeCode: "BAG-002",
    officeName: "जिल्ला निर्वाचन कार्यालय, मकवानपुर",
    officialEmail: "peo.bagmati@election.gov.np",
    role: "office",
    isActive: true
  },
  {
    officeCode: "BAG-003",
    officeName: "जिल्ला निर्वाचन कार्यालय, चितवन",
    officialEmail: "chitwan.office@example.com",
    role: "office",
    isActive: true
  },
  {
    officeCode: "BAG-004",
    officeName: "जिल्ला निर्वाचन कार्यालय, ललितपुर",
    officialEmail: "lalitpur.office@example.com",
    role: "office",
    isActive: true
  },
  {
    officeCode: "BAG-005",
    officeName: "जिल्ला निर्वाचन कार्यालय, काठमाडौँ",
    officialEmail: "kathmandu.office@example.com",
    role: "office",
    isActive: true
  },
   {
    officeCode: "BAG-006",
    officeName: "test, काठमाडौँ",
    officialEmail: "bivishan8686@gmail.com",
    role: "office",
    isActive: true
  }
];

const seedOffices = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    await Office.deleteMany({});
    await Office.insertMany(offices);

    console.log("Office data seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error("Office seed failed:", error);
    process.exit(1);
  }
};

seedOffices();