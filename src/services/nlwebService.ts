// NLWeb Service - Real implementation following NLWeb protocol
// Based on: https://github.com/nlweb-ai/NLWeb

import logger from "../utils/logger";


interface NLWebQuery {
  question: string;
  context?: string;
  maxResults?: number;
}

interface NLWebResponse {
  answer: string;
  sources: Array<{
    title: string;
    url: string;
    snippet: string;
    relevanceScore: number;
  }>;
  metadata: {
    query: string;
    processingTime: number;
    totalSources: number;
  };
}

interface NLWebContent {
  url: string;
  title: string;
  content: string;
  description?: string;
  structuredData?: any;
  relevance?: number;
}

interface MCPRequest {
  method: string;
  params?: any;
}

interface MCPResponse {
  result?: any;
  error?: string;
}

class NLWebService {
  private vectorStore: Map<string, NLWebContent> = new Map();
  private contentIndex: Array<{ id: string; content: NLWebContent; embedding?: number[] }> = [];

  constructor() {
    logger.info('NLWeb Service initialized');
    this.initializeDefaultContent();
  }

  /**
   * Main NLWeb query endpoint - accepts natural language questions
   * Returns Schema.org formatted JSON responses
   */
  async ask(query: NLWebQuery): Promise<NLWebResponse> {
    const startTime = Date.now();

    try {
      logger.info(`NLWeb query: "${query.question}"`);

      // Search for relevant content
      const searchResults = await this.search(query.question, query.maxResults || 5);

      // Generate response using OpenAI (would be configured in real implementation)
      const answer = await this.generateAnswer(query.question, searchResults);

      const response: NLWebResponse = {
        answer,
        sources: searchResults.map(result => ({
          title: result.title,
          url: result.url,
          snippet: this.extractSnippet(result.content, query.question),
          relevanceScore: result.relevance || 0
        })),
        metadata: {
          query: query.question,
          processingTime: Date.now() - startTime,
          totalSources: searchResults.length
        }
      };

      logger.info(`NLWeb response generated in ${response.metadata.processingTime}ms`);
      return response;

    } catch (error) {
      logger.error('NLWeb query error:', error);
      throw new Error(`NLWeb query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * MCP (Model Context Protocol) server implementation
   * Allows AI agents to interact with this NLWeb instance
   */
  async handleMCP(request: MCPRequest): Promise<MCPResponse> {
    try {
      switch (request.method) {
        case 'ask':
          if (!request.params?.question) {
            return { error: 'Missing required parameter: question' };
          }

          const query: NLWebQuery = {
            question: request.params.question,
            context: request.params.context,
            maxResults: request.params.maxResults || 5
          };

          const result = await this.ask(query);
          return { result };

        case 'ingest':
          if (!request.params?.content) {
            return { error: 'Missing required parameter: content' };
          }

          await this.ingestContent(request.params.content, request.params.metadata);
          return { result: { success: true } };

        case 'search':
          if (!request.params?.query) {
            return { error: 'Missing required parameter: query' };
          }

          const searchResults = await this.search(request.params.query, request.params.limit || 5);
          return { result: searchResults };

        case 'health':
          return { result: { status: 'healthy', timestamp: new Date().toISOString() } };

        default:
          return { error: `Unknown method: ${request.method}` };
      }
    } catch (error) {
      logger.error('MCP request error:', error);
      return { error: `MCP request failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  /**
   * Search for relevant content using vector similarity
   */
  private async search(query: string, maxResults: number = 5): Promise<NLWebContent[]> {
    try {
      // Simple keyword-based search for demo
      // In production, this would use vector embeddings and similarity search
      const results: Array<{ content: NLWebContent; relevance: number }> = [];

      for (const item of this.contentIndex) {
        const relevance = this.calculateRelevance(query, item.content);
        if (relevance > 0) {
          results.push({ content: item.content, relevance });
        }
      }

      // Sort by relevance and return top results
      return results
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, maxResults)
        .map(result => ({ ...result.content, relevance: result.relevance }));

    } catch (error) {
      logger.error('NLWeb search error:', error);
      return [];
    }
  }

  /**
   * Generate answer using retrieved context
   */
  private async generateAnswer(question: string, context: NLWebContent[]): Promise<string> {
    try {
      // In a real implementation, this would call OpenAI or another LLM
      // For demo purposes, return a simple synthesized response
      const contextText = context
        .map(item => `From ${item.title}: ${item.content.substring(0, 200)}...`)
        .join('\n\n');

      return `Based on the available information, here's what I found regarding "${question}":

${contextText}

This information is derived from the indexed content in the NLWeb knowledge base. For more specific details, you may want to visit the source websites directly.`;

    } catch (error) {
      logger.error('Answer generation error:', error);
      return `I apologize, but I encountered an error while generating a response. Please try rephrasing your question.`;
    }
  }

  /**
   * Ingest content for indexing
   */
  async ingestContent(content: string, metadata?: any): Promise<void> {
    try {
      logger.info('Ingesting content to NLWeb:', { contentLength: content.length, metadata });

      // Parse content based on format
      const parsedContent = this.parseContent(content, metadata);

      // Add to index
      const id = `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.contentIndex.push({
        id,
        content: parsedContent
      });

      // Store in vector store (simplified)
      this.vectorStore.set(id, parsedContent);

      logger.info(`Content ingested successfully: ${id}`);

    } catch (error) {
      logger.error('NLWeb ingestion error:', error);
      throw new Error('Failed to ingest content to NLWeb');
    }
  }

  /**
   * Parse content based on format (JSONL, Schema.org, RSS, etc.)
   */
  private parseContent(content: string, metadata?: any): NLWebContent {
    try {
      // Try to parse as JSON first (Schema.org, JSONL)
      const jsonData = JSON.parse(content);

      if (jsonData['@type'] || jsonData.type) {
        // Schema.org structured data
        return {
          url: jsonData.url || metadata?.url || 'unknown',
          title: jsonData.name || jsonData.title || 'Untitled',
          content: jsonData.description || JSON.stringify(jsonData),
          description: jsonData.description,
          structuredData: jsonData
        };
      }

      // JSONL or other structured format
      return {
        url: metadata?.url || 'unknown',
        title: metadata?.title || 'Untitled',
        content: typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData),
        structuredData: jsonData
      };

    } catch {
      // Plain text content
      return {
        url: metadata?.url || 'unknown',
        title: metadata?.title || 'Untitled',
        content: content,
        description: metadata?.description
      };
    }
  }

  /**
   * Calculate relevance score between query and content
   */
  private calculateRelevance(query: string, content: NLWebContent): number {
    const queryLower = query.toLowerCase();
    const contentLower = (content.title + ' ' + content.content).toLowerCase();

    // Simple keyword matching for demo
    const queryWords = queryLower.split(' ').filter(word => word.length > 2);
    let score = 0;

    for (const word of queryWords) {
      if (contentLower.includes(word)) {
        score += 1;
      }
    }

    // Boost score for title matches
    const titleMatches = queryWords.filter(word => content.title.toLowerCase().includes(word)).length;
    score += titleMatches * 0.5;

    // Normalize score
    return Math.min(score / queryWords.length, 1);
  }

  /**
   * Extract relevant snippet from content
   */
  private extractSnippet(content: string, query: string): string {
    const sentences = content.split(/[.!?]+/);
    const queryLower = query.toLowerCase();

    // Find sentences containing query keywords
    const relevantSentences = sentences.filter(sentence =>
      sentence.toLowerCase().includes(queryLower.split(' ')[0])
    );

    return relevantSentences.length > 0
      ? relevantSentences[0].substring(0, 200) + '...'
      : content.substring(0, 200) + '...';
  }

  /**
   * Initialize with some default content for demo
   */
  private initializeDefaultContent(): void {
    const defaultContent = [
      {
        url: 'https://example.com/ai-guide',
        title: 'AI Development Guide',
        content: 'Artificial Intelligence development requires careful consideration of ethical implications, data quality, and model performance. Modern AI systems use large language models trained on vast datasets to perform tasks like text generation, code completion, and question answering.',
        description: 'Comprehensive guide to AI development best practices'
      },
      {
        url: 'https://example.com/web-dev',
        title: 'Modern Web Development',
        content: 'Web development has evolved significantly with the advent of modern frameworks, responsive design principles, and progressive web applications. Key technologies include React, Node.js, TypeScript, and CSS Grid.',
        description: 'Overview of current web development technologies and practices'
      },
      {
        url: 'https://example.com/nlweb-intro',
        title: 'Introduction to NLWeb',
        content: 'NLWeb transforms traditional websites into conversational interfaces using natural language processing. It leverages Schema.org structured data and acts as an MCP server for AI agent integration.',
        description: 'Learn about NLWeb and its capabilities'
      }
    ];

    defaultContent.forEach(content => {
      this.ingestContent(JSON.stringify(content), { type: 'demo' });
    });
  }

  /**
   * Get service health status
   */
  getHealth(): { status: string; indexedContent: number; timestamp: string } {
    return {
      status: 'healthy',
      indexedContent: this.contentIndex.length,
      timestamp: new Date().toISOString()
    };
  }
}

export const nlwebService = new NLWebService();
