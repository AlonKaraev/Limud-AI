// Test Data Generator for Question Display Interface
// This generates sample Hebrew test data for demonstration purposes

export const generateSampleTestData = () => {
  const sampleQuestions = [
    {
      id: 1,
      type: 'multiple_choice',
      topic: 'מתמטיקה',
      difficulty: 'easy',
      question: 'מה התוצאה של 15 + 27?',
      options: [
        { id: 'a', text: '42' },
        { id: 'b', text: '41' },
        { id: 'c', text: '43' },
        { id: 'd', text: '40' }
      ],
      correctAnswer: 'a',
      explanation: 'התוצאה הנכונה היא 42 כי 15 + 27 = 42'
    },
    {
      id: 2,
      type: 'multiple_choice',
      topic: 'היסטוריה',
      difficulty: 'medium',
      question: 'באיזו שנה הוקמה מדינת ישראל?',
      options: [
        { id: 'a', text: '1947' },
        { id: 'b', text: '1948' },
        { id: 'c', text: '1949' },
        { id: 'd', text: '1950' }
      ],
      correctAnswer: 'b',
      explanation: 'מדינת ישראל הוקמה ב-14 במאי 1948'
    },
    {
      id: 3,
      type: 'short_answer',
      topic: 'עברית',
      difficulty: 'easy',
      question: 'מה המילה הנרדפת למילה "שמח"?',
      correctAnswer: 'עליז',
      explanation: 'מילים נרדפות למילה "שמח" הן: עליז, משושש, מאושר'
    },
    {
      id: 4,
      type: 'multiple_choice',
      topic: 'מדעים',
      difficulty: 'hard',
      question: 'איזה מהיסודות הבאים הוא הכי קל?',
      options: [
        { id: 'a', text: 'מימן' },
        { id: 'b', text: 'הליום' },
        { id: 'c', text: 'ליתיום' },
        { id: 'd', text: 'בריליום' }
      ],
      correctAnswer: 'a',
      explanation: 'מימן הוא היסוד הקל ביותר בטבלה המחזורית עם מספר אטומי 1'
    },
    {
      id: 5,
      type: 'essay',
      topic: 'ספרות',
      difficulty: 'medium',
      question: 'כתוב פסקה קצרה על חשיבות הקריאה בחיי היומיום.',
      minWords: 50,
      maxWords: 150,
      explanation: 'תשובה טובה תכלול: פיתוח אוצר מילים, הרחבת ידע, פיתוח דמיון ויכולת חשיבה ביקורתית'
    },
    {
      id: 6,
      type: 'multiple_choice',
      topic: 'גיאוגרפיה',
      difficulty: 'easy',
      question: 'מה הוא הים הכי נמוך בעולם?',
      options: [
        { id: 'a', text: 'הים התיכון' },
        { id: 'b', text: 'ים המלח' },
        { id: 'c', text: 'הים האדום' },
        { id: 'd', text: 'הים השחור' }
      ],
      correctAnswer: 'b',
      explanation: 'ים המלח הוא הנקודה הנמוכה ביותר על פני כדור הארץ, כ-430 מטר מתחת לפני הים'
    },
    {
      id: 7,
      type: 'short_answer',
      topic: 'מתמטיקה',
      difficulty: 'medium',
      question: 'מה השורש הריבועי של 144?',
      correctAnswer: '12',
      explanation: '12 × 12 = 144, לכן השורש הריבועי של 144 הוא 12'
    },
    {
      id: 8,
      type: 'multiple_choice',
      topic: 'מדעים',
      difficulty: 'medium',
      question: 'כמה כוכבי לכת יש במערכת השמש שלנו?',
      options: [
        { id: 'a', text: '7' },
        { id: 'b', text: '8' },
        { id: 'c', text: '9' },
        { id: 'd', text: '10' }
      ],
      correctAnswer: 'b',
      explanation: 'במערכת השמש שלנו יש 8 כוכבי לכת: מרקורי, ונוס, כדור הארץ, מאדים, צדק, שבתאי, אורנוס ונפטון'
    },
    {
      id: 9,
      type: 'essay',
      topic: 'חברה',
      difficulty: 'hard',
      question: 'נתח את השפעת הטכנולוgia על חיי בני הנוער בימינו.',
      minWords: 100,
      maxWords: 200,
      explanation: 'תשובה מקיפה תדון ביתרונות (תקשורת, גישה למידע) ובחסרונות (התמכרות, בעיות חברתיות) של הטכנולוגיה'
    },
    {
      id: 10,
      type: 'multiple_choice',
      topic: 'אמנות',
      difficulty: 'easy',
      question: 'מי צייר את הציור המפורסם "הלילה הכוכבי"?',
      options: [
        { id: 'a', text: 'פיקאסו' },
        { id: 'b', text: 'ואן גוך' },
        { id: 'c', text: 'דה וינצ\'י' },
        { id: 'd', text: 'מונה' }
      ],
      correctAnswer: 'b',
      explanation: 'וינסנט ואן גוך צייר את "הלילה הכוכבי" בשנת 1889'
    }
  ];

  const testInfo = {
    id: 'demo-test-001',
    title: 'מבחן הדגמה - ידע כללי',
    description: 'מבחן לדוגמה הכולל שאלות מתחומי ידע שונים לבדיקת ממשק השאלות',
    subject: 'ידע כללי',
    className: 'כיתה ח\'',
    totalQuestions: sampleQuestions.length,
    estimatedDuration: 30, // minutes
    timeLimit: 45, // minutes
    instructions: [
      'קרא כל שאלה בעיון לפני מתן התשובה',
      'בשאלות רב-ברירה, בחר תשובה אחת בלבד',
      'בשאלות פתוחות, כתב תשובה מפורטת וברורה',
      'ניתן לחזור לשאלות קודמות ולשנות תשובות',
      'לחץ על "סיום מבחן" כאשר סיימת לענות על כל השאלות'
    ],
    passingGrade: 70,
    maxAttempts: 2,
    showResults: true,
    allowReview: true
  };

  return {
    test: testInfo,
    questions: sampleQuestions
  };
};

