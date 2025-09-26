export interface OpenAIConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  timeout: number;
}

// Default configuration optimized for demo purposes
export const DEFAULT_CONFIG: OpenAIConfig = {
  model: 'gpt-3.5-turbo',
  maxTokens: 500,
  temperature: 0.7,        // Balanced creativity and consistency
  topP: 0.9,              // Nucleus sampling for diverse responses
  frequencyPenalty: 0.1,   // Slight penalty for repetition
  presencePenalty: 0.1,    // Slight penalty for topic drift
  timeout: 30000,          // 30 second timeout
};

// Configuration optimized for fast responses (lower quality, faster)
export const FAST_CONFIG: OpenAIConfig = {
  ...DEFAULT_CONFIG,
  model: 'gpt-3.5-turbo',
  maxTokens: 300,
  temperature: 0.5,
  topP: 0.8,
  frequencyPenalty: 0.0,
  presencePenalty: 0.0,
};

// Configuration optimized for high quality responses (slower, more expensive)
export const QUALITY_CONFIG: OpenAIConfig = {
  ...DEFAULT_CONFIG,
  model: 'gpt-4', // Requires GPT-4 access
  maxTokens: 800,
  temperature: 0.8,
  topP: 0.95,
  frequencyPenalty: 0.2,
  presencePenalty: 0.2,
};

// Configuration optimized for creative tasks
export const CREATIVE_CONFIG: OpenAIConfig = {
  ...DEFAULT_CONFIG,
  maxTokens: 600,
  temperature: 0.9,
  topP: 0.95,
  frequencyPenalty: -0.1, // Encourage creativity
  presencePenalty: 0.3,
};

// Configuration optimized for factual/analytical tasks
export const ANALYTICAL_CONFIG: OpenAIConfig = {
  ...DEFAULT_CONFIG,
  maxTokens: 400,
  temperature: 0.3,        // More deterministic
  topP: 0.7,
  frequencyPenalty: 0.3,   // Reduce repetition
  presencePenalty: 0.1,
};

export const getOptimizedConfig = (useCase?: string): OpenAIConfig => {
  const envModel = process.env.OPENAI_MODEL;
  const envMaxTokens = process.env.OPENAI_MAX_TOKENS;
  const envTemperature = process.env.OPENAI_TEMPERATURE;

  // Allow environment variables to override defaults
  const config: OpenAIConfig = {
    ...DEFAULT_CONFIG,
    model: envModel || DEFAULT_CONFIG.model,
    maxTokens: envMaxTokens ? parseInt(envMaxTokens, 10) : DEFAULT_CONFIG.maxTokens,
    temperature: envTemperature ? parseFloat(envTemperature) : DEFAULT_CONFIG.temperature,
  };

  // Select configuration based on use case
  switch (useCase?.toLowerCase()) {
    case 'fast':
      return { ...FAST_CONFIG, ...config };
    case 'quality':
      return { ...QUALITY_CONFIG, ...config };
    case 'creative':
      return { ...CREATIVE_CONFIG, ...config };
    case 'analytical':
      return { ...ANALYTICAL_CONFIG, ...config };
    default:
      return config;
  }
};

export const validateConfig = (config: OpenAIConfig): boolean => {
  if (!config.model || typeof config.model !== 'string') {
    throw new Error('Model must be a non-empty string');
  }

  if (config.maxTokens < 1 || config.maxTokens > 4096) {
    throw new Error('maxTokens must be between 1 and 4096');
  }

  if (config.temperature < 0 || config.temperature > 2) {
    throw new Error('temperature must be between 0 and 2');
  }

  if (config.topP < 0 || config.topP > 1) {
    throw new Error('topP must be between 0 and 1');
  }

  if (config.frequencyPenalty < -2 || config.frequencyPenalty > 2) {
    throw new Error('frequencyPenalty must be between -2 and 2');
  }

  if (config.presencePenalty < -2 || config.presencePenalty > 2) {
    throw new Error('presencePenalty must be between -2 and 2');
  }

  if (config.timeout < 1000 || config.timeout > 120000) {
    throw new Error('timeout must be between 1000 and 120000 milliseconds');
  }

  return true;
};
