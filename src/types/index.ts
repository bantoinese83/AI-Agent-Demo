export interface QueryRequest {
  query: string;
  context?: {
    nlwebResults?: any[];
    userId?: string;
    sessionId?: string;
  };
}

export interface QueryResponse {
  success: boolean;
  response: string;
  timestamp: string;
  metadata?: {
    model: string;
    tokensUsed?: number;
    processingTime?: number;
  };
}

export interface ErrorResponse {
  error: string;
  message: string;
  timestamp?: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  environment: string;
  version?: string;
}
