const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../server/database/limudai.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Testing documents query...');

// Test the exact query used in getUserDocuments function
const userId = 4; // We know from earlier that user 4 has documents

console.log(`Testing query for user ID: ${userId}`);

// First, test simple query
console.log('\n1. Testing simple documents query...');
db.all(`SELECT * FROM documents WHERE user_id = ?`, [userId], (err, rows) => {
  if (err) {
    console.error('❌ Simple query failed:', err);
  } else {
    console.log(`✅ Simple query found ${rows.length} documents`);
    if (rows.length > 0) {
      console.log('Sample document:', {
        id: rows[0].id,
        filename: rows[0].original_filename,
        created_at: rows[0].created_at
      });
    }
  }
  
  // Now test the complex query with LEFT JOIN
  console.log('\n2. Testing complex query with LEFT JOIN...');
  const complexSql = `
    SELECT d.*, 
           tej.status as extraction_status,
           tej.progress_percent as extraction_progress
    FROM documents d
    LEFT JOIN text_extraction_jobs tej ON d.id = tej.document_id 
      AND tej.id = (
        SELECT id FROM text_extraction_jobs 
        WHERE document_id = d.id 
        ORDER BY created_at DESC 
        LIMIT 1
      )
    WHERE d.user_id = ?
    ORDER BY d.created_at DESC
  `;
  
  db.all(complexSql, [userId], (err, complexRows) => {
    if (err) {
      console.error('❌ Complex query failed:', err);
      console.error('Error details:', err.message);
    } else {
      console.log(`✅ Complex query found ${complexRows.length} documents`);
      if (complexRows.length > 0) {
        console.log('Sample complex result:', {
          id: complexRows[0].id,
          filename: complexRows[0].original_filename,
          extraction_status: complexRows[0].extraction_status,
          created_at: complexRows[0].created_at
        });
      }
    }
    
    // Test if text_extraction_jobs table exists
    console.log('\n3. Checking text_extraction_jobs table...');
    db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name='text_extraction_jobs'`, (err, tables) => {
      if (err) {
        console.error('❌ Error checking text_extraction_jobs table:', err);
      } else if (tables.length === 0) {
        console.log('❌ text_extraction_jobs table does not exist!');
      } else {
        console.log('✅ text_extraction_jobs table exists');
        
        // Check if there are any extraction jobs
        db.get(`SELECT COUNT(*) as count FROM text_extraction_jobs`, (err, result) => {
          if (err) {
            console.error('❌ Error counting extraction jobs:', err);
          } else {
            console.log(`📊 Total extraction jobs: ${result.count}`);
          }
          
          // Check jobs for our user
          db.all(`SELECT * FROM text_extraction_jobs WHERE user_id = ? LIMIT 3`, [userId], (err, jobs) => {
            if (err) {
              console.error('❌ Error getting user jobs:', err);
            } else {
              console.log(`📊 Extraction jobs for user ${userId}: ${jobs.length}`);
              jobs.forEach(job => {
                console.log(`  - Job ${job.id}: Document ${job.document_id}, Status: ${job.status}`);
              });
            }
            
            db.close();
          });
        });
      }
    });
  });
});
