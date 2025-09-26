import request from 'supertest';
import express from 'express';
import { nlwebService } from '../../src/services/nlwebService';

// Create a test app instance
const app = express();
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

describe('NLWeb API Integration Tests', () => {
  beforeEach(async () => {
    // Reset NLWeb service state
    // This would be better with a proper reset method in the service
  });

  describe('POST /api/nlweb/ask', () => {
    test('should handle valid natural language queries', async () => {
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

    test('should return 400 for missing question parameter', async () => {
      const response = await request(app)
        .post('/api/nlweb/ask')
        .send({ maxResults: 3 })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required parameter');
    });

    test('should handle queries with context', async () => {
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

    test('should handle empty query gracefully', async () => {
      const response = await request(app)
        .post('/api/nlweb/ask')
        .send({ question: '' })
        .expect(400);

      expect(response.body.error).toContain('Missing required parameter');
    });
  });

  describe('POST /api/nlweb/ingest', () => {
    test('should ingest valid Schema.org content', async () => {
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

    test('should ingest plain text content', async () => {
      const response = await request(app)
        .post('/api/nlweb/ingest')
        .send({
          content: 'This is plain text content for testing NLWeb ingestion.',
          metadata: {
            url: 'https://example.com/plain-text',
            title: 'Plain Text Document'
          }
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    test('should return 400 for missing content parameter', async () => {
      const response = await request(app)
        .post('/api/nlweb/ingest')
        .send({ metadata: { type: 'test' } })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required parameter');
    });

    test('should handle malformed JSON content', async () => {
      const response = await request(app)
        .post('/api/nlweb/ingest')
        .send({
          content: '{ "invalid": json }',
          metadata: { type: 'test' }
        })
        .expect(200); // Should still succeed as it handles malformed content gracefully

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('POST /api/nlweb/mcp', () => {
    test('should handle MCP ask method', async () => {
      const response = await request(app)
        .post('/api/nlweb/mcp')
        .send({
          method: 'ask',
          params: {
            question: 'What is NLWeb?',
            maxResults: 2
          }
        })
        .expect(200);

      expect(response.body).toHaveProperty('result');
      expect(response.body.result).toHaveProperty('answer');
      expect(response.body.result).toHaveProperty('sources');
    });

    test('should handle MCP search method', async () => {
      const response = await request(app)
        .post('/api/nlweb/mcp')
        .send({
          method: 'search',
          params: {
            query: 'artificial intelligence',
            limit: 3
          }
        })
        .expect(200);

      expect(response.body).toHaveProperty('result');
      expect(Array.isArray(response.body.result)).toBe(true);
    });

    test('should handle MCP health method', async () => {
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

    test('should handle MCP ingest method', async () => {
      const testContent = {
        url: 'https://example.com/mcp-test',
        title: 'MCP Test Document',
        content: 'This document is for testing MCP ingestion functionality.'
      };

      const response = await request(app)
        .post('/api/nlweb/mcp')
        .send({
          method: 'ingest',
          params: {
            content: JSON.stringify(testContent),
            metadata: { type: 'mcp-test' }
          }
        })
        .expect(200);

      expect(response.body).toHaveProperty('result');
      expect(response.body.result).toHaveProperty('success', true);
    });

    test('should return 400 for missing method parameter', async () => {
      const response = await request(app)
        .post('/api/nlweb/mcp')
        .send({ params: {} })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Missing required parameter');
    });

    test('should return 400 for unknown MCP methods', async () => {
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

  describe('Error Handling', () => {
    test('should handle server errors gracefully', async () => {
      // Test with invalid JSON structure that would cause parsing error
      const response = await request(app)
        .post('/api/nlweb/ask')
        .send('{ invalid json }')
        .expect(500); // Should return 500 for server errors

      expect(response.body.error).toBeDefined();
    });

    test('should handle large payloads', async () => {
      const largeContent = 'x'.repeat(10000); // 10KB of content

      const response = await request(app)
        .post('/api/nlweb/ingest')
        .send({
          content: largeContent,
          metadata: { type: 'large-test' }
        })
        .expect(200); // Should handle large content

      expect(response.body).toHaveProperty('success', true);
    });
  });

  describe('Response Format Validation', () => {
    test('should return proper JSON responses', async () => {
      const responses = await Promise.all([
        request(app).post('/api/nlweb/ask').send({ question: 'test' }),
        request(app).post('/api/nlweb/mcp').send({ method: 'health' }),
        request(app).post('/api/nlweb/ingest').send({ content: 'test' })
      ]);

      responses.forEach(response => {
        expect(response.headers['content-type']).toMatch(/application\/json/);
        expect(typeof response.body).toBe('object');
      });
    });

    test('should include proper HTTP status codes', async () => {
      // Test successful responses
      const successResponse = await request(app)
        .post('/api/nlweb/ask')
        .send({ question: 'test' });

      expect(successResponse.status).toBe(200);

      // Test error responses
      const errorResponse = await request(app)
        .post('/api/nlweb/ask')
        .send({});

      expect(errorResponse.status).toBe(400);
    });
  });
});
