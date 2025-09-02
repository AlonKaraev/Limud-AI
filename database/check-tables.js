const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../server/database/limudai.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking database tables...');

db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name IN ('tests', 'test_questions', 'test_question_options')`, (err, rows) => {
  if (err) {
    console.error('❌ Error checking tables:', err);
  } else {
    console.log('📋 Tables found:', rows.map(r => r.name));
    
    if (rows.length === 3) {
      console.log('✅ All unified tests tables exist!');
      
      // Check if we have any data
      db.get('SELECT COUNT(*) as count FROM tests', (err, result) => {
        if (err) {
          console.error('❌ Error counting tests:', err);
        } else {
          console.log(`📊 Tests in database: ${result.count}`);
        }
        
        // Check views
        db.all(`SELECT name FROM sqlite_master WHERE type='view' AND name IN ('lesson_tests', 'manual_tests', 'test_statistics')`, (err, views) => {
          if (err) {
            console.error('❌ Error checking views:', err);
          } else {
            console.log('👁️ Views found:', views.map(v => v.name));
          }
          
          db.close();
        });
      });
    } else {
      console.log('❌ Missing tables. Expected: tests, test_questions, test_question_options');
      db.close();
    }
  }
});
