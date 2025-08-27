const { query, run } = require('../config/database-sqlite');
const User = require('../models/User');

class PrincipalService {
  // Check if user has principal permissions
  static async hasPrincipalPermission(userId, permissionType) {
    try {
      const result = await query(`
        SELECT pp.* FROM principal_permissions pp
        JOIN users u ON pp.principal_id = u.id
        WHERE pp.principal_id = ? 
        AND pp.permission_type = ? 
        AND pp.is_active = 1
        AND u.role = 'principal'
        AND (pp.expires_at IS NULL OR pp.expires_at > datetime('now'))
      `, [userId, permissionType]);
      
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking principal permission:', error);
      throw new Error('שגיאה בבדיקת הרשאות מנהל');
    }
  }

  // Get all permissions for a principal
  static async getPrincipalPermissions(principalId) {
    try {
      const result = await query(`
        SELECT pp.*, 
               u1.first_name || ' ' || u1.last_name as principal_name,
               u2.first_name || ' ' || u2.last_name as granted_by_name
        FROM principal_permissions pp
        JOIN users u1 ON pp.principal_id = u1.id
        JOIN users u2 ON pp.granted_by = u2.id
        WHERE pp.principal_id = ?
        ORDER BY pp.permission_type, pp.created_at DESC
      `, [principalId]);
      
      return result.rows;
    } catch (error) {
      console.error('Error getting principal permissions:', error);
      throw new Error('שגיאה בקבלת הרשאות מנהל');
    }
  }

  // Grant permission to a principal
  static async grantPermission(principalId, grantedBy, permissionType, notes = null, expiresAt = null) {
    try {
      // Verify the principal exists and has principal role
      const principal = await User.findById(principalId);
      if (!principal || principal.role !== 'principal') {
        throw new Error('המשתמש אינו מנהל');
      }

      // Verify the granter has permission_management rights
      const canGrant = await this.hasPrincipalPermission(grantedBy, 'permission_management');
      if (!canGrant) {
        throw new Error('אין הרשאה להעניק הרשאות');
      }

      // Insert or update permission
      const result = await run(`
        INSERT OR REPLACE INTO principal_permissions 
        (principal_id, granted_by, permission_type, notes, expires_at, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
      `, [principalId, grantedBy, permissionType, notes, expiresAt]);

      // Log the action
      await this.logPrincipalAction(grantedBy, 'permission_granted', 'permission', result.lastID, 
        null, { principalId, permissionType, notes });

      return result;
    } catch (error) {
      console.error('Error granting permission:', error);
      throw error;
    }
  }

  // Revoke permission from a principal
  static async revokePermission(principalId, revokedBy, permissionType) {
    try {
      // Verify the revoker has permission_management rights
      const canRevoke = await this.hasPrincipalPermission(revokedBy, 'permission_management');
      if (!canRevoke) {
        throw new Error('אין הרשאה לבטל הרשאות');
      }

      const result = await run(`
        UPDATE principal_permissions 
        SET is_active = 0, updated_at = CURRENT_TIMESTAMP
        WHERE principal_id = ? AND permission_type = ?
      `, [principalId, permissionType]);

      // Log the action
      await this.logPrincipalAction(revokedBy, 'permission_revoked', 'permission', principalId, 
        { permissionType }, null);

      return result;
    } catch (error) {
      console.error('Error revoking permission:', error);
      throw error;
    }
  }

