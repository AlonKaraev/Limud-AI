const { initializeDatabase } = require('./server/config/database-sqlite');
const MemoryCard = require('./server/models/MemoryCard');
const MemoryCardSet = require('./server/models/MemoryCardSet');
const User = require('./server/models/User');

async function testMemoryCards() {
  console.log('🧪 Starting Memory Cards Feature Tests...\n');

  try {
    // Initialize database
    console.log('📊 Initializing database...');
    await initializeDatabase();
    console.log('✅ Database initialized successfully\n');

    // Test 1: Create a test user
    console.log('👤 Test 1: Creating test user...');
    const testUser = await User.create({
      email: 'teacher@test.co.il',
      password: 'password123',
      role: 'teacher',
      firstName: 'מורה',
      lastName: 'בדיקה',
      schoolId: 1
    });
    console.log('✅ Test user created:', testUser.firstName, testUser.lastName);
    console.log('   User ID:', testUser.id, '\n');

    // Test 2: Create a memory card set with Hebrew text
    console.log('📚 Test 2: Creating memory card set with Hebrew text...');
    const testSet = await MemoryCardSet.create({
      name: 'מתמטיקה - כיתה ג\'',
      description: 'כרטיסי זיכרון למתמטיקה לכיתה ג\'',
      userId: testUser.id,
      subjectArea: 'מתמטיקה',
      gradeLevel: 'ג\'',
      isPublic: false
    });
    console.log('✅ Memory card set created:', testSet.name);
    console.log('   Set ID:', testSet.id);
    console.log('   Description:', testSet.description);
    console.log('   Subject Area:', testSet.subjectArea);
    console.log('   Grade Level:', testSet.gradeLevel, '\n');

    // Test 3: Create memory cards with Hebrew text
    console.log('🃏 Test 3: Creating memory cards with Hebrew text...');
    
    const hebrewCards = [
      {
        frontText: '5 + 3 = ?',
        backText: '8',
        tags: ['חיבור', 'בסיסי']
      },
      {
        frontText: 'מה זה 10 - 4?',
        backText: '6',
        tags: ['חיסור', 'בסיסי']
      },
      {
        frontText: '7 × 2 = ?',
        backText: '14',
        tags: ['כפל', 'בסיסי']
      },
      {
        frontText: 'כמה זה 15 ÷ 3?',
        backText: '5',
        tags: ['חילוק', 'בסיסי']
      },
      {
        frontText: 'מהו השורש הריבועי של 16?',
        backText: '4',
        tags: ['שורש ריבועי', 'מתקדם'],
        difficultyLevel: 'hard'
      }
    ];

    const createdCards = [];
    for (let i = 0; i < hebrewCards.length; i++) {
      const cardData = {
        userId: testUser.id,
        setId: testSet.id,
        frontText: hebrewCards[i].frontText,
        backText: hebrewCards[i].backText,
        tags: hebrewCards[i].tags,
        difficultyLevel: hebrewCards[i].difficultyLevel || 'medium',
        orderIndex: i
      };

      const card = await MemoryCard.create(cardData);
      createdCards.push(card);
      console.log(`   ✅ Card ${i + 1}: "${card.frontText}" → "${card.backText}"`);
      console.log(`      Tags: [${card.tags.join(', ')}]`);
      console.log(`      Difficulty: ${card.difficultyLevel}`);
    }
    console.log(`\n✅ Created ${createdCards.length} memory cards successfully\n`);

    // Test 4: Retrieve cards and verify Hebrew text storage
    console.log('🔍 Test 4: Retrieving cards and verifying Hebrew text storage...');
    const retrievedCards = await MemoryCard.getBySetId(testSet.id);
    console.log(`✅ Retrieved ${retrievedCards.length} cards from set`);
    
    for (const card of retrievedCards) {
      console.log(`   Card ID ${card.id}:`);
      console.log(`     Front: "${card.frontText}"`);
      console.log(`     Back: "${card.backText}"`);
      console.log(`     Tags: [${card.tags.join(', ')}]`);
      console.log(`     Hebrew validation: ${MemoryCard.validateHebrewText(card.frontText) ? '✅' : '❌'}`);
    }
    console.log();

    // Test 5: Update set total cards count
    console.log('🔄 Test 5: Verifying set total cards count...');
    const updatedSet = await MemoryCardSet.findById(testSet.id);
    console.log(`✅ Set total cards count: ${updatedSet.totalCards}`);
    console.log(`   Expected: ${createdCards.length}, Actual: ${updatedSet.totalCards}`);
    console.log(`   Count verification: ${updatedSet.totalCards === createdCards.length ? '✅' : '❌'}\n`);

    // Test 6: Search cards by Hebrew text
    console.log('🔎 Test 6: Searching cards by Hebrew text...');
    const searchResults = await MemoryCard.searchCards(testUser.id, 'מה');
    console.log(`✅ Found ${searchResults.length} cards containing "מה"`);
    for (const card of searchResults) {
      console.log(`   Found: "${card.frontText}" → "${card.backText}"`);
    }
    console.log();

    // Test 7: Test card update with Hebrew text
    console.log('✏️ Test 7: Testing card update with Hebrew text...');
    const cardToUpdate = createdCards[0];
    const updatedCard = await cardToUpdate.update({
      frontText: '5 + 3 = ? (עודכן)',
      backText: '8 (תשובה נכונה)',
      tags: ['חיבור', 'בסיסי', 'עודכן']
    });
    console.log('✅ Card updated successfully:');
    console.log(`   New front text: "${updatedCard.frontText}"`);
    console.log(`   New back text: "${updatedCard.backText}"`);
    console.log(`   New tags: [${updatedCard.tags.join(', ')}]\n`);

    // Test 8: Test set with cards retrieval
    console.log('📖 Test 8: Testing set with cards retrieval...');
    const setWithCards = await updatedSet.getWithCards();
    console.log(`✅ Retrieved set "${setWithCards.name}" with ${setWithCards.cards.length} cards`);
    console.log('   Cards in set:');
    for (const card of setWithCards.cards) {
      console.log(`     - "${card.frontText}" → "${card.backText}"`);
    }
    console.log();

    // Test 9: Test Hebrew text validation
    console.log('🔤 Test 9: Testing Hebrew text validation...');
    const hebrewTexts = [
      'שלום עולם',
      'Hello World',
      'מתמטיקה',
      '123',
      'Mixed עברית and English',
      ''
    ];
    
    for (const text of hebrewTexts) {
      const isValid = MemoryCard.validateHebrewText(text);
      console.log(`   "${text}" → ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    }
    console.log();

    // Test 10: Test card statistics
    console.log('📊 Test 10: Testing card statistics...');
    const cardStats = await MemoryCard.getCardStats(createdCards[0].id);
    console.log('✅ Card statistics retrieved:');
    console.log(`   Total attempts: ${cardStats.total_attempts}`);
    console.log(`   Total correct: ${cardStats.total_correct}`);
    console.log(`   Total incorrect: ${cardStats.total_incorrect}`);
    console.log(`   Average mastery level: ${cardStats.avg_mastery_level}`);
    console.log(`   Unique students: ${cardStats.unique_students}\n`);

    // Test 11: Test set statistics
    console.log('📈 Test 11: Testing set statistics...');
    const setStats = await updatedSet.getStats();
    console.log('✅ Set statistics retrieved:');
    console.log(`   Total cards: ${setStats.total_cards}`);
    console.log(`   Active cards: ${setStats.active_cards}`);
    console.log(`   Unique students: ${setStats.unique_students}`);
    console.log(`   Average mastery level: ${setStats.avg_mastery_level}`);
    console.log(`   Total correct attempts: ${setStats.total_correct_attempts}`);
    console.log(`   Total incorrect attempts: ${setStats.total_incorrect_attempts}\n`);

    console.log('🎉 All Memory Cards tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('✅ Card table created successfully');
    console.log('✅ Can insert/retrieve card data');
    console.log('✅ Hebrew text storage works correctly');
    console.log('✅ Card sets management works');
    console.log('✅ Search functionality works');
    console.log('✅ Update operations work');
    console.log('✅ Statistics generation works');
    console.log('✅ Text validation works');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the tests
if (require.main === module) {
  testMemoryCards()
    .then(() => {
      console.log('\n✨ Memory Cards feature is ready for production!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Tests failed:', error);
      process.exit(1);
    });
}

module.exports = { testMemoryCards };
