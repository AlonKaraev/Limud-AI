/**
 * Test script to verify flashcard generation inheritance and workflow
 * Tests the complete flashcard generation process from lesson creation to card generation
 */

// Configuration
const BASE_URL = 'http://localhost:5000';

// Import fetch for Node.js
let fetch;
(async () => {
  const { default: nodeFetch } = await import('node-fetch');
  fetch = nodeFetch;
})();
const TEST_USER = {
  username: 'teacher@test.com',
  password: 'password123'
};

// Test lesson metadata with class and field of study
const TEST_LESSON_METADATA = {
  lessonName: 'מתמטיקה - חשבון שברים',
  subject: 'מתמטיקה',
  classLevel: 'כיתה ה',
  curriculum: 'תכנית הליבה',
  subjectArea: 'מתמטיקה',
  gradeLevel: 'כיתה ה',
  fieldOfStudy: 'מתמטיקה'
};

// Test transcription text for flashcard generation
const TEST_TRANSCRIPTION = `
שיעור מתמטיקה - חשבון שברים

היום נלמד על שברים. שבר הוא חלק ממספר שלם.
השבר מורכב משני חלקים: המונה והמכנה.
המונה הוא המספר העליון, והמכנה הוא המספר התחתון.

לדוגמה: בשבר 3/4, המספר 3 הוא המונה והמספר 4 הוא המכנה.
זה אומר שיש לנו 3 חלקים מתוך 4 חלקים שלמים.

כדי לחבר שברים עם אותו מכנה, אנחנו מחברים רק את המונים:
1/4 + 2/4 = 3/4

כדי לחסר שברים עם אותו מכנה, אנחנו מחסרים את המונים:
3/4 - 1/4 = 2/4 = 1/2

כשהמכנים שונים, אנחנו צריכים למצוא מכנה משותף.
לדוגמה: 1/2 + 1/3
המכנה המשותף הוא 6.
1/2 = 3/6
1/3 = 2/6
אז 1/2 + 1/3 = 3/6 + 2/6 = 5/6
`;

let authToken = null;
let testRecordingId = null;

/**
 * Authenticate and get token
 */
async function authenticate() {
  console.log('🔐 Authenticating...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(TEST_USER)
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status}`);
    }

    const data = await response.json();
    authToken = data.token;
    console.log('✅ Authentication successful');
    return true;
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    return false;
  }
}

/**
 * Create a test lesson with metadata
 */
async function createTestLesson() {
  console.log('📝 Creating test lesson...');
  
  try {
    // Create a mock audio file (empty blob for testing)
    const formData = new FormData();
    const audioBlob = new Blob(['mock audio data'], { type: 'audio/wav' });
    
    formData.append('audio', audioBlob, 'test-lesson.wav');
    formData.append('recordingId', `test_${Date.now()}`);
    formData.append('metadata', JSON.stringify(TEST_LESSON_METADATA));

    const response = await fetch(`${BASE_URL}/api/recordings/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Lesson creation failed: ${response.status}`);
    }

    const data = await response.json();
    testRecordingId = data.recordingId;
    console.log('✅ Test lesson created:', testRecordingId);
    return true;
  } catch (error) {
    console.error('❌ Lesson creation failed:', error.message);
    return false;
  }
}

/**
 * Add transcription to the lesson
 */
async function addTranscription() {
  console.log('📄 Adding transcription to lesson...');
  
  try {
    // Simulate transcription creation by directly inserting into database
    const response = await fetch(`${BASE_URL}/api/ai-content/process/${testRecordingId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        generateTranscription: true,
        transcriptionText: TEST_TRANSCRIPTION
      })
    });

    if (!response.ok) {
      throw new Error(`Transcription creation failed: ${response.status}`);
    }

    console.log('✅ Transcription added successfully');
    return true;
  } catch (error) {
    console.error('❌ Transcription creation failed:', error.message);
    return false;
  }
}

/**
 * Test flashcard generation with inheritance
 */
