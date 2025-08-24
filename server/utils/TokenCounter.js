/**
 * Token Counter Utility
 * Provides token counting and context window management for AI services
 */

/**
 * Estimate token count for text (rough approximation)
 * Hebrew text typically uses more tokens per character than English
 * @param {string} text - Text to count tokens for
 * @returns {number} Estimated token count
 */
function estimateTokenCount(text) {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  // Hebrew text approximation: ~0.8 tokens per character on average
  // This is a conservative estimate for GPT-4 tokenization
  const hebrewRegex = /[\u0590-\u05FF]/;
  const hasHebrew = hebrewRegex.test(text);
  
  if (hasHebrew) {
    // Hebrew text: approximately 0.8 tokens per character
    return Math.ceil(text.length * 0.8);
  } else {
    // English text: approximately 0.25 tokens per character (4 chars per token)
    return Math.ceil(text.length / 4);
  }
}

/**
 * Check if content fits within context window
 * @param {string} prompt - System prompt
 * @param {string} content - Main content
 * @param {number} maxOutputTokens - Maximum tokens for output
 * @param {number} contextWindow - Total context window size (default: 128K for GPT-4 Turbo)
 * @returns {Object} Fit analysis
 */
function checkContextWindowFit(prompt, content, maxOutputTokens = 4000, contextWindow = 128000) {
  const promptTokens = estimateTokenCount(prompt);
  const contentTokens = estimateTokenCount(content);
  const totalInputTokens = promptTokens + contentTokens;
  const totalRequiredTokens = totalInputTokens + maxOutputTokens;

  return {
    promptTokens,
    contentTokens,
    totalInputTokens,
    maxOutputTokens,
    totalRequiredTokens,
    contextWindow,
    fits: totalRequiredTokens <= contextWindow,
    remainingTokens: contextWindow - totalRequiredTokens,
    utilizationPercent: Math.round((totalRequiredTokens / contextWindow) * 100)
  };
}

/**
 * Split content into chunks that fit within context window
 * @param {string} content - Content to split
 * @param {string} prompt - System prompt
 * @param {number} maxOutputTokens - Maximum tokens for output
 * @param {number} contextWindow - Total context window size
 * @param {number} overlapTokens - Overlap between chunks for continuity
 * @returns {Array} Array of content chunks
 */
function splitContentForContext(content, prompt, maxOutputTokens = 4000, contextWindow = 128000, overlapTokens = 500) {
  const promptTokens = estimateTokenCount(prompt);
  const availableContentTokens = contextWindow - promptTokens - maxOutputTokens - 1000; // 1000 token safety buffer
  
  if (availableContentTokens <= 0) {
    throw new Error('Prompt is too long for context window');
  }

  const contentTokens = estimateTokenCount(content);
  
  if (contentTokens <= availableContentTokens) {
    // Content fits in single chunk
    return [content];
  }

  // Split content into chunks
  const chunks = [];
  const sentences = content.split(/[.!?]\s+/);
  let currentChunk = '';
  let currentTokens = 0;
  
  for (const sentence of sentences) {
    const sentenceTokens = estimateTokenCount(sentence);
    
    if (currentTokens + sentenceTokens > availableContentTokens - overlapTokens) {
      // Current chunk is full, start new chunk
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      
      // Start new chunk with overlap from previous chunk if possible
      if (chunks.length > 0 && overlapTokens > 0) {
        const lastSentences = currentChunk.split(/[.!?]\s+/).slice(-2);
        const overlapText = lastSentences.join('. ');
        const overlapActualTokens = estimateTokenCount(overlapText);
        
        if (overlapActualTokens <= overlapTokens) {
          currentChunk = overlapText + '. ' + sentence;
          currentTokens = overlapActualTokens + sentenceTokens;
        } else {
          currentChunk = sentence;
          currentTokens = sentenceTokens;
        }
      } else {
        currentChunk = sentence;
        currentTokens = sentenceTokens;
      }
    } else {
      // Add sentence to current chunk
      if (currentChunk) {
        currentChunk += '. ' + sentence;
      } else {
        currentChunk = sentence;
      }
      currentTokens += sentenceTokens;
    }
  }
  
  // Add final chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Optimize max_tokens based on available context window
 * @param {string} prompt - System prompt
 * @param {string} content - Main content
 * @param {number} preferredMaxTokens - Preferred max tokens
 * @param {number} contextWindow - Total context window size
 * @returns {number} Optimized max_tokens value
 */
function optimizeMaxTokens(prompt, content, preferredMaxTokens, contextWindow = 128000) {
  const analysis = checkContextWindowFit(prompt, content, preferredMaxTokens, contextWindow);
  
  if (analysis.fits) {
    return preferredMaxTokens;
  }
  
  // Calculate maximum possible output tokens
  const safetyBuffer = 1000;
  const maxPossibleTokens = contextWindow - analysis.totalInputTokens - safetyBuffer;
  
  return Math.max(500, Math.min(preferredMaxTokens, maxPossibleTokens));
}

/**
 * Get context window size for model
 * @param {string} model - Model name
 * @returns {number} Context window size in tokens
 */
function getContextWindowSize(model) {
  const contextWindows = {
    'gpt-4-turbo': 128000,
    'gpt-4-turbo-preview': 128000,
    'gpt-4-0125-preview': 128000,
    'gpt-4-1106-preview': 128000,
    'gpt-4o': 128000,
    'gpt-4o-mini': 128000,
    'gpt-4': 8192,
    'gpt-3.5-turbo': 16385,
    'gpt-3.5-turbo-16k': 16385
  };
  
  return contextWindows[model] || 8192; // Default to conservative estimate
}

/**
 * Validate content for AI processing
 * @param {string} prompt - System prompt
 * @param {string} content - Main content
 * @param {string} model - AI model name
 * @param {number} maxOutputTokens - Maximum output tokens
 * @returns {Object} Validation result
 */
function validateContentForProcessing(prompt, content, model, maxOutputTokens) {
  const contextWindow = getContextWindowSize(model);
  const analysis = checkContextWindowFit(prompt, content, maxOutputTokens, contextWindow);
  
  return {
    valid: analysis.fits,
    analysis,
    recommendations: analysis.fits ? [] : [
      'Consider using content chunking',
      'Reduce prompt length',
      'Decrease max_tokens parameter',
      `Content is ${analysis.utilizationPercent}% of context window`
    ]
  };
}

module.exports = {
  estimateTokenCount,
  checkContextWindowFit,
  splitContentForContext,
  optimizeMaxTokens,
  getContextWindowSize,
  validateContentForProcessing
};
