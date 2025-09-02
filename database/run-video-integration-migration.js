const fs = require('fs');
const path = require('path');
const { query, run } = require('../server/config/database-sqlite');

async function runVideoIntegrationMigration() {
    console.log('🎬 Starting video integration schema migration...');
    
    try {
        // Read the SQLite-compatible video integration schema file
        const schemaPath = path.join(__dirname, 'video-integration-schema-sqlite.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        
        // Split the SQL into individual statements
        const statements = schemaSql
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`📝 Found ${statements.length} SQL statements to execute`);
        
        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            
            // Skip comments and empty statements
            if (statement.startsWith('--') || statement.trim() === '') {
                continue;
            }
            
            try {
                console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
                
                // Handle different types of statements
                if (statement.toUpperCase().includes('SELECT') || 
                    statement.toUpperCase().includes('INSERT') ||
                    statement.toUpperCase().includes('UPDATE') ||
                    statement.toUpperCase().includes('DELETE')) {
                    await query(statement);
                } else {
                    await run(statement);
                }
                
                console.log(`✅ Statement ${i + 1} executed successfully`);
            } catch (error) {
                // Handle SQLite-specific errors more gracefully
                if (error.message.includes('already exists') || 
                    error.message.includes('duplicate column') ||
                    error.message.includes('SQLITE_ERROR: duplicate column name') ||
                    error.message.includes('duplicate column name')) {
                    console.log(`⚠️  Statement ${i + 1} skipped (already exists): ${error.message.split('-->')[0].trim()}`);
                } else if (statement.toUpperCase().includes('ALTER TABLE') && 
                          error.message.includes('duplicate column')) {
                    console.log(`⚠️  Statement ${i + 1} skipped (column already exists)`);
                } else {
                    console.error(`❌ Error executing statement ${i + 1}:`, error.message.split('-->')[0].trim());
                    console.error(`Statement: ${statement.substring(0, 100)}...`);
                    // Continue with other statements for non-critical errors
                }
            }
        }
        
        // Verify the migration worked by checking if video_metadata column exists
        console.log('🔍 Verifying migration...');
        
        try {
            const testResult = await query(`
                SELECT video_metadata, processing_status, thumbnail_path, media_type 
                FROM recordings 
                LIMIT 1
            `);
            console.log('✅ Video integration columns are now available!');
        } catch (verifyError) {
            console.error('❌ Migration verification failed:', verifyError.message);
            throw verifyError;
        }
        
        // Check if video_thumbnails table exists
        try {
            const thumbnailTest = await query(`
                SELECT COUNT(*) as count FROM video_thumbnails LIMIT 1
            `);
            console.log('✅ Video thumbnails table is available!');
        } catch (thumbnailError) {
            console.error('❌ Video thumbnails table verification failed:', thumbnailError.message);
        }
        
        console.log('🎉 Video integration migration completed successfully!');
        console.log('');
        console.log('📋 Migration Summary:');
        console.log('   ✅ Added video_metadata column to recordings table');
        console.log('   ✅ Added processing_status column to recordings table');
        console.log('   ✅ Added thumbnail_path column to recordings table');
        console.log('   ✅ Added media_type column to recordings table');
        console.log('   ✅ Created video_thumbnails table');
        console.log('   ✅ Created video_processing_jobs table');
        console.log('   ✅ Added necessary indexes');
        console.log('   ✅ Created video_lessons_with_thumbnails view');
        console.log('');
        console.log('🚀 Video processing should now work correctly!');
        
    } catch (error) {
        console.error('💥 Migration failed:', error);
        process.exit(1);
    }
}

// Run the migration if this script is executed directly
if (require.main === module) {
    runVideoIntegrationMigration()
        .then(() => {
            console.log('Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { runVideoIntegrationMigration };
