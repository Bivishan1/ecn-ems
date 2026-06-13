require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const AdminUser = require("./models/AdminUser");

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const email = "deo.makwanpur@election.gov.np";
    const plainPassword = "Admin@2083";

    const existingAdmin = await AdminUser.findOne({ email });

    if (existingAdmin) {
      console.log("Admin already exists");
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    await AdminUser.create({
      fullName: "प्रदेश निर्वाचन कार्यालय, मकवानपुर",
      email,
      password: hashedPassword,
      officeName: "प्रदेश निर्वाचन कार्यालय, मकवानपुर",
      role: "admin",
      authType: "admin",
      isActive: true,
    });

    console.log("Admin seeded successfully");
    console.log("Email:", email);
    console.log("Password:", plainPassword);

    process.exit(0);
  } catch (error) {
    console.error("Admin seed failed:", error);
    process.exit(1);
  }
};

seedAdmin();