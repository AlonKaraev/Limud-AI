const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

// Database path
const dbPath = path.join(__dirname, '../server/database/limudai.db');

async function setupStudentPortalData() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');
    });

    db.serialize(async () => {
      try {
        console.log('Setting up student portal sample data...');

        // Create sample teacher user
        const teacherPassword = await bcrypt.hash('Teacher123!', 10);
        
        db.run(`
          INSERT OR IGNORE INTO users (email, password_hash, role, first_name, last_name, school_id, is_verified)
          VALUES (?, ?, 'teacher', 'שרה', 'כהן', 1, 1)
        `, ['teacher@example.com', teacherPassword], function(err) {
          if (err) {
            console.error('Error creating teacher:', err);
          } else {
            console.log('✅ Sample teacher created');
          }
        });

        // Create sample student users
        const studentPassword = await bcrypt.hash('Student123!', 10);
        
        const students = [
          { email: 'student1@example.com', firstName: 'דוד', lastName: 'לוי' },
          { email: 'student2@example.com', firstName: 'מיכל', lastName: 'אברהם' },
          { email: 'student3@example.com', firstName: 'יוסף', lastName: 'מזרחי' }
        ];

        for (const student of students) {
          db.run(`
            INSERT OR IGNORE INTO users (email, password_hash, role, first_name, last_name, school_id, is_verified)
            VALUES (?, ?, 'student', ?, ?, 1, 1)
          `, [student.email, studentPassword, student.firstName, student.lastName], function(err) {
            if (err) {
              console.error(`Error creating student ${student.firstName}:`, err);
            } else {
              console.log(`✅ Sample student ${student.firstName} created`);
            }
          });
        }

        // Wait a bit for users to be created
        setTimeout(() => {
          // Create sample classes
          db.get('SELECT id FROM users WHERE email = ? AND role = ?', ['teacher@example.com', 'teacher'], (err, teacher) => {
            if (err || !teacher) {
              console.error('Teacher not found:', err);
              return;
            }

            const classes = [
              { name: 'כיתה ה׳ - מתמטיקה', subject: 'מתמטיקה', grade: 'ה׳' },
              { name: 'כיתה ו׳ - עברית', subject: 'עברית', grade: 'ו׳' }
            ];

            classes.forEach((classData, index) => {
              db.run(`
                INSERT OR IGNORE INTO classes (name, description, teacher_id, grade_level, subject_area, school_id)
                VALUES (?, ?, ?, ?, ?, 1)
              `, [
                classData.name,
                `כיתה לימוד ${classData.subject} לכיתה ${classData.grade}`,
                teacher.id,
                classData.grade,
                classData.subject
              ], function(err) {
                if (err) {
                  console.error(`Error creating class ${classData.name}:`, err);
                } else {
                  console.log(`✅ Sample class ${classData.name} created`);
                  
                  // Add students to classes
                  db.all('SELECT id FROM users WHERE role = ?', ['student'], (err, students) => {
                    if (err || !students.length) {
                      console.error('Students not found:', err);
                      return;
                    }

                    students.forEach(student => {
                      db.run(`
                        INSERT OR IGNORE INTO class_memberships (class_id, student_id)
                        VALUES (?, ?)
                      `, [this.lastID, student.id], (err) => {
                        if (err) {
                          console.error('Error adding student to class:', err);
                        }
                      });
                    });
                  });
                }
              });
            });
          });

          // Create sample recordings and content
          setTimeout(() => {
            db.get('SELECT id FROM users WHERE email = ? AND role = ?', ['teacher@example.com', 'teacher'], (err, teacher) => {
              if (err || !teacher) return;

              const recordings = [
                {
                  filename: 'שיעור מתמטיקה - חיבור וחיסור.mp3',
                  metadata: JSON.stringify({ duration: 1800, subject: 'מתמטיקה' })
                },
                {
                  filename: 'שיעור עברית - דקדוק ותחביר.mp3',
                  metadata: JSON.stringify({ duration: 2100, subject: 'עברית' })
                },
                {
                  filename: 'שיעור מדעים - מערכת השמש.mp3',
                  metadata: JSON.stringify({ duration: 1650, subject: 'מדעים' })
                }
              ];

              recordings.forEach((recording, index) => {
                db.run(`
                  INSERT OR IGNORE INTO recordings (user_id, recording_id, filename, file_path, file_size, metadata)
                  VALUES (?, ?, ?, ?, ?, ?)
                `, [
                  teacher.id,
                  `sample-recording-${index + 1}`,
                  recording.filename,
                  `/uploads/sample-recording-${index + 1}.mp3`,
                  1024000,
                  recording.metadata
                ], function(err) {
                  if (err) {
                    console.error(`Error creating recording ${recording.filename}:`, err);
                  } else {
                    console.log(`✅ Sample recording ${recording.filename} created`);
                    
                    const recordingId = this.lastID;

                    // Create sample summary
                    db.run(`
                      INSERT OR IGNORE INTO content_summaries (recording_id, user_id, summary_text, key_topics, subject_area)
                      VALUES (?, ?, ?, ?, ?)
                    `, [
                      recordingId,
                      teacher.id,
                      `תקציר של ${recording.filename}: שיעור מקיף הכולל הסברים ברורים ודוגמאות מעשיות. השיעור מתאים לתלמידים ברמות שונות ומספק בסיס חזק להמשך הלמידה.`,
                      JSON.stringify(['מושגי יסוד', 'דוגמאות מעשיות', 'תרגילים']),
                      JSON.parse(recording.metadata).subject
                    ], (err) => {
                      if (err) {
                        console.error('Error creating summary:', err);
                      } else {
                        console.log(`✅ Summary created for ${recording.filename}`);
                      }
                    });

                    // Create sample question set
                    db.run(`
                      INSERT OR IGNORE INTO question_sets (recording_id, user_id, set_name, description, total_questions, subject_area, estimated_duration)
                      VALUES (?, ?, ?, ?, ?, ?, ?)
                    `, [
                      recordingId,
                      teacher.id,
                      `מבחן - ${recording.filename.replace('.mp3', '')}`,
                      `מבחן בדיקת הבנה לשיעור ${recording.filename}`,
                      5,
                      JSON.parse(recording.metadata).subject,
                      15
                    ], function(err) {
                      if (err) {
                        console.error('Error creating question set:', err);
                      } else {
                        console.log(`✅ Question set created for ${recording.filename}`);
                        
                        const questionSetId = this.lastID;

                        // Create sample questions
                        const sampleQuestions = [
                          {
                            text: 'מה המושג המרכזי שנלמד בשיעור?',
                            type: 'multiple_choice',
                            answer: 'המושג המרכזי',
                            options: JSON.stringify(['המושג המרכזי', 'מושג משני', 'מושג נוסף', 'אף אחד מהנ"ל'])
                          },
                          {
                            text: 'האם הבנת את הנושא שנלמד?',
                            type: 'true_false',
                            answer: 'נכון',
                            options: JSON.stringify(['נכון', 'לא נכון'])
                          }
                        ];

                        sampleQuestions.forEach((question, qIndex) => {
                          db.run(`
                            INSERT OR IGNORE INTO generated_questions (recording_id, user_id, question_text, question_type, correct_answer, answer_options, topic_area)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                          `, [
                            recordingId,
                            teacher.id,
                            question.text,
                            question.type,
                            question.answer,
                            question.options,
                            JSON.parse(recording.metadata).subject
                          ], function(err) {
                            if (err) {
                              console.error('Error creating question:', err);
                            } else {
                              // Link question to set
                              db.run(`
                                INSERT OR IGNORE INTO question_set_items (question_set_id, question_id, order_index)
                                VALUES (?, ?, ?)
                              `, [questionSetId, this.lastID, qIndex], (err) => {
                                if (err) {
                                  console.error('Error linking question to set:', err);
                                }
                              });
                            }
                          });
                        });
                      }
                    });

                    // Create content shares
                    setTimeout(() => {
                      // Share lesson content
                      db.run(`
                        INSERT OR IGNORE INTO content_shares (recording_id, teacher_id, share_type, is_active)
                        VALUES (?, ?, 'summary', 1)
                      `, [recordingId, teacher.id], function(err) {
                        if (err) {
                          console.error('Error creating lesson content share:', err);
                        } else {
                          console.log(`✅ Lesson content share created for ${recording.filename}`);
                          
                          const contentShareId = this.lastID;

                          // Share with all classes
                          db.all('SELECT id FROM classes WHERE teacher_id = ?', [teacher.id], (err, classes) => {
                            if (err || !classes.length) return;

                            classes.forEach(classData => {
                              db.run(`
                                INSERT OR IGNORE INTO content_share_permissions (content_share_id, class_id)
                                VALUES (?, ?)
                              `, [contentShareId, classData.id], (err) => {
                                if (err) {
                                  console.error('Error creating content share permission:', err);
                                }
                              });
                            });
                          });
                        }
                      });

                      // Share test content
                      db.run(`
                        INSERT OR IGNORE INTO content_shares (recording_id, teacher_id, share_type, is_active)
                        VALUES (?, ?, 'test', 1)
                      `, [recordingId, teacher.id], function(err) {
                        if (err) {
                          console.error('Error creating test content share:', err);
                        } else {
                          console.log(`✅ Test content share created for ${recording.filename}`);
                          
                          const testShareId = this.lastID;

                          // Share with all classes
                          db.all('SELECT id FROM classes WHERE teacher_id = ?', [teacher.id], (err, classes) => {
                            if (err || !classes.length) return;

                            classes.forEach(classData => {
                              db.run(`
                                INSERT OR IGNORE INTO content_share_permissions (content_share_id, class_id)
                                VALUES (?, ?)
                              `, [testShareId, classData.id], (err) => {
                                if (err) {
                                  console.error('Error creating test share permission:', err);
                                }
                              });
                            });
                          });
                        }
                      });
                    }, 500);
                  }
                });
              });
            });
          }, 1000);
        }, 500);

        setTimeout(() => {
          console.log('\n🎉 Student portal sample data setup completed!');
          console.log('\nSample accounts created:');
          console.log('📧 Teacher: teacher@example.com / Teacher123!');
          console.log('📧 Student 1: student1@example.com / Student123!');
          console.log('📧 Student 2: student2@example.com / Student123!');
          console.log('📧 Student 3: student3@example.com / Student123!');
          console.log('\nYou can now test the student portal with these accounts.');
          
          db.close((err) => {
            if (err) {
              console.error('Error closing database:', err);
              reject(err);
            } else {
              console.log('Database connection closed.');
              resolve();
            }
          });
        }, 3000);

      } catch (error) {
        console.error('Error in setup:', error);
        reject(error);
      }
    });
  });
}

// Run the setup if this file is executed directly
if (require.main === module) {
  setupStudentPortalData()
    .then(() => {
      console.log('Setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupStudentPortalData };
