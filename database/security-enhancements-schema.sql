-- Security and Privacy Enhancements Schema for Limud AI
-- Extends existing schema with audit logging, consent management, and security features

-- Content Access Audit Log
CREATE TABLE IF NOT EXISTS content_access_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('transcription', 'summary', 'test', 'recording')),
    content_id INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('view', 'download', 'share', 'access', 'delete')),
    ip_address TEXT,
    user_agent TEXT,
    session_id VARCHAR(255),
    metadata TEXT DEFAULT '{}', -- JSON string for SQLite compatibility
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Student Consent Management
CREATE TABLE IF NOT EXISTS student_consent (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL CHECK (consent_type IN ('content_sharing', 'data_processing', 'ai_analysis')),
    consent_given BOOLEAN NOT NULL DEFAULT 0,
    parent_consent BOOLEAN DEFAULT 0,
    consent_date DATETIME,
    expiry_date DATETIME,
    withdrawal_date DATETIME,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(student_id, consent_type)
);

-- Content Security Metadata
CREATE TABLE IF NOT EXISTS content_security_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content_type VARCHAR(50) NOT NULL,
    content_id INTEGER NOT NULL,
    classification_level VARCHAR(20) DEFAULT 'public' CHECK (classification_level IN ('public', 'restricted', 'confidential')),
    pii_detected BOOLEAN DEFAULT 0,
    pii_redacted BOOLEAN DEFAULT 0,
    redaction_count INTEGER DEFAULT 0,
    quality_score INTEGER DEFAULT 100,
    quality_issues TEXT DEFAULT '[]', -- JSON array as string
    sharing_token VARCHAR(255) UNIQUE,
    expires_at DATETIME,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(content_type, content_id)
);

-- Rate Limiting Tracking
CREATE TABLE IF NOT EXISTS rate_limit_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    action_count INTEGER DEFAULT 1,
    window_start DATETIME NOT NULL,
    window_end DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, action_type, window_start)
);

-- Content Sharing Audit
CREATE TABLE IF NOT EXISTS content_sharing_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    share_id INTEGER NOT NULL REFERENCES content_shares(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'modified', 'accessed', 'expired', 'revoked')),
    performed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    affected_users TEXT, -- JSON array of user IDs as string
    details TEXT DEFAULT '{}', -- JSON string
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Privacy Impact Assessments
CREATE TABLE IF NOT EXISTS privacy_impact_assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content_type VARCHAR(50) NOT NULL,
    assessment_data TEXT NOT NULL, -- JSON string
    risk_level VARCHAR(20) DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    mitigation_measures TEXT, -- JSON array as string
    approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approval_date DATETIME,
    review_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Content Snapshots for Immutable Sharing
CREATE TABLE IF NOT EXISTS content_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_content_type VARCHAR(50) NOT NULL,
    original_content_id INTEGER NOT NULL,
    snapshot_data TEXT NOT NULL, -- JSON string of the content at time of sharing
    content_hash VARCHAR(64) NOT NULL, -- SHA-256 hash for integrity
    created_for_share_id INTEGER REFERENCES content_shares(id) ON DELETE CASCADE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(original_content_type, original_content_id, created_for_share_id)
);

-- Student Notification Preferences
CREATE TABLE IF NOT EXISTS student_notification_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    enabled BOOLEAN DEFAULT 1,
    delivery_method VARCHAR(20) DEFAULT 'in_app' CHECK (delivery_method IN ('in_app', 'email', 'sms', 'none')),
    frequency VARCHAR(20) DEFAULT 'immediate' CHECK (frequency IN ('immediate', 'daily', 'weekly', 'none')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(student_id, notification_type)
);

-- Enhanced Content Shares with Security Features
-- Add new columns to existing content_shares table
ALTER TABLE content_shares ADD COLUMN sharing_token VARCHAR(255) UNIQUE;
ALTER TABLE content_shares ADD COLUMN classification_level VARCHAR(20) DEFAULT 'public';
ALTER TABLE content_shares ADD COLUMN requires_consent BOOLEAN DEFAULT 0;
ALTER TABLE content_shares ADD COLUMN auto_expire_days INTEGER DEFAULT 30;
ALTER TABLE content_shares ADD COLUMN access_count INTEGER DEFAULT 0;
ALTER TABLE content_shares ADD COLUMN last_accessed_at DATETIME;

-- Enhanced Student Notifications with Privacy Controls
ALTER TABLE student_notifications ADD COLUMN requires_consent BOOLEAN DEFAULT 0;
ALTER TABLE student_notifications ADD COLUMN consent_obtained BOOLEAN DEFAULT 0;
ALTER TABLE student_notifications ADD COLUMN privacy_level VARCHAR(20) DEFAULT 'standard';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_access_log_user_id ON content_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_content_access_log_content_type ON content_access_log(content_type);
CREATE INDEX IF NOT EXISTS idx_content_access_log_created_at ON content_access_log(created_at);
CREATE INDEX IF NOT EXISTS idx_content_access_log_action ON content_access_log(action);

CREATE INDEX IF NOT EXISTS idx_student_consent_student_id ON student_consent(student_id);
CREATE INDEX IF NOT EXISTS idx_student_consent_type ON student_consent(consent_type);
CREATE INDEX IF NOT EXISTS idx_student_consent_given ON student_consent(consent_given);

