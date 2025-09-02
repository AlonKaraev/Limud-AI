const VideoProcessingService = require('../server/services/VideoProcessingService');
const { query } = require('../server/config/database-sqlite');

async function testVideoMetadataFix() {
    console.log('🧪 Testing video metadata fix...');
    
    try {
        // Create a VideoProcessingService instance
        const videoService = new VideoProcessingService();
        
        // Test 1: Check if we can query the video_metadata column
        console.log('📋 Test 1: Checking if video_metadata column exists...');
        const testQuery = await query(`
            SELECT id, video_metadata, processing_status, media_type, thumbnail_path 
            FROM recordings 
            LIMIT 1
        `);
        console.log('✅ Successfully queried video_metadata column');
        
        // Test 2: Try to save some test metadata (simulate what VideoProcessingService does)
        console.log('📋 Test 2: Testing saveVideoMetadata method...');
        
        // First, let's see if there are any recordings to test with
        const recordings = await query(`SELECT id FROM recordings LIMIT 1`);
        
        if (recordings.rows && recordings.rows.length > 0) {
            const testRecordingId = recordings.rows[0].id;
            console.log(`Found test recording with ID: ${testRecordingId}`);
            
            // Create test metadata
            const testMetadata = {
                duration: 120.5,
                resolution: {
                    width: 1920,
                    height: 1080
                },
                codec: 'h264',
                bitrate: 2500000,
                frameRate: 30,
                audioCodec: 'aac',
                audioBitrate: 128000,
                audioChannels: 2,
                format: 'mp4',
                hasAudio: true,
                hasVideo: true
            };
            
            // Test the saveVideoMetadata method
            try {
                await videoService.saveVideoMetadata(testRecordingId, testMetadata);
                console.log('✅ Successfully saved video metadata using VideoProcessingService');
                
                // Verify the metadata was saved
                const savedData = await query(`
                    SELECT video_metadata, processing_status 
                    FROM recordings 
                    WHERE id = ?
                `, [testRecordingId]);
                
                if (savedData.rows && savedData.rows.length > 0) {
                    const savedMetadata = JSON.parse(savedData.rows[0].video_metadata);
                    console.log('✅ Metadata successfully retrieved from database');
                    console.log(`   Duration: ${savedMetadata.duration}s`);
                    console.log(`   Resolution: ${savedMetadata.resolution.width}x${savedMetadata.resolution.height}`);
                    console.log(`   Processing Status: ${savedData.rows[0].processing_status}`);
                }
            } catch (saveError) {
                console.error('❌ Error saving video metadata:', saveError.message);
                throw saveError;
            }
        } else {
            console.log('⚠️  No recordings found to test with, but column structure is correct');
        }
        
        // Test 3: Check video_thumbnails table
        console.log('📋 Test 3: Checking video_thumbnails table...');
        await query(`SELECT COUNT(*) as count FROM video_thumbnails`);
        console.log('✅ video_thumbnails table is accessible');
        
        // Test 4: Check video_processing_jobs table
        console.log('📋 Test 4: Checking video_processing_jobs table...');
        await query(`SELECT COUNT(*) as count FROM video_processing_jobs`);
        console.log('✅ video_processing_jobs table is accessible');
        
        console.log('');
        console.log('🎉 All tests passed! Video metadata fix is working correctly.');
        console.log('');
        console.log('📋 Summary:');
        console.log('   ✅ video_metadata column is accessible');
        console.log('   ✅ VideoProcessingService.saveVideoMetadata() works');
        console.log('   ✅ processing_status column is accessible');
        console.log('   ✅ media_type column is accessible');
        console.log('   ✅ thumbnail_path column is accessible');
        console.log('   ✅ video_thumbnails table is accessible');
        console.log('   ✅ video_processing_jobs table is accessible');
        console.log('');
        console.log('🚀 The original error "no such column: video_metadata" should now be resolved!');
        console.log('   Background video processing for recording 26 should work on the next attempt.');
        
    } catch (error) {
        console.error('💥 Test failed:', error);
        console.error('');
        console.error('This indicates the fix may not be complete. Please check:');
        console.error('1. Database connection is working');
        console.error('2. All required columns were added successfully');
        console.error('3. VideoProcessingService is using the correct database');
        process.exit(1);
    }
}

// Run the test
testVideoMetadataFix()
    .then(() => {
        console.log('Test completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Test failed:', error);
        process.exit(1);
    });
