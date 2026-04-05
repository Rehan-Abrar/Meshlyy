import express from 'express';
import cors from 'cors';
import config from './config/env';
import { requestLogger, logger } from './middleware/logging';
import { timeoutMiddleware, haltOnTimeout } from './middleware/timeout';
import { errorHandler } from './middleware/errorHandler';
import { verifyToken, loadAuthContext } from './middleware/auth';
import healthRouter from './routes/health';
import onboardingRouter from './routes/onboarding';
import creatorsRouter from './routes/creators';
import campaignRouter, { matchedCampaignsRouter } from './routes/campaigns';
import shortlistRouter from './routes/shortlists';
import collaborationRouter from './routes/collaborations';
import aiRouter from './routes/ai';

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

// Onboarding routes
app.use('/v1/onboarding', onboardingRouter);

// Creator discovery and detail routes
app.use('/v1/creators', creatorsRouter);

// Campaign routes
app.use('/v1/campaigns/matched', matchedCampaignsRouter); // Must come before /v1/campaigns
app.use('/v1/campaigns', campaignRouter);

// Shortlist routes
app.use('/v1/shortlists', shortlistRouter);

// Collaboration routes
app.use('/v1/collaborations', collaborationRouter);

// AI Co-Pilot routes
app.use('/v1/ai', aiRouter);

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
