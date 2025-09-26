import { validateQueryInput, validateEnvironmentVariables } from '../../src/utils/validation';
import { ValidationError } from '../../src/utils/errorHandler';

describe('Input Validation', () => {
  describe('validateQueryInput', () => {
    it('should validate correct input successfully', () => {
      const validInput = {
        query: 'What is the capital of France?',
        context: {
          userId: 'user123',
          sessionId: 'session456'
        }
      };

      const result = validateQueryInput(validInput);
      expect(result).toBe('What is the capital of France?');
    });

    it('should throw error for missing query', () => {
      const invalidInput = { context: {} };

      expect(() => validateQueryInput(invalidInput))
        .toThrow(ValidationError);
    });

    it('should throw error for empty query', () => {
      const invalidInput = { query: '' };

      expect(() => validateQueryInput(invalidInput))
        .toThrow(ValidationError);
    });

    it('should throw error for query too long', () => {
      const longQuery = 'a'.repeat(1001);
      const invalidInput = { query: longQuery };

      expect(() => validateQueryInput(invalidInput))
        .toThrow(ValidationError);
    });

    it('should throw error for harmful content', () => {
      const harmfulInput = { query: '<script>alert("xss")</script>' };

      expect(() => validateQueryInput(harmfulInput))
        .toThrow(ValidationError);
    });

    it('should throw error for invalid context structure', () => {
      const invalidInput = {
        query: 'test query',
        context: 'invalid context'
      };

      expect(() => validateQueryInput(invalidInput))
        .toThrow(ValidationError);
    });

    it('should validate input without context', () => {
      const inputWithoutContext = { query: 'Simple question' };

      const result = validateQueryInput(inputWithoutContext);
      expect(result).toBe('Simple question');
    });
  });

  describe('validateEnvironmentVariables', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should validate correct environment variables', () => {
      process.env.OPENAI_API_KEY = 'sk-test123456789';
      process.env.PORT = '3001';
      process.env.NODE_ENV = 'development';

      expect(() => validateEnvironmentVariables()).not.toThrow();
    });

    it('should throw error for missing API key', () => {
      delete process.env.OPENAI_API_KEY;

      expect(() => validateEnvironmentVariables()).toThrow(ValidationError);
    });

    it('should throw error for invalid API key format', () => {
      process.env.OPENAI_API_KEY = 'invalid-key';

      expect(() => validateEnvironmentVariables()).toThrow(ValidationError);
    });

    it('should throw error for invalid port', () => {
      process.env.OPENAI_API_KEY = 'sk-test123456789';
      process.env.PORT = '99999';

      expect(() => validateEnvironmentVariables()).toThrow(ValidationError);
    });

    it('should throw error for invalid node environment', () => {
      process.env.OPENAI_API_KEY = 'sk-test123456789';
      process.env.NODE_ENV = 'invalid';

      expect(() => validateEnvironmentVariables()).toThrow(ValidationError);
    });
  });
});
