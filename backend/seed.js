const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

const User = require("./models/User");

dotenv.config();

const seedDefaultAdmin = async () => {
  const email = "admin@consultancy.com";
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    console.log("Already seeded");
    return existingUser;
  }

  const hashedPassword = await bcrypt.hash("admin123", 10);

  const admin = await User.create({
    name: "Consultancy Admin",
    email,
    password: hashedPassword,
    role: "consultancy",
  });

  console.log("Seed complete");
  return admin;
};

const runSeed = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not configured");
    }

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
      console.log("MongoDB connected");
    }

    await seedDefaultAdmin();
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (require.main === module && mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
};

if (require.main === module) {
  runSeed();
}

module.exports = {
  seedDefaultAdmin,
  runSeed,
};
