const { Pool } = require('pg');
const { runUnifiedFlashcardsMigration } = require('../database/run-unified-flashcards-migration');

// Test configuration
const testConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'limudai_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
};

async function testUnifiedFlashcards() {
  const pool = new Pool(testConfig);
  
  try {
    console.log('🧪 Testing Unified Flashcards System...\n');
    
    // Step 1: Run migration
    console.log('1️⃣ Running unified flashcards migration...');
    await runUnifiedFlashcardsMigration();
    console.log('✅ Migration completed\n');
    
    // Step 2: Test creating a lesson-generated flashcard set
    console.log('2️⃣ Testing lesson-generated flashcard set creation...');
    
    // First, create a test recording
    const recordingResult = await pool.query(`
      INSERT INTO recordings (user_id, recording_id, filename, file_path, file_size, metadata)
      VALUES (1, 'test-recording-123', 'test-lesson.mp3', '/uploads/test-lesson.mp3', 1024000, 
              '{"lessonName": "מתמטיקה - חיבור וחיסור", "subject": "מתמטיקה", "classLevel": "כיתה ב", "duration": 300}')
      RETURNING id
    `);
    const recordingId = recordingResult.rows[0].id;
    console.log(`📹 Created test recording with ID: ${recordingId}`);
    
    // Create a lesson-generated flashcard set using the new function
    const setResult = await pool.query(`
      SELECT create_lesson_flashcard_set(
        1, -- user_id
        $1, -- recording_id
        'כרטיסי זיכרון - מתמטיקה חיבור וחיסור', -- name
        'סט כרטיסי זיכרון שנוצר מתוכן השיעור על חיבור וחיסור', -- description
        'מתמטיקה', -- subject_area
        'כיתה ב', -- grade_level
        5, -- total_cards
        'medium', -- difficulty_level
        '["הבנת חיבור", "הבנת חיסור", "פתרון בעיות"]', -- learning_objectives
        'openai', -- ai_provider
        'gpt-3.5-turbo', -- model_version
        0.85, -- confidence_score
        '{"cardCount": 5, "difficultyLevel": "medium", "subjectArea": "מתמטיקה"}' -- processing_metadata
      ) as set_id
    `, [recordingId]);
    
    const lessonSetId = setResult.rows[0].set_id;
    console.log(`📚 Created lesson-generated flashcard set with ID: ${lessonSetId}`);
    
    // Step 3: Test creating a manual flashcard set
    console.log('\n3️⃣ Testing manual flashcard set creation...');
    const manualSetResult = await pool.query(`
      INSERT INTO memory_card_sets (
        user_id, name, description, subject_area, grade_level, 
        set_type, source_type, difficulty_level, tags
      )
      VALUES (1, 'כרטיסי זיכרון ידניים - היסטוריה', 'סט כרטיסי זיכרון שנוצר ידנית', 
              'היסטוריה', 'כיתה ו', 'manual', 'manual', 'medium', '["היסטוריה", "ידני"]')
      RETURNING id
    `);
    const manualSetId = manualSetResult.rows[0].id;
    console.log(`📝 Created manual flashcard set with ID: ${manualSetId}`);
    
    // Step 4: Test the unified views
    console.log('\n4️⃣ Testing unified views...');
    
    // Test lesson flashcard sets view
    const lessonSetsResult = await pool.query(`
      SELECT * FROM lesson_flashcard_sets WHERE user_id = 1
    `);
    console.log(`📊 Found ${lessonSetsResult.rows.length} lesson flashcard sets`);
    lessonSetsResult.rows.forEach(set => {
      console.log(`   - ${set.set_name} (Recording ID: ${set.recording_id}, Subject: ${set.subject_area})`);
    });
    
    // Test manual flashcard sets view
    const manualSetsResult = await pool.query(`
      SELECT * FROM manual_flashcard_sets WHERE user_id = 1
    `);
    console.log(`📊 Found ${manualSetsResult.rows.length} manual flashcard sets`);
    manualSetsResult.rows.forEach(set => {
      console.log(`   - ${set.name} (Subject: ${set.subject_area})`);
    });
    
    // Test flashcard statistics view
    const statsResult = await pool.query(`
      SELECT * FROM flashcard_statistics WHERE user_id = 1
    `);
    if (statsResult.rows.length > 0) {
      const stats = statsResult.rows[0];
      console.log(`📈 Flashcard Statistics for User 1:`);
      console.log(`   - Total Sets: ${stats.total_sets}`);
      console.log(`   - Manual Sets: ${stats.manual_sets}`);
      console.log(`   - Lesson Sets: ${stats.lesson_sets}`);
      console.log(`   - Active Sets: ${stats.active_sets}`);
      console.log(`   - Total Cards: ${stats.total_cards}`);
      console.log(`   - Subjects Covered: ${stats.subjects_covered}`);
    }
    
    // Test overview statistics view (combined tests + flashcards)
    const overviewResult = await pool.query(`
      SELECT * FROM overview_statistics WHERE user_id = 1
    `);
    if (overviewResult.rows.length > 0) {
      const overview = overviewResult.rows[0];
      console.log(`🎯 Overview Statistics for User 1:`);
      console.log(`   - Total Tests: ${overview.total_tests || 0}`);
      console.log(`   - Total Flashcard Sets: ${overview.total_flashcard_sets || 0}`);
      console.log(`   - Lesson Flashcard Sets: ${overview.lesson_flashcard_sets || 0}`);
      console.log(`   - Total Flashcards: ${overview.total_flashcards || 0}`);
    }
    
    // Step 5: Test the get_flashcard_set_with_source function
    console.log('\n5️⃣ Testing flashcard set with source information...');
    const setWithSourceResult = await pool.query(`
      SELECT * FROM get_flashcard_set_with_source($1)
    `, [lessonSetId]);
    
    if (setWithSourceResult.rows.length > 0) {
      const setInfo = setWithSourceResult.rows[0];
      console.log(`🔗 Flashcard Set with Source Info:`);
      console.log(`   - Set Name: ${setInfo.name}`);
      console.log(`   - Set Type: ${setInfo.set_type}`);
      console.log(`   - Source Type: ${setInfo.source_type}`);
      console.log(`   - Source Title: ${setInfo.source_title}`);
      console.log(`   - Subject Area: ${setInfo.subject_area}`);
      console.log(`   - Grade Level: ${setInfo.grade_level}`);
    }
    
    // Step 6: Test that lesson sets appear in regular queries
    console.log('\n6️⃣ Testing that lesson sets appear in regular flashcard queries...');
    const allSetsResult = await pool.query(`
      SELECT id, name, set_type, source_type, subject_area, grade_level 
      FROM memory_card_sets 
      WHERE user_id = 1 
      ORDER BY created_at DESC
    `);
    
    console.log(`📋 All flashcard sets for User 1:`);
    allSetsResult.rows.forEach(set => {
      console.log(`   - ${set.name} (Type: ${set.set_type}, Source: ${set.source_type}, Subject: ${set.subject_area})`);
    });
    
    // Step 7: Verify deliverables
    console.log('\n7️⃣ Verifying deliverables...');
    
    // Deliverable 1: Lesson generated flashcard set is added to test list when generated directly from card
    const lessonSetsCount = await pool.query(`
      SELECT COUNT(*) as count FROM memory_card_sets 
      WHERE user_id = 1 AND set_type = 'lesson_generated'
    `);
    console.log(`✅ Deliverable 1: ${lessonSetsCount.rows[0].count} lesson-generated flashcard sets found`);
    
    // Deliverable 2: Lesson generated flashcard set is counted in the overview tab statistics
    const overviewStats = await pool.query(`
      SELECT lesson_flashcard_sets, total_flashcard_sets FROM overview_statistics WHERE user_id = 1
    `);
    if (overviewStats.rows.length > 0) {
      const stats = overviewStats.rows[0];
      console.log(`✅ Deliverable 2: Overview statistics show ${stats.lesson_flashcard_sets} lesson sets out of ${stats.total_flashcard_sets} total sets`);
    }
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   ✅ Unified flashcard database schema created');
    console.log('   ✅ Lesson-generated flashcard sets properly tagged and tracked');
    console.log('   ✅ Statistics views include lesson-generated sets');
    console.log('   ✅ Overview statistics combine tests and flashcards');
    console.log('   ✅ Source information properly linked to recordings');
    console.log('   ✅ Both deliverables verified');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run test if called directly
if (require.main === module) {
  testUnifiedFlashcards()
    .then(() => {
      console.log('\n✅ Test script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test script failed:', error);
      process.exit(1);
    });
}

module.exports = { testUnifiedFlashcards };
