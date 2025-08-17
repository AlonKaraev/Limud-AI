const express = require('express');
const { body } = require('express-validator');
const User = require('../models/User');
const { 
  authLimiter, 
  authenticate, 
  validateRequest, 
  logAuthEvent 
} = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('כתובת אימייל לא תקינה'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('סיסמה חייבת להכיל לפחות 8 תווים')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('סיסמה חייבת להכיל לפחות אות קטנה, אות גדולה ומספר'),
  body('role')
    .isIn(['teacher', 'student'])
    .withMessage('תפקיד חייב להיות מורה או תלמיד'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('שם פרטי חייב להכיל בין 2 ל-50 תווים'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('שם משפחה חייב להכיל בין 2 ל-50 תווים'),
  body('phone')
    .optional()
    .matches(/^05\d{8}$/)
    .withMessage('מספר טלפון חייב להיות בפורמט 05XXXXXXXX'),
  body('schoolId')
    .isInt({ min: 1 })
    .withMessage('מזהה בית ספר לא תקין')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('כתובת אימייל לא תקינה'),
  body('password')
    .notEmpty()
    .withMessage('סיסמה נדרשת')
];

const resetPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('כתובת אימייל לא תקינה')
];

const newPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('טוקן איפוס נדרש'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('סיסמה חייבת להכיל לפחות 8 תווים')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('סיסמה חייבת להכיל לפחות אות קטנה, אות גדולה ומספר')
];

// Register new user
router.post('/register', authLimiter, registerValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = require('express-validator').validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'נתונים לא תקינים',
        code: 'VALIDATION_ERROR',
        details: errors.array().map(err => ({
          field: err.param,
          message: err.msg
        }))
      });
    }

    const { email, password, role, firstName, lastName, phone, schoolId } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      logAuthEvent('REGISTRATION_FAILED', null, {
        reason: 'EMAIL_EXISTS',
        email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(409).json({
        error: 'משתמש עם כתובת אימייל זו כבר קיים במערכת',
        code: 'EMAIL_EXISTS'
      });
    }

    // Create new user
    const user = await User.create({
      email,
      password,
      role,
      firstName,
      lastName,
      phone,
      schoolId
    });

    logAuthEvent('USER_REGISTERED', user.id, {
      email: user.email,
      role: user.role,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Generate token
    const token = user.generateToken();

    res.status(201).json({
      message: 'משתמש נרשם בהצלחה',
      user: user.toJSON(),
      token,
      requiresVerification: !user.isVerified
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    logAuthEvent('REGISTRATION_ERROR', null, {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(500).json({
      error: 'שגיאה ברישום המשתמש',
      code: 'REGISTRATION_ERROR'
    });
  }
});

// Login user
router.post('/login', authLimiter, loginValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = require('express-validator').validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'נתונים לא תקינים',
        code: 'VALIDATION_ERROR',
        details: errors.array().map(err => ({
          field: err.param,
          message: err.msg
        }))
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      logAuthEvent('LOGIN_FAILED', null, {
        reason: 'USER_NOT_FOUND',
        email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json({
        error: 'כתובת אימייל או סיסמה שגויים',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Verify password
    const isValidPassword = await user.verifyPassword(password);
    if (!isValidPassword) {
      logAuthEvent('LOGIN_FAILED', user.id, {
        reason: 'INVALID_PASSWORD',
        email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json({
        error: 'כתובת אימייל או סיסמה שגויים',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Skip account verification check in development
    if (process.env.NODE_ENV === 'production' && !user.isVerified) {
      logAuthEvent('LOGIN_FAILED', user.id, {
        reason: 'ACCOUNT_NOT_VERIFIED',
        email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json({
        error: 'חשבון המשתמש לא מאומת. אנא בדוק את האימייל שלך',
        code: 'ACCOUNT_NOT_VERIFIED'
      });
    }

    // Generate token
    const token = user.generateToken();

    logAuthEvent('LOGIN_SUCCESS', user.id, {
      email: user.email,
      role: user.role,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      message: 'התחברות בוצעה בהצלחה',
      user: user.toJSON(),
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    
    logAuthEvent('LOGIN_ERROR', null, {
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(500).json({
      error: 'שגיאה בתהליך ההתחברות',
      code: 'LOGIN_ERROR'
    });
  }
});

// Get current user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    res.json({
      user: req.user.toJSON()
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      error: 'שגיאה בטעינת פרופיל המשתמש',
      code: 'PROFILE_ERROR'
    });
  }
});

// Update user profile
router.put('/profile', authenticate, [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('שם פרטי חייב להכיל בין 2 ל-50 תווים'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('שם משפחה חייב להכיל בין 2 ל-50 תווים'),
  body('phone')
    .optional()
    .matches(/^05\d{8}$/)
    .withMessage('מספר טלפון חייב להיות בפורמט 05XXXXXXXX')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = require('express-validator').validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'נתונים לא תקינים',
        code: 'VALIDATION_ERROR',
        details: errors.array().map(err => ({
          field: err.param,
          message: err.msg
        }))
      });
    }

    const { firstName, lastName, phone } = req.body;
    
    const updatedUser = await req.user.updateProfile({
      first_name: firstName,
      last_name: lastName,
      phone
    });

    logAuthEvent('PROFILE_UPDATED', req.user.id, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      message: 'פרופיל עודכן בהצלחה',
      user: updatedUser.toJSON()
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      error: 'שגיאה בעדכון הפרופיל',
      code: 'PROFILE_UPDATE_ERROR'
    });
  }
});

// Verify account
router.post('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'כתובת אימייל נדרשת',
        code: 'EMAIL_REQUIRED'
      });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({
        error: 'משתמש לא נמצא',
        code: 'USER_NOT_FOUND'
      });
    }

    await user.verifyAccount(token);

    logAuthEvent('ACCOUNT_VERIFIED', user.id, {
      email: user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      message: 'חשבון אומת בהצלחה',
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Account verification error:', error);
    
    if (error.message.includes('טוקן אימות לא תקין')) {
      return res.status(400).json({
        error: error.message,
        code: 'INVALID_VERIFICATION_TOKEN'
      });
    }

    res.status(500).json({
      error: 'שגיאה באימות החשבון',
      code: 'VERIFICATION_ERROR'
    });
  }
});

// Request password reset
router.post('/reset-password', authLimiter, resetPasswordValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = require('express-validator').validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'נתונים לא תקינים',
        code: 'VALIDATION_ERROR',
        details: errors.array().map(err => ({
          field: err.param,
          message: err.msg
        }))
      });
    }

    const { email } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({
        message: 'אם כתובת האימייל קיימת במערכת, נשלח אליה קישור לאיפוס סיסמה'
      });
    }

    const resetToken = await user.generatePasswordResetToken();

    logAuthEvent('PASSWORD_RESET_REQUESTED', user.id, {
      email: user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // In a real application, you would send an email here
    console.log(`Password reset token for ${email}: ${resetToken}`);

    res.json({
      message: 'אם כתובת האימייל קיימת במערכת, נשלח אליה קישור לאיפוס סיסמה'
    });

  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      error: 'שגיאה בבקשת איפוס סיסמה',
      code: 'RESET_REQUEST_ERROR'
    });
  }
});

