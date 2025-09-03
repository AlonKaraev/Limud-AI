const { openaiClient } = require('../config/ai-services');

/**
 * Enhanced Parallel API Rate Limiter for OpenAI and other external services
 * Optimized for parallel processing with intelligent batching and dynamic rate adjustment
 */
class ParallelAPIRateLimiter {
  constructor() {
    // OpenAI rate limits (optimized for parallel processing)
    this.limits = {
      openai: {
        requestsPerMinute: 50, // Increased for parallel processing
        tokensPerMinute: 150000,
        requestsPerDay: 1000,
        maxConcurrentRequests: 5, // Maximum parallel requests
        burstLimit: 10 // Allow short bursts
      }
    };

    // Current usage tracking
    this.usage = {
      openai: {
        requests: [],
        tokens: [],
        dailyRequests: 0,
        lastDayReset: new Date().toDateString(),
        activeRequests: 0, // Track concurrent requests
        burstRequests: [] // Track burst requests
      }
    };

    // Request queues with priority support
    this.queues = {
      openai: {
        high: [], // High priority (single files)
        normal: [], // Normal priority (segments)
        low: [] // Low priority (background tasks)
      }
    };

    // Processing state
    this.processing = {
      openai: {
        active: false,
        workers: 0,
        maxWorkers: 3 // Multiple workers for parallel processing
      }
    };

    // Performance metrics
    this.metrics = {
      openai: {
        averageResponseTime: 0,
        successRate: 1.0,
        lastAdjustment: Date.now(),
        adaptiveDelay: 1000
      }
    };

    // Start queue processors
    this.startParallelQueueProcessor('openai');
  }

  /**
   * Add request to queue with priority support
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
        maxRetries: options.maxRetries || 3,
        priority: options.priority || 'normal',
        estimatedTokens: options.estimatedTokens || 0
      };

      // Add to appropriate priority queue
      const priority = request.priority;
      if (!this.queues[provider][priority]) {
        this.queues[provider]['normal'].push(request);
      } else {
        this.queues[provider][priority].push(request);
      }

      console.log(`Queued ${provider} request ${request.id} (${priority} priority). Queue lengths: high=${this.queues[provider].high.length}, normal=${this.queues[provider].normal.length}, low=${this.queues[provider].low.length}`);
    });
  }

  /**
   * Start parallel processing queue for a provider
   * @param {string} provider - API provider
   */
  startParallelQueueProcessor(provider) {
    const maxWorkers = this.processing[provider].maxWorkers;
    
    // Start multiple workers for parallel processing
    for (let workerId = 0; workerId < maxWorkers; workerId++) {
      this.startWorker(provider, workerId);
    }

    // Start metrics updater
    this.startMetricsUpdater(provider);
  }

  /**
   * Start a single worker for processing requests
   * @param {string} provider - API provider
   * @param {number} workerId - Worker ID
   */
  startWorker(provider, workerId) {
    const processNext = async () => {
      try {
        // Check if we can make a request
        if (!this.canMakeRequest(provider)) {
          const waitTime = this.getWaitTime(provider);
          setTimeout(processNext, waitTime);
          return;
        }

        // Get next request from priority queues
        const request = this.getNextRequest(provider);
        if (!request) {
          setTimeout(processNext, 500); // Check again in 500ms
          return;
        }

        // Track active request
        this.usage[provider].activeRequests++;
        this.processing[provider].workers++;

        try {
          console.log(`Worker ${workerId} processing ${provider} request ${request.id}`);
          
          // Execute the request with timing
          const startTime = Date.now();
          const result = await request.requestFunction();
          const duration = Date.now() - startTime;

          // Track usage and performance
          this.trackRequest(provider, result.usage || {}, duration, true);

          console.log(`Worker ${workerId} completed ${provider} request ${request.id} in ${duration}ms`);
          request.resolve(result);

        } catch (error) {
          console.error(`Worker ${workerId} error processing ${provider} request ${request.id}:`, error.message);
          
          // Track failed request
          this.trackRequest(provider, {}, 0, false);

          // Handle rate limit errors and retries
          if (this.isRateLimitError(error)) {
            await this.handleRateLimitError(provider, request, error);
          } else {
            await this.handleGeneralError(provider, request, error);
          }
        } finally {
          // Update counters
          this.usage[provider].activeRequests--;
          this.processing[provider].workers--;
          
          // Add adaptive delay based on performance
          const delay = this.getAdaptiveDelay(provider);
          setTimeout(processNext, delay);
        }

      } catch (workerError) {
        console.error(`Worker ${workerId} critical error:`, workerError);
        setTimeout(processNext, 5000); // Restart worker after 5 seconds
      }
    };

    processNext();
  }

