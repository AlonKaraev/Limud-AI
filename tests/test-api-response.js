const { query } = require('../server/config/database-sqlite');

async function testAPIResponse() {
  try {
    console.log('🧪 Testing API response for flashcard sets...\n');
    
    // Test direct database query first
    console.log('1️⃣ Testing direct database query...');
    const directResult = await query(`
      SELECT id, name, set_type, source_type, source_id, subject_area, grade_level, total_cards, is_active
      FROM memory_card_sets 
      WHERE user_id = 5 
      ORDER BY created_at DESC
    `);
    
    console.log(`📊 Found ${directResult.rows.length} sets in database:`);
    directResult.rows.forEach(set => {
      console.log(`   - ${set.name} (ID: ${set.id}, Type: ${set.set_type}, Source: ${set.source_type}, Cards: ${set.total_cards})`);
    });
    
    // Test the model method
    console.log('\n2️⃣ Testing MemoryCardSet.getByUserId method...');
    const MemoryCardSet = require('../server/models/MemoryCardSet');
    const modelResult = await MemoryCardSet.getByUserId(5);
    
    console.log(`📊 Model returned ${modelResult.length} sets:`);
    modelResult.forEach(set => {
      console.log(`   - ${set.name} (ID: ${set.id}, Type: ${set.setType}, Source: ${set.sourceType}, Cards: ${set.totalCards})`);
      console.log(`     JSON: ${JSON.stringify({
        id: set.id,
        name: set.name,
        setType: set.setType,
        sourceType: set.sourceType,
        sourceId: set.sourceId,
        totalCards: set.totalCards
      })}`);
    });
    
    // Test the views
    console.log('\n3️⃣ Testing unified views...');
    const lessonSetsResult = await query(`
      SELECT * FROM lesson_flashcard_sets WHERE user_id = 5
    `);
    console.log(`📊 Lesson sets view returned ${lessonSetsResult.rows.length} sets`);
    
    const manualSetsResult = await query(`
      SELECT * FROM manual_flashcard_sets WHERE user_id = 5
    `);
    console.log(`📊 Manual sets view returned ${manualSetsResult.rows.length} sets`);
    
    const statsResult = await query(`
      SELECT * FROM flashcard_statistics WHERE user_id = 5
    `);
    if (statsResult.rows.length > 0) {
      const stats = statsResult.rows[0];
      console.log(`📈 Statistics: ${stats.total_sets} total, ${stats.manual_sets} manual, ${stats.lesson_sets} lesson`);
    }
    
    console.log('\n✅ API response test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run test if called directly
if (require.main === module) {
  testAPIResponse()
    .then(() => {
      console.log('\n✅ Test script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test script failed:', error);
      process.exit(1);
    });
}

module.exports = { testAPIResponse };
