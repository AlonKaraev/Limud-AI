const fs = require('fs');
const path = require('path');
const { run, query } = require('../server/config/database-sqlite');

async function runImagesMigration() {
  try {
    console.log('Starting images database migration...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'images-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        await run(statement);
        console.log(`✓ Statement ${i + 1} executed successfully`);
      } catch (error) {
        console.error(`✗ Error executing statement ${i + 1}:`, error.message);
        console.error('Statement:', statement);
        throw error;
      }
    }
    
    // Verify tables were created
    console.log('\nVerifying tables were created...');
    
    const tables = ['images', 'image_text_extractions', 'image_extraction_jobs'];
    for (const table of tables) {
      try {
        const result = await query(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [table]);
        if (result.rows.length > 0) {
          console.log(`✓ Table '${table}' exists`);
        } else {
          console.log(`✗ Table '${table}' not found`);
        }
      } catch (error) {
        console.error(`Error checking table '${table}':`, error.message);
      }
    }
    
    // Check indexes
    console.log('\nVerifying indexes were created...');
    const indexResult = await query(`SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_image%'`);
    console.log(`✓ Created ${indexResult.rows.length} indexes for images tables`);
    
    console.log('\n🎉 Images migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Images migration failed:', error);
    process.exit(1);
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  runImagesMigration()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { runImagesMigration };
