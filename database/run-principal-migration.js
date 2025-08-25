const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

// Database file path
const dbPath = path.join(__dirname, '..', 'server', 'database', 'limudai.db');
const migrationPath = path.join(__dirname, 'principal-migration.sql');

console.log('🚀 Starting Principal Migration...');
console.log(`Database path: ${dbPath}`);
console.log(`Migration file: ${migrationPath}`);

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Connected to SQLite database');
  }
});

// Helper function to run queries with promises
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

// Helper function to query with promises
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

async function runMigration() {
  try {
    // Read migration file
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          await run(statement);
          console.log(`✅ Statement ${i + 1}/${statements.length} executed successfully`);
        } catch (error) {
          // Some statements might fail if they already exist, which is okay
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate column name') ||
              error.message.includes('UNIQUE constraint failed')) {
            console.log(`⚠️  Statement ${i + 1}/${statements.length} skipped (already exists)`);
          } else {
            console.error(`❌ Error in statement ${i + 1}:`, error.message);
            console.error(`Statement: ${statement.substring(0, 100)}...`);
          }
        }
      }
    }

    console.log('✅ Migration completed successfully');

    // Create sample principal user
    await createSamplePrincipal();

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function createSamplePrincipal() {
  try {
    console.log('👤 Creating sample principal user...');

    // Check if principal already exists
    const existingPrincipal = await query(`
      SELECT * FROM users 
      WHERE email = 'principal@example-school.co.il' AND role = 'principal'
    `);

    if (existingPrincipal.rows.length > 0) {
      console.log('⚠️  Sample principal user already exists');
      return;
    }

    // Get school ID
    const schoolResult = await query(`SELECT id FROM schools WHERE name = 'בית ספר דוגמה' LIMIT 1`);
    if (schoolResult.rows.length === 0) {
      console.error('❌ No school found to assign principal to');
      return;
    }

    const schoolId = schoolResult.rows[0].id;

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash('principal123', saltRounds);

    // Create principal user
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

    // Grant default permissions
    const permissions = [
      'class_management',
      'user_management',
      'permission_management',
      'school_administration',
      'content_oversight'
    ];

    for (const permission of permissions) {
      try {
        await run(`
          INSERT INTO principal_permissions (principal_id, granted_by, permission_type, notes)
          VALUES (?, ?, ?, ?)
        `, [principalId, principalId, permission, 'Initial setup - auto-granted']);
        
        console.log(`✅ Granted permission: ${permission}`);
      } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
          console.log(`⚠️  Permission ${permission} already exists`);
        } else {
          console.error(`❌ Error granting permission ${permission}:`, error.message);
        }
      }
    }

    console.log('🎉 Sample principal user setup completed!');
    console.log('📧 Email: principal@example-school.co.il');
    console.log('🔑 Password: principal123');

  } catch (error) {
    console.error('❌ Error creating sample principal:', error);
  }
}

// Run the migration
runMigration().finally(() => {
  db.close((err) => {
    if (err) {
      console.error('❌ Error closing database:', err.message);
    } else {
      console.log('✅ Database connection closed');
    }
    process.exit(0);
  });
});
