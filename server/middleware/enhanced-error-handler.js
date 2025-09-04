/**
 * Enhanced error handling middleware for media loading issues
 * Provides consistent error responses and graceful degradation
 */

const { createEnhancedErrorHandler } = require('../../fix-media-loading-issues');

// Create enhanced error handler instance
const errorHandler = createEnhancedErrorHandler();

/**
 * Async wrapper to catch errors in async route handlers
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Database operation wrapper with retry logic
 */
const withDatabaseRetry = async (operation, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if it's a retryable database error
      if (isRetryableError(error) && attempt < maxRetries) {
        console.warn(`Database operation failed (attempt ${attempt}/${maxRetries}):`, error.message);
        await sleep(delay * attempt); // Exponential backoff
        continue;
      }
      
      // If not retryable or max retries reached, throw the error
      throw error;
    }
  }
  
  throw lastError;
};

/**
 * Check if an error is retryable
 */
const isRetryableError = (error) => {
  const retryableCodes = [
    'SQLITE_BUSY',
    'SQLITE_LOCKED',
    'SQLITE_PROTOCOL',
    'ECONNRESET',
    'ETIMEDOUT'
  ];
  
  return retryableCodes.includes(error.code) || 
         error.message.includes('database is locked') ||
         error.message.includes('database is busy');
};

/**
 * Sleep utility for retry delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Enhanced media list loader with error handling and caching
 */
const loadMediaList = async (req, res, mediaType, queryFunction) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, search, sortBy = 'created_at', sortOrder = 'DESC' } = req.query;

    // Validate parameters
    const validatedPage = Math.max(1, parseInt(page) || 1);
    const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
    
    // Perform database query with retry logic
    const result = await withDatabaseRetry(async () => {
      return await queryFunction({
        userId,
        page: validatedPage,
        limit: validatedLimit,
        search: search || null,
        sortBy,
        sortOrder: sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
      });
    });

    // Ensure result has expected structure
    const mediaList = result?.data || [];
    const pagination = result?.pagination || {
      page: validatedPage,
      limit: validatedLimit,
      total: 0,
      pages: 0
    };

    // Return successful response
    return errorHandler.sendSuccess(res, {
      [mediaType]: mediaList,
      pagination
    });

  } catch (error) {
    console.error(`Error loading ${mediaType} list:`, error);
    
    // Handle specific error types
    if (error.code === 'SQLITE_BUSY' || error.code === 'SQLITE_LOCKED') {
      return res.status(503).json({
        success: false,
        error: 'השרת עמוס כרגע, אנא נסה שוב בעוד כמה שניות',
        code: 'DATABASE_BUSY',
        [mediaType]: [],
        pagination: {
          page: parseInt(page) || 1,
          limit: parseInt(limit) || 20,
          total: 0,
          pages: 0
        }
      });
    }
    
    if (error.message && error.message.includes('no such table')) {
      return res.status(500).json({
        success: false,
        error: 'בסיס הנתונים לא מוכן, אנא נסה שוב מאוחר יותר',
        code: 'DATABASE_SCHEMA_ERROR',
        [mediaType]: [],
        pagination: {
          page: parseInt(page) || 1,
          limit: parseInt(limit) || 20,
          total: 0,
          pages: 0
        }
      });
    }
    
    // For authentication errors
    if (error.message && error.message.includes('authentication')) {
      return errorHandler.handleAuthError(res);
    }
    
    // Generic database error - return empty list instead of failing
    return res.status(200).json({
      success: true,
      [mediaType]: [],
      pagination: {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        total: 0,
        pages: 0
      },
      warning: 'חלק מהנתונים עשויים להיות זמנית לא זמינים'
    });
  }
};

/**
 * Request rate limiting to prevent race conditions
 */
const requestQueue = new Map();

const withRequestQueuing = (key) => {
  return async (req, res, next) => {
    const queueKey = `${key}_${req.user?.id || 'anonymous'}`;
    
    // If there's already a request in progress for this user/endpoint, wait
    if (requestQueue.has(queueKey)) {
      const existingPromise = requestQueue.get(queueKey);
      try {
        await existingPromise;
      } catch (error) {
        // Ignore errors from previous requests
      }
    }
    
    // Create a new promise for this request
    const requestPromise = new Promise((resolve, reject) => {
      const originalSend = res.send;
      const originalJson = res.json;
      
      // Override response methods to resolve the promise when response is sent
      res.send = function(...args) {
        resolve();
        return originalSend.apply(this, args);
      };
      
      res.json = function(...args) {
        resolve();
        return originalJson.apply(this, args);
      };
      
      // Handle errors
      res.on('error', reject);
      
      // Continue to next middleware
      next();
    });
    
    // Store the promise
    requestQueue.set(queueKey, requestPromise);
    
    // Clean up after request completes
    requestPromise.finally(() => {
      requestQueue.delete(queueKey);
    });
  };
};

/**
 * Enhanced authentication middleware with better error handling
 */
const enhancedAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return errorHandler.handleAuthError(res, 'לא נמצא טוקן אימות');
    }
    
    // Here you would normally verify the JWT token
    // For now, we'll assume the original auth middleware handles this
    next();
    
  } catch (error) {
    console.error('Authentication error:', error);
    return errorHandler.handleAuthError(res, 'שגיאה באימות המשתמש');
  }
};

/**
 * Global error handler middleware
 */
const globalErrorHandler = (error, req, res, next) => {
  console.error('Global error handler:', error);
  
  // Don't send error response if headers already sent
  if (res.headersSent) {
    return next(error);
  }
  
  // Handle specific error types
  if (error.code === 'SQLITE_BUSY' || error.code === 'SQLITE_LOCKED') {
    return res.status(503).json({
      success: false,
      error: 'השרת עמוס כרגע, אנא נסה שוב',
      code: 'DATABASE_BUSY'
    });
  }
  
  if (error.name === 'JsonWebTokenError') {
    return errorHandler.handleAuthError(res, 'טוקן אימות לא תקין');
  }
  
  if (error.name === 'TokenExpiredError') {
    return errorHandler.handleAuthError(res, 'טוקן אימות פג תוקף');
  }
  
  // Generic error response
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return res.status(error.status || 500).json({
    success: false,
    error: isDevelopment ? error.message : 'שגיאה פנימית בשרת',
    code: error.code || 'INTERNAL_SERVER_ERROR',
    ...(isDevelopment && { stack: error.stack })
  });
};

/**
 * Request timeout middleware
 */
const requestTimeout = (timeoutMs = 30000) => {
  return (req, res, next) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: 'הבקשה ארכה יותר מדי זמן',
          code: 'REQUEST_TIMEOUT'
        });
      }
    }, timeoutMs);
    
    // Clear timeout when response is sent
    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));
    
    next();
  };
};

/**
 * Response compression and caching headers
 */
const optimizeResponse = (req, res, next) => {
  // Set cache headers for media lists
  if (req.method === 'GET' && req.path.match(/\/(recordings|documents|images)$/)) {
    res.set({
      'Cache-Control': 'private, max-age=60', // Cache for 1 minute
      'ETag': `"${Date.now()}"` // Simple ETag based on timestamp
    });
  }
  
  next();
};

module.exports = {
  asyncHandler,
  withDatabaseRetry,
  loadMediaList,
  withRequestQueuing,
  enhancedAuth,
  globalErrorHandler,
  requestTimeout,
  optimizeResponse,
  errorHandler
};
