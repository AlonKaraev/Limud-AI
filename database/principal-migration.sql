-- Principal User Type Migration for Limud AI
-- This script adds principal role support and permission management

-- Step 1: Update users table to support principal role
-- First, we need to drop the existing CHECK constraint and recreate it
-- SQLite doesn't support ALTER COLUMN directly, so we'll use a workaround

-- Create a temporary table with the new schema
CREATE TABLE users_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('teacher', 'student', 'principal')),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    school_id INTEGER REFERENCES schools(id),
    is_verified BOOLEAN DEFAULT 0,
    verification_token TEXT,
    reset_password_token TEXT,
    reset_password_expires DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copy data from old table to new table
INSERT INTO users_new SELECT * FROM users;

-- Drop the old table
DROP TABLE users;

-- Rename the new table
ALTER TABLE users_new RENAME TO users;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_school_id ON users(school_id);

-- Step 2: Create principal permissions table
CREATE TABLE IF NOT EXISTS principal_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    principal_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    granted_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_type TEXT NOT NULL CHECK (permission_type IN (
        'class_management',
        'user_management', 
        'permission_management',
        'school_administration',
        'content_oversight'
    )),
    granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NULL,
    is_active BOOLEAN DEFAULT 1,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(principal_id, permission_type)
);

-- Step 3: Update classes table to support principal management
-- Add columns to track who created and manages classes
ALTER TABLE classes ADD COLUMN created_by INTEGER REFERENCES users(id);
ALTER TABLE classes ADD COLUMN managed_by INTEGER REFERENCES users(id);

-- Update existing classes to set created_by to teacher_id
UPDATE classes SET created_by = teacher_id WHERE created_by IS NULL;

-- Step 4: Create principal audit log table
CREATE TABLE IF NOT EXISTS principal_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    principal_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN (
        'user_created',
        'user_updated',
        'user_deleted',
        'class_created',
        'class_updated',
        'class_deleted',
        'student_assigned',
        'student_removed',
        'permission_granted',
        'permission_revoked'
    )),
    target_type TEXT NOT NULL CHECK (target_type IN ('user', 'class', 'permission')),
    target_id INTEGER NOT NULL,
    old_values TEXT, -- JSON string of old values
    new_values TEXT, -- JSON string of new values
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Step 5: Create school settings table for principal configuration
CREATE TABLE IF NOT EXISTS school_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    setting_key TEXT NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type TEXT NOT NULL DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    updated_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(school_id, setting_key)
);

-- Step 6: Create class templates table for principals to create standardized classes
CREATE TABLE IF NOT EXISTS class_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    template_name TEXT NOT NULL,
    grade_level TEXT NOT NULL,
    subject_area TEXT,
    description TEXT,
    default_capacity INTEGER DEFAULT 30,
    academic_year TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(school_id, template_name, academic_year)
);

-- Step 7: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_principal_permissions_principal_id ON principal_permissions(principal_id);
CREATE INDEX IF NOT EXISTS idx_principal_permissions_granted_by ON principal_permissions(granted_by);
CREATE INDEX IF NOT EXISTS idx_principal_permissions_permission_type ON principal_permissions(permission_type);
CREATE INDEX IF NOT EXISTS idx_principal_permissions_is_active ON principal_permissions(is_active);
CREATE INDEX IF NOT EXISTS idx_principal_permissions_expires_at ON principal_permissions(expires_at);

CREATE INDEX IF NOT EXISTS idx_classes_created_by ON classes(created_by);
CREATE INDEX IF NOT EXISTS idx_classes_managed_by ON classes(managed_by);

CREATE INDEX IF NOT EXISTS idx_principal_audit_log_principal_id ON principal_audit_log(principal_id);
CREATE INDEX IF NOT EXISTS idx_principal_audit_log_action_type ON principal_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_principal_audit_log_target_type ON principal_audit_log(target_type);
CREATE INDEX IF NOT EXISTS idx_principal_audit_log_target_id ON principal_audit_log(target_id);
CREATE INDEX IF NOT EXISTS idx_principal_audit_log_created_at ON principal_audit_log(created_at);

CREATE INDEX IF NOT EXISTS idx_school_settings_school_id ON school_settings(school_id);
CREATE INDEX IF NOT EXISTS idx_school_settings_setting_key ON school_settings(setting_key);

