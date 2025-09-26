import request from 'supertest';
import express from 'express';
import { nlwebService } from '../../src/services/nlwebService';
import { APIError } from '../../src/utils/errorHandler';

// Mock queryService
jest.mock('../../src/services/queryService', () => ({
  queryService: {
    processQuery: jest.fn()
  }
}));

const { queryService } = require('../../src/services/queryService');

describe('API Integration Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Add NLWeb endpoints for testing
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

        res.json(result);
      } catch (error) {
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
        res.status(500).json({ error: 'NLWeb MCP request failed' });
      }
    });

    // Add query endpoint for testing
    app.post('/api/query', async (req, res) => {
      try {
        const { query, context } = req.body;

        if (!query) {
          return res.status(400).json({ error: 'Missing required parameter: query' });
        }

        const result = await queryService.processQuery(query, context);

        res.json({
          success: true,
          response: result.text,
          timestamp: new Date().toISOString(),
          metadata: result.metadata,
          totalProcessingTime: result.metadata.processingTime
        });
      } catch (error) {
        if (error instanceof APIError) {
          return res.status(error.statusCode).json({
            error: error.message,
            code: error.statusCode
          });
        }

        res.status(500).json({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    jest.clearAllMocks();
  });

  describe('POST /api/query', () => {
    it('should successfully process a valid query', async () => {
      const mockResponse = {
        text: 'Test response',
        metadata: {
          model: 'gpt-3.5-turbo',
          processingTime: 1250,
          tokensUsed: 15
        }
      };

      (queryService.processQuery as jest.Mock).mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/api/query')
        .send({ query: 'What is the capital of France?' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('response', 'Paris is the capital of France.');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('metadata');
      expect(queryService.processQuery).toHaveBeenCalledWith('What is the capital of France?', undefined);
    });

    it('should handle query with context', async () => {
      const mockResponse = {
        text: 'Response with context',
        metadata: {
          model: 'gpt-3.5-turbo',
          processingTime: 800,
          tokensUsed: 12
        }
      };

      (queryService.processQuery as jest.Mock).mockResolvedValue(mockResponse);

      const requestBody = {
        query: 'Explain quantum physics',
        context: {
          userId: 'user123',
          sessionId: 'session456'
        }
      };

      const response = await request(app)
        .post('/api/query')
        .send(requestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(queryService.processQuery).toHaveBeenCalledWith('Explain quantum physics', requestBody.context);
    });

    it('should return 400 for missing query', async () => {
      const response = await request(app)
        .post('/api/query')
        .send({ context: {} })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for empty query', async () => {
      const response = await request(app)
        .post('/api/query')
        .send({ query: '' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for non-string query', async () => {
      const response = await request(app)
        .post('/api/query')
        .send({ query: 123 })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for query too long', async () => {
      const longQuery = 'a'.repeat(1001);

      const response = await request(app)
        .post('/api/query')
        .send({ query: longQuery })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for harmful content', async () => {
      const response = await request(app)
        .post('/api/query')
        .send({ query: '<script>alert("xss")</script>' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    it('should handle service errors gracefully', async () => {
      (queryService.processQuery as jest.Mock).mockRejectedValue(
        new APIError('Service unavailable', 503)
      );

      const response = await request(app)
        .post('/api/query')
        .send({ query: 'test query' })
        .expect(503);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    it('should handle rate limit errors', async () => {
      (queryService.processQuery as jest.Mock).mockRejectedValue(
        new APIError('Rate limit exceeded', 429)
      );

      const response = await request(app)
        .post('/api/query')
        .send({ query: 'test query' })
        .expect(429);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    it('should handle authentication errors', async () => {
      (queryService.processQuery as jest.Mock).mockRejectedValue(
        new APIError('Invalid API key', 401)
      );

      const response = await request(app)
        .post('/api/query')
        .send({ query: 'test query' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    it('should handle unexpected errors', async () => {
      (queryService.processQuery as jest.Mock).mockRejectedValue(
        new Error('Unexpected error')
      );

      const response = await request(app)
        .post('/api/query')
        .send({ query: 'test query' })
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/nlweb/ask', () => {
    it('should successfully process a valid NLWeb query', async () => {
      const response = await request(app)
        .post('/api/nlweb/ask')
        .send({
          question: 'What is artificial intelligence?',
          maxResults: 3
        })
        .expect(200);

      expect(response.body).toHaveProperty('answer');
      expect(response.body).toHaveProperty('sources');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata.query).toBe('What is artificial intelligence?');
      expect(Array.isArray(response.body.sources)).toBe(true);
    });

    it('should return 400 for missing question parameter', async () => {
      const response = await request(app)
        .post('/api/nlweb/ask')
        .send({ maxResults: 3 })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required parameter');
    });

    it('should handle queries with context', async () => {
      const response = await request(app)
        .post('/api/nlweb/ask')
        .send({
          question: 'Tell me more about AI development',
          context: 'I want to learn about machine learning',
          maxResults: 2
        })
        .expect(200);

      expect(response.body.answer).toBeDefined();
      expect(response.body.sources).toBeDefined();
    });
  });

  describe('POST /api/nlweb/ingest', () => {
    it('should successfully ingest valid Schema.org content', async () => {
      const schemaContent = {
        '@type': 'Article',
        name: 'Test Article for Ingestion',
        description: 'This article will be ingested into NLWeb for testing purposes.',
        url: 'https://example.com/test-article'
      };

      const response = await request(app)
        .post('/api/nlweb/ingest')
        .send({
          content: JSON.stringify(schemaContent),
          metadata: { type: 'test', source: 'unit-test' }
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 for missing content parameter', async () => {
      const response = await request(app)
        .post('/api/nlweb/ingest')
        .send({ metadata: { type: 'test' } })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required parameter');
    });
  });

  describe('POST /api/nlweb/mcp', () => {
    it('should handle MCP health method', async () => {
      const response = await request(app)
        .post('/api/nlweb/mcp')
        .send({
          method: 'health',
          params: {}
        })
        .expect(200);

      expect(response.body).toHaveProperty('result');
      expect(response.body.result).toHaveProperty('status', 'healthy');
      expect(response.body.result).toHaveProperty('timestamp');
    });

    it('should return 400 for missing method parameter', async () => {
      const response = await request(app)
        .post('/api/nlweb/mcp')
        .send({ params: {} })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required parameter');
    });

    it('should return 400 for unknown MCP methods', async () => {
      const response = await request(app)
        .post('/api/nlweb/mcp')
        .send({
          method: 'unknownMethod',
          params: {}
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Unknown method');
    });
  });
});
