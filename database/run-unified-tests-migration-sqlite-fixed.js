const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Database configuration
const dbPath = process.env.DB_PATH || path.join(__dirname, '../server/database/limudai.db');

async function runUnifiedTestsMigration() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Error opening database:', err);
        reject(err);
        return;
      }
      console.log('📁 Connected to SQLite database:', dbPath);
    });

    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');

    console.log('🚀 Starting unified tests migration...');

    // Begin transaction
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      try {
        console.log('📋 Creating unified tests tables...');
        
        // Create tables one by one with explicit SQL
        const createTestsTable = `
          CREATE TABLE IF NOT EXISTS tests (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              title TEXT NOT NULL,
              description TEXT,
              test_type TEXT NOT NULL DEFAULT 'manual' CHECK (test_type IN ('manual', 'lesson_generated', 'ai_generated')),
              
              -- Source information
              source_type TEXT DEFAULT 'manual' CHECK (source_type IN ('manual', 'recording', 'lesson', 'ai_processing')),
              source_id INTEGER, -- References recording_id for lesson tests, NULL for manual
              
              -- Educational metadata
              subject_area TEXT,
              grade_level TEXT,
              curriculum TEXT,
              
              -- Test configuration
              time_limit INTEGER DEFAULT 0, -- in minutes, 0 = no limit
              question_count INTEGER DEFAULT 0,
              passing_score INTEGER DEFAULT 60, -- percentage
              allow_retakes INTEGER DEFAULT 1,
              shuffle_questions INTEGER DEFAULT 0,
              shuffle_answers INTEGER DEFAULT 0,
              show_results_immediately INTEGER DEFAULT 1,
              
              -- Content organization
              tags TEXT DEFAULT '[]', -- JSON array of tags
              difficulty_level TEXT DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard', 'mixed')),
              learning_objectives TEXT DEFAULT '[]', -- JSON array of learning objectives
              
              -- Status and visibility
              status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
              is_public INTEGER DEFAULT 0,
              is_shared INTEGER DEFAULT 0,
              shared_with TEXT DEFAULT '[]', -- JSON array of user/class IDs
              
              -- AI-specific metadata (for lesson tests)
              ai_provider TEXT, -- 'openai', 'anthropic', etc.
              model_version TEXT,
              confidence_score REAL DEFAULT 0.0,
              processing_metadata TEXT DEFAULT '{}',
              
              -- Timestamps
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`;

        const createTestQuestionsTable = `
          CREATE TABLE IF NOT EXISTS test_questions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
              question_text TEXT NOT NULL,
              question_type TEXT DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank')),
              difficulty_level TEXT DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
              points INTEGER DEFAULT 1,
              order_index INTEGER DEFAULT 0,
              
              -- Multiple choice specific
              correct_answer TEXT, -- For non-multiple choice questions
              explanation TEXT,
              
              -- Metadata
              metadata TEXT DEFAULT '{}',
              tags TEXT DEFAULT '[]',
              
              -- AI generation info
              ai_generated INTEGER DEFAULT 0,
              ai_provider TEXT,
              confidence_score REAL DEFAULT 0.0,
              
              -- Timestamps
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`;

        const createTestQuestionOptionsTable = `
          CREATE TABLE IF NOT EXISTS test_question_options (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              question_id INTEGER NOT NULL REFERENCES test_questions(id) ON DELETE CASCADE,
              option_text TEXT NOT NULL,
              is_correct INTEGER DEFAULT 0,
              explanation TEXT,
              option_order INTEGER DEFAULT 0,
              
              -- Timestamps
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`;

        // Execute table creation
        db.run(createTestsTable, (err) => {
          if (err) {
            console.error('❌ Error creating tests table:', err);
            db.run('ROLLBACK');
            db.close();
            reject(err);
            return;
          }
          console.log('✅ Created tests table');

          db.run(createTestQuestionsTable, (err) => {
            if (err) {
              console.error('❌ Error creating test_questions table:', err);
              db.run('ROLLBACK');
              db.close();
              reject(err);
              return;
            }
            console.log('✅ Created test_questions table');

            db.run(createTestQuestionOptionsTable, (err) => {
              if (err) {
                console.error('❌ Error creating test_question_options table:', err);
                db.run('ROLLBACK');
                db.close();
                reject(err);
                return;
              }
              console.log('✅ Created test_question_options table');

              // Create indexes
              createIndexes();
            });
          });
        });

        const createIndexes = () => {
          console.log('📊 Creating indexes...');
          
          const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_tests_user_id ON tests(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_tests_test_type ON tests(test_type)',
            'CREATE INDEX IF NOT EXISTS idx_tests_source_type ON tests(source_type)',
            'CREATE INDEX IF NOT EXISTS idx_tests_source_id ON tests(source_id)',
            'CREATE INDEX IF NOT EXISTS idx_tests_subject_area ON tests(subject_area)',
            'CREATE INDEX IF NOT EXISTS idx_tests_grade_level ON tests(grade_level)',
            'CREATE INDEX IF NOT EXISTS idx_tests_status ON tests(status)',
            'CREATE INDEX IF NOT EXISTS idx_tests_is_public ON tests(is_public)',
            'CREATE INDEX IF NOT EXISTS idx_tests_created_at ON tests(created_at)',
            'CREATE INDEX IF NOT EXISTS idx_test_questions_test_id ON test_questions(test_id)',
            'CREATE INDEX IF NOT EXISTS idx_test_questions_question_type ON test_questions(question_type)',
            'CREATE INDEX IF NOT EXISTS idx_test_questions_difficulty ON test_questions(difficulty_level)',
            'CREATE INDEX IF NOT EXISTS idx_test_questions_order ON test_questions(order_index)',
            'CREATE INDEX IF NOT EXISTS idx_test_questions_ai_generated ON test_questions(ai_generated)',
            'CREATE INDEX IF NOT EXISTS idx_test_question_options_question_id ON test_question_options(question_id)',
            'CREATE INDEX IF NOT EXISTS idx_test_question_options_is_correct ON test_question_options(is_correct)',
            'CREATE INDEX IF NOT EXISTS idx_test_question_options_order ON test_question_options(option_order)'
          ];

          let indexCount = 0;
          const createNextIndex = () => {
            if (indexCount >= indexes.length) {
              createViews();
              return;
            }

            db.run(indexes[indexCount], (err) => {
              if (err) {
                console.error(`❌ Error creating index ${indexCount + 1}:`, err);
                db.run('ROLLBACK');
                db.close();
                reject(err);
                return;
              }
              
              indexCount++;
              if (indexCount % 5 === 0 || indexCount === indexes.length) {
                console.log(`✅ Created ${indexCount}/${indexes.length} indexes`);
              }
              createNextIndex();
            });
          };

          createNextIndex();
        };

        const createViews = () => {
          console.log('👁️ Creating views...');
          
          const lessonTestsView = `
            CREATE VIEW IF NOT EXISTS lesson_tests AS
            SELECT 
                id,
                user_id,
                source_id as recording_id,
                title as set_name,
                description,
                test_type,
                subject_area,
                grade_level,
                question_count as total_questions,
                time_limit as estimated_duration,
                difficulty_level,
                learning_objectives,
                confidence_score,
                ai_provider,
                model_version,
                processing_metadata as metadata,
                created_at,
                updated_at
            FROM tests 
            WHERE test_type IN ('lesson_generated', 'ai_generated') 
            AND source_type IN ('recording', 'lesson', 'ai_processing')`;

          const manualTestsView = `
            CREATE VIEW IF NOT EXISTS manual_tests AS
            SELECT 
                id,
                user_id,
                title,
                description,
                subject_area,
                grade_level,
                question_count,
                time_limit,
                passing_score,
                tags,
                status,
                is_public,
                created_at,
                updated_at
            FROM tests 
            WHERE test_type = 'manual' 
            AND source_type = 'manual'`;

          const testStatisticsView = `
            CREATE VIEW IF NOT EXISTS test_statistics AS
            SELECT 
                user_id,
                COUNT(*) as total_tests,
                SUM(CASE WHEN test_type = 'manual' THEN 1 ELSE 0 END) as manual_tests,
                SUM(CASE WHEN test_type IN ('lesson_generated', 'ai_generated') THEN 1 ELSE 0 END) as lesson_tests,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_tests,
                SUM(CASE WHEN is_public = 1 THEN 1 ELSE 0 END) as public_tests,
                SUM(CASE WHEN is_shared = 1 THEN 1 ELSE 0 END) as shared_tests,
                SUM(question_count) as total_questions,
                COUNT(DISTINCT subject_area) as subjects_covered,
                COUNT(DISTINCT grade_level) as grade_levels_covered
            FROM tests 
            GROUP BY user_id`;

          db.run(lessonTestsView, (err) => {
            if (err) {
              console.error('❌ Error creating lesson_tests view:', err);
              db.run('ROLLBACK');
              db.close();
              reject(err);
              return;
            }
            console.log('✅ Created lesson_tests view');

            db.run(manualTestsView, (err) => {
              if (err) {
                console.error('❌ Error creating manual_tests view:', err);
                db.run('ROLLBACK');
                db.close();
                reject(err);
                return;
              }
              console.log('✅ Created manual_tests view');

              db.run(testStatisticsView, (err) => {
                if (err) {
                  console.error('❌ Error creating test_statistics view:', err);
                  db.run('ROLLBACK');
                  db.close();
                  reject(err);
                  return;
                }
                console.log('✅ Created test_statistics view');

                // Now migrate data
                migrateData();
              });
            });
          });
        };

        const migrateData = () => {
          console.log('🔄 Migrating existing question sets to unified tests table...');
          
          // Check if question_sets table exists
          db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='question_sets'`, (err, row) => {
            if (err) {
              console.error('❌ Error checking for question_sets table:', err);
              db.run('ROLLBACK');
              db.close();
              reject(err);
              return;
            }

            if (!row) {
              console.log('ℹ️ No question_sets table found, skipping data migration');
              completeTransaction();
              return;
            }

            // Get existing question sets
            db.all(`
              SELECT 
                qs.*,
                COALESCE(r.user_id, 1) as user_id,
                COALESCE(qs.set_name, 'מבחן מתוכן שיעור ' || qs.recording_id) as title,
                COUNT(qsi.question_id) as actual_question_count
              FROM question_sets qs
              LEFT JOIN recordings r ON qs.recording_id = r.id
              LEFT JOIN question_set_items qsi ON qs.id = qsi.question_set_id
              WHERE NOT EXISTS (
                SELECT 1 FROM tests t 
                WHERE t.source_type = 'recording' 
                AND t.source_id = qs.recording_id 
                AND t.test_type = 'lesson_generated'
              )
              AND COALESCE(r.user_id, 1) IS NOT NULL
              GROUP BY qs.id, COALESCE(r.user_id, 1)
            `, (err, questionSets) => {
              if (err) {
                console.error('❌ Error fetching question sets:', err);
                db.run('ROLLBACK');
                db.close();
                reject(err);
                return;
              }

              if (questionSets.length === 0) {
                console.log('ℹ️ No question sets to migrate');
                completeTransaction();
                return;
              }

              console.log(`📦 Found ${questionSets.length} question sets to migrate`);
              
              let migratedCount = 0;
              const migrateQuestionSet = (index) => {
                if (index >= questionSets.length) {
                  console.log(`✅ Successfully migrated ${migratedCount} question sets to tests table`);
                  completeTransaction();
                  return;
                }

                const questionSet = questionSets[index];
                
                // Insert test
                db.run(`
                  INSERT INTO tests (
                    user_id, title, description, test_type, source_type, source_id,
                    subject_area, grade_level, question_count, time_limit, difficulty_level,
                    learning_objectives, ai_provider, model_version, confidence_score,
                    processing_metadata, tags, status, created_at, updated_at
                  ) VALUES (?, ?, ?, 'lesson_generated', 'recording', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
                `, [
                  questionSet.user_id,
                  questionSet.title,
                  questionSet.description || 'מבחן שנוצר אוטומטית מתוכן השיעור',
                  questionSet.recording_id,
                  questionSet.subject_area,
                  questionSet.grade_level,
                  questionSet.actual_question_count || questionSet.total_questions || 0,
                  questionSet.estimated_duration || 0,
                  questionSet.difficulty_level || 'medium',
                  questionSet.learning_objectives || '[]',
                  questionSet.ai_provider || 'openai',
                  questionSet.model_version,
                  questionSet.confidence_score || 0.0,
                  questionSet.metadata || '{}',
                  JSON.stringify(['lesson', questionSet.subject_area || 'general'].filter(Boolean)),
                  questionSet.created_at,
                  questionSet.updated_at
                ], function(err) {
                  if (err) {
                    console.error(`❌ Error migrating question set ${questionSet.id}:`, err);
                    db.run('ROLLBACK');
                    db.close();
                    reject(err);
                    return;
                  }

                  migratedCount++;
                  migrateQuestionSet(index + 1);
                });
              };

              migrateQuestionSet(0);
            });
          });
        };

        const completeTransaction = () => {
          console.log('🔍 Verifying migration results...');
          
          db.get(`
            SELECT 
              COUNT(*) as total_tests,
              SUM(CASE WHEN test_type = 'manual' THEN 1 ELSE 0 END) as manual_tests,
              SUM(CASE WHEN test_type = 'lesson_generated' THEN 1 ELSE 0 END) as lesson_tests,
              SUM(CASE WHEN test_type = 'ai_generated' THEN 1 ELSE 0 END) as ai_tests,
              SUM(question_count) as total_questions
            FROM tests
          `, (err, testStats) => {
            if (err) {
              console.error('❌ Error fetching test stats:', err);
              db.run('ROLLBACK');
              db.close();
              reject(err);
              return;
            }

            console.log('\n📊 Migration Summary:');
            console.log(`   Tests: ${testStats.total_tests} total`);
            console.log(`   - Manual: ${testStats.manual_tests}`);
            console.log(`   - Lesson Generated: ${testStats.lesson_tests}`);
            console.log(`   - AI Generated: ${testStats.ai_tests}`);

            // Commit transaction
            db.run('COMMIT', (err) => {
              if (err) {
                console.error('❌ Error committing transaction:', err);
                db.run('ROLLBACK');
                db.close();
                reject(err);
                return;
              }

              console.log('\n✅ Unified tests migration completed successfully!');
              console.log('\n📝 Next steps:');
              console.log('   1. Restart the server to use the new unified tests API');
              console.log('   2. Test lesson-generated test creation from cards');
              console.log('   3. Verify statistics counting in overview tab');

              db.close((err) => {
                if (err) {
                  console.error('❌ Error closing database:', err);
                  reject(err);
                } else {
                  console.log('\n🎉 Migration script completed successfully!');
                  resolve();
                }
              });
            });
          });
        };

      } catch (error) {
        console.error('❌ Migration failed:', error);
        db.run('ROLLBACK');
        db.close();
        reject(error);
      }
    });
  });
}

// Run migration if called directly
if (require.main === module) {
  runUnifiedTestsMigration()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { runUnifiedTestsMigration };
