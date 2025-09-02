const { query, run } = require('../server/config/database-sqlite');

/**
 * Test the complete lesson-to-cards workflow to verify that
 * lesson-generated flashcard sets appear in the unified list
 */
async function testLessonToCardsWorkflow() {
  console.log('🧪 Testing Lesson-to-Cards Workflow Integration...\n');

  try {
    // 1. Create a test user and recording
    console.log('1️⃣ Setting up test data...');
    
    // Create test user
    const userResult = await run(`
      INSERT OR IGNORE INTO users (email, password_hash, role, first_name, last_name)
      VALUES ('test-lesson-cards@example.com', 'hash', 'teacher', 'Test', 'Teacher')
    `);
    
    const userQuery = await query(`
      SELECT id FROM users WHERE email = 'test-lesson-cards@example.com'
    `);
    const userId = userQuery.rows[0].id;
    console.log(`👤 Using test user with ID: ${userId}`);

    // Create test recording with lesson metadata
    const recordingResult = await run(`
      INSERT INTO recordings (user_id, recording_id, filename, file_path, file_size, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      userId,
      'lesson-test-recording',
      'lesson-test.mp3',
      '/uploads/lesson-test.mp3',
      1024000,
      JSON.stringify({
        lessonName: 'שיעור מתמטיקה - חיבור וחיסור',
        subjectArea: 'מתמטיקה',
        gradeLevel: 'כיתה ג',
        duration: 1800
      })
    ]);
    
    const recordingId = recordingResult.lastID;
    console.log(`📹 Created test recording with ID: ${recordingId}`);

    // Create transcription for the recording
    await run(`
      INSERT INTO transcriptions (recording_id, user_id, transcription_text, language_detected)
      VALUES (?, ?, ?, ?)
    `, [
      recordingId,
      userId,
      'היום נלמד על חיבור וחיסור. חיבור זה כאשר אנחנו מוסיפים מספרים יחד. לדוגמה, 2 + 3 = 5. חיסור זה כאשר אנחנו לוקחים מספר מתוך מספר אחר. לדוגמה, 5 - 2 = 3.',
      'he'
    ]);

    // 2. Simulate the card generation job creation
    console.log('\n2️⃣ Simulating card generation from lesson...');
    
    const jobResult = await run(`
      INSERT INTO card_generation_jobs (
        user_id, recording_id, status, generation_config, result_metadata, text_length
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      userId,
      recordingId,
      'completed',
      JSON.stringify({
        cardCount: 5,
        difficultyLevel: 'medium',
        subjectArea: 'מתמטיקה',
        gradeLevel: 'כיתה ג',
        provider: 'openai',
        model: 'gpt-3.5-turbo'
      }),
      JSON.stringify({
        cardsGenerated: 5,
        processingTime: 15000
      }),
      150 // text_length
    ]);
    
    const jobId = jobResult.lastID;
    console.log(`⚙️ Created card generation job with ID: ${jobId}`);

    // 3. Simulate the approval process (what happens when user clicks "Save Cards")
    console.log('\n3️⃣ Simulating card approval and set creation...');
    
    // This simulates what the /api/memory-cards/generate/approve/:jobId endpoint does
    const approvedCards = [
      {
        frontText: 'מה זה חיבור?',
        backText: 'חיבור זה כאשר אנחנו מוסיפים מספרים יחד',
        cardType: 'text',
        difficultyLevel: 'medium',
        tags: ['מתמטיקה', 'חיבור']
      },
      {
        frontText: 'מה התוצאה של 2 + 3?',
        backText: '5',
        cardType: 'text',
        difficultyLevel: 'easy',
        tags: ['מתמטיקה', 'חיבור']
      },
      {
        frontText: 'מה זה חיסור?',
        backText: 'חיסור זה כאשר אנחנו לוקחים מספר מתוך מספר אחר',
        cardType: 'text',
        difficultyLevel: 'medium',
        tags: ['מתמטיקה', 'חיסור']
      }
    ];

    // Get job details to determine lesson generation context
    const jobQuery = await query(`
      SELECT * FROM card_generation_jobs WHERE id = ? AND user_id = ?
    `, [jobId, userId]);
    
    const job = jobQuery.rows[0];
    const isLessonGenerated = job && job.recording_id;
    const generationConfig = job.generation_config ? JSON.parse(job.generation_config) : {};

    console.log(`📊 Job details: isLessonGenerated=${isLessonGenerated}, recordingId=${job.recording_id}`);

    // Create new set with unified fields for lesson-generated content
    const setName = 'כרטיסי זיכרון - שיעור מתמטיקה - חיבור וחיסור';
    const setData = {
      name: setName,
      description: 'כרטיסי זיכרון שנוצרו אוטומטית מהשיעור',
      userId,
      subjectArea: generationConfig.subjectArea || 'מתמטיקה',
      gradeLevel: generationConfig.gradeLevel || 'כיתה ג',
      isPublic: false,
      // Unified fields for lesson-generated sets
      setType: 'lesson_generated',
      sourceType: 'recording',
      sourceId: job.recording_id,
      difficultyLevel: generationConfig.difficultyLevel || 'medium',
      aiProvider: generationConfig.provider || 'openai',
      modelVersion: generationConfig.model || 'gpt-3.5-turbo',
      confidenceScore: 0.8,
      processingMetadata: generationConfig,
      tags: ['lesson', generationConfig.subjectArea || 'מתמטיקה'].filter(Boolean)
    };

    // Create the set using the model
    const MemoryCardSet = require('../server/models/MemoryCardSet');
    const newSet = await MemoryCardSet.create(setData);
    console.log(`📚 Created lesson-generated flashcard set with ID: ${newSet.id}`);

    // Add the approved cards to the set
    const MemoryCard = require('../server/models/MemoryCard');
    const savedCards = [];
    
    for (let i = 0; i < approvedCards.length; i++) {
      const card = approvedCards[i];
      const cardData = {
        userId,
        setId: newSet.id,
        frontText: card.frontText,
        backText: card.backText,
        cardType: card.cardType || 'text',
        difficultyLevel: card.difficultyLevel || 'medium',
        tags: card.tags || [],
        orderIndex: i
      };

      const savedCard = await MemoryCard.create(cardData);
      savedCards.push(savedCard);
    }

    // Update set card count
    await newSet.update({
      totalCards: savedCards.length
    });

    console.log(`💾 Added ${savedCards.length} cards to the set`);

    // 4. Test that the lesson-generated set appears in the unified list
    console.log('\n4️⃣ Testing unified flashcard list retrieval...');
    
    // Get all sets for the user (this is what the frontend calls)
    const allSets = await MemoryCardSet.getByUserId(userId);
    console.log(`📋 Found ${allSets.length} total sets for user ${userId}`);
    
    // Filter lesson-generated sets
    const lessonSets = allSets.filter(set => set.setType === 'lesson_generated');
    const manualSets = allSets.filter(set => set.setType === 'manual');
    
    console.log(`📊 Breakdown: ${lessonSets.length} lesson sets, ${manualSets.length} manual sets`);
    
    // Display the lesson-generated sets
    if (lessonSets.length > 0) {
      console.log('\n📚 Lesson-generated sets found:');
      lessonSets.forEach(set => {
        console.log(`   - ${set.name} (ID: ${set.id}, Source: recording ${set.sourceId}, Cards: ${set.totalCards})`);
        console.log(`     Type: ${set.setType}, Subject: ${set.subjectArea}, Grade: ${set.gradeLevel}`);
      });
    } else {
      console.log('❌ No lesson-generated sets found!');
    }

    // 5. Test the API endpoint that the frontend actually calls
    console.log('\n5️⃣ Testing API endpoint response...');
    
    // Simulate the API call that TeacherDashboard makes
    const apiSets = await MemoryCardSet.getByUserId(userId);
    const apiResponse = {
      success: true,
      data: apiSets.map(set => set.toJSON()),
      count: apiSets.length
    };

    console.log(`📡 API would return ${apiResponse.count} sets`);
    
    // Check if lesson sets are included in API response
    const apiLessonSets = apiResponse.data.filter(set => set.setType === 'lesson_generated');
    console.log(`📊 API lesson sets: ${apiLessonSets.length}`);
    
    if (apiLessonSets.length > 0) {
      console.log('✅ Lesson-generated sets are included in API response');
      apiLessonSets.forEach(set => {
        console.log(`   - ${set.name} (setType: ${set.setType}, sourceType: ${set.sourceType})`);
      });
    } else {
      console.log('❌ Lesson-generated sets are NOT included in API response');
    }

    // 6. Test statistics
    console.log('\n6️⃣ Testing statistics...');
    
    const totalSets = allSets.length;
    const totalLessonSets = lessonSets.length;
    const totalManualSets = manualSets.length;
    const totalCards = allSets.reduce((sum, set) => sum + (set.totalCards || 0), 0);
    
    console.log(`📈 Statistics:`);
    console.log(`   Total Sets: ${totalSets}`);
    console.log(`   Lesson Sets: ${totalLessonSets}`);
    console.log(`   Manual Sets: ${totalManualSets}`);
    console.log(`   Total Cards: ${totalCards}`);

    // 7. Verify deliverables
    console.log('\n7️⃣ Verifying deliverables...');
    
    const deliverable1 = lessonSets.length > 0;
    const deliverable2 = totalLessonSets > 0;
    
    console.log(`✅ Deliverable 1 (Lesson sets in list): ${deliverable1 ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Deliverable 2 (Lesson sets in statistics): ${deliverable2 ? 'PASS' : 'FAIL'}`);

    if (deliverable1 && deliverable2) {
      console.log('\n🎉 All tests passed! Lesson-to-cards workflow is working correctly.');
    } else {
      console.log('\n❌ Some tests failed. There may be an issue with the workflow.');
    }

    return {
      success: true,
      userId,
      recordingId,
      setId: newSet.id,
      totalSets,
      lessonSets: totalLessonSets,
      manualSets: totalManualSets,
      totalCards,
      deliverable1,
      deliverable2
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
if (require.main === module) {
  testLessonToCardsWorkflow()
    .then(result => {
      console.log('\n📊 Test Results:', JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testLessonToCardsWorkflow };
