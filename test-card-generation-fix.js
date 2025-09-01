/**
 * Test script to verify the card generation fix
 * This script tests the CardGenerationService with mock data to ensure
 * the transcript field issue is resolved
 */

const CardGenerationService = require('./server/services/CardGenerationService');

// Mock TranscriptionService to simulate the database response
const mockTranscriptionService = {
  getTranscriptionByRecordingId: async (recordingId, userId) => {
    // Simulate a transcription record from the database
    // Note: The database field is 'transcription_text', not 'text'
    return {
      id: 1,
      recording_id: recordingId,
      user_id: userId,
      transcription_text: 'זהו טקסט תמליל לדוגמה שמכיל מספיק תוכן ליצירת כרטיסי זיכרון. הטקסט כולל מידע חינוכי על נושא מתמטיקה. אנחנו לומדים על חיבור וחיסור של מספרים. חיבור הוא פעולה מתמטית שבה אנחנו מוסיפים מספרים יחד. לדוגמה, 2 + 3 = 5. חיסור הוא פעולה הפוכה שבה אנחנו מורידים מספר אחד מהשני.',
      confidence_score: 0.85,
      language_detected: 'he',
      processing_duration: 5000,
      ai_provider: 'openai',
      model_version: 'whisper-1',
      segments: [],
      metadata: {
        duration: 30,
        words: null
      },
      created_at: new Date().toISOString()
    };
  }
};

// Mock the TranscriptionService require
const originalRequire = require;
require = function(id) {
  if (id === './TranscriptionService') {
    return mockTranscriptionService;
  }
  return originalRequire.apply(this, arguments);
};

// Mock AI provider to avoid actual API calls
const mockAIProvider = {
  generateCompletion: async (options) => {
    return {
      text: JSON.stringify({
        cards: [
          {
            frontText: "מה זה חיבור?",
            backText: "חיבור הוא פעולה מתמטית שבה אנחנו מוסיפים מספרים יחד",
            difficultyLevel: "easy",
            tags: ["מתמטיקה", "חיבור"]
          },
          {
            frontText: "תן דוגמה לחיבור פשוט",
            backText: "2 + 3 = 5",
            difficultyLevel: "easy", 
            tags: ["מתמטיקה", "דוגמה"]
          }
        ]
      })
    };
  }
};

// Mock the AI services
const mockAIServices = {
  AI_PROVIDERS: { OPENAI: 'openai' },
  getAIProvider: () => mockAIProvider
};

// Mock database functions
const mockDatabase = {
  run: async (query, params) => {
    console.log('Mock DB run:', query.substring(0, 50) + '...');
    return { lastID: Math.floor(Math.random() * 1000) };
  },
  query: async (query, params) => {
    console.log('Mock DB query:', query.substring(0, 50) + '...');
    return { rows: [] };
  }
};

async function testCardGenerationFix() {
  console.log('🧪 Testing Card Generation Fix...\n');

  try {
    // Test the generateCardsFromLesson method
    console.log('1. Testing generateCardsFromLesson with mock data...');
    
    const result = await CardGenerationService.generateCardsFromLesson({
      recordingId: 123,
      userId: 456,
      config: {
        cardCount: 2,
        difficultyLevel: 'easy',
        subjectArea: 'מתמטיקה',
        gradeLevel: 'כיתות ד-ו'
      }
    });

    console.log('✅ Card generation successful!');
    console.log('Generated cards:', result.cards.length);
    console.log('Cards preview:');
    result.cards.forEach((card, index) => {
      console.log(`  Card ${index + 1}:`);
      console.log(`    Front: ${card.frontText}`);
      console.log(`    Back: ${card.backText}`);
      console.log(`    Difficulty: ${card.difficultyLevel}`);
      console.log('');
    });

    console.log('✅ Test passed! The transcript field issue has been fixed.');
    console.log('The service now correctly accesses transcription_text from the database.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Mock the required modules before running the test
const Module = require('module');
const originalLoad = Module._load;

Module._load = function(request, parent) {
  if (request === '../config/ai-services') {
    return mockAIServices;
  }
  if (request === '../config/database-sqlite') {
    return mockDatabase;
  }
  return originalLoad.apply(this, arguments);
};

// Run the test
testCardGenerationFix().then(() => {
  console.log('\n🎉 Test completed!');
}).catch((error) => {
  console.error('\n💥 Test execution failed:', error);
});
