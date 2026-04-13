import express from 'express';
import cors from 'cors';
import config from './config/env';
import { requestLogger, logger } from './middleware/logging';
import { timeoutMiddleware, haltOnTimeout } from './middleware/timeout';
import { errorHandler } from './middleware/errorHandler';
import { verifyToken, loadAuthContext } from './middleware/auth';
import { onboardingGuard } from './middleware/onboardingGuard';
import healthRouter from './routes/health';
import onboardingRouter from './routes/onboarding';
import creatorsRouter from './routes/creators';
import campaignRouter, { matchedCampaignsRouter } from './routes/campaigns';
import shortlistRouter from './routes/shortlists';
import collaborationRouter from './routes/collaborations';
import influencerRouter from './routes/influencer.js';
import aiRouter from './routes/ai';
import profileRouter from './routes/profile';
import { ingestService } from './services/IngestService';

const app = express();

const configuredCorsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const defaultDevOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const allowedOrigins = new Set([
  ...configuredCorsOrigins,
  ...(config.NODE_ENV === 'development' ? defaultDevOrigins : []),
]);

// Core middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.has('*') || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(requestLogger);

// Global timeout
app.use(timeoutMiddleware());
app.use(haltOnTimeout);

// Health check (always public)
app.use('/v1/health', healthRouter);

// Onboarding routes
app.use('/v1/onboarding', onboardingRouter);

// Profile routes (authenticated; no onboarding gate)
app.use('/v1/profile', profileRouter);

// Core platform guard stack (auth context + onboarding completion)
const corePlatformMiddleware = [verifyToken, loadAuthContext, onboardingGuard];

// Creator discovery and detail routes
app.use('/v1/creators', ...corePlatformMiddleware, creatorsRouter);

// Campaign routes
app.use('/v1/campaigns/matched', ...corePlatformMiddleware, matchedCampaignsRouter); // Must come before /v1/campaigns
app.use('/v1/campaigns', ...corePlatformMiddleware, campaignRouter);

// Shortlist routes
app.use('/v1/shortlists', ...corePlatformMiddleware, shortlistRouter);

// Collaboration routes
app.use('/v1/collaborations', ...corePlatformMiddleware, collaborationRouter);

// Influencer dashboard routes
app.use('/v1/influencer', ...corePlatformMiddleware, influencerRouter);

// AI Co-Pilot routes
app.use('/v1/ai', ...corePlatformMiddleware, aiRouter);

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
  ingestService.startBackgroundWorker();

  const server = app.listen(config.PORT, () => {
    logger.info(`🚀 Meshly backend listening on port ${config.PORT}`);
    logger.info(`📝 Environment: ${config.NODE_ENV}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    ingestService.stopBackgroundWorker();
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  });
}

export default app;
