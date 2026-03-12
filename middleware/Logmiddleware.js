const winston = require('winston');

// Create a logger instance
const logger = winston.createLogger({
  level: 'info', // Minimum level to log
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'employee-auth-api' },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    // Write all logs with importance level of `info` or less to `combined.log`
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// If we're not in production, log to the console with a simple format
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Middleware function to log HTTP requests
const requestLogger = (req, res, next) => {
  logger.info(`${req.method} ${req.url} - IP: ${req.ip} - User-Agent: ${req.get('User-Agent')}`);
  next();
};

module.exports = { logger, requestLogger };
