import { QueryService } from '../../src/services/queryService';
import { OpenAIError, ValidationError } from '../../src/utils/errorHandler';

// Mock the logger to avoid console output during tests
jest.mock('../../src/utils/logger', () => ({
  logActivity: jest.fn(),
  logError: jest.fn(),
  logPerformance: jest.fn(),
  logSecurityEvent: jest.fn(),
  logHealthCheck: jest.fn()
}));

describe('QueryService', () => {
  let queryService: QueryService;
  let mockOpenAI: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a mock OpenAI instance
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    };

    // Mock the OpenAI constructor
    const OpenAI = require('openai').OpenAI;
    OpenAI.mockReturnValue(mockOpenAI);

    queryService = new QueryService();
  });

  describe('processQuery', () => {
    it('should process a simple query successfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Paris is the capital of France.'
            }
          }
        ],
        usage: {
          total_tokens: 15
        }
      };

      // Mock OpenAI response
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await queryService.processQuery('What is the capital of France?');

      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('metadata');
      expect(result.metadata).toHaveProperty('model');
      expect(result.metadata).toHaveProperty('processingTime');
      expect(result.metadata).toHaveProperty('tokensUsed');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
    });

    it('should handle OpenAI API errors gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue({
        status: 401,
        message: 'Invalid API key'
      });

      await expect(queryService.processQuery('test query'))
        .rejects.toThrow(OpenAIError);
    });

    it('should validate input and throw error for invalid query', async () => {
      const invalidQuery = '';

      await expect(queryService.processQuery(invalidQuery))
        .rejects.toThrow(ValidationError);
    });

    it('should handle rate limit errors', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue({
        status: 429,
        message: 'Rate limit exceeded'
      });

      await expect(queryService.processQuery('test query'))
        .rejects.toThrow(OpenAIError);
    });

    it('should handle service unavailable errors', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue({
        status: 503,
        message: 'Service unavailable'
      });

      await expect(queryService.processQuery('test query'))
        .rejects.toThrow(OpenAIError);
    });

    it('should process queries with context', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Response with context'
            }
          }
        ],
        usage: {
          total_tokens: 20
        }
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const context = {
        nlwebResults: [{ title: 'Test', content: 'Test content' }],
        userId: 'user123'
      };

      const result = await queryService.processQuery('test query', context);

      expect(result).toHaveProperty('text');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('getQueryType', () => {
    it('should identify creative queries', () => {
      const creativeQueries = [
        'Write a story about dragons',
        'Create a poem about nature',
        'Imagine a world without technology'
      ];

      creativeQueries.forEach(query => {
        const queryType = (queryService as any).getQueryType(query);
        expect(queryType).toBe('creative');
      });
    });

    it('should identify analytical queries', () => {
      const analyticalQueries = [
        'Analyze the data trends',
        'What are the statistics for 2023?',
        'Compare these two approaches'
      ];

      analyticalQueries.forEach(query => {
        const queryType = (queryService as any).getQueryType(query);
        expect(queryType).toBe('analytical');
      });
    });

    it('should identify questions as quality queries', () => {
      const questionQueries = [
        'What is the meaning of life?',
        'How does photosynthesis work?',
        'Why is the sky blue?'
      ];

      questionQueries.forEach(query => {
        const queryType = (queryService as any).getQueryType(query);
        expect(queryType).toBe('quality');
      });
    });

    it('should default simple statements to fast queries', () => {
      const simpleQueries = [
        'Hello world',
        'This is a test',
        'Simple statement'
      ];

      simpleQueries.forEach(query => {
        const queryType = (queryService as any).getQueryType(query);
        expect(queryType).toBe('fast');
      });
    });
  });
});
