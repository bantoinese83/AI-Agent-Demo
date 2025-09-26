import OpenAI from 'openai';
import { OpenAIError, handleError } from '../utils/errorHandler';
import { validateQueryInput, sanitizeString } from '../utils/validation';
import { getOptimizedConfig, validateConfig, DEFAULT_CONFIG } from '../utils/openaiConfig';
import { nlwebService } from './nlwebService';
import logger from '../utils/logger';

class QueryService {
  private openai: OpenAI;

  constructor() {
    try {
      const apiKey = process.env.OPENAI_API_KEY;

      if (!apiKey) {
        throw new OpenAIError('OpenAI API key is required');
      }

      // Get optimized configuration
      const config = getOptimizedConfig();

      // Validate configuration
      validateConfig(config);

      this.openai = new OpenAI({
        apiKey,
        timeout: config.timeout,
      });

      console.log('QueryService initialized with config:', {
        model: config.model,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
        topP: config.topP
      });
    } catch (error) {
      handleError(error, 'QueryService initialization');
      throw error;
    }
  }

  async processQuery(userQuery: string, context?: any) {
    const startTime = Date.now();

    try {
      // Validate and sanitize input
      const validatedQuery = validateQueryInput({ query: userQuery, context });

      // Enrich query with NLWeb context if available
      const enrichedQuery = await this.enrichWithNLWeb(validatedQuery, context);

      // Get optimized configuration for this query
      const config = getOptimizedConfig(this.getQueryType(userQuery));

      const completion = await this.openai.chat.completions.create({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: enrichedQuery
          }
        ],
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        top_p: config.topP,
        frequency_penalty: config.frequencyPenalty,
        presence_penalty: config.presencePenalty,
      });

      const response = completion.choices[0]?.message?.content;

      if (!response) {
        throw new OpenAIError('No response received from OpenAI API');
      }

      const processingTime = Date.now() - startTime;

      // Log successful query processing
      console.log(`Query processed successfully in ${processingTime}ms`);

      return {
        text: response.trim(),
        metadata: {
          model: config.model,
          processingTime,
          tokensUsed: completion.usage?.total_tokens,
          config: {
            temperature: config.temperature,
            topP: config.topP,
            maxTokens: config.maxTokens
          }
        }
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      handleError(error, `Query processing failed after ${processingTime}ms`);

      if (error instanceof OpenAIError) {
        throw error;
      }

      // Handle OpenAI API specific errors
      if (error && typeof error === 'object' && 'status' in error) {
        const apiError = error as any;

        if (apiError.status === 401) {
          throw new OpenAIError('Invalid OpenAI API key', error);
        }

        if (apiError.status === 429) {
          throw new OpenAIError('OpenAI API rate limit exceeded', error);
        }

        if (apiError.status >= 500) {
          throw new OpenAIError('OpenAI API service error', error);
        }
      }

      throw new OpenAIError('Failed to process query with OpenAI API', error);
    }
  }

  private async enrichWithNLWeb(query: string, context?: any): Promise<string> {
    try {
      // Query NLWeb for relevant context
      const nlwebResponse = await nlwebService.ask({
        question: query,
        maxResults: 3
      });

      // If NLWeb has relevant sources, include them in context
      if (nlwebResponse.sources && nlwebResponse.sources.length > 0) {
        const contextText = nlwebResponse.sources
          .map(source => `[${source.title}] ${source.snippet}`)
          .join('\n\n');

        return `${query}\n\nRelevant web context from NLWeb:\n${contextText}`;
      }

      // Return original query if no NLWeb context found
      return query;

    } catch (error) {
      logger.warn('NLWeb enrichment failed, using original query:', error);
      return query;
    }
  }

  private getQueryType(query: string): string {
    const lowerQuery = query.toLowerCase();

    // Creative queries (stories, poems, creative writing)
    if (lowerQuery.match(/\b(story|poem|write|create|imagine|fiction|creative)\b/)) {
      return 'creative';
    }

    // Analytical queries (data, facts, analysis, research)
    if (lowerQuery.match(/\b(analyze|research|data|statistics|facts?|compare|explain|how|why|what)\b/)) {
      return 'analytical';
    }

    // Questions that might need detailed responses
    if (lowerQuery.includes('?') || lowerQuery.match(/\b(how|what|why|when|where|who)\b/)) {
      return 'quality';
    }

    // Default to fast for simple queries
    return 'fast';
  }

  private getSystemPrompt(): string {
    return `You are an intelligent AI assistant with access to a comprehensive knowledge base through NLWeb.
You provide helpful, accurate, and contextual responses based on both your training data and the web context provided.

When web context is available from NLWeb, use it to enhance your responses with current, relevant information from trusted sources. Always cite sources when providing factual information.

If you don't have enough context to answer a question, be honest about it and suggest alternatives.
Keep responses clear, concise, and well-formatted. Use markdown when appropriate for better readability.

You can reference information from the NLWeb knowledge base which includes content from various websites and structured data sources.`;
  }
}

export { QueryService };
export const queryService = new QueryService();
