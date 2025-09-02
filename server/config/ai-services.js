const OpenAI = require('openai');
require('dotenv').config();

/**
 * AI Services Configuration
 * Manages connections and configurations for various AI service providers
 */

// OpenAI Configuration
const openaiConfig = {
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
  timeout: 60000, // 60 seconds
  maxRetries: 3
};

// Initialize OpenAI client
let openaiClient = null;
if (openaiConfig.apiKey) {
  openaiClient = new OpenAI(openaiConfig);
} else {
  console.warn('OpenAI API key not found. AI services will be limited.');
}

// AI Service Providers Configuration
const AI_PROVIDERS = {
  OPENAI: 'openai',
  // Future providers can be added here
  // AZURE: 'azure',
  // GOOGLE: 'google'
};

// Model Configurations
const MODEL_CONFIGS = {
  transcription: {
    openai: {
      model: 'whisper-1',
      // Removed hardcoded language - let Whisper auto-detect Hebrew/English
      response_format: 'verbose_json',
      temperature: 0.0
    }
  },
  text_generation: {
    openai: {
      model: 'gpt-4-turbo',
      temperature: 0.7,
      max_tokens: 4000,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    }
  },
  summary_generation: {
    openai: {
      model: 'gpt-4-turbo',
      temperature: 0.3,
      max_tokens: 3000,
      top_p: 0.9
    }
  },
  question_generation: {
    openai: {
      model: 'gpt-4-turbo',
      temperature: 0.5,
      max_tokens: 4000,
      top_p: 0.95
    }
  }
};

// Rate Limiting Configuration
const RATE_LIMITS = {
  openai: {
    requests_per_minute: 50,
    tokens_per_minute: 150000, // Increased for GPT-4 Turbo's 128K context window
    requests_per_day: 1000
  }
};

// Cost Tracking (approximate costs in USD)
const COST_ESTIMATES = {
  openai: {
    'whisper-1': {
      per_minute: 0.006 // $0.006 per minute of audio
    },
    'gpt-4-turbo': {
      input_tokens: 0.00001, // $0.01 per 1K tokens
      output_tokens: 0.00003 // $0.03 per 1K tokens
    },
    'gpt-4': {
      input_tokens: 0.00003, // $0.03 per 1K tokens
      output_tokens: 0.00006 // $0.06 per 1K tokens
    },
    'gpt-3.5-turbo': {
      input_tokens: 0.0000015, // $0.0015 per 1K tokens
      output_tokens: 0.000002 // $0.002 per 1K tokens
    }
  }
};

// Service Health Check
const checkServiceHealth = async (provider = AI_PROVIDERS.OPENAI) => {
  try {
    switch (provider) {
      case AI_PROVIDERS.OPENAI:
        if (!openaiClient) {
          return { healthy: false, error: 'OpenAI client not initialized' };
        }
        
        // Simple test request
        const response = await openaiClient.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Test' }],
          max_tokens: 5
        });
        
        return { 
          healthy: true, 
          provider,
          model: 'gpt-3.5-turbo',
          response_time: Date.now()
        };
        
      default:
        return { healthy: false, error: 'Unknown provider' };
    }
  } catch (error) {
    return { 
      healthy: false, 
      provider,
      error: error.message,
      code: error.code
    };
  }
};

// Get available providers
const getAvailableProviders = () => {
  const providers = [];
  
  if (openaiClient) {
    providers.push({
      name: AI_PROVIDERS.OPENAI,
      models: Object.keys(MODEL_CONFIGS).reduce((acc, service) => {
        if (MODEL_CONFIGS[service].openai) {
          acc[service] = MODEL_CONFIGS[service].openai.model;
        }
        return acc;
      }, {}),
      rate_limits: RATE_LIMITS.openai
    });
  }
  
  return providers;
};

// Calculate estimated cost
const calculateEstimatedCost = (provider, model, usage) => {
  try {
    const costs = COST_ESTIMATES[provider];
    if (!costs || !costs[model]) {
      return 0;
    }
    
    const modelCosts = costs[model];
    let totalCost = 0;
    
    if (usage.audio_minutes) {
      totalCost += usage.audio_minutes * modelCosts.per_minute;
    }
    
    if (usage.input_tokens) {
      totalCost += (usage.input_tokens / 1000) * modelCosts.input_tokens;
    }
    
    if (usage.output_tokens) {
      totalCost += (usage.output_tokens / 1000) * modelCosts.output_tokens;
    }
    
    return Math.round(totalCost * 10000) / 10000; // Round to 4 decimal places
  } catch (error) {
    console.error('Error calculating cost:', error);
    return 0;
  }
};

// Failover logic
const getNextAvailableProvider = async (excludeProviders = []) => {
  const available = getAvailableProviders();
  
  for (const provider of available) {
    if (!excludeProviders.includes(provider.name)) {
      const health = await checkServiceHealth(provider.name);
      if (health.healthy) {
        return provider.name;
      }
    }
  }
  
  return null;
};

// Service configuration validation
const validateServiceConfig = () => {
  const issues = [];
  
  if (!process.env.OPENAI_API_KEY) {
    issues.push('OPENAI_API_KEY environment variable is not set');
  }
  
  if (issues.length > 0) {
    console.warn('AI Service Configuration Issues:', issues);
    return { valid: false, issues };
  }
  
  return { valid: true, issues: [] };
};

module.exports = {
  // Clients
  openaiClient,
  
  // Constants
  AI_PROVIDERS,
  MODEL_CONFIGS,
  RATE_LIMITS,
  COST_ESTIMATES,
  
  // Functions
  checkServiceHealth,
  getAvailableProviders,
  calculateEstimatedCost,
  getNextAvailableProvider,
  validateServiceConfig
};
