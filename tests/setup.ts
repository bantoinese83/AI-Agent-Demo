import { jest } from '@jest/globals';

// Set up test environment
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-api-key';

// Mock OpenAI
jest.mock('openai', () => {
  const mockCreate = jest.fn();

  return {
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      }
    })),
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      }
    }))
  };
});

// Mock winston logger
jest.mock('../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  },
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  },
  logActivity: jest.fn(),
  logPerformance: jest.fn(),
  logError: jest.fn(),
  logHealthCheck: jest.fn(),
  logSecurityEvent: jest.fn()
}));

// Global test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Mock console methods for cleaner test output
const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  Object.assign(console, originalConsole);
});
