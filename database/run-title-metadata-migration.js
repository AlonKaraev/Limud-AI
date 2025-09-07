const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database path
const dbPath = path.join(__dirname, '..', 'server', 'database', 'limudai.db');

// Check if database exists
if (!fs.existsSync(dbPath)) {
    console.error('Database file not found at:', dbPath);
    process.exit(1);
}

// Open database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database');
});

// Function to run migration
function runMigration() {
    console.log('Starting title metadata migration...');
    
    // Begin transaction
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        // Add title column to documents table
        db.run(`ALTER TABLE documents ADD COLUMN title VARCHAR(255)`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('Error adding title to documents:', err.message);
                db.run('ROLLBACK');
                return;
            }
            console.log('✓ Added title column to documents table');
        });
        
        // Add title column to images table
        db.run(`ALTER TABLE images ADD COLUMN title VARCHAR(255)`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('Error adding title to images:', err.message);
                db.run('ROLLBACK');
                return;
            }
            console.log('✓ Added title column to images table');
        });
        
        // Add title column to recordings table
        db.run(`ALTER TABLE recordings ADD COLUMN title VARCHAR(255)`, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error('Error adding title to recordings:', err.message);
                db.run('ROLLBACK');
                return;
            }
            console.log('✓ Added title column to recordings table');
        });
        
        // Create indexes
        db.run(`CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title)`, (err) => {
            if (err) {
                console.error('Error creating documents title index:', err.message);
            } else {
                console.log('✓ Created index for documents title');
            }
        });
        
        db.run(`CREATE INDEX IF NOT EXISTS idx_images_title ON images(title)`, (err) => {
            if (err) {
                console.error('Error creating images title index:', err.message);
            } else {
                console.log('✓ Created index for images title');
            }
        });
        
        db.run(`CREATE INDEX IF NOT EXISTS idx_recordings_title ON recordings(title)`, (err) => {
            if (err) {
                console.error('Error creating recordings title index:', err.message);
            } else {
                console.log('✓ Created index for recordings title');
            }
        });
        
        // Commit transaction
        db.run('COMMIT', (err) => {
            if (err) {
                console.error('Error committing transaction:', err.message);
                db.run('ROLLBACK');
            } else {
                console.log('✅ Title metadata migration completed successfully!');
            }
            
            // Close database connection
            db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err.message);
                } else {
                    console.log('Database connection closed');
                }
            });
        });
    });
}

// Run the migration
runMigration();
