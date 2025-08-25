const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// Database file path
const dbPath = path.join(__dirname, '..', 'database', 'limudai.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Helper function to run queries with promises
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('Database query error:', err);
        reject(err);
      } else {
        resolve({ rows, rowCount: rows.length });
      }
    });
  });
};

// Helper function to run single queries (INSERT, UPDATE, DELETE)
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        console.error('Database run error:', err);
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
};

// Initialize database schema
const initializeDatabase = async () => {
  try {
    // Create schools table
    await run(`
      CREATE TABLE IF NOT EXISTS schools (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create users table
    await run(`
      CREATE TABLE IF NOT EXISTS users (
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
      )
    `);

    // Create recordings table
    await run(`
      CREATE TABLE IF NOT EXISTS recordings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        recording_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        metadata TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    await run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_users_school_id ON users(school_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_recordings_user_id ON recordings(user_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_recordings_recording_id ON recordings(recording_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_recordings_created_at ON recordings(created_at)`);

    // Create AI processing jobs table
    await run(`
      CREATE TABLE IF NOT EXISTS ai_processing_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recording_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        job_type TEXT NOT NULL CHECK (job_type IN ('transcription', 'summary', 'questions', 'full_processing')),
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
        ai_provider TEXT NOT NULL DEFAULT 'openai',
        processing_config TEXT DEFAULT '{}',
        error_message TEXT,
        started_at DATETIME,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create transcriptions table
    await run(`
      CREATE TABLE IF NOT EXISTS transcriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recording_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        job_id INTEGER,
        transcription_text TEXT NOT NULL,
        confidence_score REAL DEFAULT 0.0,
        language_detected TEXT DEFAULT 'he',
        processing_duration INTEGER,
        ai_provider TEXT NOT NULL DEFAULT 'openai',
        model_version TEXT,
        segments TEXT DEFAULT '[]',
        metadata TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (job_id) REFERENCES ai_processing_jobs(id) ON DELETE SET NULL
      )
    `);

    // Create content summaries table
    await run(`
      CREATE TABLE IF NOT EXISTS content_summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recording_id INTEGER NOT NULL,
        transcription_id INTEGER,
        user_id INTEGER NOT NULL,
        job_id INTEGER,
        summary_text TEXT NOT NULL,
        summary_type TEXT DEFAULT 'educational' CHECK (summary_type IN ('educational', 'brief', 'detailed', 'key_points')),
        key_topics TEXT DEFAULT '[]',
        learning_objectives TEXT DEFAULT '[]',
        subject_area TEXT,
        grade_level TEXT,
        confidence_score REAL DEFAULT 0.0,
        ai_provider TEXT NOT NULL DEFAULT 'openai',
        model_version TEXT,
        metadata TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE,
        FOREIGN KEY (transcription_id) REFERENCES transcriptions(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (job_id) REFERENCES ai_processing_jobs(id) ON DELETE SET NULL
      )
    `);

    // Create generated questions table
    await run(`
      CREATE TABLE IF NOT EXISTS generated_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recording_id INTEGER NOT NULL,
        transcription_id INTEGER,
        summary_id INTEGER,
        user_id INTEGER NOT NULL,
        job_id INTEGER,
        question_text TEXT NOT NULL,
        question_type TEXT DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay')),
        correct_answer TEXT NOT NULL,
        answer_options TEXT DEFAULT '[]',
        difficulty_level TEXT DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
        topic_area TEXT,
        learning_objective TEXT,
        explanation TEXT,
        confidence_score REAL DEFAULT 0.0,
        ai_provider TEXT NOT NULL DEFAULT 'openai',
        model_version TEXT,
        metadata TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE,
        FOREIGN KEY (transcription_id) REFERENCES transcriptions(id) ON DELETE CASCADE,
        FOREIGN KEY (summary_id) REFERENCES content_summaries(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (job_id) REFERENCES ai_processing_jobs(id) ON DELETE SET NULL
      )
    `);

    // Create question sets table
    await run(`
      CREATE TABLE IF NOT EXISTS question_sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recording_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        job_id INTEGER,
        set_name TEXT NOT NULL,
        description TEXT,
        total_questions INTEGER DEFAULT 0,
        subject_area TEXT,
        grade_level TEXT,
        estimated_duration INTEGER,
        metadata TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (job_id) REFERENCES ai_processing_jobs(id) ON DELETE SET NULL
      )
    `);

    // Create question set items table
    await run(`
      CREATE TABLE IF NOT EXISTS question_set_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_set_id INTEGER NOT NULL,
        question_id INTEGER NOT NULL,
        order_index INTEGER NOT NULL DEFAULT 0,
        points INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (question_set_id) REFERENCES question_sets(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES generated_questions(id) ON DELETE CASCADE,
        UNIQUE(question_set_id, question_id)
      )
    `);

    // Create AI service usage table
    await run(`
      CREATE TABLE IF NOT EXISTS ai_service_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        service_provider TEXT NOT NULL,
        service_type TEXT NOT NULL,
        tokens_used INTEGER DEFAULT 0,
        cost_usd REAL DEFAULT 0.0000,
        processing_time INTEGER,
        request_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT DEFAULT '{}',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create content quality ratings table
    await run(`
      CREATE TABLE IF NOT EXISTS content_quality_ratings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content_type TEXT NOT NULL CHECK (content_type IN ('transcription', 'summary', 'question')),
        content_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        feedback_text TEXT,
        improvement_suggestions TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create content sharing tables
    await run(`
      CREATE TABLE IF NOT EXISTS classes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        school_id INTEGER,
        teacher_id INTEGER NOT NULL,
        grade_level TEXT,
        subject_area TEXT,
        academic_year TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(teacher_id, name, academic_year)
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS class_memberships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        class_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(class_id, student_id)
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS content_shares (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recording_id INTEGER NOT NULL,
        teacher_id INTEGER NOT NULL,
        share_type TEXT NOT NULL CHECK (share_type IN ('transcription', 'summary', 'test')),
        is_active BOOLEAN DEFAULT 1,
        start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        end_date DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recording_id) REFERENCES recordings(id) ON DELETE CASCADE,
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(recording_id, share_type)
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS content_share_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content_share_id INTEGER NOT NULL,
        class_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (content_share_id) REFERENCES content_shares(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
        UNIQUE(content_share_id, class_id)
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS student_notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        content_share_id INTEGER NOT NULL,
        notification_type TEXT NOT NULL DEFAULT 'content_shared',
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT 0,
        read_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (content_share_id) REFERENCES content_shares(id) ON DELETE CASCADE
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS student_content_access (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        content_share_id INTEGER NOT NULL,
        access_type TEXT NOT NULL CHECK (access_type IN ('view', 'download')),
        accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT,
        user_agent TEXT,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (content_share_id) REFERENCES content_shares(id) ON DELETE CASCADE
      )
    `);

    // Create AI-related indexes
    await run(`CREATE INDEX IF NOT EXISTS idx_ai_processing_jobs_recording_id ON ai_processing_jobs(recording_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_ai_processing_jobs_user_id ON ai_processing_jobs(user_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_ai_processing_jobs_status ON ai_processing_jobs(status)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_ai_processing_jobs_job_type ON ai_processing_jobs(job_type)`);
    
    await run(`CREATE INDEX IF NOT EXISTS idx_transcriptions_recording_id ON transcriptions(recording_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_transcriptions_user_id ON transcriptions(user_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_transcriptions_job_id ON transcriptions(job_id)`);
    
    await run(`CREATE INDEX IF NOT EXISTS idx_content_summaries_recording_id ON content_summaries(recording_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_content_summaries_user_id ON content_summaries(user_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_content_summaries_transcription_id ON content_summaries(transcription_id)`);
    
    await run(`CREATE INDEX IF NOT EXISTS idx_generated_questions_recording_id ON generated_questions(recording_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_generated_questions_user_id ON generated_questions(user_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_generated_questions_transcription_id ON generated_questions(transcription_id)`);
    
    await run(`CREATE INDEX IF NOT EXISTS idx_question_sets_recording_id ON question_sets(recording_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_question_sets_user_id ON question_sets(user_id)`);
    
    await run(`CREATE INDEX IF NOT EXISTS idx_ai_service_usage_user_id ON ai_service_usage(user_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_ai_service_usage_service_provider ON ai_service_usage(service_provider)`);

    // Create content sharing indexes
    await run(`CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes(school_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_classes_is_active ON classes(is_active)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_classes_academic_year ON classes(academic_year)`);

    await run(`CREATE INDEX IF NOT EXISTS idx_class_memberships_class_id ON class_memberships(class_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_class_memberships_student_id ON class_memberships(student_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_class_memberships_is_active ON class_memberships(is_active)`);

    await run(`CREATE INDEX IF NOT EXISTS idx_content_shares_recording_id ON content_shares(recording_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_content_shares_teacher_id ON content_shares(teacher_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_content_shares_share_type ON content_shares(share_type)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_content_shares_is_active ON content_shares(is_active)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_content_shares_start_date ON content_shares(start_date)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_content_shares_end_date ON content_shares(end_date)`);

    await run(`CREATE INDEX IF NOT EXISTS idx_content_share_permissions_content_share_id ON content_share_permissions(content_share_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_content_share_permissions_class_id ON content_share_permissions(class_id)`);

    await run(`CREATE INDEX IF NOT EXISTS idx_student_notifications_student_id ON student_notifications(student_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_student_notifications_created_at ON student_notifications(created_at)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_student_notifications_is_read ON student_notifications(is_read)`);

    await run(`CREATE INDEX IF NOT EXISTS idx_student_content_access_student_id ON student_content_access(student_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_student_content_access_content_share_id ON student_content_access(content_share_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_student_content_access_accessed_at ON student_content_access(accessed_at)`);

    // Create principal-specific tables
    await run(`
      CREATE TABLE IF NOT EXISTS principal_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        principal_id INTEGER NOT NULL,
        granted_by INTEGER NOT NULL,
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
        FOREIGN KEY (principal_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(principal_id, permission_type)
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS principal_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        principal_id INTEGER NOT NULL,
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
        old_values TEXT,
        new_values TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (principal_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS school_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        school_id INTEGER NOT NULL,
        setting_key TEXT NOT NULL,
        setting_value TEXT NOT NULL,
        setting_type TEXT NOT NULL DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
        description TEXT,
        updated_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
        FOREIGN KEY (updated_by) REFERENCES users(id),
        UNIQUE(school_id, setting_key)
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS class_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        school_id INTEGER NOT NULL,
        template_name TEXT NOT NULL,
        grade_level TEXT NOT NULL,
        subject_area TEXT,
        description TEXT,
        default_capacity INTEGER DEFAULT 30,
        academic_year TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_by INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id),
        UNIQUE(school_id, template_name, academic_year)
      )
    `);

    // Add created_by and managed_by columns to classes table if they don't exist
    try {
      await run(`ALTER TABLE classes ADD COLUMN created_by INTEGER REFERENCES users(id)`);
    } catch (error) {
      // Column already exists, ignore error
    }
    
    try {
      await run(`ALTER TABLE classes ADD COLUMN managed_by INTEGER REFERENCES users(id)`);
    } catch (error) {
      // Column already exists, ignore error
    }

    // Create principal-specific indexes
    await run(`CREATE INDEX IF NOT EXISTS idx_principal_permissions_principal_id ON principal_permissions(principal_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_principal_permissions_granted_by ON principal_permissions(granted_by)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_principal_permissions_permission_type ON principal_permissions(permission_type)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_principal_permissions_is_active ON principal_permissions(is_active)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_principal_permissions_expires_at ON principal_permissions(expires_at)`);

    await run(`CREATE INDEX IF NOT EXISTS idx_classes_created_by ON classes(created_by)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_classes_managed_by ON classes(managed_by)`);

    await run(`CREATE INDEX IF NOT EXISTS idx_principal_audit_log_principal_id ON principal_audit_log(principal_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_principal_audit_log_action_type ON principal_audit_log(action_type)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_principal_audit_log_target_type ON principal_audit_log(target_type)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_principal_audit_log_target_id ON principal_audit_log(target_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_principal_audit_log_created_at ON principal_audit_log(created_at)`);

    await run(`CREATE INDEX IF NOT EXISTS idx_school_settings_school_id ON school_settings(school_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_school_settings_setting_key ON school_settings(setting_key)`);

    await run(`CREATE INDEX IF NOT EXISTS idx_class_templates_school_id ON class_templates(school_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_class_templates_created_by ON class_templates(created_by)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_class_templates_is_active ON class_templates(is_active)`);

    // Insert sample school if not exists
    const schoolExists = await query(`SELECT COUNT(*) as count FROM schools`);
    if (schoolExists.rows[0].count === 0) {
      await run(`
        INSERT INTO schools (name, address, phone, email) VALUES 
        (?, ?, ?, ?)
      `, ['בית ספר דוגמה', 'רחוב הרצל 123, תל אביב', '03-1234567', 'info@example-school.co.il']);
    }

    // Insert default school settings
    const settingsExist = await query(`SELECT COUNT(*) as count FROM school_settings`);
    if (settingsExist.rows[0].count === 0) {
      const schools = await query(`SELECT id FROM schools`);
      for (const school of schools.rows) {
        await run(`
          INSERT OR IGNORE INTO school_settings (school_id, setting_key, setting_value, setting_type, description) 
          VALUES (?, ?, ?, ?, ?)
        `, [school.id, 'max_students_per_class', '35', 'number', 'Maximum number of students allowed per class']);
        
        await run(`
          INSERT OR IGNORE INTO school_settings (school_id, setting_key, setting_value, setting_type, description) 
          VALUES (?, ?, ?, ?, ?)
        `, [school.id, 'academic_year', '2024-2025', 'string', 'Current academic year']);
        
        await run(`
          INSERT OR IGNORE INTO school_settings (school_id, setting_key, setting_value, setting_type, description) 
          VALUES (?, ?, ?, ?, ?)
        `, [school.id, 'grade_levels', '["א\'", "ב\'", "ג\'", "ד\'", "ה\'", "ו\'"]', 'json', 'Available grade levels in Hebrew']);
      }
    }

    console.log('Database initialized successfully with AI content and principal tables');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

module.exports = {
  db,
  query,
  run,
  initializeDatabase
};
