const express = require('express');
const router = express.Router();
const PrincipalService = require('../services/PrincipalService');
const { 
  authenticate, 
  authorizePrincipal, 
  authorize,
  authorizeTeacherOrPrincipal,
  generalLimiter 
} = require('../middleware/auth');

// Apply rate limiting and authentication to all routes
router.use(generalLimiter);
router.use(authenticate);

// =============================================================================
// PERMISSION MANAGEMENT ROUTES
// =============================================================================

// Get principal's permissions
router.get('/permissions', authorize('principal'), async (req, res) => {
  try {
    const permissions = await PrincipalService.getPrincipalPermissions(req.user.id);
    res.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Error getting principal permissions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'שגיאה בקבלת הרשאות מנהל'
    });
  }
});

// Grant permission to another principal
router.post('/permissions/grant', authorizePrincipal('permission_management'), async (req, res) => {
  try {
    const { principalId, permissionType, notes, expiresAt } = req.body;

    if (!principalId || !permissionType) {
      return res.status(400).json({
        success: false,
        error: 'נדרש מזהה מנהל וסוג הרשאה'
      });
    }

    const result = await PrincipalService.grantPermission(
      principalId, 
      req.user.id, 
      permissionType, 
      notes, 
      expiresAt
    );

    // Log the action with request details
    await PrincipalService.logPrincipalAction(
      req.user.id, 
      'permission_granted', 
      'permission', 
      result.lastID,
      null,
      { principalId, permissionType, notes },
      req
    );

    res.json({
      success: true,
      message: 'הרשאה הוענקה בהצלחה',
      data: result
    });
  } catch (error) {
    console.error('Error granting permission:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'שגיאה בהענקת הרשאה'
    });
  }
});

// Revoke permission from a principal
router.post('/permissions/revoke', authorizePrincipal('permission_management'), async (req, res) => {
  try {
    const { principalId, permissionType } = req.body;

    if (!principalId || !permissionType) {
      return res.status(400).json({
        success: false,
        error: 'נדרש מזהה מנהל וסוג הרשאה'
      });
    }

    const result = await PrincipalService.revokePermission(principalId, req.user.id, permissionType);

    // Log the action with request details
    await PrincipalService.logPrincipalAction(
      req.user.id, 
      'permission_revoked', 
      'permission', 
      principalId,
      { permissionType },
      null,
      req
    );

    res.json({
      success: true,
      message: 'הרשאה בוטלה בהצלחה',
      data: result
    });
  } catch (error) {
    console.error('Error revoking permission:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'שגיאה בביטול הרשאה'
    });
  }
});

// =============================================================================
// CLASS MANAGEMENT ROUTES
// =============================================================================

// Get all classes in principal's school
router.get('/classes', authorize('principal'), async (req, res) => {
  try {
    const filters = {
      gradeLevel: req.query.gradeLevel,
      academicYear: req.query.academicYear,
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined
    };

    const classes = await PrincipalService.getSchoolClasses(req.user.id, filters);
    res.json({
      success: true,
      data: classes
    });
  } catch (error) {
    console.error('Error getting school classes:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'שגיאה בקבלת כיתות בית הספר'
    });
  }
});

// Create a new class
router.post('/classes', authorizePrincipal('class_management'), async (req, res) => {
  try {
    const { name, description, teacherId, gradeLevel, subjectArea, academicYear } = req.body;

    if (!name || !teacherId || !gradeLevel) {
      return res.status(400).json({
        success: false,
        error: 'נדרש שם כיתה, מזהה מורה ורמת כיתה'
      });
    }

    const classData = {
      name,
      description,
      teacherId,
      gradeLevel,
      subjectArea,
      academicYear
    };

    const result = await PrincipalService.createClass(req.user.id, classData);

    res.status(201).json({
      success: true,
      message: 'כיתה נוצרה בהצלחה',
      data: { classId: result.lastID }
    });
  } catch (error) {
    console.error('Error creating class:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'שגיאה ביצירת כיתה'
    });
  }
});

// Assign students to a class
router.post('/classes/:classId/students', authorizePrincipal('class_management'), async (req, res) => {
  try {
    const { classId } = req.params;
    const { studentIds } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'נדרש מערך מזהי תלמידים'
      });
    }

    const results = await PrincipalService.assignStudentsToClass(req.user.id, parseInt(classId), studentIds);

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `${successCount} תלמידים שויכו בהצלחה${failureCount > 0 ? `, ${failureCount} נכשלו` : ''}`,
      data: results
    });
  } catch (error) {
    console.error('Error assigning students to class:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'שגיאה בשיוך תלמידים לכיתה'
    });
  }
});

// Remove students from a class
router.delete('/classes/:classId/students', authorizePrincipal('class_management'), async (req, res) => {
  try {
    const { classId } = req.params;
    const { studentIds } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'נדרש מערך מזהי תלמידים'
      });
    }

    const results = await PrincipalService.removeStudentsFromClass(req.user.id, parseInt(classId), studentIds);

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `${successCount} תלמידים הוסרו בהצלחה${failureCount > 0 ? `, ${failureCount} נכשלו` : ''}`,
      data: results
    });
  } catch (error) {
    console.error('Error removing students from class:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'שגיאה בהסרת תלמידים מכיתה'
    });
  }
});

// =============================================================================
// USER MANAGEMENT ROUTES
// =============================================================================

// Get all users in principal's school
router.get('/users', authorize('principal'), async (req, res) => {
  try {
    const { role } = req.query;
    const users = await PrincipalService.getSchoolUsers(req.user.id, role);
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error getting school users:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'שגיאה בקבלת משתמשי בית הספר'
    });
  }
});

