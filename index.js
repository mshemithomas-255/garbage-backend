const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./src/config/db");
const path = require("path");

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// use var to prevent future bugs on render
var __dirname = path.resolve();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", require("./src/routes/auth"));
app.use("/api/locations", require("./src/routes/locations"));
app.use("/api/plots", require("./src/routes/plots"));
app.use("/api/users", require("./src/routes/users"));
app.use("/api/admins", require("./src/routes/admins"));

// Default route
app.get("/", (req, res) => {
  res.status(200).json({ msg: "Welcome to the Garbage Collection API!" });
});

app.use(express.static(path.join(__dirname, "/client/dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "dist", "index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ msg: "Something went wrong!" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
