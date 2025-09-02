const path = require('path');
const { run, query, initializeDatabase } = require('../server/config/database-sqlite');

async function runUnifiedSummariesMigration() {
  console.log('🚀 Starting unified summaries migration for SQLite...');
  
  try {
    // Ensure database is initialized first
    await initializeDatabase();
    
    console.log('📋 Creating unified summaries table and related objects...');
    
    // Create unified summaries table
    await run(`
      CREATE TABLE IF NOT EXISTS unified_summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        summary_type TEXT NOT NULL DEFAULT 'manual' CHECK (summary_type IN ('manual', 'lesson', 'ai')),
        source_type TEXT CHECK (source_type IN ('recording', 'manual', 'upload')),
        source_id INTEGER,
        subject_area TEXT,
        grade_level TEXT,
        tags TEXT DEFAULT '[]',
        is_public BOOLEAN DEFAULT 0,
        metadata TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (source_id) REFERENCES recordings(id) ON DELETE SET NULL
      )
    `);

    // Create indexes for performance
    await run(`CREATE INDEX IF NOT EXISTS idx_unified_summaries_user_id ON unified_summaries(user_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_unified_summaries_summary_type ON unified_summaries(summary_type)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_unified_summaries_source_type ON unified_summaries(source_type)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_unified_summaries_source_id ON unified_summaries(source_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_unified_summaries_subject_area ON unified_summaries(subject_area)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_unified_summaries_grade_level ON unified_summaries(grade_level)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_unified_summaries_is_public ON unified_summaries(is_public)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_unified_summaries_created_at ON unified_summaries(created_at)`);

    console.log('✅ Unified summaries table created successfully');

    // Migrate existing content_summaries to unified_summaries
    console.log('📦 Migrating existing content summaries...');
    
    const existingSummaries = await query(`
      SELECT 
        cs.*,
        r.user_id as recording_user_id
      FROM content_summaries cs
      LEFT JOIN recordings r ON cs.recording_id = r.id
    `);

    let migratedCount = 0;
    for (const summary of existingSummaries.rows) {
      try {
        await run(`
          INSERT INTO unified_summaries (
            user_id, title, content, summary_type, source_type, source_id,
            subject_area, grade_level, metadata, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          summary.user_id || summary.recording_user_id,
          `סיכום שיעור ${summary.id}`,
          summary.summary_text,
          'lesson',
          'recording',
          summary.recording_id,
          summary.subject_area,
          summary.grade_level,
          JSON.stringify({
            original_id: summary.id,
            confidence_score: summary.confidence_score,
            ai_provider: summary.ai_provider,
            model_version: summary.model_version,
            key_topics: summary.key_topics ? JSON.parse(summary.key_topics) : [],
            learning_objectives: summary.learning_objectives ? JSON.parse(summary.learning_objectives) : []
          }),
          summary.created_at,
          summary.updated_at
        ]);
        migratedCount++;
      } catch (error) {
        console.warn(`⚠️ Failed to migrate summary ${summary.id}:`, error.message);
      }
    }

    console.log(`✅ Migrated ${migratedCount} content summaries to unified table`);

    // Create backward compatibility view
    console.log('🔗 Creating backward compatibility view...');
    
    await run(`
      CREATE VIEW IF NOT EXISTS legacy_summaries AS
      SELECT 
        id,
        user_id,
        title,
        content,
        subject_area,
        grade_level,
        is_public,
        created_at,
        updated_at,
        CASE 
          WHEN summary_type = 'manual' THEN 'manual'
          ELSE 'ai'
        END as type
      FROM unified_summaries
    `);

    console.log('✅ Backward compatibility view created');

    // Get final statistics
    const stats = await query(`
      SELECT 
        COUNT(*) as total_summaries,
        COUNT(CASE WHEN summary_type = 'manual' THEN 1 END) as manual_summaries,
        COUNT(CASE WHEN summary_type = 'lesson' THEN 1 END) as lesson_summaries,
        COUNT(CASE WHEN summary_type = 'ai' THEN 1 END) as ai_summaries,
        COUNT(CASE WHEN is_public = 1 THEN 1 END) as public_summaries
      FROM unified_summaries
    `);

    console.log('📊 Migration completed successfully!');
    console.log('📈 Final Statistics:');
    console.log(`   Total summaries: ${stats.rows[0].total_summaries}`);
    console.log(`   Manual summaries: ${stats.rows[0].manual_summaries}`);
    console.log(`   Lesson summaries: ${stats.rows[0].lesson_summaries}`);
    console.log(`   AI summaries: ${stats.rows[0].ai_summaries}`);
    console.log(`   Public summaries: ${stats.rows[0].public_summaries}`);

    return {
      success: true,
      statistics: stats.rows[0]
    };

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  runUnifiedSummariesMigration()
    .then((result) => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { runUnifiedSummariesMigration };
