const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'server', 'database', 'limud_ai.db');
const db = new Database(dbPath);

console.log('Current tables in database:');
const tables = db.prepare('SELECT name FROM sqlite_master WHERE type=\'table\' ORDER BY name').all();
tables.forEach(table => console.log('- ' + table.name));

console.log('\nChecking for images table structure:');
try {
    const imagesInfo = db.prepare('PRAGMA table_info(images)').all();
    console.log('Images table columns:');
    imagesInfo.forEach(col => console.log(`  - ${col.name} (${col.type})`));
} catch (error) {
    console.log('Images table not found or error:', error.message);
}

console.log('\nChecking for image_text_extraction_jobs table:');
try {
    const jobsInfo = db.prepare('PRAGMA table_info(image_text_extraction_jobs)').all();
    if (jobsInfo.length > 0) {
        console.log('image_text_extraction_jobs table columns:');
        jobsInfo.forEach(col => console.log(`  - ${col.name} (${col.type})`));
    } else {
        console.log('image_text_extraction_jobs table exists but has no columns');
    }
} catch (error) {
    console.log('image_text_extraction_jobs table not found');
}

console.log('\nChecking for image_text_extractions table:');
try {
    const extractionsInfo = db.prepare('PRAGMA table_info(image_text_extractions)').all();
    if (extractionsInfo.length > 0) {
        console.log('image_text_extractions table columns:');
        extractionsInfo.forEach(col => console.log(`  - ${col.name} (${col.type})`));
    } else {
        console.log('image_text_extractions table exists but has no columns');
    }
} catch (error) {
    console.log('image_text_extractions table not found');
}

db.close();
