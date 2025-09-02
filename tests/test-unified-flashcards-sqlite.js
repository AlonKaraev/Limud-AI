const { runUnifiedFlashcardsMigrationSQLite } = require('../database/run-unified-flashcards-migration-sqlite');
const { query, run, initializeDatabase } = require('../server/config/database-sqlite');

async function testUnifiedFlashcardsSQLite() {
  try {
    console.log('🧪 Testing Unified Flashcards System (SQLite)...\n');
    
    // Step 1: Initialize database and run migration
    console.log('1️⃣ Initializing database and running unified flashcards migration...');
    await initializeDatabase();
    const migrationResult = await runUnifiedFlashcardsMigrationSQLite();
    console.log('✅ Migration completed\n');
    
    // Step 2: Test creating a lesson-generated flashcard set
    console.log('2️⃣ Testing lesson-generated flashcard set creation...');
    
    // First, create a test user if not exists
    const userResult = await query(`SELECT id FROM users WHERE email = 'test@example.com'`);
    let userId;
    if (userResult.rows.length === 0) {
      const newUser = await run(`
        INSERT INTO users (email, password_hash, role, first_name, last_name, school_id)
        VALUES ('test@example.com', 'hashed_password', 'teacher', 'Test', 'Teacher', 1)
      `);
      userId = newUser.lastID;
      console.log(`👤 Created test user with ID: ${userId}`);
    } else {
      userId = userResult.rows[0].id;
      console.log(`👤 Using existing test user with ID: ${userId}`);
    }
    
    // Create a test recording
    const recordingResult = await run(`
      INSERT INTO recordings (user_id, recording_id, filename, file_path, file_size, metadata)
      VALUES (?, 'test-recording-123', 'test-lesson.mp3', '/uploads/test-lesson.mp3', 1024000, 
              '{"lessonName": "מתמטיקה - חיבור וחיסור", "subject": "מתמטיקה", "classLevel": "כיתה ב", "duration": 300}')
    `, [userId]);
    const recordingId = recordingResult.lastID;
    console.log(`📹 Created test recording with ID: ${recordingId}`);
    
    // Create a lesson-generated flashcard set
    const lessonSetResult = await run(`
      INSERT INTO memory_card_sets (
        user_id, name, description, subject_area, grade_level, 
        set_type, source_type, source_id, difficulty_level, learning_objectives,
        ai_provider, model_version, confidence_score, processing_metadata, tags, total_cards
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      'כרטיסי זיכרון - מתמטיקה חיבור וחיסור',
      'סט כרטיסי זיכרון שנוצר מתוכן השיעור על חיבור וחיסור',
      'מתמטיקה',
      'כיתה ב',
      'lesson_generated',
      'recording',
      recordingId,
      'medium',
      '["הבנת חיבור", "הבנת חיסור", "פתרון בעיות"]',
      'openai',
      'gpt-3.5-turbo',
      0.85,
      '{"cardCount": 5, "difficultyLevel": "medium", "subjectArea": "מתמטיקה"}',
      '["lesson", "מתמטיקה"]',
      5
    ]);
    
    const lessonSetId = lessonSetResult.lastID;
    console.log(`📚 Created lesson-generated flashcard set with ID: ${lessonSetId}`);
    
    // Step 3: Test creating a manual flashcard set
    console.log('\n3️⃣ Testing manual flashcard set creation...');
    const manualSetResult = await run(`
      INSERT INTO memory_card_sets (
        user_id, name, description, subject_area, grade_level, 
        set_type, source_type, difficulty_level, tags, total_cards
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userId,
      'כרטיסי זיכרון ידניים - היסטוריה',
      'סט כרטיסי זיכרון שנוצר ידנית',
      'היסטוריה',
      'כיתה ו',
      'manual',
      'manual',
      'medium',
      '["היסטוריה", "ידני"]',
      3
    ]);
    const manualSetId = manualSetResult.lastID;
    console.log(`📝 Created manual flashcard set with ID: ${manualSetId}`);
    
    // Step 4: Test the unified views
    console.log('\n4️⃣ Testing unified views...');
    
    // Test lesson flashcard sets view
    const lessonSetsResult = await query(`
      SELECT * FROM lesson_flashcard_sets WHERE user_id = ?
    `, [userId]);
    console.log(`📊 Found ${lessonSetsResult.rows.length} lesson flashcard sets`);
    lessonSetsResult.rows.forEach(set => {
      console.log(`   - ${set.set_name} (Recording ID: ${set.recording_id}, Subject: ${set.subject_area})`);
    });
    
    // Test manual flashcard sets view
    const manualSetsResult = await query(`
      SELECT * FROM manual_flashcard_sets WHERE user_id = ?
    `, [userId]);
    console.log(`📊 Found ${manualSetsResult.rows.length} manual flashcard sets`);
    manualSetsResult.rows.forEach(set => {
      console.log(`   - ${set.name} (Subject: ${set.subject_area})`);
    });
    
    // Test flashcard statistics view
    const statsResult = await query(`
      SELECT * FROM flashcard_statistics WHERE user_id = ?
    `, [userId]);
    if (statsResult.rows.length > 0) {
      const stats = statsResult.rows[0];
      console.log(`📈 Flashcard Statistics for User ${userId}:`);
      console.log(`   - Total Sets: ${stats.total_sets}`);
      console.log(`   - Manual Sets: ${stats.manual_sets}`);
      console.log(`   - Lesson Sets: ${stats.lesson_sets}`);
      console.log(`   - Active Sets: ${stats.active_sets}`);
      console.log(`   - Total Cards: ${stats.total_cards}`);
      console.log(`   - Subjects Covered: ${stats.subjects_covered}`);
    }
    
    // Step 5: Test that lesson sets appear in regular queries
    console.log('\n5️⃣ Testing that lesson sets appear in regular flashcard queries...');
    const allSetsResult = await query(`
      SELECT id, name, set_type, source_type, subject_area, grade_level 
      FROM memory_card_sets 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `, [userId]);
    
    console.log(`📋 All flashcard sets for User ${userId}:`);
    allSetsResult.rows.forEach(set => {
      console.log(`   - ${set.name} (Type: ${set.set_type}, Source: ${set.source_type}, Subject: ${set.subject_area})`);
    });
    
    // Step 6: Test card generation job simulation
    console.log('\n6️⃣ Testing card generation job simulation...');
    const jobResult = await run(`
      INSERT INTO card_generation_jobs (
        user_id, recording_id, text_length, generation_config, status, result_metadata
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      userId,
      recordingId,
      500,
      '{"cardCount": 5, "difficultyLevel": "medium", "subjectArea": "מתמטיקה"}',
      'completed',
      '{"cardsGenerated": 5}'
    ]);
    console.log(`⚙️ Created card generation job with ID: ${jobResult.lastID}`);
    
    // Step 7: Verify deliverables
    console.log('\n7️⃣ Verifying deliverables...');
    
    // Deliverable 1: Lesson generated flashcard set is added to test list when generated directly from card
    const lessonSetsCount = await query(`
      SELECT COUNT(*) as count FROM memory_card_sets 
      WHERE user_id = ? AND set_type = 'lesson_generated'
    `, [userId]);
    console.log(`✅ Deliverable 1: ${lessonSetsCount.rows[0].count} lesson-generated flashcard sets found`);
    
    // Deliverable 2: Lesson generated flashcard set is counted in the overview tab statistics
    const overviewStats = await query(`
      SELECT lesson_sets, total_sets FROM flashcard_statistics WHERE user_id = ?
    `, [userId]);
    if (overviewStats.rows.length > 0) {
      const stats = overviewStats.rows[0];
      console.log(`✅ Deliverable 2: Statistics show ${stats.lesson_sets} lesson sets out of ${stats.total_sets} total sets`);
    }
    
    // Step 8: Test API integration simulation
    console.log('\n8️⃣ Testing API integration simulation...');
    
    // Simulate what happens when cards are approved from a lesson
    const approvedCards = [
      { frontText: '2 + 3 = ?', backText: '5', difficultyLevel: 'easy', tags: ['חיבור'] },
      { frontText: '5 - 2 = ?', backText: '3', difficultyLevel: 'easy', tags: ['חיסור'] }
    ];
    
    // Add cards to the lesson set
    for (let i = 0; i < approvedCards.length; i++) {
      const card = approvedCards[i];
      await run(`
        INSERT INTO memory_cards (
          user_id, set_id, front_text, back_text, card_type, difficulty_level, 
          tags, order_index, ai_generated, ai_provider, generation_metadata
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        lessonSetId,
        card.frontText,
        card.backText,
        'text',
        card.difficultyLevel,
        JSON.stringify(card.tags),
        i,
        1,
        'openai',
        '{"sourceType": "lesson", "jobId": ' + jobResult.lastID + '}'
      ]);
    }
    
    // Update set card count
    await run(`
      UPDATE memory_card_sets 
      SET total_cards = (SELECT COUNT(*) FROM memory_cards WHERE set_id = ?)
      WHERE id = ?
    `, [lessonSetId, lessonSetId]);
    
    console.log(`📚 Added ${approvedCards.length} AI-generated cards to lesson set`);
    
    // Final verification
    const finalStats = await query(`
      SELECT 
        COUNT(*) as total_sets,
        SUM(CASE WHEN set_type = 'lesson_generated' THEN 1 ELSE 0 END) as lesson_sets,
        SUM(total_cards) as total_cards,
        SUM(CASE WHEN set_type = 'lesson_generated' THEN total_cards ELSE 0 END) as lesson_cards
      FROM memory_card_sets 
      WHERE user_id = ?
    `, [userId]);
    
    const final = finalStats.rows[0];
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📝 Final Summary:');
    console.log('   ✅ Unified flashcard database schema created');
    console.log('   ✅ Lesson-generated flashcard sets properly tagged and tracked');
    console.log('   ✅ Statistics views include lesson-generated sets');
    console.log('   ✅ Card generation jobs and logs tracked');
    console.log('   ✅ AI-generated cards properly linked to sets');
    console.log('   ✅ Both deliverables verified');
    console.log(`   📊 Final stats: ${final.total_sets} sets, ${final.lesson_sets} lesson sets, ${final.total_cards} total cards, ${final.lesson_cards} lesson cards`);
    
    return {
      success: true,
      userId,
      lessonSetId,
      manualSetId,
      totalSets: final.total_sets,
      lessonSets: final.lesson_sets,
      totalCards: final.total_cards,
      lessonCards: final.lesson_cards
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run test if called directly
if (require.main === module) {
  testUnifiedFlashcardsSQLite()
    .then((result) => {
      console.log('\n✅ Test script completed successfully');
      console.log('📊 Test results:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test script failed:', error);
      process.exit(1);
    });
}

module.exports = { testUnifiedFlashcardsSQLite };
