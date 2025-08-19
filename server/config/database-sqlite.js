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
        role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
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

    // Insert sample school if not exists
    const schoolExists = await query(`SELECT COUNT(*) as count FROM schools`);
    if (schoolExists.rows[0].count === 0) {
      await run(`
        INSERT INTO schools (name, address, phone, email) VALUES 
        (?, ?, ?, ?)
      `, ['בית ספר דוגמה', 'רחוב הרצל 123, תל אביב', '03-1234567', 'info@example-school.co.il']);
    }

    console.log('Database initialized successfully with AI content tables');
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
