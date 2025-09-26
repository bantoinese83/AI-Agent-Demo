import logger, { logError, logSecurityEvent } from './logger';

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'APIError';

    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIError);
    }
  }
}

export class ValidationError extends APIError {
  constructor(message: string, public field?: string) {
    super(message, 400, true);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, true);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends APIError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, true);
    this.name = 'RateLimitError';
  }
}

export class OpenAIError extends APIError {
  constructor(message: string, public originalError?: any) {
    super(message, 502, true);
    this.name = 'OpenAIError';
  }
}

export const handleError = (error: any, context?: string): void => {
  if (error instanceof APIError) {
    logError(error, context || 'API Error', {
      statusCode: error.statusCode,
      isOperational: error.isOperational
    });
  } else {
    // Handle unknown errors
    logError(error, context || 'Unknown Error');
  }

  // Log security events for certain error types
  if (error instanceof AuthenticationError || error.statusCode === 401) {
    logSecurityEvent('Authentication Failure', {
      context: context || 'Unknown',
      userAgent: 'system',
      ip: 'internal'
    });
  }
};

export const sanitizeErrorMessage = (error: any): string => {
  if (error instanceof APIError) {
    return error.message;
  }

  // Don't expose internal error details in production
  if (process.env.NODE_ENV === 'production') {
    return 'An unexpected error occurred';
  }

  return error.message || 'Unknown error';
};

export const isTrustedError = (error: any): boolean => {
  if (error instanceof APIError) {
    return error.isOperational;
  }
  return false;
};

// Export logger functions for use in other modules
export { logError, logSecurityEvent } from './logger';
