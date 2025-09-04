const { query } = require('../server/config/database-sqlite');

async function checkExtractionJobsTable() {
  try {
    console.log('🔍 Checking text_extraction_jobs table...');
    
    // Check if table exists
    const tableExists = await query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='text_extraction_jobs'
    `);
    
    if (tableExists.rows.length === 0) {
      console.log('❌ text_extraction_jobs table does not exist!');
      return;
    }
    
    console.log('✅ text_extraction_jobs table exists!');
    
    // Get table schema
    const schema = await query(`PRAGMA table_info(text_extraction_jobs)`);
    console.log('📋 text_extraction_jobs table schema:');
    schema.rows.forEach(column => {
      console.log(`  - ${column.name}: ${column.type} ${column.notnull ? 'NOT NULL' : ''} ${column.pk ? 'PRIMARY KEY' : ''}`);
    });
    
    // Check for progress_message column specifically
    const progressMessageColumn = schema.rows.find(col => col.name === 'progress_message');
    if (progressMessageColumn) {
      console.log('✅ progress_message column exists!');
    } else {
      console.log('❌ progress_message column is missing!');
    }
    
    // Count records
    const count = await query('SELECT COUNT(*) as count FROM text_extraction_jobs');
    console.log(`📊 Total extraction jobs in database: ${count.rows[0].count}`);
    
    // Show sample records if any exist
    if (count.rows[0].count > 0) {
      const samples = await query('SELECT * FROM text_extraction_jobs ORDER BY created_at DESC LIMIT 5');
      console.log('📄 Sample extraction jobs:');
      samples.rows.forEach(job => {
        console.log(`  - ID: ${job.id}, Document: ${job.document_id}, Status: ${job.status}, Progress: ${job.progress_percent}%`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking text_extraction_jobs table:', error);
  }
}

checkExtractionJobsTable();
