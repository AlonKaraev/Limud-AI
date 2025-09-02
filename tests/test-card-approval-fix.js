const CardGenerationService = require('../server/services/CardGenerationService');
const MemoryCardSet = require('../server/models/MemoryCardSet');
const MemoryCard = require('../server/models/MemoryCard');

/**
 * Test script to verify card approval and saving functionality
 */

async function testCardApproval() {
  console.log('🧪 Testing Card Approval and Saving...\n');

  try {
    // Step 1: Generate cards from text
    console.log('📝 Step 1: Generate cards from text');
    const testText = `
    היסטוריה היא חקר העבר של האנושות. 
    היא עוזרת לנו להבין איך התפתחה הציvilization האנושית.
    היסטוריונים חוקרים מקורות כמו מסמכים עתיקים, חפצים ארכיאולוגיים ועדויות.
    לימוד היסטוריה חשוב כדי להבין את ההווה ולהיערך לעתיד.
    `;

    const generationResult = await CardGenerationService.generateCardsFromText({
      text: testText,
      userId: 1, // Test user ID
      config: {
        cardCount: 3,
        difficultyLevel: 'medium',
        subjectArea: 'היסטוריה',
        gradeLevel: 'כיתות ז-ט'
      }
    });

    console.log('✅ Cards generated successfully!');
    console.log(`📊 Generated ${generationResult.cards.length} cards`);
    console.log(`🔧 Job ID: ${generationResult.jobId}`);

    // Step 2: Test creating a new set
    console.log('\n📁 Step 2: Create new memory card set');
    const newSet = await MemoryCardSet.create({
      name: 'בדיקת היסטוריה - ' + Date.now(),
      description: 'סט בדיקה ליצירת כרטיסים מטקסט',
      userId: 1,
      subjectArea: 'היסטוריה',
      gradeLevel: 'כיתות ז-ט',
      isPublic: false
    });

    console.log('✅ New set created successfully!');
    console.log(`📁 Set ID: ${newSet.id}, Name: ${newSet.name}`);

    // Step 3: Save generated cards to the new set
    console.log('\n💾 Step 3: Save generated cards to set');
    const savedCards = [];
    
    for (let i = 0; i < generationResult.cards.length; i++) {
      const generatedCard = generationResult.cards[i];
      
      console.log(`Saving card ${i + 1}:`);
      console.log(`  Front: ${generatedCard.frontText}`);
      console.log(`  Back: ${generatedCard.backText}`);
      
      const cardData = {
        userId: 1,
        setId: newSet.id,
        frontText: generatedCard.frontText,
        backText: generatedCard.backText,
        cardType: generatedCard.cardType || 'text',
        difficultyLevel: generatedCard.difficultyLevel || 'medium',
        tags: generatedCard.tags || [],
        orderIndex: i
      };

      const savedCard = await MemoryCard.create(cardData);
      savedCards.push(savedCard);
      console.log(`  ✅ Card saved with ID: ${savedCard.id}`);
    }

    console.log(`\n✅ All ${savedCards.length} cards saved successfully!`);

    // Step 4: Test saving to existing set
    console.log('\n📂 Step 4: Test saving to existing set');
    
    // Get all sets for user
    const userSets = await MemoryCardSet.getByUserId(1);
    console.log(`Found ${userSets.length} existing sets for user`);
    
    if (userSets.length > 1) {
      const existingSet = userSets.find(set => set.id !== newSet.id);
      if (existingSet) {
        console.log(`Using existing set: ${existingSet.name} (ID: ${existingSet.id})`);
        
        // Generate one more card and save to existing set
        const singleCardResult = await CardGenerationService.generateCardsFromText({
          text: 'מלחמת העולם השנייה החלה ב-1939 והסתיימה ב-1945. זו הייתה המלחמה הגדולה ביותר בהיסטוריה האנושית.',
          userId: 1,
          config: {
            cardCount: 1,
            difficultyLevel: 'easy',
            subjectArea: 'היסטוריה',
            gradeLevel: 'כיתות ז-ט'
          }
        });

        if (singleCardResult.cards.length > 0) {
          const cardToSave = singleCardResult.cards[0];
          const savedToExisting = await MemoryCard.create({
            userId: 1,
            setId: existingSet.id,
            frontText: cardToSave.frontText,
            backText: cardToSave.backText,
            cardType: 'text',
            difficultyLevel: 'easy',
            tags: cardToSave.tags || [],
            orderIndex: 0
          });
          
          console.log(`✅ Card saved to existing set with ID: ${savedToExisting.id}`);
        }
      }
    }

    // Step 5: Verify the sets and cards
    console.log('\n🔍 Step 5: Verify saved data');
    
    const setWithCards = await newSet.getWithCards();
    console.log(`Set "${setWithCards.name}" contains ${setWithCards.cards.length} cards:`);
    
    setWithCards.cards.forEach((card, index) => {
      console.log(`  ${index + 1}. Front: ${card.frontText.substring(0, 50)}...`);
      console.log(`     Back: ${card.backText.substring(0, 50)}...`);
      console.log(`     Difficulty: ${card.difficultyLevel}, Tags: ${card.tags.join(', ')}`);
    });

    console.log('\n✅ All tests passed! Card approval and saving is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Provide specific error guidance
    if (error.message.includes('חסרים שדות חובה')) {
      console.log('\n💡 Solution: Check that all required fields are provided when creating cards/sets');
    } else if (error.message.includes('no such table')) {
      console.log('\n💡 Solution: Run database setup: node database/setup-card-generation.js');
    } else {
      console.log('\n💡 Check the error details above and ensure all dependencies are properly configured.');
    }
    
    process.exit(1);
  }
}

// Test the approval route directly
async function testApprovalRoute() {
  console.log('\n🌐 Testing approval route simulation...');
  
  try {
    // Simulate the approval route logic
    const mockApprovedCards = [
      {
        frontText: 'מהי היסטוריה?',
        backText: 'היסטוריה היא חקר העבר של האנושות',
        difficultyLevel: 'medium',
        tags: ['היסטוריה', 'הגדרה'],
        cardType: 'text'
      },
      {
        frontText: 'מה עוזר לנו לימוד היסטוריה?',
        backText: 'לימוד היסטוריה עוזר להבין את ההווה ולהיערך לעתיד',
        difficultyLevel: 'medium',
        tags: ['היסטוריה', 'חשיבות'],
        cardType: 'text'
      }
    ];

    const setName = 'בדיקת מסלול אישור - ' + Date.now();
    const setDescription = 'בדיקה של מסלול אישור כרטיסים';
    const userId = 1;

    // Create new set
    const newSet = await MemoryCardSet.create({
      name: setName,
      description: setDescription,
      userId,
      subjectArea: 'היסטוריה',
      gradeLevel: 'כיתות ז-ט',
      isPublic: false
    });

    console.log(`✅ Created set: ${newSet.name} (ID: ${newSet.id})`);

    // Save approved cards
    const savedCards = [];
    for (let i = 0; i < mockApprovedCards.length; i++) {
      const card = mockApprovedCards[i];
      
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
    const updatedSet = await newSet.update({
      totalCards: newSet.totalCards + savedCards.length
    });

    console.log(`✅ Saved ${savedCards.length} cards to set`);
    console.log(`📊 Set now has ${updatedSet.totalCards} total cards`);

    return {
      success: true,
      setId: newSet.id,
      setName: newSet.name,
      cardsAdded: savedCards.length,
      cards: savedCards
    };

  } catch (error) {
    console.error('❌ Approval route test failed:', error.message);
    throw error;
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Card Approval Tests\n');
  console.log('=' .repeat(60));
  
  await testCardApproval();
  await testApprovalRoute();
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 All approval tests completed!');
  console.log('\nThe card approval and saving functionality is working correctly.');
  console.log('If you\'re still experiencing issues in the UI, the problem might be:');
  console.log('1. Frontend-backend communication');
  console.log('2. Authentication/authorization');
  console.log('3. Request format or validation');
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the tests
runTests().catch(console.error);
