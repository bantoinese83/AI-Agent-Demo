import winston from 'winston';

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ai-agent' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
        })
      )
    })
  ],
});

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    )
  }));

  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    )
  }));
}

export const logActivity = (action: string, details: any = {}) => {
  logger.info(`Activity: ${action}`, {
    ...details,
    timestamp: new Date().toISOString()
  });
};

export const logError = (error: any, context: string = '', additionalInfo: any = {}) => {
  logger.error(`Error in ${context}`, {
    error: error.message || error,
    stack: error.stack,
    ...additionalInfo,
    timestamp: new Date().toISOString()
  });
};

export const logPerformance = (operation: string, duration: number, details: any = {}) => {
  logger.info(`Performance: ${operation}`, {
    duration: `${duration}ms`,
    ...details,
    timestamp: new Date().toISOString()
  });
};

export const logSecurityEvent = (event: string, details: any = {}) => {
  logger.warn(`Security Event: ${event}`, {
    ...details,
    timestamp: new Date().toISOString(),
    severity: 'high'
  });
};

// Health check logging
export const logHealthCheck = (status: string, metrics: any = {}) => {
  logger.info('Health Check', {
    status,
    ...metrics,
    timestamp: new Date().toISOString()
  });
};

export default logger;
