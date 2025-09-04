const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, '../server/database/limud_ai.db');

console.log('Starting document extraction enhancement migration...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database.');
});

// Migration function
function runMigration() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Check if progress_message column already exists
      db.get(`PRAGMA table_info(text_extraction_jobs)`, (err, row) => {
        if (err) {
          console.error('Error checking table structure:', err);
          reject(err);
          return;
        }

        // Check if progress_message column exists
        db.all(`PRAGMA table_info(text_extraction_jobs)`, (err, columns) => {
          if (err) {
            console.error('Error getting table info:', err);
            reject(err);
            return;
          }

          const hasProgressMessage = columns.some(col => col.name === 'progress_message');
          
          if (hasProgressMessage) {
            console.log('✅ progress_message column already exists in text_extraction_jobs table');
            resolve();
            return;
          }

          console.log('Adding progress_message column to text_extraction_jobs table...');
          
          // Add progress_message column
          db.run(`
            ALTER TABLE text_extraction_jobs 
            ADD COLUMN progress_message TEXT
          `, (err) => {
            if (err) {
              console.error('Error adding progress_message column:', err);
              reject(err);
              return;
            }
            
            console.log('✅ Successfully added progress_message column to text_extraction_jobs table');
            resolve();
          });
        });
      });
    });
  });
}

// Run the migration
runMigration()
  .then(() => {
    console.log('✅ Document extraction enhancement migration completed successfully!');
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed.');
      }
      process.exit(0);
    });
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      }
      process.exit(1);
    });
  });
