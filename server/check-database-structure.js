const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'limud_ai.db');
const db = new sqlite3.Database(dbPath);

console.log('Current tables in database:');
db.all('SELECT name FROM sqlite_master WHERE type=\'table\' ORDER BY name', [], (err, tables) => {
    if (err) {
        console.error('Error getting tables:', err);
        return;
    }
    
    tables.forEach(table => console.log('- ' + table.name));
    
    console.log('\nChecking for images table structure:');
    db.all('PRAGMA table_info(images)', [], (err, imagesInfo) => {
        if (err) {
            console.log('Images table not found or error:', err.message);
        } else {
            console.log('Images table columns:');
            imagesInfo.forEach(col => console.log(`  - ${col.name} (${col.type})`));
        }
        
        console.log('\nChecking for image_text_extraction_jobs table:');
        db.all('PRAGMA table_info(image_text_extraction_jobs)', [], (err, jobsInfo) => {
            if (err) {
                console.log('image_text_extraction_jobs table not found');
            } else if (jobsInfo.length > 0) {
                console.log('image_text_extraction_jobs table columns:');
                jobsInfo.forEach(col => console.log(`  - ${col.name} (${col.type})`));
            } else {
                console.log('image_text_extraction_jobs table exists but has no columns');
            }
            
            console.log('\nChecking for image_text_extractions table:');
            db.all('PRAGMA table_info(image_text_extractions)', [], (err, extractionsInfo) => {
                if (err) {
                    console.log('image_text_extractions table not found');
                } else if (extractionsInfo.length > 0) {
                    console.log('image_text_extractions table columns:');
                    extractionsInfo.forEach(col => console.log(`  - ${col.name} (${col.type})`));
                } else {
                    console.log('image_text_extractions table exists but has no columns');
                }
                
                db.close();
            });
        });
    });
});
