const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../server/database/limudai.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking users table...');

// Check all users
db.all(`SELECT id, email, role, first_name, last_name, created_at FROM users ORDER BY id`, (err, users) => {
  if (err) {
    console.error('❌ Error getting users:', err);
    db.close();
    return;
  }
  
  console.log(`📊 Found ${users.length} users:`);
  users.forEach(user => {
    console.log(`  - ID: ${user.id}, Email: ${user.email}, Role: ${user.role}, Name: ${user.first_name} ${user.last_name}`);
  });
  
  // Check which users have documents
  console.log('\n📄 Checking document ownership:');
  db.all(`
    SELECT u.id, u.email, COUNT(d.id) as doc_count 
    FROM users u 
    LEFT JOIN documents d ON u.id = d.user_id 
    GROUP BY u.id, u.email 
    ORDER BY u.id
  `, (err, userDocs) => {
    if (err) {
      console.error('❌ Error checking user documents:', err);
    } else {
      userDocs.forEach(user => {
        console.log(`  - User ${user.id} (${user.email}): ${user.doc_count} documents`);
      });
    }
    
    // Check if there's a test user
    console.log('\n🔍 Looking for test users:');
    db.all(`SELECT * FROM users WHERE email LIKE '%test%' OR email LIKE '%example%'`, (err, testUsers) => {
      if (err) {
        console.error('❌ Error finding test users:', err);
      } else if (testUsers.length === 0) {
        console.log('❌ No test users found');
      } else {
        console.log('✅ Test users found:');
        testUsers.forEach(user => {
          console.log(`  - ID: ${user.id}, Email: ${user.email}, Password Hash: ${user.password_hash ? 'Set' : 'Not set'}`);
        });
      }
      
      db.close();
    });
  });
});
