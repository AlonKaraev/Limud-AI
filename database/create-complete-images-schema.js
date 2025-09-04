const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'server', 'database', 'limud_ai.db');
const db = new sqlite3.Database(dbPath);

console.log('Creating complete images schema...');

// Drop existing incomplete tables if they exist
const dropTables = [
    'DROP TABLE IF EXISTS image_text_extractions',
    'DROP TABLE IF EXISTS image_text_extraction_jobs', 
    'DROP TABLE IF EXISTS images'
];

// Create complete schema
const createTables = [
    // Main images table
    `CREATE TABLE images (
        image_id INTEGER PRIMARY KEY AUTOINCREMENT,
        id INTEGER,
        filename TEXT NOT NULL,
        original_filename TEXT,
        file_path TEXT NOT NULL,
        file_size INTEGER,
        file_type TEXT,
        dimensions TEXT,
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        upload_status TEXT DEFAULT 'completed',
        user_id INTEGER,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // OCR text extraction jobs table
    `CREATE TABLE image_text_extraction_jobs (
        job_id INTEGER PRIMARY KEY AUTOINCREMENT,
        image_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        started_at DATETIME,
        completed_at DATETIME,
        error_message TEXT,
        progress INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (image_id) REFERENCES images(image_id) ON DELETE CASCADE
    )`,
    
    // OCR text extraction results table
    `CREATE TABLE image_text_extractions (
        extraction_id INTEGER PRIMARY KEY AUTOINCREMENT,
        image_id INTEGER NOT NULL,
        job_id INTEGER,
        extracted_text TEXT,
        confidence_score REAL,
        language TEXT,
        extraction_method TEXT DEFAULT 'tesseract',
        bounding_boxes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (image_id) REFERENCES images(image_id) ON DELETE CASCADE,
        FOREIGN KEY (job_id) REFERENCES image_text_extraction_jobs(job_id) ON DELETE SET NULL
    )`
];

// Execute drops first
let dropIndex = 0;
function executeDrop() {
    if (dropIndex < dropTables.length) {
        db.run(dropTables[dropIndex], (err) => {
            if (err) {
                console.log(`Note: ${err.message}`);
            } else {
                console.log(`Dropped table ${dropIndex + 1}/${dropTables.length}`);
            }
            dropIndex++;
            executeDrop();
        });
    } else {
        // Start creating tables
        executeCreate();
    }
}

// Execute creates
let createIndex = 0;
function executeCreate() {
    if (createIndex < createTables.length) {
        db.run(createTables[createIndex], (err) => {
            if (err) {
                console.error(`Error creating table ${createIndex + 1}:`, err.message);
            } else {
                console.log(`Created table ${createIndex + 1}/${createTables.length}`);
            }
            createIndex++;
            executeCreate();
        });
    } else {
        // Verify the schema
        verifySchema();
    }
}

function verifySchema() {
    console.log('\nVerifying created schema...');
    
    db.all('SELECT name FROM sqlite_master WHERE type=\'table\' AND name LIKE \'image%\' ORDER BY name', [], (err, tables) => {
        if (err) {
            console.error('Error verifying tables:', err);
            return;
        }
        
        console.log('Image-related tables:');
        tables.forEach(table => console.log('- ' + table.name));
        
        // Check images table structure
        db.all('PRAGMA table_info(images)', [], (err, imagesInfo) => {
            if (err) {
                console.log('Error checking images table:', err.message);
            } else {
                console.log('\nImages table columns:');
                imagesInfo.forEach(col => console.log(`  - ${col.name} (${col.type})`));
            }
            
            // Check jobs table structure
            db.all('PRAGMA table_info(image_text_extraction_jobs)', [], (err, jobsInfo) => {
                if (err) {
                    console.log('Error checking jobs table:', err.message);
                } else {
                    console.log('\nimage_text_extraction_jobs table columns:');
                    jobsInfo.forEach(col => console.log(`  - ${col.name} (${col.type})`));
                }
                
                // Check extractions table structure
                db.all('PRAGMA table_info(image_text_extractions)', [], (err, extractionsInfo) => {
                    if (err) {
                        console.log('Error checking extractions table:', err.message);
                    } else {
                        console.log('\nimage_text_extractions table columns:');
                        extractionsInfo.forEach(col => console.log(`  - ${col.name} (${col.type})`));
                    }
                    
                    console.log('\nImages schema creation completed successfully!');
                    db.close();
                });
            });
        });
    });
}

// Start the process
executeDrop();