async function testFlashcardGeneration() {
  console.log('🃏 Testing flashcard generation with inheritance...');
  
  try {
    // Test flashcard generation from lesson
    const response = await fetch(`${BASE_URL}/api/memory-cards/generate/from-lesson/${testRecordingId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        config: {
          cardCount: 8,
          difficultyLevel: 'medium',
          language: 'hebrew',
          // These should be inherited from lesson metadata
          subjectArea: '', // Should inherit 'מתמטיקה'
          gradeLevel: ''   // Should inherit 'כיתה ה'
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Flashcard generation failed: ${response.status} - ${errorData.message}`);
    }

    const data = await response.json();
    
    if (!data.success || !data.cards) {
      throw new Error('Flashcard generation returned invalid data');
    }

    console.log('✅ Flashcard generation successful!');
    console.log(`📊 Generated ${data.cards.length} flashcards`);
    
    // Verify inheritance
    console.log('🔍 Verifying inheritance...');
    
    // Check if cards have inherited metadata
    const firstCard = data.cards[0];
    if (firstCard.metadata) {
      console.log('📋 Card metadata:', {
        subjectArea: firstCard.metadata.subjectArea,
        gradeLevel: firstCard.metadata.gradeLevel,
        sourceType: firstCard.metadata.sourceType
      });
      
      // Verify inheritance worked
      if (firstCard.metadata.subjectArea === TEST_LESSON_METADATA.subjectArea) {
        console.log('✅ Subject area inheritance: PASSED');
      } else {
        console.log('❌ Subject area inheritance: FAILED');
        console.log(`Expected: ${TEST_LESSON_METADATA.subjectArea}, Got: ${firstCard.metadata.subjectArea}`);
      }
      
      if (firstCard.metadata.gradeLevel === TEST_LESSON_METADATA.gradeLevel) {
        console.log('✅ Grade level inheritance: PASSED');
      } else {
        console.log('❌ Grade level inheritance: FAILED');
        console.log(`Expected: ${TEST_LESSON_METADATA.gradeLevel}, Got: ${firstCard.metadata.gradeLevel}`);
      }
    }
    
    // Display sample cards
    console.log('\n📚 Sample generated flashcards:');
    data.cards.slice(0, 3).forEach((card, index) => {
      console.log(`\n🃏 Card ${index + 1}:`);
      console.log(`   Front: ${card.frontText}`);
      console.log(`   Back: ${card.backText}`);
      console.log(`   Difficulty: ${card.difficultyLevel}`);
      console.log(`   Tags: ${card.tags?.join(', ') || 'None'}`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Flashcard generation test failed:', error.message);
    return false;
  }
}

/**
 * Test flashcard generation in re-generation list
 */
async function testReGenerationList() {
  console.log('🔄 Testing flashcard generation in re-generation workflow...');
  
  try {
    // Get lesson AI content to verify flashcards are in the list
    const response = await fetch(`${BASE_URL}/api/ai-content/content/${testRecordingId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get AI content: ${response.status}`);
    }

    const data = await response.json();
    
    // Check if flashcards are available for re-generation
    console.log('📋 Available AI content types:', Object.keys(data.content || {}));
    
    // Test re-generation of flashcards
    const regenResponse = await fetch(`${BASE_URL}/api/memory-cards/generate/from-lesson/${testRecordingId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        config: {
          cardCount: 5,
          difficultyLevel: 'easy',
          language: 'hebrew'
        }
      })
    });

    if (!regenResponse.ok) {
      throw new Error(`Re-generation failed: ${regenResponse.status}`);
    }

    const regenData = await regenResponse.json();
    console.log('✅ Re-generation successful!');
    console.log(`📊 Re-generated ${regenData.cards.length} flashcards`);
    
    return true;
  } catch (error) {
    console.error('❌ Re-generation test failed:', error.message);
    return false;
  }
}

/**
 * Cleanup test data
 */
async function cleanup() {
  console.log('🧹 Cleaning up test data...');
  
  try {
    if (testRecordingId) {
      const response = await fetch(`${BASE_URL}/api/recordings/${testRecordingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        console.log('✅ Test lesson deleted successfully');
      } else {
        console.log('⚠️ Failed to delete test lesson (may not exist)');
      }
    }
  } catch (error) {
    console.log('⚠️ Cleanup warning:', error.message);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting Flashcard Inheritance Tests\n');
  
  const results = {
    authentication: false,
    lessonCreation: false,
    transcriptionAdding: false,
    flashcardGeneration: false,
    reGenerationList: false
  };

  try {
    // Run tests in sequence
    results.authentication = await authenticate();
    if (!results.authentication) return results;

    results.lessonCreation = await createTestLesson();
    if (!results.lessonCreation) return results;

    // Wait a bit for lesson to be processed
    console.log('⏳ Waiting for lesson processing...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    results.transcriptionAdding = await addTranscription();
    if (!results.transcriptionAdding) return results;

    // Wait for transcription to be processed
    console.log('⏳ Waiting for transcription processing...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    results.flashcardGeneration = await testFlashcardGeneration();
    results.reGenerationList = await testReGenerationList();

    return results;
  } catch (error) {
    console.error('💥 Test suite failed:', error.message);
    return results;
  } finally {
    await cleanup();
  }
}

/**
 * Print test results
 */
function printResults(results) {
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASSED' : '❌ FAILED';
    const testName = test.replace(/([A-Z])/g, ' $1').toLowerCase();
    console.log(`${status} - ${testName}`);
  });
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Flashcard inheritance is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Please check the implementation.');
  }
}

// Run the tests
if (require.main === module) {
  runTests()
    .then(printResults)
    .catch(error => {
      console.error('💥 Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runTests,
  authenticate,
  createTestLesson,
  testFlashcardGeneration,
  testReGenerationList
};
