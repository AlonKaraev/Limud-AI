import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import TestCreationInterface from './TestCreationInterface';
import TestPreviewInterface from './TestPreviewInterface';

const Container = styled.div`
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: 2rem;
  box-shadow: 0 2px 8px var(--color-shadowLight);
  margin-bottom: 2rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
`;

const Title = styled.h2`
  color: var(--color-text);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.5rem;
`;

const TitleIcon = styled.span`
  font-size: 1.8rem;
`;

const HeaderButtons = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-family: 'Heebo', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all var(--transition-medium);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: var(--shadow-sm);
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  
  &.primary {
    background: linear-gradient(135deg, var(--color-primary), var(--color-primaryHover));
    color: var(--color-textOnPrimary);
    
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, var(--color-primaryHover), var(--color-primaryActive));
    }
  }
  
  &.success {
    background: linear-gradient(135deg, var(--color-success), var(--color-successHover));
    color: var(--color-textOnPrimary);
    
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, var(--color-successHover), var(--color-successActive));
    }
  }
  
  &.secondary {
    background: var(--color-surface);
    color: var(--color-text);
    border: 2px solid var(--color-border);
    
    &:hover:not(:disabled) {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: var(--shadow-xs);
  }
`;

const TabNavigation = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  border-bottom: 2px solid var(--color-border);
  overflow-x: auto;
  padding-bottom: 0;
`;

const Tab = styled.button`
  padding: 1rem 1.5rem;
  border: none;
  background: none;
  cursor: pointer;
  font-family: 'Heebo', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-textSecondary);
  border-bottom: 3px solid transparent;
  transition: all var(--transition-fast);
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    color: var(--color-primary);
    background: var(--color-surfaceHover);
  }
  
  &.active {
    color: var(--color-primary);
    border-bottom-color: var(--color-primary);
    background: var(--color-surfaceHover);
  }
`;

const TabContent = styled.div`
  min-height: 400px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  background: var(--color-surfaceElevated);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  text-align: center;
  transition: all var(--transition-medium);
  
  &:hover {
    border-color: var(--color-primary);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(52, 152, 219, 0.15);
  }
`;

const StatNumber = styled.div`
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  color: var(--color-textSecondary);
  font-weight: 500;
  font-size: 0.9rem;
`;

const TestsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
`;

const TestCard = styled.div`
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  background: var(--color-surfaceElevated);
  transition: all var(--transition-medium);
  
  &:hover {
    box-shadow: 0 4px 12px var(--color-shadowMedium);
    transform: translateY(-2px);
    border-color: var(--color-primary);
  }
`;

const TestHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const TestTitle = styled.h3`
  color: var(--color-text);
  margin: 0;
  font-size: 1.1rem;
  line-height: 1.3;
`;

const TestStatus = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  
  &.draft {
    background-color: var(--color-warningLight);
    color: var(--color-warning);
  }
  
  &.active {
    background-color: var(--color-successLight);
    color: var(--color-success);
  }
  
  &.completed {
    background-color: var(--color-primaryLight);
    color: var(--color-primary);
  }
  
  &.archived {
    background-color: var(--color-surfaceHover);
    color: var(--color-textSecondary);
  }
`;

const TestMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  color: var(--color-textSecondary);
`;

const TestMetaRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TestActions = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const TestActionButton = styled.button`
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  font-family: 'Heebo', sans-serif;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all var(--transition-fast);
  
  &:hover:not(:disabled) {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: var(--color-surfaceHover);
  }
  
  &.primary {
    background: var(--color-primary);
    color: var(--color-textOnPrimary);
    border-color: var(--color-primary);
    
    &:hover:not(:disabled) {
      background: var(--color-primaryHover);
      border-color: var(--color-primaryHover);
    }
  }
  
  &.danger {
    color: var(--color-danger);
    border-color: var(--color-dangerLight);
    
    &:hover:not(:disabled) {
      background: var(--color-dangerLight);
      border-color: var(--color-danger);
    }
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: var(--color-textSecondary);
`;

const EmptyStateIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1rem;
`;

const EmptyStateTitle = styled.h3`
  color: var(--color-text);
  margin-bottom: 0.5rem;
`;

const EmptyStateDescription = styled.p`
  margin-bottom: 2rem;
  line-height: 1.5;
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
  
  &::after {
    content: '';
    width: 40px;
    height: 40px;
    border: 4px solid var(--color-border);
    border-top: 4px solid var(--color-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  background-color: var(--color-dangerLight);
  color: var(--color-danger);
  padding: 1rem;
  border-radius: var(--radius-sm);
  margin-bottom: 1rem;
  border: 1px solid var(--color-dangerLighter);
`;

// Question Bank Styled Components
const QuestionBankHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const SearchAndFilters = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
`;

const SearchInput = styled.input`
  padding: 0.75rem 1rem;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: 'Heebo', sans-serif;
  font-size: 0.9rem;
  background: var(--color-surface);
  color: var(--color-text);
  min-width: 250px;
  transition: all var(--transition-fast);
  
  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
  }
  
  &::placeholder {
    color: var(--color-textSecondary);
  }
`;

const FilterSelect = styled.select`
  padding: 0.75rem 1rem;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: 'Heebo', sans-serif;
  font-size: 0.9rem;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
  }
