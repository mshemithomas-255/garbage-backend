const express = require("express");
const cors = require("cors");
const { errorHandler } = require("./src/middleware/errorHandler");
const dotenv = require("dotenv");
const connectDB = require("./src/config/db");
const path = require("path");
const morgan = require("morgan"); // Add this for logging

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Use var to prevent future bugs on render
var __dirname = path.resolve();

// CORS configuration - IMPORTANT: Configure this properly
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://collectors-front.vercel.app",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware (only in development)
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// API Routes - MUST come before static file serving
app.use("/api/auth", require("./src/routes/auth"));
app.use("/api/locations", require("./src/routes/locations"));
app.use("/api/plots", require("./src/routes/plots"));
app.use("/api/users", require("./src/routes/users"));
app.use("/api/admins", require("./src/routes/admins"));

// Default API route
app.get("/", (req, res) => {
  res.status(200).json({
    msg: "Welcome to the Garbage Collection API!",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      locations: "/api/locations",
      plots: "/api/plots",
      users: "/api/users",
      admins: "/api/admins",
    },
  });
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  // Check if client/dist exists
  const clientDistPath = path.join(__dirname, "../../client/dist");
  const fs = require("fs");

  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));

    // Handle React routing - return all requests to React app
    app.get("*", (req, res) => {
      // Skip API routes
      if (req.path.startsWith("/api")) {
        return res.status(404).json({ msg: "API endpoint not found" });
      }
      res.sendFile(path.join(clientDistPath, "index.html"));
    });
  } else {
    console.log(
      "Client dist folder not found. Make sure to build the frontend first.",
    );
  }
} else {
  // Development - just a simple message
  app.get("/", (req, res) => {
    res.status(200).json({
      msg: "Welcome to the Garbage Collection API!",
      note: "Frontend should be running separately on port 3000 or 5173",
    });
  });
}

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    msg: `Route ${req.originalUrl} not found`,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error stack:", err.stack);
  console.error("Error message:", err.message);

  // Send error response
  res.status(err.statusCode || 500).json({
    success: false,
    msg: err.message || "Something went wrong!",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Custom error handler (if you have a separate errorHandler middleware)
// Make sure errorHandler is the last middleware
app.use(errorHandler);

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`CORS enabled for origins:`, corsOptions.origin);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
  // Close server & exit process
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  // Close server & exit process
  process.exit(1);
});
