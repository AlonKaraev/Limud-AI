import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { heTranslations } from '../translations';
import { ThemeToggleButton } from '../contexts/ThemeContext';
import ErrorBoundary from './ErrorBoundary';
import LoadingSpinner, { ContentSkeleton, StatsSkeleton } from './LoadingSpinner';
import ErrorMessage, { NetworkStatus } from './ErrorMessage';
import LessonViewer from './LessonViewer';
import './StudentPortal.css';

// Translation helper
const getNestedTranslation = (obj, path) => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

const t = (key, params = {}) => {
  let translation = getNestedTranslation(heTranslations, key) || key;
  
  Object.keys(params).forEach(param => {
    translation = translation.replace(`{{${param}}}`, params[param]);
  });
  
  return translation;
};

// Custom hooks
const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

const useSessionTimeout = (onLogout) => {
  const [timeLeft, setTimeLeft] = useState(null);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    const WARNING_TIME = 5 * 60 * 1000; // 5 minutes before timeout
    
    let timeoutId;
    let warningId;
    let countdownId;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      clearTimeout(warningId);
      clearInterval(countdownId);
      setShowWarning(false);
      setTimeLeft(null);

      // Set warning timer
      warningId = setTimeout(() => {
        setShowWarning(true);
        setTimeLeft(WARNING_TIME / 1000);

        // Start countdown
        countdownId = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              onLogout();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }, SESSION_TIMEOUT - WARNING_TIME);

      // Set logout timer
      timeoutId = setTimeout(() => {
        onLogout();
      }, SESSION_TIMEOUT);
    };

    const handleActivity = () => {
      resetTimer();
    };

    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Start initial timer
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(warningId);
      clearInterval(countdownId);
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [onLogout]);

  const extendSession = useCallback(() => {
    setShowWarning(false);
    setTimeLeft(null);
  }, []);

  return { showWarning, timeLeft: Math.ceil(timeLeft / 60), extendSession };
};

