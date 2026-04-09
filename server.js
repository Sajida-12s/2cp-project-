const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const authRoutes = require("./routes/auth");
// for logging
const { requestLogger } = require("./middleware/Logmiddleware");
const http = require("http");
require("dotenv").config();
const { initSocket } = require("./socket");

const rating = require('./routes/rating');

const app = express();
const Server = http.createServer(app);

const registerRoutes = require("./routes/register");

initSocket(Server);
app.use(express.json());    
app.use('/api/comments', require('./routes/comments'));
app.use('/api/notifications', require('./routes/notifications'));

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

app.use("/api/auth", registerRoutes);

app.use('/api/ratings', rating);

Server.listen(5000, () => {
    console.log("Server running on port 5000");
});