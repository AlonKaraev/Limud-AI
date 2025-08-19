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

    // Insert sample school if not exists
    const schoolExists = await query(`SELECT COUNT(*) as count FROM schools`);
    if (schoolExists.rows[0].count === 0) {
      await run(`
        INSERT INTO schools (name, address, phone, email) VALUES 
        (?, ?, ?, ?)
      `, ['בית ספר דוגמה', 'רחוב הרצל 123, תל אביב', '03-1234567', 'info@example-school.co.il']);
    }

    console.log('Database initialized successfully');
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
