/**
 * Transcription Service Configuration
 * Allows switching between sequential and parallel transcription processing
 */

const TranscriptionService = require('../services/TranscriptionService');
const ParallelTranscriptionService = require('../services/ParallelTranscriptionService');

/**
 * Transcription configuration options
 */
const TRANSCRIPTION_CONFIG = {
  // Service selection
  USE_PARALLEL_PROCESSING: process.env.USE_PARALLEL_TRANSCRIPTION === 'true' || true, // Default to parallel
  
  // Parallel processing settings
  PARALLEL_SETTINGS: {
    maxConcurrentRequests: parseInt(process.env.TRANSCRIPTION_MAX_CONCURRENT) || 5,
    batchSize: parseInt(process.env.TRANSCRIPTION_BATCH_SIZE) || 3,
    requestDelay: parseInt(process.env.TRANSCRIPTION_REQUEST_DELAY) || 1000,
    segmentDuration: parseInt(process.env.TRANSCRIPTION_SEGMENT_DURATION) || 30,
    overlapDuration: parseInt(process.env.TRANSCRIPTION_OVERLAP_DURATION) || 2
  },

  // Rate limiting settings
  RATE_LIMITING: {
    requestsPerMinute: parseInt(process.env.OPENAI_REQUESTS_PER_MINUTE) || 50,
    tokensPerMinute: parseInt(process.env.OPENAI_TOKENS_PER_MINUTE) || 150000,
    requestsPerDay: parseInt(process.env.OPENAI_REQUESTS_PER_DAY) || 1000,
    maxConcurrentRequests: parseInt(process.env.OPENAI_MAX_CONCURRENT) || 5,
    burstLimit: parseInt(process.env.OPENAI_BURST_LIMIT) || 10
  },

  // Performance monitoring
  MONITORING: {
    enablePerformanceLogging: process.env.ENABLE_PERFORMANCE_LOGGING === 'true' || false,
    logInterval: parseInt(process.env.PERFORMANCE_LOG_INTERVAL) || 30000, // 30 seconds
    enableMetrics: process.env.ENABLE_TRANSCRIPTION_METRICS === 'true' || true
  }
};

/**
 * Get the appropriate transcription service based on configuration
 * @returns {Object} Transcription service instance
 */
function getTranscriptionService() {
  if (TRANSCRIPTION_CONFIG.USE_PARALLEL_PROCESSING) {
    console.log('🚀 Using Parallel Transcription Service');
    
    // Apply configuration to parallel service
    if (ParallelTranscriptionService.maxConcurrentRequests !== undefined) {
      ParallelTranscriptionService.maxConcurrentRequests = TRANSCRIPTION_CONFIG.PARALLEL_SETTINGS.maxConcurrentRequests;
      ParallelTranscriptionService.batchSize = TRANSCRIPTION_CONFIG.PARALLEL_SETTINGS.batchSize;
      ParallelTranscriptionService.requestDelay = TRANSCRIPTION_CONFIG.PARALLEL_SETTINGS.requestDelay;
    }
    
    return ParallelTranscriptionService;
  } else {
    console.log('📝 Using Sequential Transcription Service');
    return TranscriptionService;
  }
}

/**
 * Get transcription configuration
 * @returns {Object} Configuration object
 */
function getTranscriptionConfig() {
  return TRANSCRIPTION_CONFIG;
}

/**
 * Update transcription configuration
 * @param {Object} newConfig - New configuration options
 */
function updateTranscriptionConfig(newConfig) {
  Object.assign(TRANSCRIPTION_CONFIG, newConfig);
  console.log('🔧 Transcription configuration updated:', newConfig);
}

/**
 * Get performance metrics for the current service
 * @returns {Object} Performance metrics
 */
async function getPerformanceMetrics() {
  const service = getTranscriptionService();
  
  if (service === ParallelTranscriptionService) {
    // Get parallel processing metrics
    const parallelAPIRateLimiter = require('../utils/ParallelAPIRateLimiter');
    return {
      serviceType: 'parallel',
      queueStatus: parallelAPIRateLimiter.getQueueStatus(),
      config: TRANSCRIPTION_CONFIG.PARALLEL_SETTINGS
    };
  } else {
    // Get sequential processing metrics
    const apiRateLimiter = require('../utils/APIRateLimiter');
    return {
      serviceType: 'sequential',
      queueStatus: apiRateLimiter.getQueueStatus(),
      config: {}
    };
  }
}

/**
 * Switch transcription service
 * @param {boolean} useParallel - Whether to use parallel processing
 */
function switchTranscriptionService(useParallel) {
  TRANSCRIPTION_CONFIG.USE_PARALLEL_PROCESSING = useParallel;
  console.log(`🔄 Switched to ${useParallel ? 'parallel' : 'sequential'} transcription service`);
}

/**
 * Log configuration status
 */
