const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, '..', 'server', 'database', 'limudai.db');

console.log('🔍 Checking for Principal User...');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
});

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

async function checkPrincipal() {
  try {
    // Check for principal user
    const result = await query(`
      SELECT id, email, role, first_name, last_name, is_verified 
      FROM users 
      WHERE email = 'principal@example-school.co.il'
    `);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('✅ Principal user found:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Name: ${user.first_name} ${user.last_name}`);
      console.log(`   Verified: ${user.is_verified ? 'Yes' : 'No'}`);

      // Check permissions
      const permissions = await query(`
        SELECT permission_type, is_active 
        FROM principal_permissions 
        WHERE principal_id = ?
      `, [user.id]);

      if (permissions.rows.length > 0) {
        console.log('🔑 Permissions:');
        permissions.rows.forEach(perm => {
          console.log(`   - ${perm.permission_type}: ${perm.is_active ? 'Active' : 'Inactive'}`);
        });
      } else {
        console.log('⚠️  No permissions found');
      }

    } else {
      console.log('❌ Principal user not found');
      
      // Check all users
      const allUsers = await query('SELECT id, email, role FROM users');
      console.log(`📊 Total users in database: ${allUsers.rows.length}`);
      allUsers.rows.forEach(user => {
        console.log(`   - ${user.email} (${user.role})`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking principal:', error);
  }
}

checkPrincipal().finally(() => {
  db.close();
});