  /**
   * Get next request from priority queues
   * @param {string} provider - API provider
   * @returns {Object|null} Next request or null
   */
  getNextRequest(provider) {
    const queues = this.queues[provider];
    
    // Check high priority first
    if (queues.high.length > 0) {
      return queues.high.shift();
    }
    
    // Then normal priority
    if (queues.normal.length > 0) {
      return queues.normal.shift();
    }
    
    // Finally low priority
    if (queues.low.length > 0) {
      return queues.low.shift();
    }
    
    return null;
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
    usage.burstRequests = usage.burstRequests.filter(timestamp => now - timestamp < 10000); // 10 second burst window

    // Reset daily counter if needed
    const today = new Date().toDateString();
    if (usage.lastDayReset !== today) {
      usage.dailyRequests = 0;
      usage.lastDayReset = today;
    }

    // Check concurrent request limit
    if (usage.activeRequests >= limits.maxConcurrentRequests) {
      return false;
    }

    // Check burst limit (short-term)
    if (usage.burstRequests.length >= limits.burstLimit) {
      return false;
    }

    // Check standard limits
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

    // If we're at concurrent limit, wait for active requests to complete
    if (usage.activeRequests >= limits.maxConcurrentRequests) {
      return 1000; // Check again in 1 second
    }

    // If we're at burst limit, wait for burst window to clear
    if (usage.burstRequests.length >= limits.burstLimit) {
      const oldestBurst = Math.min(...usage.burstRequests);
      return Math.max(0, 10000 - (now - oldestBurst)) + 100;
    }

    // Calculate wait time based on rate limits
    const oldestRequest = usage.requests.length > 0 ? Math.min(...usage.requests) : now;
    const oldestToken = usage.tokens.length > 0 ? Math.min(...usage.tokens.map(e => e.timestamp)) : now;
    
    const oldestActivity = Math.min(oldestRequest, oldestToken);
    const waitTime = Math.max(0, 60000 - (now - oldestActivity)) + 500; // Add 500ms buffer

    return waitTime;
  }

  /**
   * Get adaptive delay based on performance metrics
   * @param {string} provider - API provider
   * @returns {number} Delay in milliseconds
   */
  getAdaptiveDelay(provider) {
    const metrics = this.metrics[provider];
    const usage = this.usage[provider];
    
    // Base delay
    let delay = metrics.adaptiveDelay;
    
    // Adjust based on success rate
    if (metrics.successRate < 0.9) {
      delay *= 1.5; // Increase delay if success rate is low
    } else if (metrics.successRate > 0.95) {
      delay *= 0.8; // Decrease delay if success rate is high
    }
    
    // Adjust based on active requests
    const concurrencyFactor = usage.activeRequests / this.limits[provider].maxConcurrentRequests;
    delay *= (1 + concurrencyFactor * 0.5);
    
    // Ensure reasonable bounds
    delay = Math.max(200, Math.min(5000, delay));
    
    return Math.round(delay);
  }

