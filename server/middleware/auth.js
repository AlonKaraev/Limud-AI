const User = require('../models/User');
const rateLimit = require('express-rate-limit');
const consoleLogger = require('../utils/ConsoleLogger');

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 1000, // Limit each IP to 5 requests per windowMs in production, 1000 in development
  message: {
    error: 'יותר מדי ניסיונות התחברות. נסה שוב בעוד 15 דקות',
    code: 'TOO_MANY_ATTEMPTS'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV !== 'production', // Skip rate limiting in development
});

// General rate limiting - increased for educational platform usage
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Increased from 100 to 300 requests per 15 minutes for legitimate usage
  message: {
    error: 'יותר מדי בקשות. נסה שוב מאוחר יותר',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for certain endpoints that are frequently accessed
  skip: (req) => {
    // Skip rate limiting for health checks and static assets
    return req.path === '/health' || 
           req.path.startsWith('/static/') ||
           req.path.startsWith('/assets/') ||
           (process.env.NODE_ENV !== 'production' && req.ip === '127.0.0.1');
  }
});

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    // Enhanced logging for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Auth Debug - Headers:', {
        authorization: authHeader ? `${authHeader.substring(0, 20)}...` : 'MISSING',
        endpoint: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    }
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      consoleLogger.logAuthError('MISSING_TOKEN', {
        endpoint: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        reason: 'No authorization header or invalid format',
        message: 'Authentication failed - missing or invalid token format',
        authHeaderPresent: !!authHeader,
        authHeaderFormat: authHeader ? authHeader.substring(0, 10) : 'N/A'
      });

      return res.status(401).json({
        error: 'נדרש טוקן אימות',
        code: 'MISSING_TOKEN',
        details: process.env.NODE_ENV === 'development' ? {
          authHeaderPresent: !!authHeader,
          expectedFormat: 'Bearer <token>'
        } : undefined
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Enhanced token validation logging
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Auth Debug - Token:', {
        tokenLength: token.length,
        tokenStart: token.substring(0, 20),
        tokenEnd: token.substring(token.length - 20)
      });
    }
    
    try {
      const decoded = User.verifyToken(token);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Auth Debug - Decoded token:', {
          userId: decoded.id,
          email: decoded.email,
          role: decoded.role,
          exp: new Date(decoded.exp * 1000).toISOString(),
          timeUntilExpiry: Math.round((decoded.exp * 1000 - Date.now()) / 1000 / 60) + ' minutes'
        });
      }
      
      const user = await User.findById(decoded.id);
      
      if (!user) {
        consoleLogger.logAuthError('USER_NOT_FOUND', {
          endpoint: req.originalUrl,
          method: req.method,
          userId: decoded.id,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          reason: 'User ID from token not found in database',
          message: 'Authentication failed - user not found',
          decodedUserId: decoded.id
        });

        return res.status(401).json({
          error: 'משתמש לא נמצא',
          code: 'USER_NOT_FOUND',
          details: process.env.NODE_ENV === 'development' ? {
            decodedUserId: decoded.id
          } : undefined
        });
      }
      
      if (process.env.NODE_ENV === 'production' && !user.isVerified) {
        consoleLogger.logAuthError('ACCOUNT_NOT_VERIFIED', {
          endpoint: req.originalUrl,
          method: req.method,
          email: user.email,
          userId: user.id,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          reason: 'User account is not verified',
          message: 'Authentication failed - account not verified'
        });

        return res.status(401).json({
          error: 'חשבון המשתמש לא מאומת',
          code: 'ACCOUNT_NOT_VERIFIED'
        });
      }
      
      // Enhanced success logging
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Auth Success:', {
          userId: user.id,
          email: user.email,
          role: user.role,
          endpoint: req.originalUrl
        });
      }
      
      // Ensure user object has school_id property for authorization
      req.user = user;
      req.user.school_id = user.schoolId || decoded.school_id;
      next();
    } catch (tokenError) {
      // Enhanced token error logging
      const errorDetails = {
        endpoint: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        reason: tokenError.message,
        message: 'Authentication failed - invalid or expired token',
        stack: tokenError.stack,
        tokenLength: token.length,
        tokenStart: token.substring(0, 20),
        errorName: tokenError.name
      };
      
      consoleLogger.logAuthError('INVALID_TOKEN', errorDetails);

      return res.status(401).json({
        error: 'טוקן לא תקין או פג תוקף',
        code: 'INVALID_TOKEN',
        details: process.env.NODE_ENV === 'development' ? {
          errorType: tokenError.name,
          tokenLength: token.length,
          hint: tokenError.message.includes('expired') ? 'Token has expired - please login again' : 'Token format is invalid'
        } : undefined
      });
    }
  } catch (error) {
    consoleLogger.logAuthError('AUTH_ERROR', {
      endpoint: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      reason: error.message,
      message: 'Authentication middleware error',
      stack: error.stack
    });

    console.error('Authentication error:', error);
    return res.status(500).json({
      error: 'שגיאה בתהליך האימות',
      code: 'AUTH_ERROR'
    });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'נדרש אימות',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'אין הרשאה לגשת למשאב זה',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    
    next();
  };
};

