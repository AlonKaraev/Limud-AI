const { run, query } = require('../server/config/database-sqlite');

async function fixProgressMessageColumn() {
  try {
    console.log('🔧 Fixing progress_message column in text_extraction_jobs table...');
    
    // Check if column already exists
    const schema = await query(`PRAGMA table_info(text_extraction_jobs)`);
    const progressMessageColumn = schema.rows.find(col => col.name === 'progress_message');
    
    if (progressMessageColumn) {
      console.log('✅ progress_message column already exists!');
      return;
    }
    
    console.log('➕ Adding progress_message column...');
    
    // Add the missing column
    await run(`
      ALTER TABLE text_extraction_jobs 
      ADD COLUMN progress_message TEXT
    `);
    
    console.log('✅ Successfully added progress_message column!');
    
    // Verify the column was added
    const updatedSchema = await query(`PRAGMA table_info(text_extraction_jobs)`);
    const newColumn = updatedSchema.rows.find(col => col.name === 'progress_message');
    
    if (newColumn) {
      console.log('✅ Verification successful - progress_message column is now present!');
      console.log(`   Column details: ${newColumn.name}: ${newColumn.type}`);
    } else {
      console.log('❌ Verification failed - column was not added properly');
    }
    
    // Show updated schema
    console.log('📋 Updated text_extraction_jobs table schema:');
    updatedSchema.rows.forEach(column => {
      console.log(`  - ${column.name}: ${column.type} ${column.notnull ? 'NOT NULL' : ''} ${column.pk ? 'PRIMARY KEY' : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing progress_message column:', error);
    throw error;
  }
}

// Run the fix
fixProgressMessageColumn()
  .then(() => {
    console.log('🎉 Database fix completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Database fix failed:', error);
    process.exit(1);
  });