  /**
   * Track API request usage and performance
   * @param {string} provider - API provider
   * @param {Object} usage - Usage statistics from API response
   * @param {number} duration - Request duration in milliseconds
   * @param {boolean} success - Whether request was successful
   */
  trackRequest(provider, usage = {}, duration = 0, success = true) {
    const now = Date.now();
    const providerUsage = this.usage[provider];
    const metrics = this.metrics[provider];

    // Track request
    providerUsage.requests.push(now);
    providerUsage.burstRequests.push(now);
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

    // Update performance metrics
    if (duration > 0) {
      metrics.averageResponseTime = (metrics.averageResponseTime * 0.9) + (duration * 0.1);
    }
    
    // Update success rate (exponential moving average)
    metrics.successRate = (metrics.successRate * 0.95) + (success ? 0.05 : 0);

    // Adjust adaptive delay periodically
    if (now - metrics.lastAdjustment > 30000) { // Every 30 seconds
      this.adjustAdaptiveDelay(provider);
      metrics.lastAdjustment = now;
    }

    // Log current usage
    const requestsInLastMinute = providerUsage.requests.filter(t => now - t < 60000).length;
    const tokensInLastMinute = providerUsage.tokens
      .filter(e => now - e.timestamp < 60000)
      .reduce((sum, e) => sum + e.count, 0);

    console.log(`${provider} usage: ${requestsInLastMinute}/${this.limits[provider].requestsPerMinute} req/min, ${tokensInLastMinute}/${this.limits[provider].tokensPerMinute} tokens/min, ${providerUsage.activeRequests}/${this.limits[provider].maxConcurrentRequests} concurrent, ${Math.round(metrics.successRate * 100)}% success`);
  }

  /**
   * Adjust adaptive delay based on performance
   * @param {string} provider - API provider
   */
  adjustAdaptiveDelay(provider) {
    const metrics = this.metrics[provider];
    const usage = this.usage[provider];
    
    // If success rate is high and response time is good, decrease delay
    if (metrics.successRate > 0.95 && metrics.averageResponseTime < 5000) {
      metrics.adaptiveDelay = Math.max(200, metrics.adaptiveDelay * 0.9);
    }
    // If success rate is low or response time is poor, increase delay
    else if (metrics.successRate < 0.9 || metrics.averageResponseTime > 10000) {
      metrics.adaptiveDelay = Math.min(5000, metrics.adaptiveDelay * 1.2);
    }
    
    console.log(`Adjusted ${provider} adaptive delay to ${Math.round(metrics.adaptiveDelay)}ms (success: ${Math.round(metrics.successRate * 100)}%, avg response: ${Math.round(metrics.averageResponseTime)}ms)`);
  }

  /**
   * Handle rate limit errors with intelligent backoff
   * @param {string} provider - API provider
   * @param {Object} request - Request object
   * @param {Error} error - Rate limit error
   */
  async handleRateLimitError(provider, request, error) {
    console.log(`Rate limit error for ${provider} request ${request.id}`);
    
    // Increase adaptive delay
    this.metrics[provider].adaptiveDelay = Math.min(10000, this.metrics[provider].adaptiveDelay * 2);
    
    // Calculate exponential backoff with jitter
    const backoffDelay = Math.min(60000, 2000 * Math.pow(2, request.retryCount)) + Math.random() * 1000;
    
    if (request.retryCount < request.maxRetries) {
      request.retryCount++;
      console.log(`Retrying ${provider} request ${request.id} in ${Math.round(backoffDelay)}ms (attempt ${request.retryCount}/${request.maxRetries})`);
      
      setTimeout(() => {
        // Add back to high priority queue for rate limit retries
        this.queues[provider].high.unshift(request);
      }, backoffDelay);
    } else {
      console.error(`Max retries exceeded for ${provider} request ${request.id}`);
      request.reject(new Error(`Rate limit exceeded after ${request.maxRetries} retries. Please try again later.`));
    }
  }

