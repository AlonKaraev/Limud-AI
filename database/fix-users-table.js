const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

// Database file path
const dbPath = path.join(__dirname, '..', 'server', 'database', 'limudai.db');

console.log('🔧 Fixing Users Table Schema...');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
});

// Helper function to run queries with promises
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
};

// Helper function to query with promises
const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve({ rows, rowCount: rows.length });
      }
    });
  });
};

async function fixUsersTable() {
  try {
    console.log('📋 Backing up existing users...');
    
    // Get all existing users
    const existingUsers = await query('SELECT * FROM users');
    console.log(`Found ${existingUsers.rows.length} existing users`);

    console.log('🔄 Recreating users table with principal support...');

    // Drop the old users table
    await run('DROP TABLE IF EXISTS users_backup');
    await run('CREATE TABLE users_backup AS SELECT * FROM users');
    await run('DROP TABLE users');

    // Create new users table with principal role support
    await run(`
      CREATE TABLE users (
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

    console.log('📥 Restoring existing users...');

    // Insert existing users back
    for (const user of existingUsers.rows) {
      await run(`
        INSERT INTO users (
          id, email, password_hash, role, first_name, last_name, phone, 
          school_id, is_verified, verification_token, reset_password_token, 
          reset_password_expires, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        user.id, user.email, user.password_hash, user.role, user.first_name,
        user.last_name, user.phone, user.school_id, user.is_verified,
        user.verification_token, user.reset_password_token, user.reset_password_expires,
        user.created_at, user.updated_at
      ]);
    }

    console.log('👤 Creating principal user...');

    // Hash password for the principal
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash('principal123', saltRounds);

    // Get school ID
    const schoolResult = await query(`SELECT id FROM schools LIMIT 1`);
    const schoolId = schoolResult.rows[0]?.id || 1;

    // Insert principal user
    const result = await run(`
      INSERT INTO users (
        email, 
        password_hash, 
        role, 
        first_name, 
        last_name, 
        school_id, 
        is_verified
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      'principal@example-school.co.il',
      passwordHash,
      'principal',
      'דוד',
      'כהן',
      schoolId,
      1
    ]);

    const principalId = result.lastID;
    console.log(`✅ Principal user created with ID: ${principalId}`);

    // Grant permissions
    const permissions = [
      'class_management',
      'user_management',
      'permission_management',
      'school_administration',
      'content_oversight'
    ];

    for (const permission of permissions) {
      await run(`
        INSERT INTO principal_permissions (principal_id, granted_by, permission_type, notes)
        VALUES (?, ?, ?, ?)
      `, [principalId, principalId, permission, 'Initial setup']);
      
      console.log(`✅ Granted permission: ${permission}`);
    }

    // Recreate indexes
    await run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_users_school_id ON users(school_id)`);

    // Clean up backup
    await run('DROP TABLE users_backup');

    console.log('🎉 Users table fixed and principal user created!');
    console.log('📧 Email: principal@example-school.co.il');
    console.log('🔑 Password: principal123');

  } catch (error) {
    console.error('❌ Error fixing users table:', error);
  }
}

fixUsersTable().finally(() => {
  db.close();
});
