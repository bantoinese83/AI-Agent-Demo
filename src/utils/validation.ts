import Joi from 'joi';
import { ValidationError } from './errorHandler';
import { logActivity, logSecurityEvent } from './logger';

// Joi validation schemas
export const querySchema = Joi.object({
  query: Joi.string()
    .trim()
    .min(1)
    .max(1000)
    .required()
    .custom((value: string) => {
      if (containsHarmfulContent(value)) {
        logSecurityEvent('Potentially harmful query detected', { queryLength: value.length });
        throw new ValidationError('Query contains potentially harmful content');
      }
      return value;
    }),
  context: Joi.object({
    nlwebResults: Joi.array().optional(),
    userId: Joi.string().optional(),
    sessionId: Joi.string().optional()
  }).optional()
});

export const environmentSchema = Joi.object({
  OPENAI_API_KEY: Joi.string()
    .pattern(/^sk-/)
    .required()
    .messages({
      'string.pattern.base': 'OpenAI API key must start with "sk-"'
    }),
  PORT: Joi.number()
    .integer()
    .min(1)
    .max(65535)
    .optional(),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .optional(),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .optional()
});

export const validateQueryInput = (input: any): string => {
  const { error, value } = querySchema.validate(input, { abortEarly: false });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    logActivity('Input validation failed', {
      inputType: typeof input,
      errorCount: error.details.length,
      errors: error.details.map(d => d.message)
    });
    throw new ValidationError(errorMessage);
  }

  logActivity('Input validation passed', {
    queryLength: value.query.length,
    hasContext: !!value.context
  });

  return value.query;
};

export const validateEnvironmentVariables = (): void => {
  const { error } = environmentSchema.validate(process.env, { allowUnknown: true });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    logActivity('Environment validation failed', {
      errorCount: error.details.length,
      errors: error.details.map(d => d.message)
    });
    throw new ValidationError(`Environment validation failed: ${errorMessage}`);
  }

  logActivity('Environment validation passed', {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    logLevel: process.env.LOG_LEVEL
  });
};

const containsHarmfulContent = (query: string): boolean => {
  const harmfulPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /eval\s*\(/i,
    /exec\s*\(/i,
    /system\s*\(/i,
    /shell_exec\s*\(/i,
    /passthru\s*\(/i,
  ];

  return harmfulPatterns.some(pattern => pattern.test(query));
};

export const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove potentially harmful HTML/script content
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
};

export const truncateString = (input: string, maxLength: number): string => {
  if (input.length <= maxLength) {
    return input;
  }

  return input.substring(0, maxLength - 3) + '...';
};
