const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const authRoutes = require("./routes/auth");
// for logging
const { requestLogger } = require("./middleware/Logmiddleware");
require("dotenv").config();

const app = express();

// Request logging middleware (must be first)
app.use(requestLogger);

// Security middleware
app.use(helmet());

// Rate limiting for auth routes
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later."
});
app.use("/api/auth", limiter);

app.use(express.json());

app.use("/api/auth", authRoutes);

app.listen(5000, () => {
    console.log("Server running on port 5000");
});