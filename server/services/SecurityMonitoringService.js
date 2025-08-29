const db = require('../config/database-sqlite');
const fs = require('fs').promises;
const path = require('path');

/**
 * Security Monitoring and Alerting Service
 * Monitors security events, generates alerts, and provides security analytics
 */
class SecurityMonitoringService {
    constructor() {
        this.alertThresholds = {
            failedLogins: { count: 5, timeWindow: 300 }, // 5 failures in 5 minutes
            suspiciousAccess: { count: 10, timeWindow: 600 }, // 10 suspicious accesses in 10 minutes
            rateLimit: { count: 100, timeWindow: 3600 }, // 100 rate limit hits in 1 hour
            piiDetection: { count: 3, timeWindow: 1800 }, // 3 PII detections in 30 minutes
            unauthorizedAccess: { count: 3, timeWindow: 900 }, // 3 unauthorized attempts in 15 minutes
            dataExfiltration: { count: 50, timeWindow: 3600 } // 50 large downloads in 1 hour
        };

        this.alertChannels = {
            console: true,
            database: true,
            file: true,
            email: false // Would need email service configuration
        };

        this.logFile = path.join(__dirname, '../logs/security-alerts.log');
        this.metricsFile = path.join(__dirname, '../logs/security-metrics.json');
        
        // Ensure logs directory exists
        this.initializeLogging();
    }

    async initializeLogging() {
        try {
            const logsDir = path.dirname(this.logFile);
            await fs.mkdir(logsDir, { recursive: true });
        } catch (error) {
            console.error('Failed to initialize security logging:', error);
        }
    }

    /**
     * Monitor security events and trigger alerts
     */
    async monitorSecurityEvents() {
        try {
            const now = new Date();
            const alerts = [];

            // Check for failed login attempts
            const failedLogins = await this.checkFailedLogins();
            if (failedLogins.length > 0) {
                alerts.push(...failedLogins);
            }

            // Check for suspicious access patterns
            const suspiciousAccess = await this.checkSuspiciousAccess();
            if (suspiciousAccess.length > 0) {
                alerts.push(...suspiciousAccess);
            }

            // Check for rate limit violations
            const rateLimitViolations = await this.checkRateLimitViolations();
            if (rateLimitViolations.length > 0) {
                alerts.push(...rateLimitViolations);
            }

            // Check for PII detection events
            const piiDetections = await this.checkPIIDetections();
            if (piiDetections.length > 0) {
                alerts.push(...piiDetections);
            }

            // Check for unauthorized access attempts
            const unauthorizedAccess = await this.checkUnauthorizedAccess();
            if (unauthorizedAccess.length > 0) {
                alerts.push(...unauthorizedAccess);
            }

            // Process alerts
            for (const alert of alerts) {
                await this.processAlert(alert);
            }

            // Update security metrics
            await this.updateSecurityMetrics(alerts);

            return {
                timestamp: now.toISOString(),
                alertsGenerated: alerts.length,
                alerts: alerts.map(a => ({ type: a.type, severity: a.severity, message: a.message }))
            };

        } catch (error) {
            console.error('Error in security monitoring:', error);
            await this.logError('Security monitoring failed', error);
            return { error: error.message };
        }
    }

    async checkFailedLogins() {
        const threshold = this.alertThresholds.failedLogins;
        const timeWindow = new Date(Date.now() - threshold.timeWindow * 1000);

        const failedAttempts = await db.all(`
            SELECT 
                ip_address,
                COUNT(*) as attempt_count,
                MAX(created_at) as last_attempt,
                GROUP_CONCAT(DISTINCT user_id) as attempted_users
            FROM content_access_log 
            WHERE action_type = 'failed_login' 
                AND created_at > ?
            GROUP BY ip_address
            HAVING attempt_count >= ?
        `, [timeWindow.toISOString(), threshold.count]);

        return failedAttempts.map(attempt => ({
            type: 'failed_logins',
            severity: 'high',
            message: `Multiple failed login attempts detected from IP ${attempt.ip_address}`,
            messageHe: `זוהו ניסיונות התחברות כושלים מרובים מכתובת IP ${attempt.ip_address}`,
            details: {
                ipAddress: attempt.ip_address,
                attemptCount: attempt.attempt_count,
                lastAttempt: attempt.last_attempt,
                attemptedUsers: attempt.attempted_users?.split(',') || []
            },
            timestamp: new Date().toISOString()
        }));
    }

