const { query, run } = require('../server/config/database-sqlite');

async function fixVideoMetadataColumn() {
    console.log('🔧 Fixing video metadata column issue...');
    
    try {
        // Step 1: Add the missing columns one by one
        console.log('📝 Adding video_metadata column...');
        try {
            await run(`ALTER TABLE recordings ADD COLUMN video_metadata TEXT DEFAULT '{}'`);
            console.log('✅ Added video_metadata column');
        } catch (error) {
            if (error.message.includes('duplicate column')) {
                console.log('⚠️  video_metadata column already exists');
            } else {
                throw error;
            }
        }

        console.log('📝 Adding processing_status column...');
        try {
            await run(`ALTER TABLE recordings ADD COLUMN processing_status TEXT DEFAULT 'pending'`);
            console.log('✅ Added processing_status column');
        } catch (error) {
            if (error.message.includes('duplicate column')) {
                console.log('⚠️  processing_status column already exists');
            } else {
                throw error;
            }
        }

        console.log('📝 Adding media_type column...');
        try {
            await run(`ALTER TABLE recordings ADD COLUMN media_type TEXT DEFAULT 'audio'`);
            console.log('✅ Added media_type column');
        } catch (error) {
            if (error.message.includes('duplicate column')) {
                console.log('⚠️  media_type column already exists');
            } else {
                throw error;
            }
        }

        console.log('📝 Adding thumbnail_path column...');
        try {
            await run(`ALTER TABLE recordings ADD COLUMN thumbnail_path TEXT`);
            console.log('✅ Added thumbnail_path column');
        } catch (error) {
            if (error.message.includes('duplicate column')) {
                console.log('⚠️  thumbnail_path column already exists');
            } else {
                throw error;
            }
        }

        // Step 2: Create video_thumbnails table
        console.log('📝 Creating video_thumbnails table...');
        try {
            await run(`
                CREATE TABLE IF NOT EXISTS video_thumbnails (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    recording_id INTEGER NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
                    timestamp_percent REAL NOT NULL,
                    thumbnail_path TEXT NOT NULL,
                    thumbnail_size TEXT NOT NULL CHECK (thumbnail_size IN ('small', 'medium', 'large')),
                    width INTEGER NOT NULL,
                    height INTEGER NOT NULL,
                    file_size INTEGER NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('✅ Created video_thumbnails table');
        } catch (error) {
            console.log('⚠️  video_thumbnails table might already exist:', error.message);
        }

        // Step 3: Create video_processing_jobs table
        console.log('📝 Creating video_processing_jobs table...');
        try {
            await run(`
                CREATE TABLE IF NOT EXISTS video_processing_jobs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    recording_id INTEGER NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
                    job_type TEXT NOT NULL CHECK (job_type IN ('thumbnail_generation', 'metadata_extraction', 'format_conversion', 'compression')),
                    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
                    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
                    error_message TEXT,
                    job_data TEXT DEFAULT '{}',
                    started_at DATETIME,
                    completed_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('✅ Created video_processing_jobs table');
        } catch (error) {
            console.log('⚠️  video_processing_jobs table might already exist:', error.message);
        }

        // Step 4: Create indexes
        console.log('📝 Creating indexes...');
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_video_thumbnails_recording_id ON video_thumbnails(recording_id)',
            'CREATE INDEX IF NOT EXISTS idx_video_thumbnails_timestamp ON video_thumbnails(timestamp_percent)',
            'CREATE INDEX IF NOT EXISTS idx_video_thumbnails_size ON video_thumbnails(thumbnail_size)',
            'CREATE INDEX IF NOT EXISTS idx_video_processing_jobs_recording_id ON video_processing_jobs(recording_id)',
            'CREATE INDEX IF NOT EXISTS idx_video_processing_jobs_status ON video_processing_jobs(status)',
            'CREATE INDEX IF NOT EXISTS idx_video_processing_jobs_type ON video_processing_jobs(job_type)',
            'CREATE INDEX IF NOT EXISTS idx_recordings_media_type ON recordings(media_type)',
            'CREATE INDEX IF NOT EXISTS idx_recordings_processing_status ON recordings(processing_status)'
        ];

        for (const indexSql of indexes) {
            try {
                await run(indexSql);
                console.log(`✅ Created index: ${indexSql.split(' ON ')[1]?.split('(')[0] || 'unknown'}`);
            } catch (error) {
                console.log(`⚠️  Index might already exist: ${error.message}`);
            }
        }

        // Step 5: Update existing records
        console.log('📝 Updating existing records...');
        try {
            await run(`UPDATE recordings SET media_type = 'audio' WHERE media_type IS NULL`);
            console.log('✅ Updated existing records to have media_type = audio');
        } catch (error) {
            console.log('⚠️  Error updating records:', error.message);
        }

        // Step 6: Verify the fix
        console.log('🔍 Verifying the fix...');
        try {
            const testResult = await query(`
                SELECT video_metadata, processing_status, thumbnail_path, media_type 
                FROM recordings 
                LIMIT 1
            `);
            console.log('✅ All video integration columns are now available!');
            
            // Test if we can query the new tables
            await query(`SELECT COUNT(*) as count FROM video_thumbnails`);
            console.log('✅ video_thumbnails table is accessible!');
            
            await query(`SELECT COUNT(*) as count FROM video_processing_jobs`);
            console.log('✅ video_processing_jobs table is accessible!');
            
        } catch (verifyError) {
            console.error('❌ Verification failed:', verifyError.message);
            throw verifyError;
        }

        console.log('🎉 Video metadata column fix completed successfully!');
        console.log('');
        console.log('📋 Fix Summary:');
        console.log('   ✅ Added video_metadata column to recordings table');
        console.log('   ✅ Added processing_status column to recordings table');
        console.log('   ✅ Added thumbnail_path column to recordings table');
        console.log('   ✅ Added media_type column to recordings table');
        console.log('   ✅ Created video_thumbnails table');
        console.log('   ✅ Created video_processing_jobs table');
        console.log('   ✅ Added necessary indexes');
        console.log('   ✅ Updated existing records');
        console.log('');
        console.log('🚀 Video processing should now work correctly!');
        console.log('   The error "no such column: video_metadata" should be resolved.');
        
    } catch (error) {
        console.error('💥 Fix failed:', error);
        process.exit(1);
    }
}

// Run the fix if this script is executed directly
if (require.main === module) {
    fixVideoMetadataColumn()
        .then(() => {
            console.log('Fix completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Fix failed:', error);
            process.exit(1);
        });
}

module.exports = { fixVideoMetadataColumn };
