const { run, query } = require('../server/config/database-sqlite');

async function runTranscriptionEditingMigration() {
  console.log('Starting transcription editing migration for SQLite...');

  try {
    // Check if columns already exist
    const tableInfo = await query(`PRAGMA table_info(transcriptions)`);
    const existingColumns = tableInfo.rows.map(row => row.name);
    
    // Add columns to transcriptions table if they don't exist
    if (!existingColumns.includes('original_text')) {
      await run(`ALTER TABLE transcriptions ADD COLUMN original_text TEXT`);
      console.log('Added original_text column to transcriptions table');
    }
    
    if (!existingColumns.includes('is_edited')) {
      await run(`ALTER TABLE transcriptions ADD COLUMN is_edited BOOLEAN DEFAULT FALSE`);
      console.log('Added is_edited column to transcriptions table');
    }
    
    if (!existingColumns.includes('edited_at')) {
      await run(`ALTER TABLE transcriptions ADD COLUMN edited_at TIMESTAMP`);
      console.log('Added edited_at column to transcriptions table');
    }
    
    if (!existingColumns.includes('edited_by')) {
      await run(`ALTER TABLE transcriptions ADD COLUMN edited_by INTEGER REFERENCES users(id)`);
      console.log('Added edited_by column to transcriptions table');
    }

    // Check if transcription_edit_history table exists
    const tableExists = await query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='transcription_edit_history'
    `);

    if (tableExists.rows.length === 0) {
      // Create transcription edit history table
      await run(`
        CREATE TABLE transcription_edit_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          transcription_id INTEGER NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          original_text TEXT NOT NULL,
          edited_text TEXT NOT NULL,
          edit_reason TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Created transcription_edit_history table');

      // Create indexes
      await run(`CREATE INDEX idx_transcription_edit_history_transcription_id ON transcription_edit_history(transcription_id)`);
      await run(`CREATE INDEX idx_transcription_edit_history_user_id ON transcription_edit_history(user_id)`);
      await run(`CREATE INDEX idx_transcription_edit_history_created_at ON transcription_edit_history(created_at)`);
      console.log('Created indexes for transcription_edit_history table');
    } else {
      console.log('transcription_edit_history table already exists');
    }

    console.log('Transcription editing migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  runTranscriptionEditingMigration()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { runTranscriptionEditingMigration };
