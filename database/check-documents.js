const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../server/database/limudai.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking documents table...');
console.log('📍 Database path:', dbPath);

// Check if documents table exists
db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name='documents'`, (err, rows) => {
  if (err) {
    console.error('❌ Error checking documents table:', err);
    db.close();
    return;
  }
  
  if (rows.length === 0) {
    console.log('❌ Documents table does not exist!');
    console.log('📋 Available tables:');
    
    db.all(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`, (err, allTables) => {
      if (err) {
        console.error('❌ Error listing tables:', err);
      } else {
        allTables.forEach(table => console.log(`  - ${table.name}`));
      }
      db.close();
    });
    return;
  }
  
  console.log('✅ Documents table exists!');
  
  // Get table schema
  db.all(`PRAGMA table_info(documents)`, (err, schema) => {
    if (err) {
      console.error('❌ Error getting table schema:', err);
    } else {
      console.log('📋 Documents table schema:');
      schema.forEach(col => {
        console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
      });
    }
    
    // Count total documents
    db.get('SELECT COUNT(*) as total FROM documents', (err, result) => {
      if (err) {
        console.error('❌ Error counting documents:', err);
      } else {
        console.log(`📊 Total documents in database: ${result.total}`);
      }
      
      if (result.total > 0) {
        // Get sample documents
        db.all('SELECT id, user_id, document_id, original_filename, file_size, created_at FROM documents ORDER BY created_at DESC LIMIT 5', (err, docs) => {
          if (err) {
            console.error('❌ Error getting sample documents:', err);
          } else {
            console.log('📄 Sample documents:');
            docs.forEach(doc => {
              console.log(`  - ID: ${doc.id}, User: ${doc.user_id}, File: ${doc.original_filename}, Size: ${doc.file_size}, Created: ${doc.created_at}`);
            });
          }
          
          // Count documents by user
          db.all('SELECT user_id, COUNT(*) as count FROM documents GROUP BY user_id', (err, userCounts) => {
            if (err) {
              console.error('❌ Error counting documents by user:', err);
            } else {
              console.log('👥 Documents by user:');
              userCounts.forEach(user => {
                console.log(`  - User ${user.user_id}: ${user.count} documents`);
              });
            }
            
            db.close();
          });
        });
      } else {
        console.log('📭 No documents found in database');
        db.close();
      }
    });
  });
});