CREATE INDEX IF NOT EXISTS idx_class_templates_school_id ON class_templates(school_id);
CREATE INDEX IF NOT EXISTS idx_class_templates_created_by ON class_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_class_templates_is_active ON class_templates(is_active);

-- Step 8: Insert default school settings
INSERT OR IGNORE INTO school_settings (school_id, setting_key, setting_value, setting_type, description) 
SELECT 
    id,
    'max_students_per_class',
    '35',
    'number',
    'Maximum number of students allowed per class'
FROM schools;

INSERT OR IGNORE INTO school_settings (school_id, setting_key, setting_value, setting_type, description) 
SELECT 
    id,
    'academic_year',
    '2024-2025',
    'string',
    'Current academic year'
FROM schools;

INSERT OR IGNORE INTO school_settings (school_id, setting_key, setting_value, setting_type, description) 
SELECT 
    id,
    'grade_levels',
    '["א''", "ב''", "ג''", "ד''", "ה''", "ו''"]',
    'json',
    'Available grade levels in Hebrew'
FROM schools;

-- Step 9: Insert default class templates for Hebrew grades
INSERT OR IGNORE INTO class_templates (school_id, template_name, grade_level, subject_area, description, created_by, academic_year)
SELECT 
    s.id,
    'כיתה א'' - כללי',
    'א''',
    'כללי',
    'תבנית כיתה סטנדרטית לכיתה א''',
    u.id,
    '2024-2025'
FROM schools s
CROSS JOIN users u
WHERE u.role = 'teacher'
LIMIT 1;

INSERT OR IGNORE INTO class_templates (school_id, template_name, grade_level, subject_area, description, created_by, academic_year)
SELECT 
    s.id,
    'כיתה ב'' - כללי',
    'ב''',
    'כללי',
    'תבנית כיתה סטנדרטית לכיתה ב''',
    u.id,
    '2024-2025'
FROM schools s
CROSS JOIN users u
WHERE u.role = 'teacher'
LIMIT 1;

INSERT OR IGNORE INTO class_templates (school_id, template_name, grade_level, subject_area, description, created_by, academic_year)
SELECT 
    s.id,
    'כיתה ג'' - כללי',
    'ג''',
    'כללי',
    'תבנית כיתה סטנדרטית לכיתה ג''',
    u.id,
    '2024-2025'
FROM schools s
CROSS JOIN users u
WHERE u.role = 'teacher'
LIMIT 1;

-- Step 10: Create a sample principal user (for testing)
-- This will be commented out in production - uncomment for development
/*
INSERT OR IGNORE INTO users (
    email, 
    password_hash, 
    role, 
    first_name, 
    last_name, 
    school_id, 
    is_verified
) 
SELECT 
    'principal@example-school.co.il',
    '$2b$12$LQv3c1yqBwEHxv8fGCJ16.GP.qjRU4jNUjgOgjbwGstTC2TrFO.TO', -- password: 'principal123'
    'principal',
    'דוד',
    'כהן',
    id,
    1
FROM schools 
WHERE name = 'בית ספר דוגמה'
LIMIT 1;
*/

-- Step 11: Grant default permissions to the sample principal
/*
INSERT OR IGNORE INTO principal_permissions (principal_id, granted_by, permission_type, notes)
SELECT 
    p.id,
    p.id, -- Self-granted for initial setup
    'class_management',
    'Initial setup - class management permissions'
FROM users p
WHERE p.role = 'principal' AND p.email = 'principal@example-school.co.il';

INSERT OR IGNORE INTO principal_permissions (principal_id, granted_by, permission_type, notes)
SELECT 
    p.id,
    p.id,
    'user_management',
    'Initial setup - user management permissions'
FROM users p
WHERE p.role = 'principal' AND p.email = 'principal@example-school.co.il';

INSERT OR IGNORE INTO principal_permissions (principal_id, granted_by, permission_type, notes)
SELECT 
    p.id,
    p.id,
    'permission_management',
    'Initial setup - permission management permissions'
FROM users p
WHERE p.role = 'principal' AND p.email = 'principal@example-school.co.il';
*/

-- Migration completed successfully
-- The database now supports:
-- 1. Principal user role
-- 2. Granular permission system
-- 3. Audit logging for principal actions
-- 4. School-specific settings
-- 5. Class templates for standardized class creation
-- 6. Hebrew grade level support (א', ב', ג', etc.)