// Reset password with token
router.post('/reset-password/:token', authLimiter, newPasswordValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = require('express-validator').validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'נתונים לא תקינים',
        code: 'VALIDATION_ERROR',
        details: errors.array().map(err => ({
          field: err.param,
          message: err.msg
        }))
      });
    }

    const { token } = req.params;
    const { password } = req.body;

    const user = await User.resetPassword(token, password);

    logAuthEvent('PASSWORD_RESET_COMPLETED', user.id, {
      email: user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      message: 'סיסמה אופסה בהצלחה',
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Password reset error:', error);
    
    if (error.message.includes('טוקן איפוס סיסמה לא תקין')) {
      return res.status(400).json({
        error: error.message,
        code: 'INVALID_RESET_TOKEN'
      });
    }

    res.status(500).json({
      error: 'שגיאה באיפוס הסיסמה',
      code: 'PASSWORD_RESET_ERROR'
    });
  }
});

// Logout (client-side token invalidation)
router.post('/logout', authenticate, async (req, res) => {
  try {
    logAuthEvent('LOGOUT', req.user.id, {
      email: req.user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      message: 'התנתקות בוצעה בהצלחה'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'שגיאה בהתנתקות',
      code: 'LOGOUT_ERROR'
    });
  }
});

module.exports = router;