    async checkSuspiciousAccess() {
        const threshold = this.alertThresholds.suspiciousAccess;
        const timeWindow = new Date(Date.now() - threshold.timeWindow * 1000);

        const suspiciousPatterns = await db.all(`
            SELECT 
                user_id,
                ip_address,
                COUNT(*) as access_count,
                COUNT(DISTINCT resource_id) as unique_resources,
                GROUP_CONCAT(DISTINCT action_type) as action_types
            FROM content_access_log 
            WHERE created_at > ?
                AND action_type IN ('content_access', 'download', 'share')
            GROUP BY user_id, ip_address
            HAVING access_count >= ? OR unique_resources >= 20
        `, [timeWindow.toISOString(), threshold.count]);

        return suspiciousPatterns.map(pattern => ({
            type: 'suspicious_access',
            severity: pattern.access_count > 50 ? 'critical' : 'medium',
            message: `Suspicious access pattern detected for user ${pattern.user_id}`,
            messageHe: `זוהה דפוס גישה חשוד עבור משתמש ${pattern.user_id}`,
            details: {
                userId: pattern.user_id,
                ipAddress: pattern.ip_address,
                accessCount: pattern.access_count,
                uniqueResources: pattern.unique_resources,
                actionTypes: pattern.action_types?.split(',') || []
            },
            timestamp: new Date().toISOString()
        }));
    }

    async checkRateLimitViolations() {
        const threshold = this.alertThresholds.rateLimit;
        const timeWindow = new Date(Date.now() - threshold.timeWindow * 1000);

        const violations = await db.all(`
            SELECT 
                user_id,
                ip_address,
                COUNT(*) as violation_count,
                MAX(created_at) as last_violation
            FROM rate_limit_tracking 
            WHERE created_at > ?
                AND is_blocked = 1
            GROUP BY user_id, ip_address
            HAVING violation_count >= ?
        `, [timeWindow.toISOString(), threshold.count]);

        return violations.map(violation => ({
            type: 'rate_limit_violations',
            severity: 'medium',
            message: `Excessive rate limit violations from user ${violation.user_id}`,
            messageHe: `הפרות מרובות של מגבלת קצב מהמשתמש ${violation.user_id}`,
            details: {
                userId: violation.user_id,
                ipAddress: violation.ip_address,
                violationCount: violation.violation_count,
                lastViolation: violation.last_violation
            },
            timestamp: new Date().toISOString()
        }));
    }

    async checkPIIDetections() {
        const threshold = this.alertThresholds.piiDetection;
        const timeWindow = new Date(Date.now() - threshold.timeWindow * 1000);

        const detections = await db.all(`
            SELECT 
                user_id,
                COUNT(*) as detection_count,
                GROUP_CONCAT(DISTINCT resource_id) as affected_resources,
                MAX(created_at) as last_detection
            FROM content_access_log 
            WHERE action_type = 'pii_detected' 
                AND created_at > ?
            GROUP BY user_id
            HAVING detection_count >= ?
        `, [timeWindow.toISOString(), threshold.count]);

        return detections.map(detection => ({
            type: 'pii_detections',
            severity: 'high',
            message: `Multiple PII detections for user ${detection.user_id}`,
            messageHe: `זוהו מספר מקרים של מידע אישי עבור משתמש ${detection.user_id}`,
            details: {
                userId: detection.user_id,
                detectionCount: detection.detection_count,
                affectedResources: detection.affected_resources?.split(',') || [],
                lastDetection: detection.last_detection
            },
            timestamp: new Date().toISOString()
        }));
    }

