import React, { useState } from 'react';
import SecureTestInterface from './SecureTestInterface';
import './SecureTestDemo.css';

// Demo test data with various question types
const demoTestData = {
  test: {
    id: 'demo-secure-test',
    title: 'מבחן הדגמה מאובטח',
    subject: 'מדעי המחשב',
    className: 'כיתה י\'',
    description: 'מבחן הדגמה להצגת מערכת הבחינות המאובטחת',
    timeLimit: 15, // 15 minutes
    totalQuestions: 5,
    estimatedDuration: 15
  },
  questions: [
    {
      id: 1,
      question_text: 'מהו האלגוריתם הבסיסי ביותר למיון מערך של מספרים?',
      question_type: 'multiple_choice',
      topic_area: 'אלגוריתמים',
      difficulty_level: 'easy',
      answer_options: [
        'Bubble Sort',
        'Quick Sort',
        'Merge Sort',
        'Heap Sort'
      ]
    },
    {
      id: 2,
      question_text: 'מבנה הנתונים Stack פועל על פי העיקרון LIFO.',
      question_type: 'true_false',
      topic_area: 'מבני נתונים',
      difficulty_level: 'medium'
    },
    {
      id: 3,
      question_text: 'מהי המשמעות של המונח "Big O Notation"?',
      question_type: 'short_answer',
      topic_area: 'ניתוח אלגוריתמים',
      difficulty_level: 'medium'
    },
    {
      id: 4,
      question_text: 'האם הקוד הבא יעבוד כראוי? הסבר את תשובתך.\n\nfor (int i = 0; i <= 10; i++) {\n    printf("%d ", i);\n}',
      question_type: 'multiple_choice',
      topic_area: 'תכנות',
      difficulty_level: 'easy',
      answer_options: [
        'כן, ידפיס מספרים מ-0 עד 10',
        'לא, יגרום לשגיאת קומפילציה',
        'כן, אבל ידפיס מספרים מ-1 עד 10',
        'לא, ייכנס ללולאה אינסופית'
      ]
    },
    {
      id: 5,
      question_text: 'תאר בפירוט את ההבדלים בין מבנה הנתונים Array לבין Linked List. כלול ביישום שלך דיון על יתרונות וחסרונות של כל מבנה, מורכבות זמן לפעולות שונות, ודוגמאות לשימושים מתאימים.',
      question_type: 'essay',
      topic_area: 'מבני נתונים',
      difficulty_level: 'hard',
      guidelines: 'התשובה צריכה להיות מפורטת ולכלול דוגמאות קונקרטיות. אורך מינימלי: 200 מילים.'
    }
  ]
};

const SecureTestDemo = () => {
  const [showTest, setShowTest] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const handleStartTest = () => {
    setShowTest(true);
    setTestResult(null);
  };

  const handleCloseTest = () => {
    setShowTest(false);
  };

  const handleTestComplete = (result) => {
    setTestResult(result);
    setShowTest(false);
  };

  if (showTest) {
    return (
      <SecureTestInterface
        testData={demoTestData}
        onClose={handleCloseTest}
        onTestComplete={handleTestComplete}
      />
    );
  }

  return (
    <div className="secure-test-demo">
      <div className="demo-container">
        <div className="demo-header">
          <h1 className="demo-title">🔒 מערכת בחינות מאובטחת</h1>
          <p className="demo-subtitle">
            הדגמה של מערכת בחינות עם הפרדת שאלות ותשובות ואמצעי אבטחה מתקדמים
          </p>
        </div>

        <div className="demo-content">
          <div className="security-features">
            <h2>תכונות אבטחה:</h2>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">🚫</div>
                <h3>חסימת העתקה</h3>
                <p>מניעת Ctrl+C, Ctrl+V, Ctrl+A ופעולות העתקה אחרות</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">🖱️</div>
                <h3>חסימת קליק ימני</h3>
                <p>מניעת גישה לתפריט הקונטקסט ופעולות עכבר</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">🔧</div>
                <h3>חסימת כלי פיתוח</h3>
                <p>מניעת F12, Ctrl+Shift+I וגישה לקונסול</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">📄</div>
                <h3>הפרדת עמודים</h3>
                <p>שאלות ותשובות בעמודים נפרדים עם ניקוי זיכרון</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">⏱️</div>
                <h3>מעקב זמנים</h3>
                <p>מדידת זמן קריאה ומענה לכל שאלה</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">🔒</div>
                <h3>מניעת ניווט</h3>
                <p>חסימת רענון דף, חזרה אחורה ויציאה מהמבחן</p>
              </div>
            </div>
          </div>

          <div className="test-info">
            <h2>פרטי המבחן להדגמה:</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">נושא:</span>
                <span className="info-value">{demoTestData.test.subject}</span>
              </div>
              <div className="info-item">
                <span className="info-label">כיתה:</span>
                <span className="info-value">{demoTestData.test.className}</span>
              </div>
              <div className="info-item">
                <span className="info-label">מספר שאלות:</span>
                <span className="info-value">{demoTestData.test.totalQuestions}</span>
              </div>
              <div className="info-item">
                <span className="info-label">זמן משוער:</span>
                <span className="info-value">{demoTestData.test.estimatedDuration} דקות</span>
              </div>
            </div>
          </div>

          {testResult && (
            <div className="test-result">
              <h2>תוצאות המבחן:</h2>
              <div className="result-grid">
                <div className="result-item success">
                  <span className="result-label">ציון:</span>
                  <span className="result-value">{testResult.score}</span>
                </div>
                <div className="result-item">
                  <span className="result-label">זמן כולל:</span>
                  <span className="result-value">{Math.floor(testResult.timeSpent / 60)} דקות</span>
                </div>
                <div className="result-item">
                  <span className="result-label">שאלות שנענו:</span>
                  <span className="result-value">{testResult.answeredQuestions}/{testResult.totalQuestions}</span>
                </div>
              </div>
            </div>
          )}

          <div className="demo-actions">
            <button 
              className="btn btn-primary btn-large demo-btn"
              onClick={handleStartTest}
            >
              🚀 התחל מבחן הדגמה מאובטח
            </button>
            
            <div className="demo-warning">
              <p>
                <strong>שים לב:</strong> במהלך המבחן לא תוכל להשתמש בפעולות העתקה, 
                קליק ימני, או כלי פיתוח. המבחן יפעל במצב מאובטח מלא.
              </p>
            </div>
          </div>
        </div>

        <div className="demo-instructions">
          <h2>הוראות שימוש:</h2>
          <ol>
            <li>לחץ על כפתור "התחל מבחן הדגמה מאובטח"</li>
            <li>המבחן יפתח במצב מסך מלא עם אמצעי אבטחה פעילים</li>
            <li>קרא כל שאלה בעיון (מינימום 10 שניות)</li>
            <li>לחץ "המשך לתשובות" כדי לעבור לעמוד הבחירה</li>
            <li>בחר תשובה ולחץ "שלח תשובה והמשך"</li>
            <li>המערכת תעבור אוטומטית לשאלה הבאה</li>
            <li>בסיום המבחן תקבל תוצאות מפורטות</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default SecureTestDemo;