  // Create a new class (principal can create classes for any teacher in their school)
  static async createClass(principalId, classData) {
    try {
      // Verify principal has class_management permission
      const canManage = await this.hasPrincipalPermission(principalId, 'class_management');
      if (!canManage) {
        throw new Error('אין הרשאה לניהול כיתות');
      }

      const principal = await User.findById(principalId);
      const { name, description, teacherId, gradeLevel, subjectArea, academicYear } = classData;

      // Verify teacher belongs to same school
      const teacher = await User.findById(teacherId);
      if (!teacher || teacher.schoolId !== principal.schoolId) {
        throw new Error('המורה אינו שייך לאותו בית ספר');
      }

      const result = await run(`
        INSERT INTO classes (name, description, school_id, teacher_id, grade_level, subject_area, academic_year, created_by, managed_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [name, description, principal.schoolId, teacherId, gradeLevel, subjectArea, academicYear || '2024-2025', principalId, principalId]);

      // Log the action
      await this.logPrincipalAction(principalId, 'class_created', 'class', result.lastID, 
        null, classData);

      return result;
    } catch (error) {
      console.error('Error creating class:', error);
      throw error;
    }
  }

  // Get all classes in principal's school
  static async getSchoolClasses(principalId, filters = {}) {
    try {
      const principal = await User.findById(principalId);
      let whereClause = 'WHERE c.school_id = ?';
      let params = [principal.schoolId];

      if (filters.gradeLevel) {
        whereClause += ' AND c.grade_level = ?';
        params.push(filters.gradeLevel);
      }

      if (filters.academicYear) {
        whereClause += ' AND c.academic_year = ?';
        params.push(filters.academicYear);
      }

      if (filters.isActive !== undefined) {
        whereClause += ' AND c.is_active = ?';
        params.push(filters.isActive ? 1 : 0);
      }

      const result = await query(`
        SELECT c.*, 
               u.first_name || ' ' || u.last_name as teacher_name,
               u.email as teacher_email,
               COUNT(cm.student_id) as student_count
        FROM classes c
        JOIN users u ON c.teacher_id = u.id
        LEFT JOIN class_memberships cm ON c.id = cm.class_id AND cm.is_active = 1
        ${whereClause}
        GROUP BY c.id, u.id
        ORDER BY c.grade_level, c.name
      `, params);

      return result.rows;
    } catch (error) {
      console.error('Error getting school classes:', error);
      throw new Error('שגיאה בקבלת כיתות בית הספר');
    }
  }

  // Assign students to a class
  static async assignStudentsToClass(principalId, classId, studentIds) {
    try {
      // Verify principal has class_management permission
      const canManage = await this.hasPrincipalPermission(principalId, 'class_management');
      if (!canManage) {
        throw new Error('אין הרשאה לניהול כיתות');
      }

      const principal = await User.findById(principalId);

      // Verify class belongs to principal's school
      const classResult = await query('SELECT * FROM classes WHERE id = ? AND school_id = ?', [classId, principal.schoolId]);
      if (classResult.rows.length === 0) {
        throw new Error('כיתה לא נמצאה');
      }

      const results = [];
      for (const studentId of studentIds) {
        // Verify student belongs to same school
        const student = await User.findById(studentId);
        if (!student || student.role !== 'student' || student.schoolId !== principal.schoolId) {
          continue; // Skip invalid students
        }

        try {
          const result = await run(`
            INSERT OR REPLACE INTO class_memberships (class_id, student_id, is_active)
            VALUES (?, ?, 1)
          `, [classId, studentId]);

          results.push({ studentId, success: true, result });

          // Log the action
          await this.logPrincipalAction(principalId, 'student_assigned', 'class', classId, 
            null, { studentId, studentName: `${student.first_name} ${student.last_name}` });
        } catch (error) {
          results.push({ studentId, success: false, error: error.message });
        }
      }

      return results;
    } catch (error) {
      console.error('Error assigning students to class:', error);
      throw error;
    }
  }

  // Remove students from a class
  static async removeStudentsFromClass(principalId, classId, studentIds) {
    try {
      // Verify principal has class_management permission
      const canManage = await this.hasPrincipalPermission(principalId, 'class_management');
      if (!canManage) {
        throw new Error('אין הרשאה לניהול כיתות');
      }

      const principal = await User.findById(principalId);

      // Verify class belongs to principal's school
      const classResult = await query('SELECT * FROM classes WHERE id = ? AND school_id = ?', [classId, principal.schoolId]);
      if (classResult.rows.length === 0) {
        throw new Error('כיתה לא נמצאה');
      }

      const results = [];
      for (const studentId of studentIds) {
        try {
          const result = await run(`
            UPDATE class_memberships 
            SET is_active = 0 
            WHERE class_id = ? AND student_id = ?
          `, [classId, studentId]);

          const student = await User.findById(studentId);
          results.push({ studentId, success: true, result });

          // Log the action
          await this.logPrincipalAction(principalId, 'student_removed', 'class', classId, 
            { studentId }, null);
        } catch (error) {
          results.push({ studentId, success: false, error: error.message });
        }
      }

      return results;
    } catch (error) {
      console.error('Error removing students from class:', error);
      throw error;
    }
  }

  // Get all users in principal's school
  static async getSchoolUsers(principalId, role = null) {
    try {
      const principal = await User.findById(principalId);
      let whereClause = 'WHERE school_id = ?';
      let params = [principal.schoolId];

      if (role) {
        whereClause += ' AND role = ?';
        params.push(role);
      }

      const result = await query(`
        SELECT id, email, role, first_name, last_name, phone, is_verified, created_at
        FROM users 
        ${whereClause}
        ORDER BY role, last_name, first_name
      `, params);

      return result.rows;
    } catch (error) {
      console.error('Error getting school users:', error);
      throw new Error('שגיאה בקבלת משתמשי בית הספר');
    }
  }

  // Create a new user (principal can create teachers and students)
  static async createUser(principalId, userData) {
    try {
      // Verify principal has user_management permission
      const canManage = await this.hasPrincipalPermission(principalId, 'user_management');
      if (!canManage) {
        throw new Error('אין הרשאה לניהול משתמשים');
      }

      const principal = await User.findById(principalId);
      
      // Add school_id to user data
      userData.schoolId = principal.schoolId;

      // Create the user
      const newUser = await User.create(userData);

      // Log the action
      await this.logPrincipalAction(principalId, 'user_created', 'user', newUser.id, 
        null, { email: userData.email, role: userData.role, name: `${userData.firstName} ${userData.lastName}` });

      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Get school settings
  static async getSchoolSettings(principalId) {
    try {
      const principal = await User.findById(principalId);
      
      const result = await query(`
        SELECT * FROM school_settings 
        WHERE school_id = ?
        ORDER BY setting_key
      `, [principal.schoolId]);

      return result.rows;
    } catch (error) {
      console.error('Error getting school settings:', error);
      throw new Error('שגיאה בקבלת הגדרות בית הספר');
    }
  }

  // Update school setting
  static async updateSchoolSetting(principalId, settingKey, settingValue, settingType = 'string') {
    try {
      // Verify principal has school_administration permission
      const canAdmin = await this.hasPrincipalPermission(principalId, 'school_administration');
      if (!canAdmin) {
        throw new Error('אין הרשאה לניהול בית הספר');
      }

      const principal = await User.findById(principalId);

      const result = await run(`
        INSERT OR REPLACE INTO school_settings 
        (school_id, setting_key, setting_value, setting_type, updated_by)
        VALUES (?, ?, ?, ?, ?)
      `, [principal.schoolId, settingKey, settingValue, settingType, principalId]);

      return result;
    } catch (error) {
      console.error('Error updating school setting:', error);
      throw error;
    }
  }

  // Get class templates
  static async getClassTemplates(principalId) {
    try {
      const principal = await User.findById(principalId);
      
      const result = await query(`
        SELECT ct.*, u.first_name || ' ' || u.last_name as created_by_name
        FROM class_templates ct
        JOIN users u ON ct.created_by = u.id
        WHERE ct.school_id = ? AND ct.is_active = 1
        ORDER BY ct.grade_level, ct.template_name
      `, [principal.schoolId]);

      return result.rows;
    } catch (error) {
      console.error('Error getting class templates:', error);
      throw new Error('שגיאה בקבלת תבניות כיתות');
    }
  }

  // Create class from template
  static async createClassFromTemplate(principalId, templateId, teacherId, className) {
    try {
      const template = await query(`
        SELECT * FROM class_templates 
        WHERE id = ? AND school_id = (SELECT school_id FROM users WHERE id = ?)
      `, [templateId, principalId]);

      if (template.rows.length === 0) {
        throw new Error('תבנית לא נמצאה');
      }

      const templateData = template.rows[0];
      
      const classData = {
        name: className || templateData.template_name,
        description: templateData.description,
        teacherId: teacherId,
        gradeLevel: templateData.grade_level,
        subjectArea: templateData.subject_area,
        academicYear: templateData.academic_year
      };

      return await this.createClass(principalId, classData);
    } catch (error) {
      console.error('Error creating class from template:', error);
      throw error;
    }
  }

  // Log principal actions for audit trail
  static async logPrincipalAction(principalId, actionType, targetType, targetId, oldValues = null, newValues = null, req = null) {
    try {
      const ipAddress = req?.ip || req?.connection?.remoteAddress || null;
      const userAgent = req?.get('User-Agent') || null;

      await run(`
        INSERT INTO principal_audit_log 
        (principal_id, action_type, target_type, target_id, old_values, new_values, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        principalId, 
        actionType, 
        targetType, 
        targetId, 
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress,
        userAgent
      ]);
    } catch (error) {
      console.error('Error logging principal action:', error);
      // Don't throw error for logging failures
    }
  }

  // Get audit log for principal actions
  static async getAuditLog(principalId, filters = {}) {
    try {
      const principal = await User.findById(principalId);
      let whereClause = 'WHERE p.school_id = ?';
      let params = [principal.schoolId];

      if (filters.actionType) {
        whereClause += ' AND pal.action_type = ?';
        params.push(filters.actionType);
      }

      if (filters.targetType) {
        whereClause += ' AND pal.target_type = ?';
        params.push(filters.targetType);
      }

      if (filters.startDate) {
        whereClause += ' AND pal.created_at >= ?';
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        whereClause += ' AND pal.created_at <= ?';
        params.push(filters.endDate);
      }

      const result = await query(`
        SELECT pal.*, 
               p.first_name || ' ' || p.last_name as principal_name
        FROM principal_audit_log pal
        JOIN users p ON pal.principal_id = p.id
        ${whereClause}
        ORDER BY pal.created_at DESC
        LIMIT 1000
      `, params);

      return result.rows;
    } catch (error) {
      console.error('Error getting audit log:', error);
      throw new Error('שגיאה בקבלת יומן פעולות');
    }
  }
}

module.exports = PrincipalService;
