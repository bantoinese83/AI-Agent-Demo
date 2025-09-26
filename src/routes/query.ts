import { Request, Response } from 'express';
import {
  APIError,
  AuthenticationError,
  RateLimitError,
  sanitizeErrorMessage,
  handleError
} from '../utils/errorHandler';
import { validateQueryInput } from '../utils/validation';
import { queryService } from '../services/queryService';

export const queryHandler = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();

  try {
    // Validate request body
    const { query: userQuery, context } = req.body;

    // Basic validation
    if (!userQuery || typeof userQuery !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Query parameter is required and must be a string'
      });
      return;
    }

    // Use validation utility for comprehensive checks
    const validatedQuery = validateQueryInput({ query: userQuery, context });

    const result = await queryService.processQuery(validatedQuery, context);

    const processingTime = Date.now() - startTime;

    res.json({
      success: true,
      response: result.text,
      timestamp: new Date().toISOString(),
      metadata: {
        ...result.metadata,
        totalProcessingTime: processingTime
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    handleError(error, `Query handler failed after ${processingTime}ms`);

    if (error instanceof AuthenticationError) {
      res.status(401).json({
        error: 'Authentication Error',
        message: sanitizeErrorMessage(error)
      });
      return;
    }

    if (error instanceof RateLimitError) {
      res.status(429).json({
        error: 'Rate Limit Exceeded',
        message: sanitizeErrorMessage(error)
      });
      return;
    }

    if (error instanceof APIError) {
      res.status(error.statusCode).json({
        error: error.name,
        message: sanitizeErrorMessage(error)
      });
      return;
    }

    // Handle unexpected errors
    res.status(500).json({
      error: 'Internal Server Error',
      message: sanitizeErrorMessage(error)
    });
  }
};
