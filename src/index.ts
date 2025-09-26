// __dirname is available in Node.js environments

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { queryHandler } from './routes/query';
import { validateEnvironmentVariables } from './utils/validation';
import { handleError } from './utils/errorHandler';
import { healthService } from './services/healthService';
import { nlwebService } from './services/nlwebService';
import logger, { logActivity, logPerformance, logError } from './utils/logger';

// Memory management - Only enable if garbage collection is available
const gc = (global as any).gc;
if (gc && typeof gc === 'function') {
  setInterval(() => {
    gc();
    logger.debug('Manual garbage collection triggered');
  }, 30000); // Every 30 seconds
}

// Load environment variables
dotenv.config();

// Validate environment variables on startup
try {
  validateEnvironmentVariables();
} catch (error) {
  handleError(error, 'Environment validation failed');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : true,
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static(path.join(process.cwd(), 'public')));

       // Request monitoring middleware
       app.use((req, res, next) => {
         const startTime = Date.now();

         // Log incoming requests
         logActivity('Incoming Request', {
           method: req.method,
           path: req.path,
           userAgent: req.get('User-Agent'),
           ip: req.ip
         });

         // Record response
         res.on('finish', () => {
           const duration = Date.now() - startTime;
           const success = res.statusCode >= 200 && res.statusCode < 400;

           // Don't count health checks in metrics to avoid circular dependency
           if (req.path !== '/health') {
             healthService.recordRequest(success);
           }

           logPerformance(`${req.method} ${req.path}`, duration, {
             statusCode: res.statusCode,
             success
           });
         });

         next();
       });

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const healthMetrics = await healthService.getHealthStatus();
    const metrics = healthService.getMetrics();

    healthService.updateLastHealthCheck();

    const response = {
      ...healthMetrics,
      metrics,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    const statusCode = healthMetrics.status === 'healthy' ? 200 :
                      healthMetrics.status === 'degraded' ? 206 : 503;

    res.status(statusCode).json(response);
  } catch (error) {
    handleError(error, 'Health check failed');
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Metrics endpoint for detailed monitoring
app.get('/metrics', async (req, res) => {
  try {
    const healthMetrics = await healthService.getHealthStatus();
    const metrics = healthService.getMetrics();

    res.json({
      health: healthMetrics,
      metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    handleError(error, 'Metrics retrieval failed');
    res.status(500).json({
      error: 'Failed to retrieve metrics'
    });
  }
});

// Query endpoint
app.post('/api/query', queryHandler);

// NLWeb endpoints
app.post('/api/nlweb/ask', async (req, res) => {
  try {
    const { question, context, maxResults } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Missing required parameter: question' });
    }

    const result = await nlwebService.ask({
      question,
      context,
      maxResults: maxResults || 5
    });

    logActivity('NLWeb Query', {
      question: question.substring(0, 100),
      sourcesCount: result.sources.length
    });

    res.json(result);
  } catch (error) {
    logError(error, 'NLWeb query failed');
    res.status(500).json({ error: 'NLWeb query failed' });
  }
});

app.post('/api/nlweb/ingest', async (req, res) => {
  try {
    const { content, metadata } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Missing required parameter: content' });
    }

    await nlwebService.ingestContent(content, metadata);

    res.json({ success: true, message: 'Content ingested successfully' });
  } catch (error) {
    logError(error, 'NLWeb ingestion failed');
    res.status(500).json({ error: 'NLWeb ingestion failed' });
  }
});

app.post('/api/nlweb/mcp', async (req, res) => {
  try {
    const { method, params } = req.body;

    if (!method) {
      return res.status(400).json({ error: 'Missing required parameter: method' });
    }

    const result = await nlwebService.handleMCP({ method, params });

    if (result.error) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    logError(error, 'NLWeb MCP request failed');
    res.status(500).json({ error: 'NLWeb MCP request failed' });
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  handleError(err, 'Unhandled middleware error');

  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(err.statusCode || 500).json({
    error: err.name || 'Internal Server Error',
    message: isDevelopment ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AI Agent server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});