// Generate sample test data for different subjects
export const generateSubjectTestData = (subject) => {
  const baseData = generateSampleTestData();
  
  const subjectQuestions = {
    'מתמטיקה': [
      {
        id: 1,
        type: 'multiple_choice',
        topic: 'אלגברה',
        difficulty: 'medium',
        question: 'פתר את המשוואה: 2x + 5 = 13',
        options: [
          { id: 'a', text: 'x = 3' },
          { id: 'b', text: 'x = 4' },
          { id: 'c', text: 'x = 5' },
          { id: 'd', text: 'x = 6' }
        ],
        correctAnswer: 'b',
        explanation: '2x + 5 = 13 → 2x = 8 → x = 4'
      },
      {
        id: 2,
        type: 'short_answer',
        topic: 'גיאומטריה',
        difficulty: 'easy',
        question: 'מה השטח של מלבן באורך 8 ס"מ ורוחב 5 ס"מ?',
        correctAnswer: '40',
        explanation: 'שטח מלבן = אורך × רוחב = 8 × 5 = 40 ס"מ רבועים'
      }
    ],
    'מדעים': [
      {
        id: 1,
        type: 'multiple_choice',
        topic: 'פיזיקה',
        difficulty: 'hard',
        question: 'מה מהירות האור בחלל?',
        options: [
          { id: 'a', text: '300,000 ק"מ/שנייה' },
          { id: 'b', text: '299,792,458 מ\'/שנייה' },
          { id: 'c', text: '300,000,000 מ\'/שנייה' },
          { id: 'd', text: 'כל התשובות נכונות' }
        ],
        correctAnswer: 'b',
        explanation: 'מהירות האור בחלל היא בדיוק 299,792,458 מטר לשנייה'
      }
    ]
  };

  if (subjectQuestions[subject]) {
    return {
      test: {
        ...baseData.test,
        title: `מבחן ${subject}`,
        subject: subject,
        totalQuestions: subjectQuestions[subject].length
      },
      questions: subjectQuestions[subject]
    };
  }

  return baseData;
};

// Helper function to get difficulty color
export const getDifficultyColor = (difficulty) => {
  const colors = {
    'easy': '#22c55e',    // green
    'medium': '#f59e0b',  // amber
    'hard': '#ef4444'     // red
  };
  return colors[difficulty] || colors.medium;
};

// Helper function to get difficulty label in Hebrew
export const getDifficultyLabel = (difficulty) => {
  const labels = {
    'easy': 'קל',
    'medium': 'בינוני',
    'hard': 'קשה'
  };
  return labels[difficulty] || 'בינוני';
};

// Helper function to format time
export const formatTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

// Helper function to calculate progress percentage
export const calculateProgress = (currentQuestion, totalQuestions) => {
  return Math.round((currentQuestion / totalQuestions) * 100);
};

// Helper function to validate answer
export const validateAnswer = (question, answer) => {
  if (!answer || answer.trim() === '') {
    return { isValid: false, message: 'נא לענות על השאלה' };
  }

  if (question.type === 'essay') {
    const wordCount = answer.trim().split(/\s+/).length;
    if (question.minWords && wordCount < question.minWords) {
      return { 
        isValid: false, 
        message: `התשובה קצרה מדי. נדרשות לפחות ${question.minWords} מילים` 
      };
    }
    if (question.maxWords && wordCount > question.maxWords) {
      return { 
        isValid: false, 
        message: `התשובה ארוכה מדי. מותרות עד ${question.maxWords} מילים` 
      };
    }
  }

  return { isValid: true };
};

// Helper function to get question type label
export const getQuestionTypeLabel = (type) => {
  const labels = {
    'multiple_choice': 'רב ברירה',
    'short_answer': 'תשובה קצרה',
    'essay': 'חיבור',
    'true_false': 'נכון/לא נכון'
  };
  return labels[type] || type;
};

export default {
  generateSampleTestData,
  generateSubjectTestData,
  getDifficultyColor,
  getDifficultyLabel,
  formatTime,
  calculateProgress,
  validateAnswer,
  getQuestionTypeLabel
};
