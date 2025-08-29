const express = require('express');
const router = express.Router();
const db = require('../config/database-sqlite');
const { authenticateToken } = require('../middleware/auth');
const contentSecurity = require('../middleware/contentSecurity');

/**
 * Student Consent Management Routes
 * Handles student consent for content sharing, privacy preferences, and FERPA compliance
 */

// Get student's current consent status
router.get('/status/:studentId', authenticateToken, async (req, res) => {
    try {
        const { studentId } = req.params;
        
        // Validate student access (students can only view their own consent, teachers/principals can view their students)
        if (req.user.role === 'student' && req.user.id !== parseInt(studentId)) {
            return res.status(403).json({
                success: false,
                message: 'אין הרשאה לצפות בהסכמות של תלמיד אחר',
                messageEn: 'Not authorized to view another student\'s consent'
            });
        }

        const consent = await db.get(`
            SELECT 
                sc.*,
                u.name as student_name,
                u.class_id
            FROM student_consent sc
            JOIN users u ON sc.student_id = u.id
            WHERE sc.student_id = ? AND sc.is_active = 1
            ORDER BY sc.created_at DESC
            LIMIT 1
        `, [studentId]);

        if (!consent) {
            return res.json({
                success: true,
                data: {
                    hasConsent: false,
                    consentRequired: true,
                    message: 'לא נמצאה הסכמה פעילה לתלמיד זה',
                    messageEn: 'No active consent found for this student'
                }
            });
        }

        // Check if consent is expired
        const now = new Date();
        const expiresAt = new Date(consent.expires_at);
        const isExpired = expiresAt < now;

        res.json({
            success: true,
            data: {
                hasConsent: !isExpired,
                consentId: consent.id,
                studentId: consent.student_id,
                studentName: consent.student_name,
                classId: consent.class_id,
                consentType: consent.consent_type,
                dataTypes: JSON.parse(consent.data_types || '[]'),
                sharingScope: consent.sharing_scope,
                retentionPeriod: consent.retention_period_days,
                createdAt: consent.created_at,
                expiresAt: consent.expires_at,
                isExpired,
                parentalConsent: consent.parental_consent_required,
                parentalConsentGiven: consent.parental_consent_given,
                lastUpdated: consent.updated_at
            }
        });

    } catch (error) {
        console.error('Error fetching student consent:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בטעינת מצב ההסכמה',
            messageEn: 'Error loading consent status',
            error: error.message
        });
    }
});

// Create or update student consent
router.post('/update/:studentId', authenticateToken, async (req, res) => {
    try {
        const { studentId } = req.params;
        const {
            consentType = 'content_sharing',
            dataTypes = [],
            sharingScope = 'class_only',
            retentionPeriodDays = 365,
            parentalConsentGiven = false
        } = req.body;

        // Validate student access
        if (req.user.role === 'student' && req.user.id !== parseInt(studentId)) {
            return res.status(403).json({
                success: false,
                message: 'אין הרשאה לעדכן הסכמות של תלמיד אחר',
                messageEn: 'Not authorized to update another student\'s consent'
            });
        }

        // Validate required fields
        if (!Array.isArray(dataTypes) || dataTypes.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'יש לציין לפחות סוג נתונים אחד להסכמה',
                messageEn: 'At least one data type must be specified for consent'
            });
        }

        // Check if student exists and get details
        const student = await db.get(`
            SELECT id, name, class_id, birth_date 
            FROM users 
            WHERE id = ? AND role = 'student'
        `, [studentId]);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'תלמיד לא נמצא',
                messageEn: 'Student not found'
            });
        }

        // Check if parental consent is required (students under 18)
        const birthDate = new Date(student.birth_date);
        const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        const parentalConsentRequired = age < 18;

        if (parentalConsentRequired && !parentalConsentGiven) {
            return res.status(400).json({
                success: false,
                message: 'נדרשת הסכמת הורים לתלמידים מתחת לגיל 18',
                messageEn: 'Parental consent required for students under 18',
                requiresParentalConsent: true
            });
        }

        // Deactivate existing consent
        await db.run(`
            UPDATE student_consent 
            SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
            WHERE student_id = ? AND is_active = 1
        `, [studentId]);

        // Create new consent record
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + retentionPeriodDays);

        const result = await db.run(`
            INSERT INTO student_consent (
                student_id, consent_type, data_types, sharing_scope,
                retention_period_days, expires_at, parental_consent_required,
                parental_consent_given, consent_given_by, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `, [
            studentId,
            consentType,
            JSON.stringify(dataTypes),
            sharingScope,
            retentionPeriodDays,
            expiresAt.toISOString(),
            parentalConsentRequired,
            parentalConsentGiven,
            req.user.id
        ]);

        // Log the consent update
        await contentSecurity.logContentAccess(
            req.user.id,
            'consent_update',
            `student_consent_${result.lastID}`,
            req.ip,
            { studentId, consentType, dataTypes, sharingScope }
        );

        res.json({
            success: true,
            message: 'הסכמת התלמיד עודכנה בהצלחה',
            messageEn: 'Student consent updated successfully',
            data: {
                consentId: result.lastID,
                studentId,
                expiresAt: expiresAt.toISOString(),
                parentalConsentRequired,
                parentalConsentGiven
            }
        });

    } catch (error) {
        console.error('Error updating student consent:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בעדכון הסכמת התלמיד',
            messageEn: 'Error updating student consent',
            error: error.message
        });
    }
});

