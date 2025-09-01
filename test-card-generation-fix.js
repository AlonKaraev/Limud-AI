const CardGenerationService = require('./server/services/CardGenerationService');

/**
 * Test script to verify card generation functionality after fixing the database issue
 */

async function testCardGeneration() {
  console.log('🧪 Testing Card Generation Service...\n');

  try {
    // Test 1: Generate cards from text
    console.log('📝 Test 1: Generate cards from text');
    const testText = `
    מתמטיקה היא תחום מדעי העוסק במספרים, צורות ודפוסים. 
    היא כוללת ארבע פעולות יסוד: חיבור, חיסור, כפל וחילוק.
    חיבור הוא פעולה שבה מצרפים מספרים יחד כדי לקבל סכום.
    חיסור הוא פעולה הפוכה לחיבור, שבה מפחיתים מספר אחד מאחר.
    כפל הוא חיבור חוזר של אותו מספר.
    חילוק הוא פעולה הפוכה לכפל, שבה מחלקים מספר למספר שווה של חלקים.
    `;

    const result = await CardGenerationService.generateCardsFromText({
      text: testText,
      userId: 1, // Test user ID
      config: {
        cardCount: 5,
        difficultyLevel: 'medium',
        subjectArea: 'מתמטיקה',
        gradeLevel: 'כיתות ד-ו'
      }
    });

    console.log('✅ Cards generated successfully!');
    console.log(`📊 Generated ${result.cards.length} cards`);
    console.log(`🔧 Job ID: ${result.jobId}`);
    console.log(`📏 Source text length: ${result.metadata.sourceTextLength} characters`);
    console.log(`⚡ Processing time: ${result.metadata.processingTime}ms`);
    
    // Display first card as example
    if (result.cards.length > 0) {
      console.log('\n📋 Example card:');
      console.log(`Front: ${result.cards[0].frontText}`);
      console.log(`Back: ${result.cards[0].backText}`);
      console.log(`Difficulty: ${result.cards[0].difficultyLevel}`);
      console.log(`Tags: ${result.cards[0].tags.join(', ')}`);
    }

    console.log('\n✅ All tests passed! Card generation is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Provide specific error guidance
    if (error.message.includes('OpenAI client לא זמין')) {
      console.log('\n💡 Solution: Make sure OPENAI_API_KEY is set in your .env file');
    } else if (error.message.includes('שגיאה ביצירת משימת יצירה')) {
      console.log('\n💡 Solution: Database tables might not be set up. Run: node database/setup-card-generation.js');
    } else {
      console.log('\n💡 Check the error details above and ensure all dependencies are properly configured.');
    }
    
    process.exit(1);
  }
}

// Test generation statistics
async function testGenerationStats() {
  console.log('\n📈 Testing generation statistics...');
  
  try {
    const stats = await CardGenerationService.getGenerationStats(1);
    console.log('✅ Stats retrieved successfully:');
    console.log(`Total generations: ${stats.total_generations}`);
    console.log(`Total cards generated: ${stats.total_cards_generated}`);
    console.log(`Average cards per generation: ${stats.avg_cards_per_generation}`);
    console.log(`Providers used: ${stats.providers_used}`);
  } catch (error) {
    console.error('❌ Stats test failed:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Card Generation Tests\n');
  console.log('=' .repeat(50));
  
  await testCardGeneration();
  await testGenerationStats();
  
  console.log('\n' + '='.repeat(50));
  console.log('🎉 All tests completed!');
  console.log('\nNext steps:');
  console.log('1. Start the server: npm run dev');
  console.log('2. Test card generation from the UI');
  console.log('3. Try generating cards from a lesson with transcription');
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the tests
runTests().catch(console.error);
