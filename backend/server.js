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
const { configurePushNotifications, hasPushConfig } = require("./utils/pushNotifications");
const { seedDefaultAdmin } = require("./seed");

dotenv.config();

const app = express();
const uploadsDir = path.join(__dirname, "uploads");

const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isOriginAllowed = (origin = "") => {
  if (!origin) {
    return true;
  }

  if (process.env.NODE_ENV !== "production" || !allowedOrigins.length) {
    return true;
  }

  return allowedOrigins.some((allowedOrigin) => {
    if (allowedOrigin === origin) {
      return true;
    }

    if (allowedOrigin.includes("*")) {
      const expression = new RegExp(
        `^${allowedOrigin
          .split("*")
          .map((segment) => segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          .join(".*")}$`
      );

      return expression.test(origin);
    }

    return false;
  });
};

fs.mkdirSync(uploadsDir, { recursive: true });

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use("/uploads", express.static(uploadsDir));

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
    },
    message: "API is healthy",
  });
});

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
    configurePushNotifications();
    await seedDefaultAdmin();

    const port = process.env.PORT || 5000;
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
      if (!hasPushConfig()) {
        console.log("Web push is disabled because VAPID env vars are missing");
      }
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