    async checkUnauthorizedAccess() {
        const threshold = this.alertThresholds.unauthorizedAccess;
        const timeWindow = new Date(Date.now() - threshold.timeWindow * 1000);

        const unauthorized = await db.all(`
            SELECT 
                user_id,
                ip_address,
                COUNT(*) as attempt_count,
                GROUP_CONCAT(DISTINCT resource_id) as attempted_resources,
                MAX(created_at) as last_attempt
            FROM content_access_log 
            WHERE action_type = 'unauthorized_access' 
                AND created_at > ?
            GROUP BY user_id, ip_address
            HAVING attempt_count >= ?
        `, [timeWindow.toISOString(), threshold.count]);

        return unauthorized.map(attempt => ({
            type: 'unauthorized_access',
            severity: 'critical',
            message: `Multiple unauthorized access attempts by user ${attempt.user_id}`,
            messageHe: `ניסיונות גישה לא מורשים מרובים מהמשתמש ${attempt.user_id}`,
            details: {
                userId: attempt.user_id,
                ipAddress: attempt.ip_address,
                attemptCount: attempt.attempt_count,
                attemptedResources: attempt.attempted_resources?.split(',') || [],
                lastAttempt: attempt.last_attempt
            },
            timestamp: new Date().toISOString()
        }));
    }

    async processAlert(alert) {
        try {
            // Log to console
            if (this.alertChannels.console) {
                console.warn(`🚨 SECURITY ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
            }

            // Save to database
            if (this.alertChannels.database) {
                await db.run(`
                    INSERT INTO security_alerts (
                        alert_type, severity, message, message_he, details, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    alert.type,
                    alert.severity,
                    alert.message,
                    alert.messageHe || '',
                    JSON.stringify(alert.details || {}),
                    alert.timestamp
                ]);
            }

            // Log to file
            if (this.alertChannels.file) {
                await this.logToFile(alert);
            }

            // Send email (if configured)
            if (this.alertChannels.email && alert.severity === 'critical') {
                await this.sendEmailAlert(alert);
            }

        } catch (error) {
            console.error('Error processing security alert:', error);
        }
    }

    async logToFile(alert) {
        try {
            const logEntry = {
                timestamp: alert.timestamp,
                type: alert.type,
                severity: alert.severity,
                message: alert.message,
                details: alert.details
            };

            await fs.appendFile(this.logFile, JSON.stringify(logEntry) + '\n');
        } catch (error) {
            console.error('Error writing to security log file:', error);
        }
    }

    async sendEmailAlert(alert) {
        // Placeholder for email alert functionality
        // Would integrate with email service (SendGrid, AWS SES, etc.)
        console.log(`📧 Email alert would be sent for: ${alert.message}`);
    }

