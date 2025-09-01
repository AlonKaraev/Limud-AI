const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Database path
const dbPath = path.join(__dirname, '..', 'server', 'database', 'limudai.db');

// Read the card generation schema
const schemaPath = path.join(__dirname, 'card-generation-schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

console.log('Setting up Card Generation database schema...');
console.log('Database path:', dbPath);

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
});

// Execute schema
db.exec(schema, (err) => {
  if (err) {
    console.error('Error executing schema:', err.message);
    process.exit(1);
  }
  
  console.log('✅ Card Generation schema executed successfully');
  
  // Verify tables were created
  db.all(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    AND name LIKE '%card%' 
    ORDER BY name
  `, (err, tables) => {
    if (err) {
      console.error('Error checking tables:', err.message);
    } else {
      console.log('\n📋 Card Generation tables created:');
      tables.forEach(table => {
        console.log(`  - ${table.name}`);
      });
    }
    
    // Close database connection
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('\n🎉 Card Generation setup completed successfully!');
        console.log('\nNext steps:');
        console.log('1. Start the server: npm run dev');
        console.log('2. Test card generation from a lesson with transcription');
        console.log('3. Check that Hebrew text is handled correctly');
      }
    });
  });
});