function logConfigurationStatus() {
  console.log('\n📋 Transcription Service Configuration:');
  console.log('=' .repeat(50));
  console.log(`Service Type:           ${TRANSCRIPTION_CONFIG.USE_PARALLEL_PROCESSING ? 'Parallel' : 'Sequential'}`);
  
  if (TRANSCRIPTION_CONFIG.USE_PARALLEL_PROCESSING) {
    console.log(`Max Concurrent:         ${TRANSCRIPTION_CONFIG.PARALLEL_SETTINGS.maxConcurrentRequests}`);
    console.log(`Batch Size:             ${TRANSCRIPTION_CONFIG.PARALLEL_SETTINGS.batchSize}`);
    console.log(`Request Delay:          ${TRANSCRIPTION_CONFIG.PARALLEL_SETTINGS.requestDelay}ms`);
    console.log(`Segment Duration:       ${TRANSCRIPTION_CONFIG.PARALLEL_SETTINGS.segmentDuration}s`);
    console.log(`Overlap Duration:       ${TRANSCRIPTION_CONFIG.PARALLEL_SETTINGS.overlapDuration}s`);
  }
  
  console.log(`Rate Limit (req/min):   ${TRANSCRIPTION_CONFIG.RATE_LIMITING.requestsPerMinute}`);
  console.log(`Rate Limit (tokens/min): ${TRANSCRIPTION_CONFIG.RATE_LIMITING.tokensPerMinute}`);
  console.log(`Performance Logging:    ${TRANSCRIPTION_CONFIG.MONITORING.enablePerformanceLogging ? 'Enabled' : 'Disabled'}`);
  console.log('=' .repeat(50));
}

/**
 * Validate configuration
 * @returns {Object} Validation result
 */
function validateConfiguration() {
  const issues = [];
  const warnings = [];

  // Check parallel settings
  if (TRANSCRIPTION_CONFIG.USE_PARALLEL_PROCESSING) {
    if (TRANSCRIPTION_CONFIG.PARALLEL_SETTINGS.maxConcurrentRequests > 10) {
      warnings.push('High concurrent request limit may exceed API rate limits');
    }
    
    if (TRANSCRIPTION_CONFIG.PARALLEL_SETTINGS.batchSize > 5) {
      warnings.push('Large batch size may cause memory issues');
    }
    
    if (TRANSCRIPTION_CONFIG.PARALLEL_SETTINGS.requestDelay < 500) {
      warnings.push('Low request delay may trigger rate limiting');
    }
  }

  // Check rate limiting
  if (TRANSCRIPTION_CONFIG.RATE_LIMITING.requestsPerMinute > 60) {
    warnings.push('High requests per minute may exceed OpenAI limits');
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings
  };
}

/**
 * Get recommended configuration based on usage patterns
 * @param {Object} usageStats - Usage statistics
 * @returns {Object} Recommended configuration
 */
function getRecommendedConfiguration(usageStats = {}) {
  const recommendations = {
    USE_PARALLEL_PROCESSING: true,
    PARALLEL_SETTINGS: { ...TRANSCRIPTION_CONFIG.PARALLEL_SETTINGS }
  };

  // Adjust based on average file size
  if (usageStats.averageFileSizeMB > 50) {
    recommendations.PARALLEL_SETTINGS.batchSize = 2; // Smaller batches for large files
    recommendations.PARALLEL_SETTINGS.segmentDuration = 45; // Longer segments
  } else if (usageStats.averageFileSizeMB < 10) {
    recommendations.USE_PARALLEL_PROCESSING = false; // Sequential may be sufficient
  }

  // Adjust based on error rate
  if (usageStats.errorRate > 0.1) {
    recommendations.PARALLEL_SETTINGS.maxConcurrentRequests = 3; // Reduce concurrency
    recommendations.PARALLEL_SETTINGS.requestDelay = 2000; // Increase delay
  }

  // Adjust based on API usage
  if (usageStats.apiUsagePercent > 80) {
    recommendations.PARALLEL_SETTINGS.maxConcurrentRequests = 3;
    recommendations.PARALLEL_SETTINGS.batchSize = 2;
  }

  return recommendations;
}

// Log configuration on startup
if (process.env.NODE_ENV !== 'test') {
  logConfigurationStatus();
  
  const validation = validateConfiguration();
  if (validation.warnings.length > 0) {
    console.log('\n⚠️  Configuration Warnings:');
    validation.warnings.forEach(warning => console.log(`   • ${warning}`));
  }
}

module.exports = {
  getTranscriptionService,
  getTranscriptionConfig,
  updateTranscriptionConfig,
  getPerformanceMetrics,
  switchTranscriptionService,
  logConfigurationStatus,
  validateConfiguration,
  getRecommendedConfiguration,
  TRANSCRIPTION_CONFIG
};