    async updateSecurityMetrics(alerts) {
        try {
            const now = new Date();
            const today = now.toISOString().split('T')[0];

            // Load existing metrics
            let metrics = {};
            try {
                const metricsData = await fs.readFile(this.metricsFile, 'utf8');
                metrics = JSON.parse(metricsData);
            } catch (error) {
                // File doesn't exist or is invalid, start fresh
                metrics = {};
            }

            // Initialize today's metrics if not exists
            if (!metrics[today]) {
                metrics[today] = {
                    date: today,
                    totalAlerts: 0,
                    alertsBySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
                    alertsByType: {},
                    lastUpdated: now.toISOString()
                };
            }

            // Update metrics with new alerts
            for (const alert of alerts) {
                metrics[today].totalAlerts++;
                metrics[today].alertsBySeverity[alert.severity]++;
                
                if (!metrics[today].alertsByType[alert.type]) {
                    metrics[today].alertsByType[alert.type] = 0;
                }
                metrics[today].alertsByType[alert.type]++;
            }

            metrics[today].lastUpdated = now.toISOString();

            // Keep only last 30 days of metrics
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];
            
            Object.keys(metrics).forEach(date => {
                if (date < cutoffDate) {
                    delete metrics[date];
                }
            });

            // Save updated metrics
            await fs.writeFile(this.metricsFile, JSON.stringify(metrics, null, 2));

        } catch (error) {
            console.error('Error updating security metrics:', error);
        }
    }

    async getSecurityMetrics(days = 7) {
        try {
            const metricsData = await fs.readFile(this.metricsFile, 'utf8');
            const allMetrics = JSON.parse(metricsData);

            const endDate = new Date();
            const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

            const filteredMetrics = {};
            Object.keys(allMetrics).forEach(date => {
                const metricDate = new Date(date);
                if (metricDate >= startDate && metricDate <= endDate) {
                    filteredMetrics[date] = allMetrics[date];
                }
            });

            // Calculate summary statistics
            const summary = {
                totalAlerts: 0,
                alertsBySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
                alertsByType: {},
                dailyMetrics: filteredMetrics
            };

            Object.values(filteredMetrics).forEach(dayMetrics => {
                summary.totalAlerts += dayMetrics.totalAlerts;
                
                Object.keys(dayMetrics.alertsBySeverity).forEach(severity => {
                    summary.alertsBySeverity[severity] += dayMetrics.alertsBySeverity[severity];
                });

                Object.keys(dayMetrics.alertsByType).forEach(type => {
                    if (!summary.alertsByType[type]) {
                        summary.alertsByType[type] = 0;
                    }
                    summary.alertsByType[type] += dayMetrics.alertsByType[type];
                });
            });

            return summary;

        } catch (error) {
            console.error('Error reading security metrics:', error);
            return {
                totalAlerts: 0,
                alertsBySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
                alertsByType: {},
                dailyMetrics: {},
                error: 'Failed to load metrics'
            };
        }
    }

    async getRecentAlerts(limit = 50) {
        try {
            const alerts = await db.all(`
                SELECT * FROM security_alerts 
                ORDER BY created_at DESC 
                LIMIT ?
            `, [limit]);

            return alerts.map(alert => ({
                id: alert.id,
                type: alert.alert_type,
                severity: alert.severity,
                message: alert.message,
                messageHe: alert.message_he,
                details: JSON.parse(alert.details || '{}'),
                createdAt: alert.created_at,
                acknowledged: alert.acknowledged === 1,
                acknowledgedBy: alert.acknowledged_by,
                acknowledgedAt: alert.acknowledged_at
            }));

        } catch (error) {
            console.error('Error fetching recent alerts:', error);
            return [];
        }
    }

    async acknowledgeAlert(alertId, userId) {
        try {
            const result = await db.run(`
                UPDATE security_alerts 
                SET acknowledged = 1, 
                    acknowledged_by = ?, 
                    acknowledged_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `, [userId, alertId]);

            return result.changes > 0;
        } catch (error) {
            console.error('Error acknowledging alert:', error);
            return false;
        }
    }

    async logError(message, error) {
        try {
            const errorLog = {
                timestamp: new Date().toISOString(),
                message,
                error: error.message,
                stack: error.stack
            };

            const errorLogFile = path.join(path.dirname(this.logFile), 'security-errors.log');
            await fs.appendFile(errorLogFile, JSON.stringify(errorLog) + '\n');
        } catch (logError) {
            console.error('Failed to log security error:', logError);
        }
    }

    // Start monitoring service
    startMonitoring(intervalMinutes = 5) {
        console.log(`🔒 Starting security monitoring service (checking every ${intervalMinutes} minutes)`);
        
        // Run initial check
        this.monitorSecurityEvents();

        // Set up recurring monitoring
        this.monitoringInterval = setInterval(() => {
            this.monitorSecurityEvents();
        }, intervalMinutes * 60 * 1000);

        return this.monitoringInterval;
    }

    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            console.log('🔒 Security monitoring service stopped');
        }
    }
}

module.exports = SecurityMonitoringService;
