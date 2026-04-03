import express from 'express';
import cors from 'cors';
import config from './config/env';
import { requestLogger, logger } from './middleware/logging';
import { timeoutMiddleware, haltOnTimeout } from './middleware/timeout';
import { errorHandler } from './middleware/errorHandler';
import { verifyToken, loadAuthContext } from './middleware/auth';
import healthRouter from './routes/health';
import onboardingRouter from './routes/onboarding';

const app = express();

// Core middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Global timeout
app.use(timeoutMiddleware());
app.use(haltOnTimeout);

// Health check (always public)
app.use('/v1/health', healthRouter);

// Protected stub route to verify auth middleware works
app.get('/v1/creators', verifyToken, loadAuthContext, (req, res) => {
  res.json({ message: 'ok' });
});

// Onboarding routes
app.use('/v1/onboarding', onboardingRouter);

// Routes will be added as phases progress
// app.use('/v1/auth', authRouter);
// etc.

// 404 catch-all handler (must be before error handler)
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    }
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server only when run directly.
if (require.main === module) {
  const server = app.listen(config.PORT, () => {
    logger.info(`🚀 Meshly backend listening on port ${config.PORT}`);
    logger.info(`📝 Environment: ${config.NODE_ENV}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
}

export default app;
