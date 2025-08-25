const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

// Database file path
const dbPath = path.join(__dirname, '..', 'server', 'database', 'limudai.db');

console.log('👤 Creating Principal User...');

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

async function createPrincipal() {
  try {
    // Hash password for the principal
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash('principal123', saltRounds);

    // Get school ID
    const schoolResult = await query(`SELECT id FROM schools LIMIT 1`);
    const schoolId = schoolResult.rows[0]?.id || 1;

    // Insert principal user directly
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

    console.log('🎉 Principal user setup completed!');
    console.log('📧 Email: principal@example-school.co.il');
    console.log('🔑 Password: principal123');

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // If insert fails, try updating an existing user
    console.log('🔄 Trying to convert existing user to principal...');
    
    try {
      // Get the first teacher user
      const teacherResult = await query(`SELECT id FROM users WHERE role = 'teacher' LIMIT 1`);
      
      if (teacherResult.rows.length > 0) {
        const userId = teacherResult.rows[0].id;
        
        // Update user to principal
        await run(`UPDATE users SET role = 'principal' WHERE id = ?`, [userId]);
        console.log(`✅ Updated user ID ${userId} to principal role`);
        
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
            INSERT OR REPLACE INTO principal_permissions (principal_id, granted_by, permission_type, notes)
            VALUES (?, ?, ?, ?)
          `, [userId, userId, permission, 'Initial setup']);
          
          console.log(`✅ Granted permission: ${permission}`);
        }
        
        // Get user details
        const userDetails = await query(`SELECT email FROM users WHERE id = ?`, [userId]);
        const email = userDetails.rows[0].email;
        
        console.log('🎉 Principal user setup completed!');
        console.log(`📧 Email: ${email}`);
        console.log('🔑 Use the existing password for this user');
        console.log('💡 Or you can create a new account with email: principal@example-school.co.il and password: principal123');
        
      } else {
        console.log('❌ No teacher users found to convert');
      }
      
    } catch (updateError) {
      console.error('❌ Error updating user:', updateError.message);
    }
  }
}

createPrincipal().finally(() => {
  db.close();
});