// Enhanced API service with error handling and retry logic
const apiService = {
  async request(url, options = {}, retries = 3) {
    const token = localStorage.getItem('token');
    
    if (!token) {
      const error = new Error('לא מחובר למערכת');
      error.code = 'UNAUTHORIZED';
      error.status = 401;
      throw error;
    }

    const config = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: 30000, // 30 second timeout
      ...options
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);
        
        const response = await fetch(url, {
          ...config,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = new Error(errorData.error || `שגיאת שרת ${response.status}`);
          error.status = response.status;
          error.code = errorData.code || 'SERVER_ERROR';
          error.details = errorData.details;
          error.retryAfter = errorData.retryAfter;
          
          // Don't retry for client errors (4xx) except for specific cases
          if (response.status >= 400 && response.status < 500) {
            if (response.status === 401) {
              // Token expired, redirect to login
              localStorage.removeItem('token');
              window.location.href = '/login';
              return;
            }
            
            // Don't retry for other 4xx errors except rate limiting
            if (response.status !== 429) {
              throw error;
            }
          }
          
          // Retry for server errors (5xx) and rate limiting (429)
          if (attempt === retries) {
            throw error;
          }
          
          // Wait before retry with exponential backoff
          const delay = error.retryAfter || (Math.pow(2, attempt - 1) * 1000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        return await response.json();
      } catch (error) {
        if (error.name === 'AbortError') {
          const timeoutError = new Error('הבקשה נכשלה - זמן ההמתנה פג');
          timeoutError.code = 'TIMEOUT';
          timeoutError.status = 408;
          
          if (attempt === retries) {
            throw timeoutError;
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          const networkError = new Error('שגיאת רשת - בדוק את החיבור לאינטרנט');
          networkError.code = 'NETWORK_ERROR';
          networkError.status = 0;
          
          if (attempt === retries) {
            throw networkError;
          }
          
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          continue;
        }
        
        if (attempt === retries) {
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  },

  getDashboard: () => apiService.request('/api/student/dashboard'),
  getLessons: () => apiService.request('/api/student/lessons'),
  getTests: () => apiService.request('/api/student/tests'),
  getLesson: (id) => apiService.request(`/api/student/lesson/${id}`),
  getTest: (id) => apiService.request(`/api/student/lesson/${id}/test`),
  logAccess: (id, type) => apiService.request(`/api/student/content/${id}/access`, {
    method: 'POST',
    body: JSON.stringify({ accessType: type })
  })
};

// Components
const SessionWarning = ({ timeLeft, onExtend }) => (
  <div className="session-warning" role="alert">
    <span>⚠️ {t('student.sessionExpiring')} {timeLeft} {t('student.minutes')}</span>
    <button 
      className="btn btn-sm btn-outline"
      onClick={onExtend}
      aria-label={t('student.extendSession')}
    >
      {t('student.extendSession')}
    </button>
  </div>
);

const StatCard = ({ number, label, loading = false }) => (
  <div className="stat-card">
    {loading ? (
      <>
        <div className="skeleton-stat-number"></div>
        <div className="skeleton-stat-label"></div>
      </>
    ) : (
      <>
        <div className="stat-number">{number}</div>
        <div className="stat-label">{label}</div>
      </>
    )}
  </div>
);

const ContentCard = ({ content, type, onView, onTest, loading = false }) => {
  if (loading) {
    return (
      <div className="content-card skeleton-card">
        <div className="skeleton-title"></div>
        <div className="skeleton-meta">
          <div className="skeleton-tag"></div>
          <div className="skeleton-tag"></div>
          <div className="skeleton-tag"></div>
        </div>
        <div className="skeleton-description">
          <div className="skeleton-line"></div>
          <div className="skeleton-line"></div>
          <div className="skeleton-line short"></div>
        </div>
        <div className="skeleton-actions">
          <div className="skeleton-button"></div>
          <div className="skeleton-button"></div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL');
  };

  const formatDuration = (metadata) => {
    if (metadata?.duration) {
      const minutes = Math.floor(metadata.duration / 60);
      return `${minutes} ${t('time.minutes')}`;
    }
    return 'לא ידוע';
  };

  return (
    <article className="content-card" tabIndex="0">
      <header>
        <h3 className="content-title">
          {type === 'test' ? (content.set_name || content.filename) : content.filename}
        </h3>
        <div className="content-meta">
          <span className="meta-tag">{content.subject_area || 'כללי'}</span>
          <span className="meta-tag">{content.class_name}</span>
          {type === 'lesson' && (
            <>
              <span className="meta-tag">{formatDate(content.lesson_date)}</span>
              <span className="meta-tag">{formatDuration(content.metadata)}</span>
              {content.has_test && (
                <span className="meta-tag meta-tag-success">
                  {t('student.tests')} זמין
                </span>
              )}
            </>
          )}
          {type === 'test' && (
            <>
              <span className="meta-tag">{content.total_questions} {t('student.questions')}</span>
              {content.estimated_duration && (
                <span className="meta-tag">{content.estimated_duration} {t('time.minutes')}</span>
              )}
            </>
          )}
        </div>
      </header>
      
      <div className="content-description">
        {type === 'test' 
          ? (content.test_description || content.summary_text || 'תיאור לא זמין').substring(0, 150) + '...'
          : (content.summary_text || 'תקציר לא זמין').substring(0, 150) + '...'
        }
      </div>
      
      <footer className="content-actions">
        <button 
          className="btn btn-primary"
          onClick={() => onView(content)}
          aria-label={type === 'test' ? t('student.takeTest') : t('student.viewLesson')}
        >
          {type === 'test' 
            ? (content.has_accessed ? t('student.continueTest') : t('student.takeTest'))
            : t('student.viewLesson')
          }
        </button>
        {type === 'lesson' && content.has_test && (
          <button 
            className="btn btn-success"
            onClick={() => onTest(content)}
            aria-label={t('student.takeTest')}
          >
            {t('student.takeTest')}
          </button>
        )}
      </footer>
    </article>
  );
};

const EmptyState = ({ type, icon }) => (
  <div className="empty-state">
    <div className="empty-icon" role="img" aria-label={`אין ${type}`}>
      {icon}
    </div>
    <div>{type === 'lessons' ? t('student.noLessons') : t('student.noTests')}</div>
  </div>
);

const SearchAndFilter = ({ searchTerm, onSearchChange, filters, onFilterChange }) => (
  <div className="search-filter-bar">
    <div className="search-input-group">
      <input
        type="text"
        className="search-input"
        placeholder={t('student.searchLessons')}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        aria-label={t('student.searchLessons')}
      />
    </div>
    <div className="filter-group">
      <select
        className="filter-select"
        value={filters.subject}
        onChange={(e) => onFilterChange({ ...filters, subject: e.target.value })}
        aria-label={t('student.filterBySubject')}
      >
        <option value="">{t('student.allSubjects')}</option>
        {/* Options would be populated dynamically */}
      </select>
      <select
        className="filter-select"
        value={filters.sort}
        onChange={(e) => onFilterChange({ ...filters, sort: e.target.value })}
        aria-label={t('student.sortByDate')}
      >
        <option value="newest">{t('student.newest')}</option>
        <option value="oldest">{t('student.oldest')}</option>
        <option value="alphabetical">{t('student.alphabetical')}</option>
      </select>
    </div>
  </div>
);

// Main component
const StudentDashboard = ({ user, onLogout }) => {
  // State management
  const [activeTab, setActiveTab] = useState('lessons');
  const [dashboardData, setDashboardData] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState({ dashboard: true, lessons: false, tests: false });
  const [errors, setErrors] = useState({ dashboard: null, lessons: null, tests: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ subject: '', sort: 'newest' });
  const [selectedLesson, setSelectedLesson] = useState(null);

  // Custom hooks
  const isOnline = useNetworkStatus();
  const { showWarning, timeLeft, extendSession } = useSessionTimeout(onLogout);

  // Data fetching functions
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, dashboard: true }));
      setErrors(prev => ({ ...prev, dashboard: null }));
      
      const data = await apiService.getDashboard();
      setDashboardData(data);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      setErrors(prev => ({ ...prev, dashboard: error }));
    } finally {
      setLoading(prev => ({ ...prev, dashboard: false }));
    }
  }, []);

  const fetchLessons = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, lessons: true }));
      setErrors(prev => ({ ...prev, lessons: null }));
      
      const data = await apiService.getLessons();
      setLessons(data.lessons || []);
    } catch (error) {
      console.error('Lessons fetch error:', error);
      setErrors(prev => ({ ...prev, lessons: error }));
    } finally {
      setLoading(prev => ({ ...prev, lessons: false }));
    }
  }, []);

  const fetchTests = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, tests: true }));
      setErrors(prev => ({ ...prev, tests: null }));
      
      const data = await apiService.getTests();
      setTests(data.tests || []);
    } catch (error) {
      console.error('Tests fetch error:', error);
      setErrors(prev => ({ ...prev, tests: error }));
    } finally {
      setLoading(prev => ({ ...prev, tests: false }));
    }
  }, []);

  // Event handlers
  const handleViewLesson = useCallback(async (lesson) => {
    try {
      await apiService.logAccess(lesson.content_share_id, 'view');
      setSelectedLesson(lesson);
    } catch (error) {
      console.error('Error accessing lesson:', error);
    }
  }, []);

  const handleTakeTest = useCallback(async (lesson) => {
    try {
      const data = await apiService.getTest(lesson.recording_id);
      // TODO: Open test interface component
      console.log('Opening test:', data);
      alert(`פותח מבחן: ${data.test.set_name || 'מבחן'} (${data.questions.length} שאלות)`);
    } catch (error) {
      console.error('Error accessing test:', error);
      alert(error.message || t('student.serverError'));
    }
  }, []);

  const handleCloseLessonViewer = useCallback(() => {
    setSelectedLesson(null);
  }, []);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    if (tab === 'lessons' && lessons.length === 0 && !loading.lessons) {
      fetchLessons();
    } else if (tab === 'tests' && tests.length === 0 && !loading.tests) {
      fetchTests();
    }
  }, [lessons.length, tests.length, loading.lessons, loading.tests, fetchLessons, fetchTests]);

  // Filtered and sorted data
  const filteredLessons = useMemo(() => {
    let filtered = lessons.filter(lesson => 
      lesson.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lesson.summary_text && lesson.summary_text.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (filters.subject) {
      filtered = filtered.filter(lesson => lesson.subject_area === filters.subject);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (filters.sort) {
        case 'oldest':
          return new Date(a.lesson_date) - new Date(b.lesson_date);
        case 'alphabetical':
          return a.filename.localeCompare(b.filename, 'he');
        case 'newest':
        default:
          return new Date(b.lesson_date) - new Date(a.lesson_date);
      }
    });

    return filtered;
  }, [lessons, searchTerm, filters]);

  const filteredTests = useMemo(() => {
    let filtered = tests.filter(test => 
      (test.set_name || test.filename).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (test.test_description && test.test_description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (filters.subject) {
      filtered = filtered.filter(test => test.subject_area === filters.subject);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (filters.sort) {
        case 'oldest':
          return new Date(a.lesson_date) - new Date(b.lesson_date);
        case 'alphabetical':
          return (a.set_name || a.filename).localeCompare((b.set_name || b.filename), 'he');
        case 'newest':
        default:
          return new Date(b.lesson_date) - new Date(a.lesson_date);
      }
    });

    return filtered;
  }, [tests, searchTerm, filters]);

  // Effects
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (activeTab === 'lessons' && lessons.length === 0) {
      fetchLessons();
    } else if (activeTab === 'tests' && tests.length === 0) {
      fetchTests();
    }
  }, [activeTab, lessons.length, tests.length, fetchLessons, fetchTests]);

  // Loading state for initial load
  if (loading.dashboard && !dashboardData) {
    return (
      <div className="student-portal">
        <div className="dashboard-container">
          <LoadingSpinner 
            fullScreen 
            message={t('student.loadingDashboard')}
            size="large"
          />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary fallbackMessage="שגיאה בטעינת לוח הבקרה">
      <div className="student-portal theme-bg-background theme-text-primary">
        <NetworkStatus isOnline={isOnline} onRetry={fetchDashboardData} />
        
        {/* Student Dashboard Header */}
        <header className="student-header theme-bg-primary">
          <div className="header-content">
            <h1 className="header-title">LimudAI - פורטל תלמיד</h1>
            <div className="header-actions">
              <span className="user-greeting">שלום, {user.firstName}</span>
              <ThemeToggleButton size="small" />
              <button onClick={onLogout} className="btn btn-error logout-btn">
                התנתק
              </button>
            </div>
          </div>
        </header>
        
        <div className="dashboard-container theme-bg-background">
          {/* Session Warning - positioned at top if needed */}
          {showWarning && (
            <div className="session-warning-container">
              <SessionWarning timeLeft={timeLeft} onExtend={extendSession} />
            </div>
          )}

          {/* Main Content */}
          <main className="main-content">
            {/* Welcome Card */}
            <section className="welcome-card theme-surface">
              <h2 className="welcome-title theme-text-primary">
                {t('student.dashboard')}
              </h2>
              <p className="welcome-text theme-text-secondary">
                {t('dashboard.welcome')}, {user.firstName} {user.lastName}!
              </p>

              {/* Stats Grid */}
              {errors.dashboard ? (
                <ErrorMessage 
                  error={errors.dashboard} 
                  onRetry={fetchDashboardData}
                  type="error"
                />
              ) : (
                <div className="stats-grid">
                  <StatCard 
                    number={dashboardData?.stats?.lessonsCount || 0}
                    label={t('student.availableLessons')}
                    loading={loading.dashboard}
                  />
                  <StatCard 
                    number={dashboardData?.stats?.testsCount || 0}
                    label={t('student.availableTests')}
                    loading={loading.dashboard}
                  />
                  <StatCard 
                    number={dashboardData?.stats?.recentActivity || 0}
                    label={t('dashboard.recentActivity')}
                    loading={loading.dashboard}
                  />
                  <StatCard 
                    number={dashboardData?.classes?.length || 0}
                    label={t('dashboard.myClasses')}
                    loading={loading.dashboard}
                  />
                </div>
              )}
            </section>

            {/* Navigation Tabs */}
            <section className="navigation-tabs theme-surface">
              <div className="tabs-header theme-border">
                <button 
                  className={`tab ${activeTab === 'lessons' ? 'active' : ''}`}
                  onClick={() => handleTabChange('lessons')}
                  aria-selected={activeTab === 'lessons'}
                  role="tab"
                >
                  {t('student.lessons')}
                </button>
                <button 
                  className={`tab ${activeTab === 'tests' ? 'active' : ''}`}
                  onClick={() => handleTabChange('tests')}
                  aria-selected={activeTab === 'tests'}
                  role="tab"
                >
                  {t('student.tests')}
                </button>
              </div>

              <div className="tab-content" role="tabpanel">
                {/* Search and Filter */}
                <SearchAndFilter
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  filters={filters}
                  onFilterChange={setFilters}
                />

                {/* Content */}
                {activeTab === 'lessons' && (
                  <>
                    <h3 className="content-section-title theme-text-primary">{t('student.myLessons')}</h3>
                    
                    {errors.lessons && (
                      <ErrorMessage 
                        error={errors.lessons} 
                        onRetry={fetchLessons}
                        type="error"
                      />
                    )}
                    
                    {loading.lessons ? (
                      <ContentSkeleton count={6} />
                    ) : filteredLessons.length === 0 ? (
                      <EmptyState type="lessons" icon="📚" />
                    ) : (
                      <div className="content-grid">
                        {filteredLessons.map((lesson) => (
                          <ContentCard
                            key={lesson.recording_id}
                            content={lesson}
                            type="lesson"
                            onView={handleViewLesson}
                            onTest={handleTakeTest}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'tests' && (
                  <>
                    <h3 className="content-section-title theme-text-primary">{t('student.myTests')}</h3>
                    
                    {errors.tests && (
                      <ErrorMessage 
                        error={errors.tests} 
                        onRetry={fetchTests}
                        type="error"
                      />
                    )}
                    
                    {loading.tests ? (
                      <ContentSkeleton count={6} />
                    ) : filteredTests.length === 0 ? (
                      <EmptyState type="tests" icon="📝" />
                    ) : (
                      <div className="content-grid">
                        {filteredTests.map((test) => (
                          <ContentCard
                            key={test.recording_id}
                            content={test}
                            type="test"
                            onView={handleTakeTest}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>
          </main>
        </div>

        {/* Lesson Viewer Modal */}
        {selectedLesson && (
          <LessonViewer 
            lesson={selectedLesson} 
            onClose={handleCloseLessonViewer} 
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default StudentDashboard;
