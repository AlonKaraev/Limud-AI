const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

// Database file path
const dbPath = path.join(__dirname, '..', 'server', 'database', 'limudai.db');

console.log('👤 Creating Principal User...');
console.log(`Database path: ${dbPath}`);

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

async function createPrincipalUser() {
  try {
    // Check if principal already exists
    const existingPrincipal = await query(`
      SELECT * FROM users 
      WHERE email = 'principal@example-school.co.il'
    `);

    if (existingPrincipal.rows.length > 0) {
      console.log('⚠️  Principal user already exists');
      
      // Update the role to principal if it's not already
      const user = existingPrincipal.rows[0];
      if (user.role !== 'principal') {
        console.log('🔄 Updating user role to principal...');
        await run(`UPDATE users SET role = 'principal' WHERE id = ?`, [user.id]);
        console.log('✅ User role updated to principal');
      }
      
      await grantPermissions(user.id);
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

    // Create principal user by inserting directly (bypassing CHECK constraint)
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

    await grantPermissions(principalId);

  } catch (error) {
    console.error('❌ Error creating principal user:', error);
  }
}

async function grantPermissions(principalId) {
  try {
    console.log('🔑 Granting permissions...');

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
          INSERT OR REPLACE INTO principal_permissions (principal_id, granted_by, permission_type, notes)
          VALUES (?, ?, ?, ?)
        `, [principalId, principalId, permission, 'Initial setup - auto-granted']);
        
        console.log(`✅ Granted permission: ${permission}`);
      } catch (error) {
        console.error(`❌ Error granting permission ${permission}:`, error.message);
      }
    }

    console.log('🎉 Principal user setup completed!');
    console.log('📧 Email: principal@example-school.co.il');
    console.log('🔑 Password: principal123');

  } catch (error) {
    console.error('❌ Error granting permissions:', error);
  }
}

// Run the creation
createPrincipalUser().finally(() => {
  db.close((err) => {
    if (err) {
      console.error('❌ Error closing database:', err.message);
    } else {
      console.log('✅ Database connection closed');
    }
    process.exit(0);
  });
});
