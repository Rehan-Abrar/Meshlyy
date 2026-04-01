// Request logging middleware using Morgan and Winston

import morgan from 'morgan';
import winston from 'winston';
import config from '../config/env';

// Winston logger configuration
export const logger = winston.createLogger({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

// Morgan HTTP request logger
export const requestLogger = morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim())
  }
});
