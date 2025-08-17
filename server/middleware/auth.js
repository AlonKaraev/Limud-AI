const User = require('../models/User');
const rateLimit = require('express-rate-limit');

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

// General rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'יותר מדי בקשות. נסה שוב מאוחר יותר',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'נדרש טוקן אימות',
        code: 'MISSING_TOKEN'
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const decoded = User.verifyToken(token);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return res.status(401).json({
          error: 'משתמש לא נמצא',
          code: 'USER_NOT_FOUND'
        });
      }
      
      if (process.env.NODE_ENV === 'production' && !user.isVerified) {
        return res.status(401).json({
          error: 'חשבון המשתמש לא מאומת',
          code: 'ACCOUNT_NOT_VERIFIED'
        });
      }
      
      req.user = user;
      next();
    } catch (tokenError) {
      return res.status(401).json({
        error: 'טוקן לא תקין או פג תוקף',
        code: 'INVALID_TOKEN'
      });
    }
  } catch (error) {
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
  authorizeSchool,
  authorizeTeacherForStudent,
  validateRequest,
  securityHeaders,
  csrfProtection,
  logAuthEvent
};
