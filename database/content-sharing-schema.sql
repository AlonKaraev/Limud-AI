-- Content Sharing & Student Access Management Schema Extension
-- SQLite compatible version for Limud AI
-- This extends the existing schema with tables for content sharing functionality

-- Classes/Groups table for organizing students
CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
    teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    grade_level VARCHAR(20),
    subject_area VARCHAR(100),
    academic_year VARCHAR(20) DEFAULT '2024-2025',
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(teacher_id, name, academic_year)
);

-- Student-Class membership table
CREATE TABLE IF NOT EXISTS class_memberships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    
    UNIQUE(class_id, student_id)
);

-- Content sharing permissions table
CREATE TABLE IF NOT EXISTS content_shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recording_id INTEGER NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
    teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    share_type VARCHAR(50) NOT NULL CHECK (share_type IN ('transcription', 'summary', 'test')),
    is_active BOOLEAN DEFAULT 1,
    start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_date DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(recording_id, share_type)
);

-- Class-specific content sharing (which classes can access which shared content)
CREATE TABLE IF NOT EXISTS content_share_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content_share_id INTEGER NOT NULL REFERENCES content_shares(id) ON DELETE CASCADE,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(content_share_id, class_id)
);

-- Student notifications for shared content
CREATE TABLE IF NOT EXISTS student_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_share_id INTEGER NOT NULL REFERENCES content_shares(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL DEFAULT 'content_shared',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT 0,
    read_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Student content access log (track when students access shared content)
CREATE TABLE IF NOT EXISTS student_content_access (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_share_id INTEGER NOT NULL REFERENCES content_shares(id) ON DELETE CASCADE,
    access_type VARCHAR(50) NOT NULL CHECK (access_type IN ('view', 'download')),
    accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_is_active ON classes(is_active);
CREATE INDEX IF NOT EXISTS idx_classes_academic_year ON classes(academic_year);

CREATE INDEX IF NOT EXISTS idx_class_memberships_class_id ON class_memberships(class_id);
CREATE INDEX IF NOT EXISTS idx_class_memberships_student_id ON class_memberships(student_id);
CREATE INDEX IF NOT EXISTS idx_class_memberships_is_active ON class_memberships(is_active);

CREATE INDEX IF NOT EXISTS idx_content_shares_recording_id ON content_shares(recording_id);
CREATE INDEX IF NOT EXISTS idx_content_shares_teacher_id ON content_shares(teacher_id);
CREATE INDEX IF NOT EXISTS idx_content_shares_share_type ON content_shares(share_type);
CREATE INDEX IF NOT EXISTS idx_content_shares_is_active ON content_shares(is_active);
CREATE INDEX IF NOT EXISTS idx_content_shares_start_date ON content_shares(start_date);
CREATE INDEX IF NOT EXISTS idx_content_shares_end_date ON content_shares(end_date);

CREATE INDEX IF NOT EXISTS idx_content_share_permissions_content_share_id ON content_share_permissions(content_share_id);
CREATE INDEX IF NOT EXISTS idx_content_share_permissions_class_id ON content_share_permissions(class_id);

CREATE INDEX IF NOT EXISTS idx_student_notifications_student_id ON student_notifications(student_id);
CREATE INDEX IF NOT EXISTS idx_student_notifications_created_at ON student_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_student_notifications_is_read ON student_notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_student_content_access_student_id ON student_content_access(student_id);
CREATE INDEX IF NOT EXISTS idx_student_content_access_content_share_id ON student_content_access(content_share_id);
CREATE INDEX IF NOT EXISTS idx_student_content_access_accessed_at ON student_content_access(accessed_at);

-- Insert sample data for development/testing
-- Note: These will only insert if the tables are empty and users exist

-- Sample classes (only if teacher users exist)
INSERT OR IGNORE INTO classes (name, description, teacher_id, grade_level, subject_area, academic_year) 
SELECT 
    'כיתה א׳ - מתמטיקה',
    'כיתה לימוד מתמטיקה לכיתה א׳',
    u.id,
    'א׳',
    'מתמטיקה',
    '2024-2025'
FROM users u 
WHERE u.role = 'teacher' 
LIMIT 1;

INSERT OR IGNORE INTO classes (name, description, teacher_id, grade_level, subject_area, academic_year) 
SELECT 
    'כיתה ב׳ - עברית',
    'כיתה לימוד עברית לכיתה ב׳',
    u.id,
    'ב׳',
    'עברית',
    '2024-2025'
FROM users u 
WHERE u.role = 'teacher' 
LIMIT 1;

INSERT OR IGNORE INTO classes (name, description, teacher_id, grade_level, subject_area, academic_year) 
SELECT 
    'כיתה ג׳ - מדעים',
    'כיתה לימוד מדעים לכיתה ג׳',
    u.id,
    'ג׳',
    'מדעים',
    '2024-2025'
FROM users u 
WHERE u.role = 'teacher' 
LIMIT 1;

-- Add sample students to classes (if students exist)
-- This will add up to 3 students per class
INSERT OR IGNORE INTO class_memberships (class_id, student_id)
SELECT c.id, u.id
FROM classes c
CROSS JOIN (
    SELECT id FROM users 
    WHERE role = 'student' 
    LIMIT 3
) u
WHERE c.teacher_id != u.id;
