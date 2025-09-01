const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate, authLimiter } = require('../middleware/auth');
const consoleLogger = require('../utils/ConsoleLogger');

// Apply rate limiting to auth routes
router.use(authLimiter);

// POST /api/auth/login - User login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'נדרש אימייל וסיסמה',
        code: 'MISSING_CREDENTIALS'
      });
    }

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      consoleLogger.logAuthError('LOGIN_FAILED', {
        email,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        reason: 'User not found',
        message: 'Login attempt with non-existent email'
      });

      return res.status(401).json({
        error: 'אימייל או סיסמה שגויים',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Verify password
    const isValidPassword = await user.verifyPassword(password);
    if (!isValidPassword) {
      consoleLogger.logAuthError('LOGIN_FAILED', {
        email,
        userId: user.id,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        reason: 'Invalid password',
        message: 'Login attempt with incorrect password'
      });

      return res.status(401).json({
        error: 'אימייל או סיסמה שגויים',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Check if account is verified (in production)
    if (process.env.NODE_ENV === 'production' && !user.isVerified) {
      return res.status(401).json({
        error: 'חשבון המשתמש לא מאומת',
        code: 'ACCOUNT_NOT_VERIFIED'
      });
    }

    // Generate JWT token
    const token = user.generateToken();

    // Log successful login
    console.log(`✅ User login successful: ${user.email} (ID: ${user.id})`);

    res.json({
      success: true,
      message: 'התחברות בוצעה בהצלחה',
      token,
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'שגיאה בתהליך ההתחברות',
      code: 'LOGIN_ERROR'
    });
  }
});

// POST /api/auth/register - User registration
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, schoolId, phone } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !role || !schoolId) {
      return res.status(400).json({
        error: 'חסרים שדות חובה',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'כתובת אימייל לא תקינה',
        code: 'INVALID_EMAIL_FORMAT'
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        error: 'הסיסמה חייבת להכיל לפחות 6 תווים',
        code: 'WEAK_PASSWORD'
      });
    }

    // Create user
    const userData = {
      email: email.toLowerCase().trim(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role,
      schoolId: parseInt(schoolId),
      phone: phone ? phone.trim() : null
    };

    const newUser = await User.create(userData);

    console.log(`✅ User registered successfully: ${newUser.email} (ID: ${newUser.id})`);

    res.status(201).json({
      success: true,
      message: 'המשתמש נוצר בהצלחה',
      user: newUser.toJSON()
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.message.includes('משתמש עם כתובת אימייל זו כבר קיים')) {
      return res.status(409).json({
        error: error.message,
        code: 'EMAIL_ALREADY_EXISTS'
      });
    }

    res.status(500).json({
      error: 'שגיאה ביצירת המשתמש',
      code: 'REGISTRATION_ERROR'
    });
  }
});

// POST /api/auth/refresh - Refresh JWT token
router.post('/refresh', authenticate, async (req, res) => {
  try {
    // Get the current user from the authenticated request
    const user = req.user;

    // Generate a new token
    const newToken = user.generateToken();

    console.log(`🔄 Token refreshed for user: ${user.email} (ID: ${user.id})`);

    res.json({
      success: true,
      message: 'טוקן חודש בהצלחה',
      token: newToken,
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'שגיאה בחידוש הטוקן',
      code: 'TOKEN_REFRESH_ERROR'
    });
  }
});

// GET /api/auth/validate - Validate current token
router.get('/validate', authenticate, (req, res) => {
  try {
    // If we reach here, the token is valid (authenticate middleware passed)
    res.json({
      success: true,
      message: 'טוקן תקין',
      user: req.user.toJSON()
    });
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(500).json({
      error: 'שגיאה בבדיקת הטוקן',
      code: 'TOKEN_VALIDATION_ERROR'
    });
  }
});

// POST /api/auth/logout - User logout (client-side token removal)
router.post('/logout', authenticate, (req, res) => {
  try {
    console.log(`👋 User logout: ${req.user.email} (ID: ${req.user.id})`);
    
    res.json({
      success: true,
      message: 'התנתקות בוצעה בהצלחה'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'שגיאה בתהליך ההתנתקות',
      code: 'LOGOUT_ERROR'
    });
  }
});

// GET /api/auth/me - Get current user info
router.get('/me', authenticate, (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user.toJSON()
    });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({
      error: 'שגיאה בטעינת פרטי המשתמש',
      code: 'USER_INFO_ERROR'
    });
  }
});

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'נדרש אימייל',
        code: 'MISSING_EMAIL'
      });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({
        success: true,
        message: 'אם האימייל קיים במערכת, נשלח אליך קישור לאיפוס סיסמה'
      });
    }

    const resetToken = await user.generatePasswordResetToken();
    
    // TODO: Send email with reset token
    console.log(`🔑 Password reset requested for: ${user.email}, token: ${resetToken}`);

    res.json({
      success: true,
      message: 'אם האימייל קיים במערכת, נשלח אליך קישור לאיפוס סיסמה'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      error: 'שגיאה בבקשת איפוס סיסמה',
      code: 'FORGOT_PASSWORD_ERROR'
    });
  }
});

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        error: 'נדרש טוקן וסיסמה חדשה',
        code: 'MISSING_RESET_DATA'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'הסיסמה חייבת להכיל לפחות 6 תווים',
        code: 'WEAK_PASSWORD'
      });
    }

    const user = await User.resetPassword(token, newPassword);
    
    console.log(`🔑 Password reset successful for: ${user.email}`);

    res.json({
      success: true,
      message: 'הסיסמה שונתה בהצלחה'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    
    if (error.message.includes('טוקן איפוס סיסמה לא תקין')) {
      return res.status(400).json({
        error: error.message,
        code: 'INVALID_RESET_TOKEN'
      });
    }

    res.status(500).json({
      error: 'שגיאה באיפוס הסיסמה',
      code: 'RESET_PASSWORD_ERROR'
    });
  }
});

// GET /api/auth/health - Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Auth service is healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