`;

const QuestionSetsList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const QuestionSetCard = styled.div`
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  background: var(--color-surfaceElevated);
  cursor: pointer;
  transition: all var(--transition-medium);
  
  &:hover {
    box-shadow: 0 4px 12px var(--color-shadowMedium);
    transform: translateY(-2px);
    border-color: var(--color-primary);
  }
  
  &.selected {
    border-color: var(--color-primary);
    background: var(--color-primaryLight);
  }
`;

const QuestionSetTitle = styled.h4`
  color: var(--color-text);
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
`;

const QuestionSetMeta = styled.div`
  color: var(--color-textSecondary);
  font-size: 0.9rem;
  margin-bottom: 1rem;
`;

const QuestionSetStats = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: var(--color-textSecondary);
`;

const QuestionsContainer = styled.div`
  margin-top: 2rem;
`;

const QuestionsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
`;

const QuestionsTitle = styled.h3`
  color: var(--color-text);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const QuestionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const QuestionCard = styled.div`
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  background: var(--color-surface);
  transition: all var(--transition-fast);
  
  &:hover {
    border-color: var(--color-primary);
    box-shadow: 0 2px 8px var(--color-shadowLight);
  }
`;

const QuestionText = styled.div`
  color: var(--color-text);
  font-size: 1rem;
  line-height: 1.5;
  margin-bottom: 1rem;
  font-weight: 500;
`;

const QuestionOptions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const QuestionOption = styled.div`
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  
  &.correct {
    background: var(--color-successLight);
    color: var(--color-success);
    font-weight: 600;
  }
  
  &.incorrect {
    background: var(--color-surfaceHover);
    color: var(--color-textSecondary);
  }
`;

const QuestionMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: var(--color-textSecondary);
  border-top: 1px solid var(--color-border);
  padding-top: 1rem;
`;

const QuestionActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const QuestionActionButton = styled.button`
  padding: 0.25rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  font-family: 'Heebo', sans-serif;
  font-size: 0.8rem;
  font-weight: 500;
  transition: all var(--transition-fast);
  
  &:hover:not(:disabled) {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: var(--color-surfaceHover);
  }
  
  &.danger {
    color: var(--color-danger);
    border-color: var(--color-dangerLight);
    
    &:hover:not(:disabled) {
      background: var(--color-dangerLight);
      border-color: var(--color-danger);
    }
  }
