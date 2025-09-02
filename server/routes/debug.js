const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const apiRateLimiter = require('../utils/APIRateLimiter');

/**
 * Debug and monitoring routes
 * These endpoints provide system status and debugging information
 */

/**
 * Get API rate limiter status
 * Shows current queue status, usage statistics, and health information
 */
router.get('/rate-limiter-status', authenticate, authorize('teacher', 'principal'), (req, res) => {
  try {
    const status = apiRateLimiter.getQueueStatus();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      rateLimiterStatus: status,
      summary: {
        totalQueued: Object.values(status).reduce((sum, provider) => sum + provider.queueLength, 0),
        totalProcessing: Object.values(status).filter(provider => provider.processing).length,
        healthyProviders: Object.values(status).filter(provider => provider.canMakeRequest).length,
        totalProviders: Object.keys(status).length
      }
    });
  } catch (error) {
    console.error('Error getting rate limiter status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get rate limiter status',
      message: error.message
    });
  }
});

/**
 * Clear API rate limiter queues (emergency use only)
 * This will cancel all pending requests - use with caution
 */
router.post('/clear-rate-limiter-queues', authenticate, authorize('principal'), (req, res) => {
  try {
    apiRateLimiter.clearQueues();
    
    res.json({
      success: true,
      message: 'All rate limiter queues cleared',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing rate limiter queues:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear rate limiter queues',
      message: error.message
    });
  }
});

/**
 * Get system health information
 * Provides overall system status including AI services
 */
router.get('/system-health', authenticate, authorize('teacher', 'principal'), async (req, res) => {
  try {
    const { checkServiceHealth, getAvailableProviders } = require('../config/ai-services');
    
    // Check AI service health
    const aiHealth = await checkServiceHealth('openai');
    const availableProviders = getAvailableProviders();
    
    // Get rate limiter status
    const rateLimiterStatus = apiRateLimiter.getQueueStatus();
    
    // Calculate overall health score
    const healthChecks = {
      aiService: aiHealth.healthy,
      rateLimiter: Object.values(rateLimiterStatus).every(provider => provider.canMakeRequest),
      database: true, // Assume healthy if we can respond
      server: true
    };
    
    const healthyChecks = Object.values(healthChecks).filter(Boolean).length;
    const totalChecks = Object.keys(healthChecks).length;
    const healthScore = Math.round((healthyChecks / totalChecks) * 100);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      healthScore,
      status: healthScore >= 75 ? 'healthy' : healthScore >= 50 ? 'degraded' : 'unhealthy',
      checks: healthChecks,
      details: {
        aiService: {
          healthy: aiHealth.healthy,
          provider: aiHealth.provider,
          error: aiHealth.error,
          availableProviders: availableProviders.length
        },
        rateLimiter: {
          providers: Object.keys(rateLimiterStatus).length,
          totalQueued: Object.values(rateLimiterStatus).reduce((sum, p) => sum + p.queueLength, 0),
          canMakeRequests: Object.values(rateLimiterStatus).filter(p => p.canMakeRequest).length
        },
        server: {
          uptime: Math.round(process.uptime()),
          memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
          },
          nodeVersion: process.version,
          environment: process.env.NODE_ENV || 'development'
        }
      }
    });
  } catch (error) {
    console.error('Error getting system health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system health',
      message: error.message,
      healthScore: 0,
      status: 'unhealthy'
    });
  }
});

/**
 * Get recent error logs (last 50 entries)
 * Helps with debugging rate limiting and other issues
 */
router.get('/recent-errors', authenticate, authorize('principal'), (req, res) => {
  try {
    // This is a placeholder - in a real system you'd want to implement proper error logging
    // For now, we'll return a simple response
    res.json({
      success: true,
      message: 'Error logging not yet implemented',
      timestamp: new Date().toISOString(),
      errors: [],
      note: 'Check server console logs for detailed error information'
    });
  } catch (error) {
    console.error('Error getting recent errors:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recent errors',
      message: error.message
    });
  }
});

/**
 * Test rate limiter functionality
 * Makes a test request to verify rate limiting is working
 */
router.post('/test-rate-limiter', authenticate, authorize('principal'), async (req, res) => {
  try {
    const testStart = Date.now();
    
    // Queue a test request
    const testResult = await apiRateLimiter.queueRequest('openai', async () => {
      // Simulate a quick API call
      await new Promise(resolve => setTimeout(resolve, 100));
      return {
        test: true,
        timestamp: new Date().toISOString(),
        usage: { total_tokens: 10 }
      };
    }, {
      maxRetries: 1,
      priority: 'low'
    });
    
    const testDuration = Date.now() - testStart;
    
    res.json({
      success: true,
      message: 'Rate limiter test completed successfully',
      testResult,
      testDuration,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Rate limiter test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Rate limiter test failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
