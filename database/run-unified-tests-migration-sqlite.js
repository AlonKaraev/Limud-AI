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
        // Read and execute the unified tests schema
        const schemaPath = path.join(__dirname, 'unified-tests-schema-sqlite.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('📋 Creating unified tests tables and views...');
        
        // Split the schema into individual statements, handling multi-line statements
        const statements = [];
        let currentStatement = '';
        const lines = schemaSql.split('\n');
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          
          // Skip comments and empty lines
          if (trimmedLine.startsWith('--') || trimmedLine === '') {
            continue;
          }
          
          currentStatement += ' ' + trimmedLine;
          
          // If line ends with semicolon, we have a complete statement
          if (trimmedLine.endsWith(';')) {
            const statement = currentStatement.trim().slice(0, -1); // Remove semicolon
            if (statement.length > 0) {
              statements.push(statement);
            }
            currentStatement = '';
          }
        }
        
        // Add any remaining statement
        if (currentStatement.trim()) {
          statements.push(currentStatement.trim());
        }

        let completedStatements = 0;
        const totalStatements = statements.length;

        const executeStatement = (index) => {
          if (index >= statements.length) {
            // All statements executed, now migrate data
            migrateData();
            return;
          }

          const statement = statements[index];
          if (statement.trim()) {
            db.run(statement, (err) => {
              if (err) {
                console.error(`❌ Error executing statement ${index + 1}:`, err);
                console.error('Statement:', statement.substring(0, 100) + '...');
                db.run('ROLLBACK');
                db.close();
                reject(err);
                return;
              }
              
              completedStatements++;
              if (completedStatements % 5 === 0 || completedStatements === totalStatements) {
                console.log(`✅ Executed ${completedStatements}/${totalStatements} schema statements`);
              }
              
              executeStatement(index + 1);
            });
          } else {
            executeStatement(index + 1);
          }
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
                r.user_id,
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
              GROUP BY qs.id, r.user_id
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

                  const testId = this.lastID;
                  
                  // Migrate questions for this test
                  db.all(`
                    SELECT gq.*, qsi.order_index
                    FROM generated_questions gq
                    INNER JOIN question_set_items qsi ON gq.id = qsi.question_id
                    WHERE qsi.question_set_id = ?
                    ORDER BY qsi.order_index ASC
                  `, [questionSet.id], (err, questions) => {
                    if (err) {
                      console.error(`❌ Error fetching questions for set ${questionSet.id}:`, err);
                      db.run('ROLLBACK');
                      db.close();
                      reject(err);
                      return;
                    }

                    if (questions.length === 0) {
                      migratedCount++;
                      migrateQuestionSet(index + 1);
                      return;
                    }

                    let questionIndex = 0;
                    const migrateQuestion = () => {
                      if (questionIndex >= questions.length) {
                        migratedCount++;
                        migrateQuestionSet(index + 1);
                        return;
                      }

                      const question = questions[questionIndex];
                      
                      // Insert question
                      db.run(`
                        INSERT INTO test_questions (
                          test_id, question_text, question_type, difficulty_level,
                          points, order_index, correct_answer, explanation,
                          metadata, tags, ai_generated, ai_provider, confidence_score,
                          created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
                      `, [
                        testId,
                        question.question_text,
                        question.question_type || 'multiple_choice',
                        question.difficulty_level || 'medium',
                        1,
                        question.order_index || questionIndex,
                        question.correct_answer,
                        question.explanation,
                        question.metadata || '{}',
                        question.tags || '[]',
                        question.ai_provider || 'openai',
                        question.confidence_score || 0.0,
                        question.created_at,
                        question.updated_at
                      ], function(err) {
                        if (err) {
                          console.error(`❌ Error migrating question ${question.id}:`, err);
                          db.run('ROLLBACK');
                          db.close();
                          reject(err);
                          return;
                        }

                        const testQuestionId = this.lastID;
                        
                        // Migrate question options
                        db.all(`
                          SELECT * FROM question_options 
                          WHERE question_id = ?
                          ORDER BY option_order ASC
                        `, [question.id], (err, options) => {
                          if (err) {
                            console.error(`❌ Error fetching options for question ${question.id}:`, err);
                            db.run('ROLLBACK');
                            db.close();
                            reject(err);
                            return;
                          }

                          if (options.length === 0) {
                            questionIndex++;
                            migrateQuestion();
                            return;
                          }

                          let optionIndex = 0;
                          const migrateOption = () => {
                            if (optionIndex >= options.length) {
                              questionIndex++;
                              migrateQuestion();
                              return;
                            }

                            const option = options[optionIndex];
                            
                            db.run(`
                              INSERT INTO test_question_options (
                                question_id, option_text, is_correct, explanation, option_order, created_at
                              ) VALUES (?, ?, ?, ?, ?, ?)
                            `, [
                              testQuestionId,
                              option.option_text,
                              option.is_correct ? 1 : 0,
                              option.explanation,
                              option.option_order,
                              option.created_at
                            ], (err) => {
                              if (err) {
                                console.error(`❌ Error migrating option:`, err);
                                db.run('ROLLBACK');
                                db.close();
                                reject(err);
                                return;
                              }

                              optionIndex++;
                              migrateOption();
                            });
                          };

                          migrateOption();
                        });
                      });
                    };

                    migrateQuestion();
                  });
                });
              };

              migrateQuestionSet(0);
            });
          });
        };

        const completeTransaction = () => {
          // Update question counts for migrated tests
          console.log('🔢 Updating question counts for migrated tests...');
          db.run(`
            UPDATE tests 
            SET question_count = (
              SELECT COUNT(*) 
              FROM test_questions 
              WHERE test_questions.test_id = tests.id
            )
            WHERE test_type IN ('lesson_generated', 'ai_generated')
            AND question_count = 0
          `, (err) => {
            if (err) {
              console.error('❌ Error updating question counts:', err);
              db.run('ROLLBACK');
              db.close();
              reject(err);
              return;
            }

            // Verify migration results
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

              db.get(`
                SELECT 
                  COUNT(*) as total_questions,
                  SUM(CASE WHEN ai_generated = 1 THEN 1 ELSE 0 END) as ai_generated_questions,
                  SUM(CASE WHEN ai_generated = 0 THEN 1 ELSE 0 END) as manual_questions
                FROM test_questions
              `, (err, questionStats) => {
                if (err) {
                  console.error('❌ Error fetching question stats:', err);
                  db.run('ROLLBACK');
                  db.close();
                  reject(err);
                  return;
                }

                db.get(`SELECT COUNT(*) as total_options FROM test_question_options`, (err, optionStats) => {
                  if (err) {
                    console.error('❌ Error fetching option stats:', err);
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
                  console.log(`   Questions: ${questionStats.total_questions} total`);
                  console.log(`   - AI Generated: ${questionStats.ai_generated_questions}`);
                  console.log(`   - Manual: ${questionStats.manual_questions}`);
                  console.log(`   Options: ${optionStats.total_options} total`);

                  // Test the views
                  console.log('\n🔍 Testing views...');
                  
                  db.get('SELECT COUNT(*) as count FROM lesson_tests', (err, lessonTestsView) => {
                    if (err) {
                      console.error('❌ Error testing lesson_tests view:', err);
                      db.run('ROLLBACK');
                      db.close();
                      reject(err);
                      return;
                    }

                    console.log(`   lesson_tests view: ${lessonTestsView.count} records`);
                    
                    db.get('SELECT COUNT(*) as count FROM manual_tests', (err, manualTestsView) => {
                      if (err) {
                        console.error('❌ Error testing manual_tests view:', err);
                        db.run('ROLLBACK');
                        db.close();
                        reject(err);
                        return;
                      }

                      console.log(`   manual_tests view: ${manualTestsView.count} records`);
                      
                      db.get('SELECT COUNT(*) as count FROM test_statistics', (err, testStatsView) => {
                        if (err) {
                          console.error('❌ Error testing test_statistics view:', err);
                          db.run('ROLLBACK');
                          db.close();
                          reject(err);
                          return;
                        }

                        console.log(`   test_statistics view: ${testStatsView.count} user records`);

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
                    });
                  });
                });
              });
            });
          });
        };

        executeStatement(0);

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