// Principal permission authorization middleware
const authorizePrincipal = (permissionType) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'נדרש אימות',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }

      if (req.user.role !== 'principal') {
        return res.status(403).json({
          error: 'נדרשות הרשאות מנהל',
          code: 'PRINCIPAL_ROLE_REQUIRED'
        });
      }

      // Import PrincipalService here to avoid circular dependency
      const PrincipalService = require('../services/PrincipalService');
      
      const hasPermission = await PrincipalService.hasPrincipalPermission(req.user.id, permissionType);
      
      if (!hasPermission) {
        return res.status(403).json({
          error: `אין הרשאה ל${permissionType}`,
          code: 'INSUFFICIENT_PRINCIPAL_PERMISSIONS'
        });
      }

      next();
    } catch (error) {
      console.error('Principal authorization error:', error);
      return res.status(500).json({
        error: 'שגיאה בבדיקת הרשאות מנהל',
        code: 'PRINCIPAL_AUTH_ERROR'
      });
    }
  };
};

// Combined authorization for teachers and principals with specific permissions
const authorizeTeacherOrPrincipal = (principalPermission = null) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'נדרש אימות',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }

      // Allow teachers
      if (req.user.role === 'teacher') {
        return next();
      }

      // Check principal permissions
      if (req.user.role === 'principal') {
        if (!principalPermission) {
          return next(); // No specific permission required
        }

        const PrincipalService = require('../services/PrincipalService');
        const hasPermission = await PrincipalService.hasPrincipalPermission(req.user.id, principalPermission);
        
        if (hasPermission) {
          return next();
        }
      }

      return res.status(403).json({
        error: 'נדרשות הרשאות מורה או מנהל',
        code: 'TEACHER_OR_PRINCIPAL_REQUIRED'
      });
    } catch (error) {
      console.error('Teacher/Principal authorization error:', error);
      return res.status(500).json({
        error: 'שגיאה בבדיקת הרשאות',
        code: 'AUTHORIZATION_ERROR'
      });
    }
  };
};

// School-based authorization (users can only access data from their school)
const authorizeSchool = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'נדרש אימות',
      code: 'AUTHENTICATION_REQUIRED'
    });
  }
  
  // Extract school ID from request parameters or body
  const requestedSchoolId = req.params.schoolId || req.body.schoolId;
  
  if (requestedSchoolId && parseInt(requestedSchoolId) !== req.user.schoolId) {
    return res.status(403).json({
      error: 'אין הרשאה לגשת לנתוני בית ספר אחר',
      code: 'SCHOOL_ACCESS_DENIED'
    });
  }
  
  next();
};

// Teacher authorization for student data
const authorizeTeacherForStudent = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'teacher') {
      return res.status(403).json({
        error: 'רק מורים יכולים לגשת לנתוני תלמידים',
        code: 'TEACHER_ONLY'
      });
    }
    
    const studentId = req.params.studentId || req.body.studentId;
    
    if (studentId) {
      const student = await User.findById(studentId);
      
      if (!student) {
        return res.status(404).json({
          error: 'תלמיד לא נמצא',
          code: 'STUDENT_NOT_FOUND'
        });
      }
      
      if (student.schoolId !== req.user.schoolId) {
        return res.status(403).json({
          error: 'אין הרשאה לגשת לתלמיד מבית ספר אחר',
          code: 'CROSS_SCHOOL_ACCESS_DENIED'
        });
      }
      
      if (student.role !== 'student') {
        return res.status(400).json({
          error: 'המשתמש המבוקש אינו תלמיד',
          code: 'NOT_A_STUDENT'
        });
      }
      
      req.student = student;
    }
    
    next();
  } catch (error) {
    console.error('Teacher authorization error:', error);
    return res.status(500).json({
      error: 'שגיאה בבדיקת הרשאות',
      code: 'AUTHORIZATION_ERROR'
    });
  }
};

// Validate request data middleware
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      const errorMessage = error.details[0].message;
      return res.status(400).json({
        error: `נתונים לא תקינים: ${errorMessage}`,
        code: 'VALIDATION_ERROR',
        details: error.details
      });
    }
    
    next();
  };
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  next();
};

// CSRF protection middleware (for forms)
const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET requests and API endpoints with proper authentication
  if (req.method === 'GET' || req.headers.authorization) {
    return next();
  }
  
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;
  
  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({
      error: 'טוקן CSRF לא תקין',
      code: 'INVALID_CSRF_TOKEN'
    });
  }
  
  next();
};

// Log authentication events
const logAuthEvent = (event, userId = null, details = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    userId,
    ip: details.ip,
    userAgent: details.userAgent,
    ...details
  };
  
  console.log('Auth Event:', JSON.stringify(logEntry));
  
  // In production, you might want to store this in a separate audit log table
  // or send to a logging service
};

module.exports = {
  authLimiter,
  generalLimiter,
  authenticate,
  authorize,
  authorizePrincipal,
  authorizeTeacherOrPrincipal,
  authorizeSchool,
  authorizeTeacherForStudent,
  validateRequest,
  securityHeaders,
  csrfProtection,
  logAuthEvent
};
