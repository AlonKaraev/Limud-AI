/**
 * Content Cleanup Service for Limud AI
 * Handles automatic expiration and cleanup of shared content
 */

const { query, run } = require('../config/database-sqlite');
const { logContentAccess } = require('../middleware/contentSecurity');

class ContentCleanupService {
  constructor() {
    this.isRunning = false;
    this.cleanupInterval = null;
    this.intervalMs = 60 * 60 * 1000; // Run every hour
  }

  /**
   * Start the cleanup service
   */
  start() {
    if (this.isRunning) {
      console.log('Content cleanup service is already running');
      return;
    }

    console.log('Starting content cleanup service...');
    this.isRunning = true;
    
    // Run initial cleanup
    this.runCleanup();
    
    // Schedule periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, this.intervalMs);
  }

  /**
   * Stop the cleanup service
   */
  stop() {
    if (!this.isRunning) {
      console.log('Content cleanup service is not running');
      return;
    }

    console.log('Stopping content cleanup service...');
    this.isRunning = false;
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Run cleanup operations
   */
  async runCleanup() {
    try {
      console.log('Running content cleanup...');
      
      const results = {
        expiredShares: 0,
        cleanedSnapshots: 0,
        cleanedLogs: 0,
        cleanedNotifications: 0
      };

      // Clean expired content shares
      results.expiredShares = await this.cleanupExpiredShares();
      
      // Clean orphaned content snapshots
      results.cleanedSnapshots = await this.cleanupOrphanedSnapshots();
      
      // Clean old access logs (keep 90 days)
      results.cleanedLogs = await this.cleanupOldAccessLogs();
      
      // Clean old notifications (keep 30 days for read, 90 days for unread)
      results.cleanedNotifications = await this.cleanupOldNotifications();
      
      // Clean expired consent records
      await this.cleanupExpiredConsent();

      console.log('Content cleanup completed:', results);
      
      // Log cleanup activity
      await this.logCleanupActivity(results);
      
    } catch (error) {
      console.error('Error during content cleanup:', error);
    }
  }

  /**
   * Clean up expired content shares
   */
  async cleanupExpiredShares() {
    try {
      // Find expired shares
      const expiredShares = await query(`
        SELECT id, recording_id, teacher_id, share_type, end_date
        FROM content_shares 
        WHERE is_active = 1 
          AND end_date IS NOT NULL 
          AND end_date < datetime('now')
      `);

      if (expiredShares.rows.length === 0) {
        return 0;
      }

      console.log(`Found ${expiredShares.rows.length} expired content shares`);

      // Deactivate expired shares
      for (const share of expiredShares.rows) {
        await run(`
          UPDATE content_shares 
          SET is_active = 0, updated_at = datetime('now')
          WHERE id = ?
        `, [share.id]);

        // Log expiration audit
        await run(`
          INSERT INTO content_sharing_audit (
            share_id, action, performed_by, details, created_at
          ) VALUES (?, 'expired', NULL, ?, datetime('now'))
        `, [
          share.id,
          JSON.stringify({
            reason: 'automatic_expiration',
            expired_at: new Date().toISOString(),
            original_end_date: share.end_date
          })
        ]);

        // Log access for audit trail
        await logContentAccess({
          userId: null,
          contentType: 'content_share',
          contentId: share.recording_id,
          action: 'expired',
          ipAddress: 'system',
          userAgent: 'ContentCleanupService',
          metadata: {
            shareId: share.id,
            shareType: share.share_type,
            teacherId: share.teacher_id
          }
        });
      }

      return expiredShares.rows.length;
    } catch (error) {
      console.error('Error cleaning up expired shares:', error);
      return 0;
    }
  }

  /**
   * Clean up orphaned content snapshots
   */
  async cleanupOrphanedSnapshots() {
    try {
      // Find snapshots for inactive or deleted shares
      const orphanedSnapshots = await query(`
        SELECT cs.id, cs.original_content_type, cs.original_content_id
        FROM content_snapshots cs
        LEFT JOIN content_shares sh ON cs.created_for_share_id = sh.id
        WHERE sh.id IS NULL OR sh.is_active = 0
      `);

      if (orphanedSnapshots.rows.length === 0) {
        return 0;
      }

      console.log(`Found ${orphanedSnapshots.rows.length} orphaned content snapshots`);

      // Delete orphaned snapshots
      for (const snapshot of orphanedSnapshots.rows) {
        await run(`
          DELETE FROM content_snapshots WHERE id = ?
        `, [snapshot.id]);
      }

      return orphanedSnapshots.rows.length;
    } catch (error) {
      console.error('Error cleaning up orphaned snapshots:', error);
      return 0;
    }
  }

  /**
   * Clean up old access logs (keep 90 days)
   */
  async cleanupOldAccessLogs() {
    try {
      const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      
      const result = await run(`
        DELETE FROM content_access_log 
        WHERE created_at < ?
      `, [cutoffDate]);

      const deletedCount = result.changes || 0;
      if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} old access log entries`);
      }

      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old access logs:', error);
      return 0;
    }
  }

  /**
   * Clean up old notifications
   */
  async cleanupOldNotifications() {
    try {
      // Delete read notifications older than 30 days
      const readCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const readResult = await run(`
        DELETE FROM student_notifications 
        WHERE is_read = 1 AND read_at < ?
      `, [readCutoff]);

      // Delete unread notifications older than 90 days
      const unreadCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const unreadResult = await run(`
        DELETE FROM student_notifications 
        WHERE is_read = 0 AND created_at < ?
      `, [unreadCutoff]);

      const totalDeleted = (readResult.changes || 0) + (unreadResult.changes || 0);
      if (totalDeleted > 0) {
        console.log(`Cleaned up ${totalDeleted} old notifications`);
      }

      return totalDeleted;
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      return 0;
    }
  }

  /**
   * Clean up expired consent records
   */
  async cleanupExpiredConsent() {
    try {
      // Mark expired consent as withdrawn
      const result = await run(`
        UPDATE student_consent 
        SET consent_given = 0, 
            withdrawal_date = datetime('now'),
            updated_at = datetime('now')
        WHERE consent_given = 1 
          AND expiry_date IS NOT NULL 
          AND expiry_date < datetime('now')
          AND withdrawal_date IS NULL
      `);

      const updatedCount = result.changes || 0;
      if (updatedCount > 0) {
        console.log(`Marked ${updatedCount} expired consent records as withdrawn`);
      }

      return updatedCount;
    } catch (error) {
      console.error('Error cleaning up expired consent:', error);
      return 0;
    }
  }

  /**
   * Log cleanup activity
   */
  async logCleanupActivity(results) {
    try {
      await logContentAccess({
        userId: null,
        contentType: 'system_cleanup',
        contentId: null,
        action: 'cleanup_completed',
        ipAddress: 'system',
        userAgent: 'ContentCleanupService',
        metadata: {
          timestamp: new Date().toISOString(),
          results
        }
      });
    } catch (error) {
      console.error('Error logging cleanup activity:', error);
    }
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats() {
    try {
      const stats = {};

      // Count expired shares
      const expiredShares = await query(`
        SELECT COUNT(*) as count
        FROM content_shares 
        WHERE is_active = 0 AND end_date < datetime('now')
      `);
      stats.expiredShares = expiredShares.rows[0]?.count || 0;

      // Count active shares
      const activeShares = await query(`
        SELECT COUNT(*) as count
        FROM content_shares 
        WHERE is_active = 1
      `);
      stats.activeShares = activeShares.rows[0]?.count || 0;

      // Count content snapshots
      const snapshots = await query(`
        SELECT COUNT(*) as count FROM content_snapshots
      `);
      stats.contentSnapshots = snapshots.rows[0]?.count || 0;

      // Count access logs (last 30 days)
      const recentLogs = await query(`
        SELECT COUNT(*) as count
        FROM content_access_log 
        WHERE created_at > datetime('now', '-30 days')
      `);
      stats.recentAccessLogs = recentLogs.rows[0]?.count || 0;

      // Count notifications
      const notifications = await query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN is_read = 1 THEN 1 ELSE 0 END) as read,
          SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread
        FROM student_notifications
      `);
      stats.notifications = {
        total: notifications.rows[0]?.total || 0,
        read: notifications.rows[0]?.read || 0,
        unread: notifications.rows[0]?.unread || 0
      };

      return stats;
    } catch (error) {
      console.error('Error getting cleanup stats:', error);
      return {};
    }
  }

  /**
   * Force cleanup of specific content
   */
  async forceCleanupContent(contentId, contentType) {
    try {
      console.log(`Force cleaning up content: ${contentType} ${contentId}`);

      let deletedCount = 0;

      switch (contentType) {
        case 'share':
          // Deactivate specific share
          await run(`
            UPDATE content_shares 
            SET is_active = 0, updated_at = datetime('now')
            WHERE id = ?
          `, [contentId]);
          deletedCount = 1;
          break;

        case 'snapshot':
          // Delete specific snapshot
          const snapshotResult = await run(`
            DELETE FROM content_snapshots WHERE id = ?
          `, [contentId]);
          deletedCount = snapshotResult.changes || 0;
          break;

        case 'notification':
          // Delete specific notification
          const notificationResult = await run(`
            DELETE FROM student_notifications WHERE id = ?
          `, [contentId]);
          deletedCount = notificationResult.changes || 0;
          break;

        default:
          throw new Error(`Unknown content type: ${contentType}`);
      }

      // Log forced cleanup
      await logContentAccess({
        userId: null,
        contentType: 'forced_cleanup',
        contentId,
        action: 'force_cleanup',
        ipAddress: 'system',
        userAgent: 'ContentCleanupService',
        metadata: {
          contentType,
          deletedCount,
          timestamp: new Date().toISOString()
        }
      });

      return deletedCount;
    } catch (error) {
      console.error('Error in force cleanup:', error);
      throw error;
    }
  }
}

// Export singleton instance
const contentCleanupService = new ContentCleanupService();

module.exports = contentCleanupService;
