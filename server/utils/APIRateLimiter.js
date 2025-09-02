const { openaiClient } = require('../config/ai-services');

/**
 * Global API Rate Limiter for OpenAI and other external services
 * Implements queue-based request management with proper rate limiting
 */
class APIRateLimiter {
  constructor() {
    // OpenAI rate limits (conservative estimates)
    this.limits = {
      openai: {
        requestsPerMinute: 40, // Reduced from 50 for safety margin
        tokensPerMinute: 120000, // Reduced from 150000 for safety margin
        requestsPerDay: 800 // Conservative daily limit
      }
    };

    // Current usage tracking
    this.usage = {
      openai: {
        requests: [],
        tokens: [],
        dailyRequests: 0,
        lastDayReset: new Date().toDateString()
      }
    };

    // Request queues
    this.queues = {
      openai: []
    };

    // Processing state
    this.processing = {
      openai: false
    };

    // Start queue processors
    this.startQueueProcessor('openai');
  }

  /**
   * Add request to queue
   * @param {string} provider - API provider (openai)
   * @param {Function} requestFunction - Function that makes the API call
   * @param {Object} options - Request options
   * @returns {Promise} Promise that resolves with API response
   */
  async queueRequest(provider, requestFunction, options = {}) {
    return new Promise((resolve, reject) => {
      const request = {
        id: `${provider}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        provider,
        requestFunction,
        options,
        resolve,
        reject,
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: options.maxRetries || 3
      };

      this.queues[provider].push(request);
      console.log(`Queued ${provider} request ${request.id}. Queue length: ${this.queues[provider].length}`);
    });
  }

  /**
   * Start processing queue for a provider
   * @param {string} provider - API provider
   */
  startQueueProcessor(provider) {
    const processNext = async () => {
      if (this.processing[provider] || this.queues[provider].length === 0) {
        setTimeout(processNext, 1000); // Check again in 1 second
        return;
      }

      // Check if we can make a request
      if (!this.canMakeRequest(provider)) {
        const waitTime = this.getWaitTime(provider);
        console.log(`Rate limit reached for ${provider}. Waiting ${Math.round(waitTime/1000)}s`);
        setTimeout(processNext, waitTime);
        return;
      }

      this.processing[provider] = true;
      const request = this.queues[provider].shift();

      try {
        console.log(`Processing ${provider} request ${request.id}`);
        
        // Execute the request
        const startTime = Date.now();
        const result = await request.requestFunction();
        const duration = Date.now() - startTime;

        // Track usage
        this.trackRequest(provider, result.usage || {});

        console.log(`Completed ${provider} request ${request.id} in ${duration}ms`);
        request.resolve(result);

      } catch (error) {
        console.error(`Error processing ${provider} request ${request.id}:`, error.message);

        // Handle rate limit errors specifically
        if (this.isRateLimitError(error)) {
          console.log(`Rate limit error for ${provider} request ${request.id}`);
          
          // Add exponential backoff delay
          const backoffDelay = Math.min(60000, 1000 * Math.pow(2, request.retryCount)); // Max 1 minute
          
          if (request.retryCount < request.maxRetries) {
            request.retryCount++;
            console.log(`Retrying ${provider} request ${request.id} in ${backoffDelay}ms (attempt ${request.retryCount}/${request.maxRetries})`);
            
            setTimeout(() => {
              this.queues[provider].unshift(request); // Add back to front of queue
            }, backoffDelay);
          } else {
            console.error(`Max retries exceeded for ${provider} request ${request.id}`);
            request.reject(new Error(`Rate limit exceeded after ${request.maxRetries} retries. Please try again later.`));
          }
        } else {
          // Non-rate-limit error - retry with shorter delay
          if (request.retryCount < request.maxRetries) {
            request.retryCount++;
            const retryDelay = 2000 * request.retryCount; // 2s, 4s, 6s
            console.log(`Retrying ${provider} request ${request.id} in ${retryDelay}ms due to error: ${error.message}`);
            
            setTimeout(() => {
              this.queues[provider].unshift(request);
            }, retryDelay);
          } else {
            request.reject(error);
          }
        }
      } finally {
        this.processing[provider] = false;
        
        // Add delay between requests to avoid hitting rate limits
        const delayBetweenRequests = this.getDelayBetweenRequests(provider);
        setTimeout(processNext, delayBetweenRequests);
      }
    };

    processNext();
  }

  /**
   * Check if we can make a request without hitting rate limits
   * @param {string} provider - API provider
   * @returns {boolean} Whether request can be made
   */
  canMakeRequest(provider) {
    const now = Date.now();
    const usage = this.usage[provider];
    const limits = this.limits[provider];

    // Clean old entries (older than 1 minute)
    usage.requests = usage.requests.filter(timestamp => now - timestamp < 60000);
    usage.tokens = usage.tokens.filter(entry => now - entry.timestamp < 60000);

    // Reset daily counter if needed
    const today = new Date().toDateString();
    if (usage.lastDayReset !== today) {
      usage.dailyRequests = 0;
      usage.lastDayReset = today;
    }

    // Check limits
    const requestsInLastMinute = usage.requests.length;
    const tokensInLastMinute = usage.tokens.reduce((sum, entry) => sum + entry.count, 0);

    return (
      requestsInLastMinute < limits.requestsPerMinute &&
      tokensInLastMinute < limits.tokensPerMinute &&
      usage.dailyRequests < limits.requestsPerDay
    );
  }

  /**
   * Get wait time until next request can be made
   * @param {string} provider - API provider
   * @returns {number} Wait time in milliseconds
   */
  getWaitTime(provider) {
    const now = Date.now();
    const usage = this.usage[provider];
    const limits = this.limits[provider];

    // Find oldest request in the last minute
    const oldestRequest = Math.min(...usage.requests);
    const oldestToken = usage.tokens.length > 0 ? Math.min(...usage.tokens.map(e => e.timestamp)) : now;
    
    const oldestActivity = Math.min(oldestRequest, oldestToken);
    const waitTime = Math.max(0, 60000 - (now - oldestActivity)) + 1000; // Add 1s buffer

    return waitTime;
  }

  /**
   * Get delay between requests to maintain steady rate
   * @param {string} provider - API provider
   * @returns {number} Delay in milliseconds
   */
  getDelayBetweenRequests(provider) {
    const limits = this.limits[provider];
    // Spread requests evenly across the minute
    const baseDelay = Math.ceil(60000 / limits.requestsPerMinute);
    
    // Add some randomization to avoid thundering herd
    const randomFactor = 0.5 + Math.random(); // 0.5 to 1.5
    
    return Math.ceil(baseDelay * randomFactor);
  }

  /**
   * Track API request usage
   * @param {string} provider - API provider
   * @param {Object} usage - Usage statistics from API response
   */
  trackRequest(provider, usage = {}) {
    const now = Date.now();
    const providerUsage = this.usage[provider];

    // Track request
    providerUsage.requests.push(now);
    providerUsage.dailyRequests++;

    // Track tokens if provided
    if (usage.total_tokens || usage.prompt_tokens || usage.completion_tokens) {
      const totalTokens = usage.total_tokens || 
        (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
      
      providerUsage.tokens.push({
        timestamp: now,
        count: totalTokens
      });
    }

    // Log current usage
    const requestsInLastMinute = providerUsage.requests.filter(t => now - t < 60000).length;
    const tokensInLastMinute = providerUsage.tokens
      .filter(e => now - e.timestamp < 60000)
      .reduce((sum, e) => sum + e.count, 0);

    console.log(`${provider} usage: ${requestsInLastMinute}/${this.limits[provider].requestsPerMinute} requests/min, ${tokensInLastMinute}/${this.limits[provider].tokensPerMinute} tokens/min, ${providerUsage.dailyRequests}/${this.limits[provider].requestsPerDay} requests/day`);
  }

  /**
   * Check if error is a rate limit error
   * @param {Error} error - Error object
   * @returns {boolean} Whether error is rate limit related
   */
  isRateLimitError(error) {
    return (
      error.status === 429 ||
      error.code === 'rate_limit_exceeded' ||
      error.message.toLowerCase().includes('rate limit') ||
      error.message.toLowerCase().includes('too many requests') ||
      error.message.toLowerCase().includes('quota exceeded')
    );
  }

  /**
   * Get current queue status
   * @returns {Object} Queue status for all providers
   */
  getQueueStatus() {
    const status = {};
    
    for (const provider in this.queues) {
      const usage = this.usage[provider];
      const now = Date.now();
      
      const requestsInLastMinute = usage.requests.filter(t => now - t < 60000).length;
      const tokensInLastMinute = usage.tokens
        .filter(e => now - e.timestamp < 60000)
        .reduce((sum, e) => sum + e.count, 0);

      status[provider] = {
        queueLength: this.queues[provider].length,
        processing: this.processing[provider],
        usage: {
          requestsPerMinute: `${requestsInLastMinute}/${this.limits[provider].requestsPerMinute}`,
          tokensPerMinute: `${tokensInLastMinute}/${this.limits[provider].tokensPerMinute}`,
          dailyRequests: `${usage.dailyRequests}/${this.limits[provider].requestsPerDay}`
        },
        canMakeRequest: this.canMakeRequest(provider),
        waitTime: this.canMakeRequest(provider) ? 0 : this.getWaitTime(provider)
      };
    }

    return status;
  }

  /**
   * Clear all queues (for testing or emergency)
   */
  clearQueues() {
    for (const provider in this.queues) {
      const queue = this.queues[provider];
      queue.forEach(request => {
        request.reject(new Error('Queue cleared'));
      });
      this.queues[provider] = [];
    }
    console.log('All API queues cleared');
  }
}

// Create singleton instance
const apiRateLimiter = new APIRateLimiter();

module.exports = apiRateLimiter;