// Revoke student consent
router.post('/revoke/:studentId', authenticateToken, async (req, res) => {
    try {
        const { studentId } = req.params;
        const { reason = 'user_request' } = req.body;

        // Validate student access
        if (req.user.role === 'student' && req.user.id !== parseInt(studentId)) {
            return res.status(403).json({
                success: false,
                message: 'אין הרשאה לבטל הסכמות של תלמיד אחר',
                messageEn: 'Not authorized to revoke another student\'s consent'
            });
        }

        // Deactivate all active consents for the student
        const result = await db.run(`
            UPDATE student_consent 
            SET is_active = 0, 
                revoked_at = CURRENT_TIMESTAMP,
                revoked_by = ?,
                revocation_reason = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE student_id = ? AND is_active = 1
        `, [req.user.id, reason, studentId]);

        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'לא נמצאה הסכמה פעילה לביטול',
                messageEn: 'No active consent found to revoke'
            });
        }

        // Log the consent revocation
        await contentSecurity.logContentAccess(
            req.user.id,
            'consent_revoked',
            `student_${studentId}`,
            req.ip,
            { studentId, reason, revokedConsents: result.changes }
        );

        res.json({
            success: true,
            message: 'הסכמת התלמיד בוטלה בהצלחה',
            messageEn: 'Student consent revoked successfully',
            data: {
                studentId,
                revokedConsents: result.changes,
                revokedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error revoking student consent:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בביטול הסכמת התלמיד',
            messageEn: 'Error revoking student consent',
            error: error.message
        });
    }
});

// Get consent history for a student
router.get('/history/:studentId', authenticateToken, async (req, res) => {
    try {
        const { studentId } = req.params;
        const { limit = 10, offset = 0 } = req.query;

        // Validate access (only teachers/principals can view full history)
        if (req.user.role === 'student') {
            return res.status(403).json({
                success: false,
                message: 'אין הרשאה לצפות בהיסטוריית הסכמות',
                messageEn: 'Not authorized to view consent history'
            });
        }

        const history = await db.all(`
            SELECT 
                sc.*,
                u.name as student_name,
                giver.name as consent_given_by_name,
                revoker.name as revoked_by_name
            FROM student_consent sc
            JOIN users u ON sc.student_id = u.id
            LEFT JOIN users giver ON sc.consent_given_by = giver.id
            LEFT JOIN users revoker ON sc.revoked_by = revoker.id
            WHERE sc.student_id = ?
            ORDER BY sc.created_at DESC
            LIMIT ? OFFSET ?
        `, [studentId, limit, offset]);

        const total = await db.get(`
            SELECT COUNT(*) as count 
            FROM student_consent 
            WHERE student_id = ?
        `, [studentId]);

        res.json({
            success: true,
            data: {
                history: history.map(record => ({
                    id: record.id,
                    studentId: record.student_id,
                    studentName: record.student_name,
                    consentType: record.consent_type,
                    dataTypes: JSON.parse(record.data_types || '[]'),
                    sharingScope: record.sharing_scope,
                    retentionPeriod: record.retention_period_days,
                    isActive: record.is_active === 1,
                    createdAt: record.created_at,
                    expiresAt: record.expires_at,
                    revokedAt: record.revoked_at,
                    revocationReason: record.revocation_reason,
                    consentGivenBy: record.consent_given_by_name,
                    revokedBy: record.revoked_by_name,
                    parentalConsentRequired: record.parental_consent_required === 1,
                    parentalConsentGiven: record.parental_consent_given === 1
                })),
                pagination: {
                    total: total.count,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: parseInt(offset) + parseInt(limit) < total.count
                }
            }
        });

    } catch (error) {
        console.error('Error fetching consent history:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בטעינת היסטוריית הסכמות',
            messageEn: 'Error loading consent history',
            error: error.message
        });
    }
});

