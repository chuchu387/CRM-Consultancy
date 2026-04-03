const cors = require("cors");
const dotenv = require("dotenv");
const express = require("express");
const fs = require("fs");
const mongoose = require("mongoose");
const morgan = require("morgan");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const activityRoutes = require("./routes/activityRoutes");
const documentRoutes = require("./routes/documentRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const meetingRoutes = require("./routes/meetingRoutes");
const noteRoutes = require("./routes/noteRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const taskRoutes = require("./routes/taskRoutes");
const templateRoutes = require("./routes/templateRoutes");
const universityRoutes = require("./routes/universityRoutes");
const userRoutes = require("./routes/userRoutes");
const visaRoutes = require("./routes/visaRoutes");
const errorHandler = require("./middleware/errorHandler");
const { seedDefaultAdmin } = require("./seed");

dotenv.config();

const app = express();
const uploadsDir = path.join(__dirname, "uploads");

fs.mkdirSync(uploadsDir, { recursive: true });

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use("/uploads", express.static(uploadsDir));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/visa", visaRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/universities", universityRoutes);
app.use("/api/invoices", invoiceRoutes);

app.use(errorHandler);

const connectDatabase = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected");
};

const startServer = async () => {
  try {
    await connectDatabase();
    await seedDefaultAdmin();

    const port = process.env.PORT || 5000;
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