  /**
   * Handle general errors with retry logic
   * @param {string} provider - API provider
   * @param {Object} request - Request object
   * @param {Error} error - Error object
   */
  async handleGeneralError(provider, request, error) {
    const isRetryable = this.isRetryableError(error);
    
    if (request.retryCount < request.maxRetries && isRetryable) {
      request.retryCount++;
      const retryDelay = 1000 * request.retryCount + Math.random() * 1000; // Linear backoff with jitter
      console.log(`Retrying ${provider} request ${request.id} in ${Math.round(retryDelay)}ms due to error: ${error.message}`);
      
      setTimeout(() => {
        // Add back to normal priority queue
        this.queues[provider].normal.unshift(request);
      }, retryDelay);
    } else {
      request.reject(error);
    }
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
   * Check if an error is retryable
   * @param {Error} error - The error to check
   * @returns {boolean} Whether the error is retryable
   */
  isRetryableError(error) {
    // Rate limiting (429)
    if (this.isRateLimitError(error)) {
      return true;
    }
    
    // Server errors (5xx)
    if (error.status >= 500) {
      return true;
    }
    
    // Timeout errors
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return true;
    }
    
    // Network errors
    if (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return true;
    }
    
    // OpenAI specific retryable errors
    if (error.message.includes('overloaded') || error.message.includes('temporarily unavailable')) {
      return true;
    }
    
    return false;
  }

  /**
   * Start metrics updater for performance monitoring
   * @param {string} provider - API provider
   */
  startMetricsUpdater(provider) {
    setInterval(() => {
      const usage = this.usage[provider];
      const metrics = this.metrics[provider];
      const queues = this.queues[provider];
      
      const totalQueueLength = queues.high.length + queues.normal.length + queues.low.length;
      
      if (totalQueueLength > 0 || usage.activeRequests > 0) {
        console.log(`${provider} metrics: Queue=${totalQueueLength}, Active=${usage.activeRequests}, Success=${Math.round(metrics.successRate * 100)}%, AvgTime=${Math.round(metrics.averageResponseTime)}ms, Delay=${Math.round(metrics.adaptiveDelay)}ms`);
      }
    }, 30000); // Log every 30 seconds
  }

  /**
   * Get current queue status with detailed metrics
   * @returns {Object} Queue status for all providers
   */
  getQueueStatus() {
    const status = {};
    
    for (const provider in this.queues) {
      const usage = this.usage[provider];
      const metrics = this.metrics[provider];
      const queues = this.queues[provider];
      const now = Date.now();
      
      const requestsInLastMinute = usage.requests.filter(t => now - t < 60000).length;
      const tokensInLastMinute = usage.tokens
        .filter(e => now - e.timestamp < 60000)
        .reduce((sum, e) => sum + e.count, 0);

      status[provider] = {
        queues: {
          high: queues.high.length,
          normal: queues.normal.length,
          low: queues.low.length,
          total: queues.high.length + queues.normal.length + queues.low.length
        },
        processing: {
          activeRequests: usage.activeRequests,
          maxConcurrent: this.limits[provider].maxConcurrentRequests,
          workers: this.processing[provider].workers
        },
        usage: {
          requestsPerMinute: `${requestsInLastMinute}/${this.limits[provider].requestsPerMinute}`,
          tokensPerMinute: `${tokensInLastMinute}/${this.limits[provider].tokensPerMinute}`,
          dailyRequests: `${usage.dailyRequests}/${this.limits[provider].requestsPerDay}`
        },
        performance: {
          successRate: `${Math.round(metrics.successRate * 100)}%`,
          averageResponseTime: `${Math.round(metrics.averageResponseTime)}ms`,
          adaptiveDelay: `${Math.round(metrics.adaptiveDelay)}ms`
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
      const queues = this.queues[provider];
      for (const priority in queues) {
        queues[priority].forEach(request => {
          request.reject(new Error('Queue cleared'));
        });
        queues[priority] = [];
      }
    }
    console.log('All API queues cleared');
  }

  /**
   * Adjust rate limits dynamically (for testing or optimization)
   * @param {string} provider - API provider
   * @param {Object} newLimits - New rate limits
   */
  adjustRateLimits(provider, newLimits) {
    this.limits[provider] = { ...this.limits[provider], ...newLimits };
    console.log(`Updated ${provider} rate limits:`, this.limits[provider]);
  }
}

// Create singleton instance
const parallelAPIRateLimiter = new ParallelAPIRateLimiter();

module.exports = parallelAPIRateLimiter;
