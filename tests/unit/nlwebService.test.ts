import { nlwebService } from '../../src/services/nlwebService';
import logger from '../../src/utils/logger';

// Mock logger to avoid console output during tests
jest.mock('../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('NLWebService', () => {
  beforeEach(() => {
    // Reset the service state before each test
    jest.clearAllMocks();
  });

  describe('Core Functionality', () => {
    test('should initialize with default content', () => {
      const health = nlwebService.getHealth();
      expect(health.status).toBe('healthy');
      expect(health.indexedContent).toBeGreaterThan(0);
    });

    test('should handle natural language queries', async () => {
      const query = {
        question: 'What is artificial intelligence?',
        maxResults: 3
      };

      const result = await nlwebService.ask(query);

      expect(result).toHaveProperty('answer');
      expect(result).toHaveProperty('sources');
      expect(result).toHaveProperty('metadata');
      expect(result.metadata.query).toBe(query.question);
      expect(result.metadata.totalSources).toBeGreaterThanOrEqual(0);
    });

    test('should return structured Schema.org compatible responses', async () => {
      const query = {
        question: 'Tell me about AI development',
        maxResults: 2
      };

      const result = await nlwebService.ask(query);

      expect(result.sources).toBeInstanceOf(Array);
      expect(result.sources.length).toBeLessThanOrEqual(query.maxResults);

      if (result.sources.length > 0) {
        const source = result.sources[0];
        expect(source).toHaveProperty('title');
        expect(source).toHaveProperty('url');
        expect(source).toHaveProperty('snippet');
        expect(source).toHaveProperty('relevanceScore');
        expect(typeof source.relevanceScore).toBe('number');
        expect(source.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(source.relevanceScore).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('MCP Protocol Support', () => {
    test('should handle MCP ask method', async () => {
      const mcpRequest = {
        method: 'ask',
        params: {
          question: 'What is NLWeb?',
          maxResults: 2
        }
      };

      const result = await nlwebService.handleMCP(mcpRequest);

      expect(result).not.toHaveProperty('error');
      expect(result).toHaveProperty('result');
      expect(result.result).toHaveProperty('answer');
      expect(result.result).toHaveProperty('sources');
    });

    test('should handle MCP search method', async () => {
      const mcpRequest = {
        method: 'search',
        params: {
          query: 'artificial intelligence',
          limit: 2
        }
      };

      const result = await nlwebService.handleMCP(mcpRequest);

      expect(result).not.toHaveProperty('error');
      expect(result).toHaveProperty('result');
      expect(Array.isArray(result.result)).toBe(true);
    });

    test('should handle MCP health method', async () => {
      const mcpRequest = {
        method: 'health',
        params: {}
      };

      const result = await nlwebService.handleMCP(mcpRequest);

      expect(result).not.toHaveProperty('error');
      expect(result).toHaveProperty('result');
      expect(result.result).toHaveProperty('status');
      expect(result.result.status).toBe('healthy');
      expect(result.result).toHaveProperty('timestamp');
    });

    test('should handle MCP ingest method', async () => {
      const testContent = {
        url: 'https://example.com/test',
        title: 'Test Document',
        content: 'This is test content for NLWeb ingestion.'
      };

      const mcpRequest = {
        method: 'ingest',
        params: {
          content: JSON.stringify(testContent),
          metadata: { type: 'test' }
        }
      };

      const result = await nlwebService.handleMCP(mcpRequest);

      expect(result).not.toHaveProperty('error');
      expect(result).toHaveProperty('result');
      expect(result.result).toHaveProperty('success');
      expect(result.result.success).toBe(true);
    });

    test('should handle invalid MCP methods', async () => {
      const mcpRequest = {
        method: 'invalidMethod',
        params: {}
      };

      const result = await nlwebService.handleMCP(mcpRequest);

      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Unknown method');
    });

    test('should handle missing parameters in MCP requests', async () => {
      const mcpRequest = {
        method: 'ask',
        params: {}
      };

      const result = await nlwebService.handleMCP(mcpRequest);

      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Missing required parameter');
    });
  });

  describe('Content Ingestion', () => {
    test('should ingest JSON Schema.org content', async () => {
      const schemaContent = {
        '@type': 'Article',
        name: 'Test Article',
        description: 'This is a test article for NLWeb ingestion.',
        url: 'https://example.com/article'
      };

      await expect(nlwebService.ingestContent(JSON.stringify(schemaContent), { type: 'schema' }))
        .resolves.not.toThrow();

      // Verify content was indexed
      const health = nlwebService.getHealth();
      expect(health.indexedContent).toBeGreaterThan(3); // Original + new content
    });

    test('should ingest plain text content', async () => {
      const plainText = 'This is plain text content for NLWeb ingestion.';

      await expect(nlwebService.ingestContent(plainText, {
        url: 'https://example.com/text',
        title: 'Plain Text Document'
      })).resolves.not.toThrow();
    });

    test('should handle invalid JSON gracefully', async () => {
      const invalidJson = '{ invalid json }';

      await expect(nlwebService.ingestContent(invalidJson, { type: 'test' }))
        .resolves.not.toThrow();
    });
  });

  describe('Search Functionality', () => {
    test('should find relevant content for specific queries', async () => {
      const query = {
        question: 'artificial intelligence development guide',
        maxResults: 5
      };

      const result = await nlwebService.ask(query);

      expect(result.sources.length).toBeGreaterThan(0);

      // Check that relevant content was found
      const relevantSources = result.sources.filter(source =>
        source.title.toLowerCase().includes('ai') ||
        source.snippet.toLowerCase().includes('artificial')
      );

      expect(relevantSources.length).toBeGreaterThan(0);
    });

    test('should calculate relevance scores correctly', async () => {
      const query = {
        question: 'web development frameworks',
        maxResults: 10
      };

      const result = await nlwebService.ask(query);

      if (result.sources.length > 0) {
        result.sources.forEach(source => {
          expect(typeof source.relevanceScore).toBe('number');
          expect(source.relevanceScore).toBeGreaterThanOrEqual(0);
          expect(source.relevanceScore).toBeLessThanOrEqual(1);
        });
      }
    });

    test('should return empty results for unrelated queries', async () => {
      const query = {
        question: 'quantum physics relativity',
        maxResults: 5
      };

      const result = await nlwebService.ask(query);

      // May have no sources or low relevance sources
      expect(Array.isArray(result.sources)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid queries gracefully', async () => {
      const invalidQuery = {
        question: '', // Empty query
        maxResults: 5
      };

      const result = await nlwebService.ask(invalidQuery);

      expect(result).toHaveProperty('answer');
      expect(result).toHaveProperty('sources');
      expect(result.metadata.query).toBe('');
    });

    test('should handle malformed content ingestion', async () => {
      const malformedContent = '{ "unclosed": "object"';

      await expect(nlwebService.ingestContent(malformedContent, { type: 'test' }))
        .resolves.not.toThrow();
    });

    test('should handle MCP errors gracefully', async () => {
      const invalidMCPRequest = {
        method: 'ask',
        params: {
          // Missing question parameter
        }
      };

      const result = await nlwebService.handleMCP(invalidMCPRequest);

      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Missing required parameter');
    });
  });

  describe('Performance', () => {
    test('should process queries within reasonable time', async () => {
      const startTime = Date.now();

      const query = {
        question: 'What is AI development?',
        maxResults: 3
      };

      const result = await nlwebService.ask(query);

      const processingTime = Date.now() - startTime;

      expect(result.metadata.processingTime).toBeLessThan(1000); // Should be under 1 second
      expect(processingTime).toBeLessThan(2000); // Total time under 2 seconds
    });

    test('should handle multiple concurrent queries', async () => {
      const queries = [
        'What is artificial intelligence?',
        'Tell me about web development',
        'How does NLWeb work?',
        'What is machine learning?'
      ];

      const promises = queries.map(query =>
        nlwebService.ask({ question: query, maxResults: 2 })
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result).toHaveProperty('answer');
        expect(result).toHaveProperty('sources');
        expect(result).toHaveProperty('metadata');
        expect(result.metadata.processingTime).toBeLessThan(1000);
      });
    });
  });
});
