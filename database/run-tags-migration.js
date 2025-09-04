const fs = require('fs');
const path = require('path');

// Import database configuration
const { db, run, query } = require('../server/config/database-sqlite.js');

async function runTagsMigration() {
  console.log('🏷️  Starting tags migration for recordings table...');
  
  try {
    // Execute migration statements directly
    console.log('📝 Executing migration statements...');
    
    // 1. Add tags column to recordings table
    console.log('   1. Adding tags column to recordings table...');
    try {
      await run("ALTER TABLE recordings ADD COLUMN tags TEXT DEFAULT '[]'");
      console.log('   ✅ Tags column added successfully');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('   ⏭️  Tags column already exists, skipping');
      } else {
        console.error(`   ❌ Error adding tags column: ${error.message}`);
      }
    }
    
    // 2. Create index for tags
    console.log('   2. Creating index for tags...');
    try {
      await run("CREATE INDEX IF NOT EXISTS idx_recordings_tags ON recordings(tags)");
      console.log('   ✅ Tags index created successfully');
    } catch (error) {
      console.error(`   ❌ Error creating tags index: ${error.message}`);
    }
    
    // Verify the migration worked
    console.log('\n🔍 Verifying migration...');
    
    try {
      const tableInfoResult = await query("PRAGMA table_info(recordings)");
      const tableInfo = tableInfoResult.rows;
      const tagsColumn = tableInfo.find(col => col.name === 'tags');
      
      if (tagsColumn) {
        console.log('✅ Tags column successfully added to recordings table');
        console.log(`   Column type: ${tagsColumn.type}`);
        console.log(`   Default value: ${tagsColumn.dflt_value}`);
      } else {
        console.log('❌ Tags column not found in recordings table');
      }
      
      // Check if there are any existing recordings and update them
      const recordingCountResult = await query("SELECT COUNT(*) as count FROM recordings");
      const recordingCount = recordingCountResult.rows[0].count;
      console.log(`📊 Found ${recordingCount} existing recordings`);
      
      if (recordingCount > 0) {
        // Update existing records to have empty tags array
        const updateResult = await run("UPDATE recordings SET tags = '[]' WHERE tags IS NULL OR tags = ''");
        console.log(`🔄 Updated ${updateResult.changes} recordings with empty tags array`);
      }
      
    } catch (error) {
      console.error('❌ Error verifying migration:', error.message);
    }
    
    console.log('\n🎉 Tags migration completed successfully!');
    console.log('📝 Media items can now be tagged with multiple labels for better organization');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  runTagsMigration()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { runTagsMigration };
