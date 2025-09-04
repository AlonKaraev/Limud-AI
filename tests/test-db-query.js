const { query } = require('../server/config/database-sqlite');

async function testDatabaseQuery() {
    try {
        console.log('🔍 Testing database query...');
        
        const result = await query(`
            SELECT id, filename, media_type, file_size, created_at 
            FROM recordings 
            ORDER BY created_at DESC 
            LIMIT 10
        `);
        
        console.log(`📊 Found ${result.rows.length} recent recordings:`);
        console.log('');
        
        result.rows.forEach((r, index) => {
            const sizeKB = Math.round(r.file_size / 1024);
            const date = new Date(r.created_at).toLocaleDateString('he-IL');
            console.log(`${index + 1}. ${r.media_type === 'video' ? '🎬' : '🎵'} ${r.media_type}: ${r.filename}`);
            console.log(`   Size: ${sizeKB}KB | Date: ${date}`);
            console.log('');
        });
        
        // Count by media type
        const audioCount = result.rows.filter(r => r.media_type === 'audio').length;
        const videoCount = result.rows.filter(r => r.media_type === 'video').length;
        
        console.log('📈 Summary:');
        console.log(`🎵 Audio files: ${audioCount}`);
        console.log(`🎬 Video files: ${videoCount}`);
        console.log(`📊 Total: ${result.rows.length}`);
        
    } catch (error) {
        console.error('❌ Database query failed:', error.message);
    }
}

testDatabaseQuery();