// Create a new user
router.post('/users', authorizePrincipal('user_management'), async (req, res) => {
  try {
    const { email, password, role, firstName, lastName, phone } = req.body;

    if (!email || !password || !role || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'נדרשים כל השדות החובה: אימייל, סיסמה, תפקיד, שם פרטי ושם משפחה'
      });
    }

    if (!['teacher', 'student'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'תפקיד חייב להיות מורה או תלמיד'
      });
    }

    const userData = {
      email,
      password,
      role,
      firstName,
      lastName,
      phone
    };

    const newUser = await PrincipalService.createUser(req.user.id, userData);

    res.status(201).json({
      success: true,
      message: 'משתמש נוצר בהצלחה',
      data: newUser.toJSON()
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'שגיאה ביצירת משתמש'
    });
  }
});

// =============================================================================
// SCHOOL ADMINISTRATION ROUTES
// =============================================================================

// Get school settings
router.get('/school/settings', authorize('principal'), async (req, res) => {
  try {
    const settings = await PrincipalService.getSchoolSettings(req.user.id);
    
    // Convert settings array to object for easier frontend consumption
    const settingsObject = {};
    settings.forEach(setting => {
      let value = setting.setting_value;
      
      // Parse JSON values
      if (setting.setting_type === 'json') {
        try {
          value = JSON.parse(value);
        } catch (e) {
          console.warn('Failed to parse JSON setting:', setting.setting_key);
        }
      } else if (setting.setting_type === 'number') {
        value = parseFloat(value);
      } else if (setting.setting_type === 'boolean') {
        value = value === 'true' || value === '1';
      }
      
      settingsObject[setting.setting_key] = {
        value,
        type: setting.setting_type,
        description: setting.description,
        updatedAt: setting.updated_at
      };
    });

    res.json({
      success: true,
      data: settingsObject
    });
  } catch (error) {
    console.error('Error getting school settings:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'שגיאה בקבלת הגדרות בית הספר'
    });
  }
});

// Update school setting
router.put('/school/settings/:settingKey', authorizePrincipal('school_administration'), async (req, res) => {
  try {
    const { settingKey } = req.params;
    const { value, type = 'string' } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'נדרש ערך להגדרה'
      });
    }

    let settingValue = value;
    
    // Convert value to string for storage
    if (type === 'json') {
      settingValue = JSON.stringify(value);
    } else {
      settingValue = String(value);
    }

    const result = await PrincipalService.updateSchoolSetting(req.user.id, settingKey, settingValue, type);

    res.json({
      success: true,
      message: 'הגדרה עודכנה בהצלחה',
      data: result
    });
  } catch (error) {
    console.error('Error updating school setting:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'שגיאה בעדכון הגדרת בית הספר'
    });
  }
});

// =============================================================================
// CLASS TEMPLATES ROUTES
// =============================================================================

// Get class templates
router.get('/class-templates', authorize('principal'), async (req, res) => {
  try {
    const templates = await PrincipalService.getClassTemplates(req.user.id);
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error getting class templates:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'שגיאה בקבלת תבניות כיתות'
    });
  }
});

// Create class from template
router.post('/class-templates/:templateId/create-class', authorizePrincipal('class_management'), async (req, res) => {
  try {
    const { templateId } = req.params;
    const { teacherId, className } = req.body;

    if (!teacherId) {
      return res.status(400).json({
        success: false,
        error: 'נדרש מזהה מורה'
      });
    }

    const result = await PrincipalService.createClassFromTemplate(
      req.user.id, 
      parseInt(templateId), 
      teacherId, 
      className
    );

    res.status(201).json({
      success: true,
      message: 'כיתה נוצרה מתבנית בהצלחה',
      data: { classId: result.lastID }
    });
  } catch (error) {
    console.error('Error creating class from template:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'שגיאה ביצירת כיתה מתבנית'
    });
  }
});

// =============================================================================
// AUDIT LOG ROUTES
// =============================================================================

// Get audit log
router.get('/audit-log', authorize('principal'), async (req, res) => {
  try {
    const filters = {
      actionType: req.query.actionType,
      targetType: req.query.targetType,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };

    const auditLog = await PrincipalService.getAuditLog(req.user.id, filters);
    
    res.json({
      success: true,
      data: auditLog
    });
  } catch (error) {
    console.error('Error getting audit log:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'שגיאה בקבלת יומן פעולות'
    });
  }
});

// =============================================================================
// DASHBOARD STATISTICS ROUTES
// =============================================================================

// Get principal dashboard statistics
router.get('/dashboard/stats', authorize('principal'), async (req, res) => {
  try {
    const [classes, users] = await Promise.all([
      PrincipalService.getSchoolClasses(req.user.id),
      PrincipalService.getSchoolUsers(req.user.id)
    ]);

    const stats = {
      totalClasses: classes.length,
      activeClasses: classes.filter(c => c.is_active).length,
      totalStudents: users.filter(u => u.role === 'student').length,
      totalTeachers: users.filter(u => u.role === 'teacher').length,
      totalUsers: users.length,
      classesByGrade: {},
      studentsInClasses: classes.reduce((sum, c) => sum + parseInt(c.student_count || 0), 0)
    };

    // Group classes by grade level
    classes.forEach(cls => {
      if (cls.grade_level) {
        stats.classesByGrade[cls.grade_level] = (stats.classesByGrade[cls.grade_level] || 0) + 1;
      }
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'שגיאה בקבלת סטטיסטיקות לוח הבקרה'
    });
  }
});

module.exports = router;
