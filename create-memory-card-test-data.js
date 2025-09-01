const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, 'server/database/limudai.db');

async function createMemoryCardTestData() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');
    });

    db.serialize(() => {
      // Get the teacher user
      db.get('SELECT id FROM users WHERE email = ? AND role = ?', ['teacher@example.com', 'teacher'], (err, teacher) => {
        if (err || !teacher) {
          console.error('Teacher not found:', err);
          reject(err);
          return;
        }

        console.log('Creating memory card test data...');

        // Create memory card sets
        const sets = [
          {
            name: 'מילים באנגלית - בסיסי',
            description: 'מילים בסיסיות באנגלית לתלמידי כיתה ה׳',
            subjectArea: 'אנגלית',
            gradeLevel: 'ה׳',
            isPublic: true
          },
          {
            name: 'מתמטיקה - כפל וחילוק',
            description: 'תרגילי כפל וחילוק לתלמידי כיתה ד׳',
            subjectArea: 'מתמטיקה',
            gradeLevel: 'ד׳',
            isPublic: false
          },
          {
            name: 'מדעים - בעלי חיים',
            description: 'עובדות מעניינות על בעלי חיים',
            subjectArea: 'מדעים',
            gradeLevel: 'ו׳',
            isPublic: true
          }
        ];

        let setsCreated = 0;
        sets.forEach((setData, setIndex) => {
          db.run(`
            INSERT INTO memory_card_sets (user_id, name, description, subject_area, grade_level, is_public)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [teacher.id, setData.name, setData.description, setData.subjectArea, setData.gradeLevel, setData.isPublic], function(err) {
            if (err) {
              console.error(`Error creating set ${setData.name}:`, err);
              return;
            }

            console.log(`✅ Memory card set created: ${setData.name}`);
            const setId = this.lastID;

            // Create cards for each set
            let cardsData = [];
            
            if (setIndex === 0) { // English words
              cardsData = [
                { front: 'Cat', back: 'חתול', difficulty: 'easy', tags: ['בעלי חיים', 'בסיסי'] },
                { front: 'Dog', back: 'כלב', difficulty: 'easy', tags: ['בעלי חיים', 'בסיסי'] },
                { front: 'House', back: 'בית', difficulty: 'easy', tags: ['מקומות', 'בסיסי'] },
                { front: 'School', back: 'בית ספר', difficulty: 'medium', tags: ['מקומות', 'חינוך'] },
                { front: 'Beautiful', back: 'יפה', difficulty: 'medium', tags: ['תארים', 'רגשות'] },
                { front: 'Happy', back: 'שמח', difficulty: 'easy', tags: ['רגשות', 'בסיסי'] },
                { front: 'Computer', back: 'מחשב', difficulty: 'medium', tags: ['טכנולוgiה', 'מודרני'] },
                { front: 'Book', back: 'ספר', difficulty: 'easy', tags: ['חינוך', 'בסיסי'] }
              ];
            } else if (setIndex === 1) { // Math
              cardsData = [
                { front: '7 × 8 = ?', back: '56', difficulty: 'medium', tags: ['כפל', 'חשבון'] },
                { front: '9 × 6 = ?', back: '54', difficulty: 'medium', tags: ['כפל', 'חשבון'] },
                { front: '72 ÷ 8 = ?', back: '9', difficulty: 'medium', tags: ['חילוק', 'חשבון'] },
                { front: '45 ÷ 5 = ?', back: '9', difficulty: 'easy', tags: ['חילוק', 'חשבון'] },
                { front: '12 × 12 = ?', back: '144', difficulty: 'hard', tags: ['כפל', 'מתקדם'] },
                { front: '96 ÷ 12 = ?', back: '8', difficulty: 'hard', tags: ['חילוק', 'מתקדם'] }
              ];
            } else { // Science - Animals
              cardsData = [
                { front: 'איזה בעל חיים הוא הגדול ביותר בעולם?', back: 'לוויתן כחול', difficulty: 'medium', tags: ['בעלי חיים', 'ים'] },
                { front: 'כמה לבבות יש לתמנון?', back: 'שלושה לבבות', difficulty: 'hard', tags: ['בעלי חיים', 'ים', 'מעניין'] },
                { front: 'איזה בעל חיים יכול לשנות צבע?', back: 'זיקית', difficulty: 'medium', tags: ['בעלי חיים', 'יכולות מיוחדות'] },
                { front: 'איזה בעל חיים הוא המהיר ביותר ביבשה?', back: 'ברדלס', difficulty: 'easy', tags: ['בעלי חיים', 'מהירות'] },
                { front: 'כמה שעות ישן קואלה ביום?', back: '18-22 שעות', difficulty: 'hard', tags: ['בעלי חיים', 'שינה'] },
                { front: 'איזה בעל חיים לא יכול לקפוץ?', back: 'פיל', difficulty: 'medium', tags: ['בעלי חיים', 'יכולות'] }
              ];
            }

            let cardsCreated = 0;
            cardsData.forEach((cardData, cardIndex) => {
              db.run(`
                INSERT INTO memory_cards (user_id, set_id, front_text, back_text, difficulty_level, tags, order_index)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `, [
                teacher.id, 
                setId, 
                cardData.front, 
                cardData.back, 
                cardData.difficulty, 
                JSON.stringify(cardData.tags),
                cardIndex
              ], function(err) {
                if (err) {
                  console.error(`Error creating card:`, err);
                  return;
                }

                cardsCreated++;
                if (cardsCreated === cardsData.length) {
                  // Update total cards count in set
                  db.run(`
                    UPDATE memory_card_sets 
                    SET total_cards = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                  `, [cardsData.length, setId], (err) => {
                    if (err) {
                      console.error('Error updating card count:', err);
                    } else {
                      console.log(`✅ Created ${cardsData.length} cards for set: ${setData.name}`);
                    }

                    setsCreated++;
                    if (setsCreated === sets.length) {
                      console.log('\n🎉 Memory card test data created successfully!');
                      console.log(`Created ${sets.length} sets with cards for testing search and sorting functionality.`);
                      
                      db.close((err) => {
                        if (err) {
                          console.error('Error closing database:', err);
                          reject(err);
                        } else {
                          console.log('Database connection closed.');
                          resolve();
                        }
                      });
                    }
                  });
                }
              });
            });
          });
        });
      });
    });
  });
}

// Run the setup if this file is executed directly
if (require.main === module) {
  createMemoryCardTestData()
    .then(() => {
      console.log('Memory card test data creation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Memory card test data creation failed:', error);
      process.exit(1);
    });
}

module.exports = { createMemoryCardTestData };