CREATE INDEX IF NOT EXISTS idx_content_security_metadata_content ON content_security_metadata(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_security_metadata_classification ON content_security_metadata(classification_level);
CREATE INDEX IF NOT EXISTS idx_content_security_metadata_token ON content_security_metadata(sharing_token);
CREATE INDEX IF NOT EXISTS idx_content_security_metadata_expires ON content_security_metadata(expires_at);

CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_user_action ON rate_limit_tracking(user_id, action_type);
CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_window ON rate_limit_tracking(window_start, window_end);

CREATE INDEX IF NOT EXISTS idx_content_sharing_audit_share_id ON content_sharing_audit(share_id);
CREATE INDEX IF NOT EXISTS idx_content_sharing_audit_action ON content_sharing_audit(action);
CREATE INDEX IF NOT EXISTS idx_content_sharing_audit_created_at ON content_sharing_audit(created_at);

CREATE INDEX IF NOT EXISTS idx_content_snapshots_original ON content_snapshots(original_content_type, original_content_id);
CREATE INDEX IF NOT EXISTS idx_content_snapshots_share_id ON content_snapshots(created_for_share_id);
CREATE INDEX IF NOT EXISTS idx_content_snapshots_hash ON content_snapshots(content_hash);

CREATE INDEX IF NOT EXISTS idx_student_notification_preferences_student ON student_notification_preferences(student_id);
CREATE INDEX IF NOT EXISTS idx_student_notification_preferences_type ON student_notification_preferences(notification_type);

-- Create triggers for automatic updates
CREATE TRIGGER IF NOT EXISTS update_student_consent_updated_at 
BEFORE UPDATE ON student_consent
FOR EACH ROW 
BEGIN
    UPDATE student_consent SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_content_security_metadata_updated_at 
BEFORE UPDATE ON content_security_metadata
FOR EACH ROW 
BEGIN
    UPDATE content_security_metadata SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_privacy_impact_assessments_updated_at 
BEFORE UPDATE ON privacy_impact_assessments
FOR EACH ROW 
BEGIN
    UPDATE privacy_impact_assessments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_student_notification_preferences_updated_at 
BEFORE UPDATE ON student_notification_preferences
FOR EACH ROW 
BEGIN
    UPDATE student_notification_preferences SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger to update access count when content is accessed
CREATE TRIGGER IF NOT EXISTS update_content_share_access_count
AFTER INSERT ON student_content_access
FOR EACH ROW
BEGIN
    UPDATE content_shares 
    SET access_count = access_count + 1,
        last_accessed_at = CURRENT_TIMESTAMP
    WHERE id = NEW.content_share_id;
END;

-- Insert default notification preferences for existing students
INSERT OR IGNORE INTO student_notification_preferences (student_id, notification_type, enabled, delivery_method)
SELECT u.id, 'content_shared', 1, 'in_app'
FROM users u 
WHERE u.role = 'student';

INSERT OR IGNORE INTO student_notification_preferences (student_id, notification_type, enabled, delivery_method)
SELECT u.id, 'assignment_due', 1, 'in_app'
FROM users u 
WHERE u.role = 'student';

-- Insert default consent records for existing students (requiring explicit consent)
INSERT OR IGNORE INTO student_consent (student_id, consent_type, consent_given, consent_date)
SELECT u.id, 'content_sharing', 0, NULL
FROM users u 
WHERE u.role = 'student';

INSERT OR IGNORE INTO student_consent (student_id, consent_type, consent_given, consent_date)
SELECT u.id, 'data_processing', 0, NULL
FROM users u 
WHERE u.role = 'student';

INSERT OR IGNORE INTO student_consent (student_id, consent_type, consent_given, consent_date)
SELECT u.id, 'ai_analysis', 0, NULL
FROM users u 
WHERE u.role = 'student';

-- Create view for easy consent checking
CREATE VIEW IF NOT EXISTS student_consent_status AS
SELECT 
    u.id as student_id,
    u.first_name,
    u.last_name,
    u.email,
    sc_sharing.consent_given as content_sharing_consent,
    sc_sharing.consent_date as content_sharing_date,
    sc_processing.consent_given as data_processing_consent,
    sc_processing.consent_date as data_processing_date,
    sc_ai.consent_given as ai_analysis_consent,
    sc_ai.consent_date as ai_analysis_date,
    CASE 
        WHEN sc_sharing.consent_given = 1 AND sc_processing.consent_given = 1 
        THEN 1 ELSE 0 
    END as can_share_content
FROM users u
LEFT JOIN student_consent sc_sharing ON u.id = sc_sharing.student_id AND sc_sharing.consent_type = 'content_sharing'
LEFT JOIN student_consent sc_processing ON u.id = sc_processing.student_id AND sc_processing.consent_type = 'data_processing'
LEFT JOIN student_consent sc_ai ON u.id = sc_ai.student_id AND sc_ai.consent_type = 'ai_analysis'
WHERE u.role = 'student';

-- Create view for content security overview
CREATE VIEW IF NOT EXISTS content_security_overview AS
SELECT 
    csm.content_type,
    csm.content_id,
    csm.classification_level,
    csm.pii_detected,
    csm.pii_redacted,
    csm.quality_score,
    csm.sharing_token,
    csm.expires_at,
    cs.id as share_id,
    cs.is_active as share_active,
    cs.access_count,
    cs.last_accessed_at,
    u.first_name || ' ' || u.last_name as created_by_name
FROM content_security_metadata csm
LEFT JOIN content_shares cs ON csm.sharing_token = cs.sharing_token
LEFT JOIN users u ON csm.created_by = u.id;