// Bulk consent management for class
router.post('/bulk-update/:classId', authenticateToken, async (req, res) => {
    try {
        const { classId } = req.params;
        const {
            consentType = 'content_sharing',
            dataTypes = [],
            sharingScope = 'class_only',
            retentionPeriodDays = 365,
            studentIds = []
        } = req.body;

        // Only teachers and principals can perform bulk operations
        if (!['teacher', 'principal'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'אין הרשאה לעדכון הסכמות בכמות גדולה',
                messageEn: 'Not authorized for bulk consent operations'
            });
        }

        // Validate required fields
        if (!Array.isArray(dataTypes) || dataTypes.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'יש לציין לפחות סוג נתונים אחד להסכמה',
                messageEn: 'At least one data type must be specified for consent'
            });
        }

        // Get students in the class
        let students;
        if (studentIds.length > 0) {
            const placeholders = studentIds.map(() => '?').join(',');
            students = await db.all(`
                SELECT id, name, birth_date 
                FROM users 
                WHERE id IN (${placeholders}) AND class_id = ? AND role = 'student'
            `, [...studentIds, classId]);
        } else {
            students = await db.all(`
                SELECT id, name, birth_date 
                FROM users 
                WHERE class_id = ? AND role = 'student'
            `, [classId]);
        }

        if (students.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'לא נמצאו תלמידים בכיתה זו',
                messageEn: 'No students found in this class'
            });
        }

        const results = [];
        const errors = [];

        for (const student of students) {
            try {
                // Check if parental consent is required
                const birthDate = new Date(student.birth_date);
                const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                const parentalConsentRequired = age < 18;

                // Skip students who need parental consent but don't have it
                if (parentalConsentRequired) {
                    errors.push({
                        studentId: student.id,
                        studentName: student.name,
                        error: 'נדרשת הסכמת הורים',
                        errorEn: 'Parental consent required'
                    });
                    continue;
                }

                // Deactivate existing consent
                await db.run(`
                    UPDATE student_consent 
                    SET is_active = 0, updated_at = CURRENT_TIMESTAMP 
                    WHERE student_id = ? AND is_active = 1
                `, [student.id]);

                // Create new consent record
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + retentionPeriodDays);

                const result = await db.run(`
                    INSERT INTO student_consent (
                        student_id, consent_type, data_types, sharing_scope,
                        retention_period_days, expires_at, parental_consent_required,
                        parental_consent_given, consent_given_by, is_active
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                `, [
                    student.id,
                    consentType,
                    JSON.stringify(dataTypes),
                    sharingScope,
                    retentionPeriodDays,
                    expiresAt.toISOString(),
                    parentalConsentRequired,
                    false, // Bulk operations don't include parental consent
                    req.user.id
                ]);

                results.push({
                    studentId: student.id,
                    studentName: student.name,
                    consentId: result.lastID,
                    success: true
                });

            } catch (error) {
                errors.push({
                    studentId: student.id,
                    studentName: student.name,
                    error: error.message,
                    errorEn: 'Database error'
                });
            }
        }

        // Log the bulk operation
        await contentSecurity.logContentAccess(
            req.user.id,
            'bulk_consent_update',
            `class_${classId}`,
            req.ip,
            { 
                classId, 
                consentType, 
                dataTypes, 
                sharingScope,
                successCount: results.length,
                errorCount: errors.length
            }
        );

        res.json({
            success: true,
            message: `עודכנו הסכמות עבור ${results.length} תלמידים`,
            messageEn: `Updated consent for ${results.length} students`,
            data: {
                successful: results,
                errors: errors,
                summary: {
                    total: students.length,
                    successful: results.length,
                    failed: errors.length
                }
            }
        });

    } catch (error) {
        console.error('Error in bulk consent update:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בעדכון הסכמות בכמות גדולה',
            messageEn: 'Error in bulk consent update',
            error: error.message
        });
    }
});

module.exports = router;
