/**
 * Test script for lesson sharing functionality
 * This script tests the complete flow from teacher sharing content to student accessing it
 */

const { initializeDatabase, query, run } = require('./server/config/database-sqlite');

async function testLessonSharing() {
  console.log('🧪 Starting lesson sharing functionality test...\n');

  try {
    // Initialize database
    await initializeDatabase();
    console.log('✅ Database initialized successfully\n');

    // Step 1: Create test users
    console.log('📝 Step 1: Creating test users...');
    
    // Create a school first
    const schoolResult = await run(`
      INSERT OR IGNORE INTO schools (name, address, phone, email) 
      VALUES (?, ?, ?, ?)
    `, ['בית ספר בדיקה', 'רחוב הבדיקה 1', '03-1111111', 'test@school.co.il']);
    
    const schoolId = schoolResult.lastID || 1;
    console.log(`   School created with ID: ${schoolId}`);

    // Create teacher user
    const teacherResult = await run(`
      INSERT OR IGNORE INTO users (email, password_hash, role, first_name, last_name, school_id, is_verified) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, ['teacher@test.com', 'hashed_password', 'teacher', 'מורה', 'בדיקה', schoolId, 1]);
    
    const teacherId = teacherResult.lastID || (await query('SELECT id FROM users WHERE email = ?', ['teacher@test.com'])).rows[0].id;
    console.log(`   Teacher created with ID: ${teacherId}`);

    // Create student user
    const studentResult = await run(`
      INSERT OR IGNORE INTO users (email, password_hash, role, first_name, last_name, school_id, is_verified) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, ['student@test.com', 'hashed_password', 'student', 'תלמיד', 'בדיקה', schoolId, 1]);
    
    const studentId = studentResult.lastID || (await query('SELECT id FROM users WHERE email = ?', ['student@test.com'])).rows[0].id;
    console.log(`   Student created with ID: ${studentId}`);

    // Step 2: Create a class and add student
    console.log('\n📚 Step 2: Creating class and adding student...');
    
    const classResult = await run(`
      INSERT OR IGNORE INTO classes (teacher_id, school_id, name, description, grade_level, subject_area, academic_year, is_active) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [teacherId, schoolId, 'כיתה א בדיקה', 'כיתה לבדיקת המערכת', 'א', 'מתמטיקה', '2024-2025', 1]);
    
    const classId = classResult.lastID || (await query('SELECT id FROM classes WHERE teacher_id = ? AND name = ?', [teacherId, 'כיתה א בדיקה'])).rows[0].id;
    console.log(`   Class created with ID: ${classId}`);

    // Add student to class
    await run(`
      INSERT OR IGNORE INTO class_memberships (class_id, student_id, is_active) 
      VALUES (?, ?, ?)
    `, [classId, studentId, 1]);
    console.log(`   Student added to class`);

    // Step 3: Create a recording
    console.log('\n🎵 Step 3: Creating test recording...');
    
    const recordingResult = await run(`
      INSERT INTO recordings (user_id, recording_id, filename, file_path, file_size, metadata) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [teacherId, 'test_recording_123', 'שיעור מתמטיקה - חיבור וחיסור.mp3', '/uploads/test_recording_123.mp3', 1024000, JSON.stringify({
      duration: 1800, // 30 minutes
      lessonName: 'חיבור וחיסור',
      subject: 'מתמטיקה',
      grade: 'א'
    })]);
    
    const recordingId = recordingResult.lastID;
    console.log(`   Recording created with ID: ${recordingId}`);

    // Step 4: Create AI content (transcription, summary, questions)
    console.log('\n🤖 Step 4: Creating AI content...');
    
    // Create transcription
    await run(`
      INSERT INTO transcriptions (recording_id, user_id, transcription_text, confidence_score, language_detected) 
      VALUES (?, ?, ?, ?, ?)
    `, [recordingId, teacherId, 'היום נלמד על חיבור וחיסור. חיבור זה כאשר אנחנו מוסיפים מספרים יחד. לדוגמה, 2 + 3 = 5. חיסור זה כאשר אנחנו לוקחים מספר מתוך מספר אחר. לדוגמה, 5 - 2 = 3.', 0.95, 'he']);
    console.log(`   Transcription created`);

    // Create summary
    await run(`
      INSERT INTO content_summaries (recording_id, user_id, summary_text, key_topics, learning_objectives, subject_area, grade_level) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [recordingId, teacherId, 'שיעור בסיסי על פעולות חיבור וחיסור לכיתה א. השיעור מסביר את המושגים הבסיסיים ונותן דוגמאות פשוטות.', 
        JSON.stringify(['חיבור', 'חיסור', 'מספרים']), 
        JSON.stringify(['הבנת מושג החיבור', 'הבנת מושג החיסור', 'פתרון תרגילים בסיסיים']), 
        'מתמטיקה', 'א']);
    console.log(`   Summary created`);

    // Create question set
    const questionSetResult = await run(`
      INSERT INTO question_sets (recording_id, user_id, set_name, description, total_questions, subject_area, grade_level, estimated_duration) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [recordingId, teacherId, 'מבחן חיבור וחיסור', 'מבחן בסיסי על פעולות חיבור וחיסור', 3, 'מתמטיקה', 'א', 10]);
    
    const questionSetId = questionSetResult.lastID;
    console.log(`   Question set created with ID: ${questionSetId}`);

    // Create questions
    const questions = [
      {
        text: 'כמה זה 2 + 3?',
        type: 'multiple_choice',
        correct: '5',
        options: ['4', '5', '6', '7'],
        difficulty: 'easy'
      },
      {
        text: 'כמה זה 8 - 3?',
        type: 'multiple_choice',
        correct: '5',
        options: ['4', '5', '6', '7'],
        difficulty: 'easy'
      },
      {
        text: 'האם 4 + 1 = 5?',
        type: 'true_false',
        correct: 'נכון',
        options: ['נכון', 'לא נכון'],
        difficulty: 'easy'
      }
    ];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const questionResult = await run(`
        INSERT INTO generated_questions (recording_id, user_id, question_text, question_type, correct_answer, answer_options, difficulty_level, topic_area) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [recordingId, teacherId, q.text, q.type, q.correct, JSON.stringify(q.options), q.difficulty, 'חיבור וחיסור']);
      
      const questionId = questionResult.lastID;
      
      // Add to question set
      await run(`
        INSERT INTO question_set_items (question_set_id, question_id, order_index, points) 
        VALUES (?, ?, ?, ?)
      `, [questionSetId, questionId, i + 1, 1]);
    }
    console.log(`   ${questions.length} questions created and added to set`);

    // Step 5: Share content with class
    console.log('\n📤 Step 5: Sharing content with class...');
    
    const contentTypes = ['transcription', 'summary', 'test'];
    const shareResults = [];

    for (const contentType of contentTypes) {
      // Create content share
      const shareResult = await run(`
        INSERT INTO content_shares (recording_id, teacher_id, share_type, is_active, start_date) 
        VALUES (?, ?, ?, ?, datetime('now'))
      `, [recordingId, teacherId, contentType, 1]);
      
      const shareId = shareResult.lastID;
      
      // Add class permission
      await run(`
        INSERT INTO content_share_permissions (content_share_id, class_id) 
        VALUES (?, ?)
      `, [shareId, classId]);
      
      shareResults.push({ shareId, contentType });
      console.log(`   ${contentType} shared with class (Share ID: ${shareId})`);
    }

    // Create notifications for student
    for (const shareResult of shareResults) {
      const contentTypeHebrew = {
        transcription: 'תמליל',
        summary: 'סיכום',
        test: 'מבחן'
      }[shareResult.contentType];

      await run(`
        INSERT INTO student_notifications (student_id, content_share_id, notification_type, title, message) 
        VALUES (?, ?, ?, ?, ?)
      `, [studentId, shareResult.shareId, 'content_shared', 
          `תוכן חדש זמין: ${contentTypeHebrew}`, 
          `המורה מורה בדיקה שיתף איתך ${contentTypeHebrew} עבור השיעור "חיבור וחיסור"`]);
    }
    console.log(`   Notifications created for student`);

    // Step 6: Test student access
    console.log('\n👨‍🎓 Step 6: Testing student access...');
    
    // Test dashboard data
    const dashboardData = await query(`
      SELECT COUNT(DISTINCT cs.recording_id) as lessons_count
      FROM content_shares cs
      JOIN content_share_permissions csp ON cs.id = csp.content_share_id
      JOIN class_memberships cm ON csp.class_id = cm.class_id
      WHERE cm.student_id = ? AND cs.is_active = 1 AND cm.is_active = 1
      AND cs.share_type IN ('transcription', 'summary')
    `, [studentId]);
    
    console.log(`   Student has access to ${dashboardData.rows[0].lessons_count} lessons`);

    // Test lessons access
    const lessonsData = await query(`
      SELECT DISTINCT
        r.id as recording_id,
        r.filename,
        r.created_at as lesson_date,
        cs.id as content_share_id,
        cs.share_type,
        c.name as class_name,
        c.subject_area,
        summary.summary_text,
        CASE WHEN test_share.id IS NOT NULL THEN 1 ELSE 0 END as has_test
      FROM recordings r
      JOIN content_shares cs ON r.id = cs.recording_id
      JOIN content_share_permissions csp ON cs.id = csp.content_share_id
      JOIN classes c ON csp.class_id = c.id
      JOIN class_memberships cm ON c.id = cm.class_id
      LEFT JOIN content_summaries summary ON r.id = summary.recording_id
      LEFT JOIN content_shares test_share ON r.id = test_share.recording_id AND test_share.share_type = 'test' AND test_share.is_active = 1
      WHERE cm.student_id = ? 
      AND cs.is_active = 1 
      AND cm.is_active = 1
      AND cs.share_type IN ('transcription', 'summary')
    `, [studentId]);
    
    console.log(`   Student can access ${lessonsData.rows.length} lesson records`);
    if (lessonsData.rows.length > 0) {
      const lesson = lessonsData.rows[0];
      console.log(`     - Lesson: ${lesson.filename}`);
      console.log(`     - Class: ${lesson.class_name}`);
      console.log(`     - Subject: ${lesson.subject_area}`);
      console.log(`     - Has Test: ${lesson.has_test ? 'Yes' : 'No'}`);
    }

    // Test tests access
    const testsData = await query(`
      SELECT DISTINCT
        r.id as recording_id,
        r.filename,
        qs.set_name,
        qs.total_questions,
        qs.estimated_duration,
        c.name as class_name
      FROM recordings r
      JOIN content_shares cs ON r.id = cs.recording_id
      JOIN content_share_permissions csp ON cs.id = csp.content_share_id
      JOIN classes c ON csp.class_id = c.id
      JOIN class_memberships cm ON c.id = cm.class_id
      LEFT JOIN question_sets qs ON r.id = qs.recording_id
      WHERE cm.student_id = ? 
      AND cs.is_active = 1 
      AND cm.is_active = 1
      AND cs.share_type = 'test'
    `, [studentId]);
    
    console.log(`   Student can access ${testsData.rows.length} tests`);
    if (testsData.rows.length > 0) {
      const test = testsData.rows[0];
      console.log(`     - Test: ${test.set_name}`);
      console.log(`     - Questions: ${test.total_questions}`);
      console.log(`     - Duration: ${test.estimated_duration} minutes`);
    }

    // Test notifications
    const notificationsData = await query(`
      SELECT COUNT(*) as notification_count
      FROM student_notifications 
      WHERE student_id = ?
    `, [studentId]);
    
    console.log(`   Student has ${notificationsData.rows[0].notification_count} notifications`);

    // Step 7: Test content access verification
    console.log('\n🔐 Step 7: Testing content access verification...');
    
    for (const shareResult of shareResults) {
      const accessCheck = await query(`
        SELECT 1
        FROM content_shares cs
        JOIN content_share_permissions csp ON cs.id = csp.content_share_id
        JOIN classes c ON csp.class_id = c.id
        JOIN class_memberships cm ON c.id = cm.class_id
        WHERE cm.student_id = ?
          AND cs.id = ?
          AND cs.share_type = ?
          AND cs.is_active = 1
          AND c.is_active = 1
          AND cm.is_active = 1
        LIMIT 1
      `, [studentId, shareResult.shareId, shareResult.contentType]);
      
      const hasAccess = accessCheck.rows.length > 0;
      console.log(`   Student access to ${shareResult.contentType}: ${hasAccess ? '✅ Allowed' : '❌ Denied'}`);
    }

    // Step 8: Test content retrieval
    console.log('\n📖 Step 8: Testing content retrieval...');
    
    // Test transcription retrieval
    const transcriptionContent = await query(`
      SELECT transcription_text, confidence_score
      FROM transcriptions 
      WHERE recording_id = ? 
      ORDER BY created_at DESC LIMIT 1
    `, [recordingId]);
    
    if (transcriptionContent.rows.length > 0) {
      console.log(`   ✅ Transcription retrieved (${transcriptionContent.rows[0].transcription_text.length} characters)`);
    }

    // Test summary retrieval
    const summaryContent = await query(`
      SELECT summary_text, key_topics, learning_objectives
      FROM content_summaries 
      WHERE recording_id = ? 
      ORDER BY created_at DESC LIMIT 1
    `, [recordingId]);
    
    if (summaryContent.rows.length > 0) {
      console.log(`   ✅ Summary retrieved (${summaryContent.rows[0].summary_text.length} characters)`);
      const keyTopics = JSON.parse(summaryContent.rows[0].key_topics || '[]');
      console.log(`     Topics: ${keyTopics.join(', ')}`);
    }

    // Test questions retrieval
    const questionsContent = await query(`
      SELECT gq.question_text, gq.question_type, gq.answer_options
      FROM generated_questions gq
      JOIN question_set_items qsi ON gq.id = qsi.question_id
      JOIN question_sets qs ON qsi.question_set_id = qs.id
      WHERE qs.recording_id = ?
      ORDER BY qsi.order_index
    `, [recordingId]);
    
    if (questionsContent.rows.length > 0) {
      console.log(`   ✅ Questions retrieved (${questionsContent.rows.length} questions)`);
      questionsContent.rows.forEach((q, i) => {
        console.log(`     Q${i + 1}: ${q.question_text} (${q.question_type})`);
      });
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Test Summary:');
    console.log(`   - Users created: Teacher (${teacherId}), Student (${studentId})`);
    console.log(`   - Class created: ${classId}`);
    console.log(`   - Recording created: ${recordingId}`);
    console.log(`   - Content types shared: ${contentTypes.length}`);
    console.log(`   - Share records created: ${shareResults.length}`);
    console.log(`   - Student can access lessons: ${lessonsData.rows.length > 0 ? 'Yes' : 'No'}`);
    console.log(`   - Student can access tests: ${testsData.rows.length > 0 ? 'Yes' : 'No'}`);
    console.log(`   - Notifications created: ${notificationsData.rows[0].notification_count}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testLessonSharing().then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  }).catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testLessonSharing };