`;

const TestsManager = ({ user, t }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [tests, setTests] = useState([]);
  const [questionSets, setQuestionSets] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreationModal, setShowCreationModal] = useState(false);
  const [creationMode, setCreationMode] = useState('manual'); // 'manual' or 'ai'
  const [questionBankLoading, setQuestionBankLoading] = useState(false);
  const [selectedQuestionSet, setSelectedQuestionSet] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [stats, setStats] = useState({
    totalTests: 0,
    activeTests: 0,
    totalQuestions: 0,
    averageScore: 0
  });

  useEffect(() => {
    fetchTestsData();
  }, []);

  const fetchTestsData = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('לא נמצא טוקן אימות. אנא התחבר מחדש.');
      }

      // Fetch unified tests
      const testsResponse = await fetch('/api/tests', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!testsResponse.ok) {
        throw new Error('שגיאה בטעינת המבחנים');
      }

      const testsData = await testsResponse.json();
      const tests = testsData.tests || [];
      
      // Transform tests to the expected format
      const testsFormatted = tests.map(test => ({
        id: test.id,
        title: test.title,
        status: test.status || 'draft',
        questionCount: test.question_count || 0,
        subjectArea: test.subject_area,
        gradeLevel: test.grade_level,
        estimatedDuration: test.time_limit || 0,
        createdAt: test.created_at,
        recordingId: test.source_id,
        testType: test.test_type,
        sourceTitle: test.source_title,
        description: test.description,
        tags: test.tags || [],
        difficultyLevel: test.difficulty_level
      }));
      
      setTests(testsFormatted);
      
      // Also set question sets for backward compatibility with question bank
      const questionSetsFormatted = tests
        .filter(test => test.test_type === 'lesson_generated' || test.test_type === 'ai_generated')
        .map(test => ({
          id: test.id,
          set_name: test.title,
          subject_area: test.subject_area,
          grade_level: test.grade_level,
          total_questions: test.question_count || 0,
          estimated_duration: test.time_limit || 0,
          created_at: test.created_at,
          recording_id: test.source_id
        }));
      
      setQuestionSets(questionSetsFormatted);

      // Fetch test statistics
      const statsResponse = await fetch('/api/tests/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats({
          totalTests: statsData.total_tests || 0,
          activeTests: statsData.active_tests || 0,
          totalQuestions: statsData.total_questions || 0,
          averageScore: 0 // Will be calculated when we have submissions
        });
      } else {
        // Fallback to calculated stats
        setStats({
          totalTests: testsFormatted.length,
          activeTests: testsFormatted.filter(test => test.status === 'active').length,
          totalQuestions: testsFormatted.reduce((sum, test) => sum + test.questionCount, 0),
          averageScore: 0
        });
      }

    } catch (error) {
      console.error('Error fetching tests data:', error);
      setError(`שגיאה בטעינת נתוני המבחנים: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTest = () => {
    setCreationMode('manual');
    setShowCreationModal(true);
  };

  const handleCreateFromLesson = () => {
    setCreationMode('ai');
    setShowCreationModal(true);
  };

  const handleCloseCreationModal = () => {
    setShowCreationModal(false);
  };

  const handleTestCreated = async (testData) => {
    console.log('Test created:', testData);
    setShowCreationModal(false);
    
    // Refresh the tests data to include the new test
    await fetchTestsData();
    
    // Show success message (you can enhance this with a toast notification)
    setError(''); // Clear any previous errors
  };

  const handleCreationError = (error) => {
    console.error('Test creation error:', error);
    setError(`שגיאה ביצירת המבחן: ${error.message || error}`);
  };

  const handleEditTest = (test) => {
    // TODO: Open test editor
    console.log('Edit test:', test);
  };

  const handlePreviewTest = (test) => {
    setSelectedTest(test);
    setShowPreviewModal(true);
  };

  const handleClosePreviewModal = () => {
    setShowPreviewModal(false);
    setSelectedTest(null);
  };

  const handlePreviewEdit = (test) => {
    setShowPreviewModal(false);
    handleEditTest(test);
  };

  const handlePreviewDistribute = (test) => {
    setShowPreviewModal(false);
    handleDistributeTest(test);
  };

  const handleDistributeTest = (test) => {
    // TODO: Open distribution interface
    console.log('Distribute test:', test);
  };

  const handleViewResults = (test) => {
    // TODO: Open results analytics
    console.log('View results:', test);
  };

  const handleDeleteTest = (test) => {
    // TODO: Confirm and delete test
    if (window.confirm(`האם אתה בטוח שברצונך למחוק את המבחן "${test.title}"?`)) {
      console.log('Delete test:', test);
    }
  };

  // Question Bank Functions
  const fetchQuestionsForSet = async (setId) => {
    try {
      setQuestionBankLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/ai-content/question-sets/${setId}/questions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('שגיאה בטעינת השאלות');
      }

      const data = await response.json();
      setQuestions(data.questions || []);
    } catch (error) {
      console.error('Error fetching questions:', error);
      setError(`שגיאה בטעינת השאלות: ${error.message}`);
    } finally {
      setQuestionBankLoading(false);
    }
  };

  const handleSelectQuestionSet = (questionSet) => {
    setSelectedQuestionSet(questionSet);
    fetchQuestionsForSet(questionSet.id);
  };

  const handleEditQuestion = (question) => {
    // TODO: Open question editor
    console.log('Edit question:', question);
  };

  const handleDeleteQuestion = async (question) => {
    if (window.confirm(`האם אתה בטוח שברצונך למחוק את השאלה?`)) {
      // TODO: Implement question deletion
      console.log('Delete question:', question);
    }
  };

  const getFilteredQuestionSets = () => {
    return questionSets.filter(set => {
      const matchesSearch = !searchTerm || 
        set.set_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (set.subject_area && set.subject_area.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesSubject = !filterSubject || set.subject_area === filterSubject;
      const matchesGrade = !filterGrade || set.grade_level === filterGrade;
      
      return matchesSearch && matchesSubject && matchesGrade;
    });
  };

  const getUniqueSubjects = () => {
    const subjects = questionSets
      .map(set => set.subject_area)
      .filter(subject => subject && subject.trim() !== '');
    return [...new Set(subjects)];
  };

  const getUniqueGrades = () => {
    const grades = questionSets
      .map(set => set.grade_level)
      .filter(grade => grade && grade.trim() !== '');
    return [...new Set(grades)];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${minutes} דקות`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} שעות${remainingMinutes > 0 ? ` ו-${remainingMinutes} דקות` : ''}`;
  };

  const renderOverview = () => (
    <>
      <StatsGrid>
        <StatCard>
          <StatNumber>{stats.totalTests}</StatNumber>
          <StatLabel>סה"כ מבחנים</StatLabel>
        </StatCard>
        <StatCard>
          <StatNumber>{stats.activeTests}</StatNumber>
          <StatLabel>מבחנים פעילים</StatLabel>
        </StatCard>
        <StatCard>
          <StatNumber>{stats.totalQuestions}</StatNumber>
          <StatLabel>סה"כ שאלות</StatLabel>
        </StatCard>
        <StatCard>
          <StatNumber>{stats.averageScore}%</StatNumber>
          <StatLabel>ציון ממוצע</StatLabel>
        </StatCard>
      </StatsGrid>

      {tests.length === 0 ? (
        <EmptyState>
          <EmptyStateIcon>📝</EmptyStateIcon>
          <EmptyStateTitle>אין מבחנים עדיין</EmptyStateTitle>
          <EmptyStateDescription>
            צור את המבחן הראשון שלך באמצעות יצירה ידנית או יצירה אוטומטית מתוכן שיעור
          </EmptyStateDescription>
          <ActionButton className="primary" onClick={handleCreateTest}>
            <span>➕</span>
            צור מבחן ראשון
          </ActionButton>
        </EmptyState>
      ) : (
        <TestsGrid>
          {tests.map((test) => (
            <TestCard key={test.id}>
              <TestHeader>
                <TestTitle>{test.title}</TestTitle>
                <TestStatus className={test.status}>
                  {test.status === 'draft' && 'טיוטה'}
                  {test.status === 'active' && 'פעיל'}
                  {test.status === 'completed' && 'הושלם'}
                  {test.status === 'archived' && 'בארכיון'}
                </TestStatus>
              </TestHeader>

              <TestMeta>
                <TestMetaRow>
                  <span>שאלות:</span>
                  <span>{test.questionCount}</span>
                </TestMetaRow>
                {test.subjectArea && (
                  <TestMetaRow>
                    <span>מקצוע:</span>
                    <span>{test.subjectArea}</span>
                  </TestMetaRow>
                )}
                {test.gradeLevel && (
                  <TestMetaRow>
                    <span>כיתה:</span>
                    <span>{test.gradeLevel}</span>
                  </TestMetaRow>
                )}
                {test.estimatedDuration > 0 && (
                  <TestMetaRow>
                    <span>משך משמוע:</span>
                    <span>{formatDuration(test.estimatedDuration)}</span>
                  </TestMetaRow>
                )}
                <TestMetaRow>
                  <span>נוצר:</span>
                  <span>{formatDate(test.createdAt)}</span>
                </TestMetaRow>
              </TestMeta>

              <TestActions>
                <TestActionButton 
                  className="primary"
                  onClick={() => handleEditTest(test)}
                >
                  ערוך
                </TestActionButton>
                <TestActionButton onClick={() => handlePreviewTest(test)}>
                  תצוגה מקדימה
                </TestActionButton>
                <TestActionButton onClick={() => handleDistributeTest(test)}>
                  הפץ
                </TestActionButton>
                <TestActionButton onClick={() => handleViewResults(test)}>
                  תוצאות
                </TestActionButton>
                <TestActionButton 
                  className="danger"
                  onClick={() => handleDeleteTest(test)}
                >
                  מחק
                </TestActionButton>
              </TestActions>
            </TestCard>
          ))}
        </TestsGrid>
      )}
    </>
  );

  const renderQuestionBank = () => {
    const filteredQuestionSets = getFilteredQuestionSets();
    const uniqueSubjects = getUniqueSubjects();
    const uniqueGrades = getUniqueGrades();

    return (
      <>
        <QuestionBankHeader>
          <SearchAndFilters>
            <SearchInput
              type="text"
              placeholder="חפש לפי שם מבחן או נושא..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <FilterSelect
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
            >
              <option value="">כל המקצועות</option>
              {uniqueSubjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </FilterSelect>
            <FilterSelect
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
            >
              <option value="">כל הכיתות</option>
              {uniqueGrades.map(grade => (
                <option key={grade} value={grade}>{grade}</option>
              ))}
            </FilterSelect>
          </SearchAndFilters>
          <ActionButton 
            className="secondary"
            onClick={() => {
              setSelectedQuestionSet(null);
              setQuestions([]);
            }}
          >
            <span>🔄</span>
            רענן
          </ActionButton>
        </QuestionBankHeader>

        {filteredQuestionSets.length === 0 ? (
          <EmptyState>
            <EmptyStateIcon>🏦</EmptyStateIcon>
            <EmptyStateTitle>לא נמצאו מבחנים</EmptyStateTitle>
            <EmptyStateDescription>
              {questionSets.length === 0 
                ? 'צור מבחנים כדי לראות את השאלות כאן'
                : 'לא נמצאו מבחנים התואמים לחיפוש שלך'
              }
            </EmptyStateDescription>
          </EmptyState>
        ) : (
          <>
            <QuestionSetsList>
              {filteredQuestionSets.map((questionSet) => (
                <QuestionSetCard
                  key={questionSet.id}
                  className={selectedQuestionSet?.id === questionSet.id ? 'selected' : ''}
                  onClick={() => handleSelectQuestionSet(questionSet)}
                >
                  <QuestionSetTitle>{questionSet.set_name}</QuestionSetTitle>
                  <QuestionSetMeta>
                    {questionSet.subject_area && (
                      <div>מקצוע: {questionSet.subject_area}</div>
                    )}
                    {questionSet.grade_level && (
                      <div>כיתה: {questionSet.grade_level}</div>
                    )}
                    <div>נוצר: {formatDate(questionSet.created_at)}</div>
                  </QuestionSetMeta>
                  <QuestionSetStats>
                    <span>{questionSet.total_questions || 0} שאלות</span>
                    {questionSet.estimated_duration > 0 && (
                      <span>{formatDuration(questionSet.estimated_duration)}</span>
                    )}
                  </QuestionSetStats>
                </QuestionSetCard>
              ))}
            </QuestionSetsList>

            {selectedQuestionSet && (
              <QuestionsContainer>
                <QuestionsHeader>
                  <QuestionsTitle>
                    <span>📝</span>
                    שאלות במבחן: {selectedQuestionSet.set_name}
                  </QuestionsTitle>
                  <ActionButton 
                    className="secondary"
                    onClick={() => {
                      setSelectedQuestionSet(null);
                      setQuestions([]);
                    }}
                  >
                    <span>✕</span>
                    סגור
                  </ActionButton>
                </QuestionsHeader>

                {questionBankLoading ? (
                  <LoadingSpinner />
                ) : questions.length === 0 ? (
                  <EmptyState>
                    <EmptyStateIcon>❓</EmptyStateIcon>
                    <EmptyStateTitle>אין שאלות במבחן זה</EmptyStateTitle>
                    <EmptyStateDescription>
                      המבחן עדיין לא מכיל שאלות או שהן לא נטענו כראוי
                    </EmptyStateDescription>
                  </EmptyState>
                ) : (
                  <QuestionsList>
                    {questions.map((question, index) => (
                      <QuestionCard key={question.id || index}>
                        <QuestionText>{question.question_text}</QuestionText>
                        
                        {question.options && question.options.length > 0 && (
                          <QuestionOptions>
                            {question.options.map((option, optionIndex) => (
                              <QuestionOption
                                key={optionIndex}
                                className={option.is_correct ? 'correct' : 'incorrect'}
                              >
                                {String.fromCharCode(65 + optionIndex)}. {option.option_text}
                                {option.is_correct && ' ✓'}
                              </QuestionOption>
                            ))}
                          </QuestionOptions>
                        )}

                        <QuestionMeta>
                          <div>
                            {question.question_type && (
                              <span>סוג: {question.question_type} | </span>
                            )}
                            {question.difficulty_level && (
                              <span>רמת קושי: {question.difficulty_level}</span>
                            )}
                          </div>
                          <QuestionActions>
                            <QuestionActionButton
                              onClick={() => handleEditQuestion(question)}
                            >
                              ערוך
                            </QuestionActionButton>
                            <QuestionActionButton
                              className="danger"
                              onClick={() => handleDeleteQuestion(question)}
                            >
                              מחק
                            </QuestionActionButton>
                          </QuestionActions>
                        </QuestionMeta>
                      </QuestionCard>
                    ))}
                  </QuestionsList>
                )}
              </QuestionsContainer>
            )}
          </>
        )}
      </>
    );
  };

  const renderResults = () => (
    <EmptyState>
      <EmptyStateIcon>📊</EmptyStateIcon>
      <EmptyStateTitle>תוצאות ואנליטיקה</EmptyStateTitle>
      <EmptyStateDescription>
        כאן תוכל לראות את תוצאות המבחנים, לנתח ביצועים ולייצא דוחות
      </EmptyStateDescription>
      <ActionButton className="secondary">
        בקרוב...
      </ActionButton>
    </EmptyState>
  );

  if (loading) {
    return (
      <Container>
        <LoadingSpinner />
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>
          <TitleIcon>📝</TitleIcon>
          מבחנים
        </Title>
        <HeaderButtons>
          <ActionButton className="success" onClick={handleCreateFromLesson}>
            <span>🤖</span>
            צור מתוכן שיעור
          </ActionButton>
          <ActionButton className="primary" onClick={handleCreateTest}>
            <span>➕</span>
            צור מבחן חדש
          </ActionButton>
        </HeaderButtons>
      </Header>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <TabNavigation>
        <Tab 
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          <span>📋</span>
          סקירה כללית
        </Tab>
        <Tab 
          className={activeTab === 'question-bank' ? 'active' : ''}
          onClick={() => setActiveTab('question-bank')}
        >
          <span>🏦</span>
          בנק שאלות
        </Tab>
        <Tab 
          className={activeTab === 'results' ? 'active' : ''}
          onClick={() => setActiveTab('results')}
        >
          <span>📊</span>
          תוצאות
        </Tab>
      </TabNavigation>

      <TabContent>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'question-bank' && renderQuestionBank()}
        {activeTab === 'results' && renderResults()}
      </TabContent>

      {showCreationModal && (
        <TestCreationInterface
          isOpen={showCreationModal}
          onClose={handleCloseCreationModal}
          onTestCreated={handleTestCreated}
          onError={handleCreationError}
          initialMode={creationMode}
          user={user}
          t={t}
        />
      )}

      {showPreviewModal && selectedTest && (
        <TestPreviewInterface
          isOpen={showPreviewModal}
          onClose={handleClosePreviewModal}
          test={selectedTest}
          onEdit={handlePreviewEdit}
          onDistribute={handlePreviewDistribute}
          onDelete={handleDeleteTest}
          user={user}
          t={t}
        />
      )}
    </Container>
  );
};

export default TestsManager;
