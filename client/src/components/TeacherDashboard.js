import React, { useState, useEffect } from 'react';
import MemoryCardManager from './MemoryCardManager';
import MemoryCardSetViewer from './MemoryCardSetViewer';
import MemoryCardSetEditor from './MemoryCardSetEditor';
import RecordingInterface from './RecordingInterface';
import SessionManager from './SessionManager';
import LessonsManager from './LessonsManager';
import TestsManager from './TestsManager';
import SummariesManager from './SummariesManager';
import DocumentsManager from './DocumentsManager';
import AudioManager from './AudioManager';
import VideoManager from './VideoManager';
import ImagesManager from './ImagesManager';

const TeacherDashboard = ({ user, t, onLogout, fileStorageService, isProcessingRecording, setIsProcessingRecording }) => {
  // Main tab state - 4 main tabs as requested
  const [activeMainTab, setActiveMainTab] = useState('overview');
  
  // Sub-tab states
  const [activeMediaSubTab, setActiveMediaSubTab] = useState('audio');
  const [activeContentSubTab, setActiveContentSubTab] = useState('flashcards');
  
  // Memory card related states
  const [showMemoryCardForm, setShowMemoryCardForm] = useState(false);
  const [viewingSet, setViewingSet] = useState(null);
  const [editingSet, setEditingSet] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [memoryCardSets, setMemoryCardSets] = useState([]);
  const [loadingMemoryCards, setLoadingMemoryCards] = useState(false);
  
  // Statistics states
  const [memoryCardStats, setMemoryCardStats] = useState({
    totalSets: 0,
    totalCards: 0,
    recentCards: []
  });
  const [summaryStats, setSummaryStats] = useState({
    totalSummaries: 0,
    publicSummaries: 0,
    recentSummaries: []
  });
  const [testStats, setTestStats] = useState({
    totalTests: 0,
    recentTests: []
  });
  const [lessonStats, setLessonStats] = useState({
    totalLessons: 0,
    recentLessons: []
  });
  const [successMessage, setSuccessMessage] = useState('');

  // Load data when component mounts or when tabs are active
  useEffect(() => {
    if (activeMainTab === 'content' && activeContentSubTab === 'flashcards') {
      loadMemoryCardData();
    } else if (activeMainTab === 'overview') {
      loadAllStats();
    }
  }, [activeMainTab, activeContentSubTab]);

  // Load all statistics on component mount
  useEffect(() => {
    loadAllStats();
  }, []);

  const loadAllStats = async () => {
    await Promise.all([
      loadSummaryStats(),
      loadTestStats(),
      loadLessonStats(),
      loadMemoryCardStats()
    ]);
  };

  const loadMemoryCardStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMemoryCardStats({
          totalSets: 0,
          totalCards: 0,
          recentCards: []
        });
        return;
      }
      
      // Load user's memory card sets for stats
      const setsResponse = await fetch(`/api/memory-cards/sets/user/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (setsResponse.ok) {
        const setsData = await setsResponse.json();
        const sets = setsData.data || [];
        
        // Calculate stats
        const totalSets = sets.length;
        const totalCards = sets.reduce((sum, set) => sum + (set.totalCards || 0), 0);
        
        setMemoryCardStats({
          totalSets,
          totalCards,
          recentCards: sets.slice(0, 5)
        });
      } else {
        setMemoryCardStats({
          totalSets: 0,
          totalCards: 0,
          recentCards: []
        });
      }
    } catch (error) {
      console.error('Error loading memory card stats:', error);
      setMemoryCardStats({
        totalSets: 0,
        totalCards: 0,
        recentCards: []
      });
    }
  };

  const loadSummaryStats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setSummaryStats({
          totalSummaries: 0,
          manualSummaries: 0,
          lessonSummaries: 0,
          publicSummaries: 0,
          recentSummaries: []
        });
        return;
      }

      // Load statistics from unified API
      const statsResponse = await fetch('/api/summaries/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        
        // Load recent summaries
        const recentResponse = await fetch('/api/summaries?limit=3&sort=created_at&order=desc', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        let recentSummaries = [];
        if (recentResponse.ok) {
          const recentData = await recentResponse.json();
          recentSummaries = recentData.summaries || [];
        }

        setSummaryStats({
          totalSummaries: stats.total_summaries || 0,
          manualSummaries: stats.manual_summaries || 0,
          lessonSummaries: stats.lesson_summaries || 0,
          publicSummaries: stats.public_summaries || 0,
          recentSummaries
        });
      } else {
        // Fallback to localStorage for backward compatibility
        const storedSummaries = localStorage.getItem('limud-ai-summaries');
        if (storedSummaries) {
          const summaries = JSON.parse(storedSummaries);
          const totalSummaries = summaries.length;
          const publicSummaries = summaries.filter(summary => summary.isPublic).length;
          const recentSummaries = summaries.slice(0, 3);
          
          setSummaryStats({
            totalSummaries,
            manualSummaries: totalSummaries,
            lessonSummaries: 0,
            publicSummaries,
            recentSummaries
          });
        } else {
          setSummaryStats({
            totalSummaries: 0,
            manualSummaries: 0,
            lessonSummaries: 0,
            publicSummaries: 0,
            recentSummaries: []
          });
        }
      }
    } catch (error) {
      console.error('Error loading summary stats:', error);
      setSummaryStats({
        totalSummaries: 0,
        manualSummaries: 0,
        lessonSummaries: 0,
        publicSummaries: 0,
        recentSummaries: []
      });
    }
  };

  const loadTestStats = async () => {
    try {
      // Load tests from localStorage (placeholder - would normally come from API)
      const storedTests = localStorage.getItem('limud-ai-tests');
      if (storedTests) {
        const tests = JSON.parse(storedTests);
        const totalTests = tests.length;
        const recentTests = tests.slice(0, 2);
        
        setTestStats({
          totalTests,
          recentTests
        });
      } else {
        setTestStats({
          totalTests: 0,
          recentTests: []
        });
      }
    } catch (error) {
      console.error('Error loading test stats:', error);
      setTestStats({
        totalTests: 0,
        recentTests: []
      });
    }
  };

  const loadLessonStats = async () => {
    try {
      // Load lessons from API
      const token = localStorage.getItem('token');
      if (!token) {
        setLessonStats({
          totalLessons: 0,
          recentLessons: []
        });
        return;
      }

      const response = await fetch('/api/recordings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const lessons = data.recordings || [];
        const totalLessons = lessons.length;
        const recentLessons = lessons
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 2)
          .map(lesson => ({
            id: lesson.id,
            title: lesson.metadata?.lessonName || `הקלטה ${lesson.id}`,
            subject: lesson.metadata?.subject || 'כללי',
            created_at: lesson.created_at
          }));
        
        setLessonStats({
          totalLessons,
          recentLessons
        });
      } else {
        setLessonStats({
          totalLessons: 0,
          recentLessons: []
        });
      }
    } catch (error) {
      console.error('Error loading lesson stats:', error);
      setLessonStats({
        totalLessons: 0,
        recentLessons: []
      });
    }
  };

  const loadMemoryCardData = async () => {
    setLoadingMemoryCards(true);
    try {
      const token = localStorage.getItem('token');
      
      // Load user's memory card sets
      const setsResponse = await fetch(`/api/memory-cards/sets/user/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (setsResponse.ok) {
        const setsData = await setsResponse.json();
        setMemoryCardSets(setsData.data || []);
        
        // Calculate stats
        const totalSets = setsData.data?.length || 0;
        const totalCards = setsData.data?.reduce((sum, set) => sum + (set.totalCards || 0), 0) || 0;
        
        setMemoryCardStats({
          totalSets,
          totalCards,
          recentCards: setsData.data?.slice(0, 5) || []
        });
      }
    } catch (error) {
      console.error('Error loading memory card data:', error);
    } finally {
      setLoadingMemoryCards(false);
    }
  };

  const handleRecordingComplete = async (recordingData) => {
    // Prevent duplicate processing
    if (isProcessingRecording) {
      console.log('Recording already being processed, ignoring duplicate call');
      return;
    }

    setIsProcessingRecording(true);
    
    try {
      console.log('Processing recording completion:', {
        duration: recordingData.duration,
        qualityReportDuration: recordingData.qualityReport?.duration,
        blobSize: recordingData.audioBlob?.size,
        aiOptions: recordingData.aiOptions
      });
      
      const result = await fileStorageService.saveRecording(recordingData);
      console.log('Recording saved successfully:', result);
      
      // Trigger AI processing if requested
      if (recordingData.aiOptions && (recordingData.aiOptions.generateSummary || recordingData.aiOptions.generateTest)) {
        console.log('Triggering AI processing for recording:', result.recordingId);
        await triggerAIProcessing(result.recordingId, recordingData.aiOptions);
      }
      
      // Switch to lessons tab to show the new recording with AI content
      setActiveMainTab('lessons');
    } catch (error) {
      console.error('Error saving recording:', error);
    } finally {
      // Reset the flag after a short delay to allow for legitimate subsequent recordings
      setTimeout(() => {
        setIsProcessingRecording(false);
      }, 2000);
    }
  };

  const triggerAIProcessing = async (recordingId, aiOptions) => {
    try {
      const token = localStorage.getItem('token');
      const processingOptions = [];
      
      if (aiOptions.generateSummary) {
        processingOptions.push('summary');
      }
      if (aiOptions.generateTest) {
        processingOptions.push('questions');
      }
      
      const response = await fetch('/api/ai-content/process-recording', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recordingId,
          processingOptions
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('AI processing initiated:', result);
      } else {
        const error = await response.json();
        console.error('Failed to initiate AI processing:', error);
      }
    } catch (error) {
      console.error('Error triggering AI processing:', error);
    }
  };

  const handleMemoryCardCreated = (newCard) => {
    // Refresh memory card data
    loadMemoryCardData();
    
    // Show success message and hide form
    setShowMemoryCardForm(false);
    
    // Optional: Show a toast notification
    console.log('Memory card created successfully:', newCard);
  };

  const handleCreateNewCard = () => {
    setShowMemoryCardForm(true);
  };

  const handleCancelCardCreation = () => {
    setShowMemoryCardForm(false);
  };

  const handleViewSet = (set) => {
    setViewingSet(set);
    setCurrentPage('viewer');
  };

  const handleEditSet = (set) => {
    setEditingSet(set);
    setCurrentPage('editor');
  };

  const handleCloseViewer = () => {
    setViewingSet(null);
    setCurrentPage('dashboard');
  };

  const handleCloseEditor = () => {
    setEditingSet(null);
    setCurrentPage('dashboard');
  };

  const handleSetSaved = (updatedSet) => {
    // Refresh the memory card data to reflect changes
    loadMemoryCardData();
    setEditingSet(null);
    setCurrentPage('dashboard');
  };

  const handleEditFromViewer = (set) => {
    setViewingSet(null);
    setEditingSet(set);
    setCurrentPage('editor');
  };

  // Enhanced Overview Tab Content with Quick Actions and Recent Activity
  const OverviewContent = () => {
    // Get all recent activity items and sort by date
    const getAllRecentActivity = () => {
      const allItems = [];
      
      // Add recent summaries
      summaryStats.recentSummaries.forEach(summary => {
        allItems.push({
          id: `summary-${summary.id}`,
          type: 'summary',
          title: summary.title,
          subtitle: `סיכום • ${summary.subject_area || summary.subjectArea || 'כללי'}`,
          date: new Date(summary.created_at || summary.updated_at),
          icon: summary.summary_type === 'lesson' ? '🤖' : '📝',
          badge: summary.summary_type === 'lesson' ? 'שיעור' : 'ידני',
          badgeClass: summary.summary_type === 'lesson' ? 'lesson-badge' : 'manual-badge',
          onClick: () => {
            setActiveMainTab('content');
            setActiveContentSubTab('summaries');
          }
        });
      });
      
      // Add recent tests
      testStats.recentTests.forEach(test => {
        allItems.push({
          id: `test-${test.id}`,
          type: 'test',
          title: test.title || `מבחן ${test.id}`,
          subtitle: `מבחן • ${test.subject || 'כללי'}`,
          date: new Date(test.created_at || test.createdAt),
          icon: '📋',
          onClick: () => {
            setActiveMainTab('content');
            setActiveContentSubTab('tests');
          }
        });
      });
      
      // Add recent lessons
      lessonStats.recentLessons.forEach(lesson => {
        allItems.push({
          id: `lesson-${lesson.id}`,
          type: 'lesson',
          title: lesson.title,
          subtitle: `שיעור • ${lesson.subject || 'כללי'}`,
          date: new Date(lesson.created_at),
          icon: '📚',
          onClick: () => {
            setActiveMainTab('lessons');
          }
        });
      });
      
      // Sort by date (newest first) and return top 5
      return allItems
        .sort((a, b) => b.date - a.date)
        .slice(0, 5);
    };

    const recentActivity = getAllRecentActivity();

    return (
      <div className="overview-container">
        {/* Quick Action Buttons - Enhanced */}
        <div className="overview-section">
          <h3 className="section-title">⚡ פעולות מהירות</h3>
          <div className="enhanced-quick-actions-grid">
            <button 
              className="enhanced-quick-action-card create-test"
              onClick={() => {
                setActiveMainTab('content');
                setActiveContentSubTab('tests');
                // Small delay to ensure tab switch, then trigger test creation
                setTimeout(() => {
                  // This will be handled by the TestsManager component
                  const createButton = document.querySelector('[data-action="create-test"]');
                  if (createButton) {
                    createButton.click();
                  }
                }, 100);
              }}
            >
              <div className="enhanced-action-icon">📋</div>
              <div className="enhanced-action-content">
                <div className="enhanced-action-title">צור מבחן</div>
                <div className="enhanced-action-desc">צור מבחן חדש עם שאלות מותאמות</div>
              </div>
              <div className="enhanced-action-arrow">→</div>
            </button>
            
            <button 
              className="enhanced-quick-action-card create-summary"
              onClick={() => {
                setActiveMainTab('content');
                setActiveContentSubTab('summaries');
                // Small delay to ensure tab switch, then trigger summary creation
                setTimeout(() => {
                  // This will be handled by the SummariesManager component
                  const createButton = document.querySelector('[data-action="create-summary"]');
                  if (createButton) {
                    createButton.click();
                  }
                }, 100);
              }}
            >
              <div className="enhanced-action-icon">📝</div>
              <div className="enhanced-action-content">
                <div className="enhanced-action-title">צור סיכום</div>
                <div className="enhanced-action-desc">כתב סיכום חדש או צור מתוכן קיים</div>
              </div>
              <div className="enhanced-action-arrow">→</div>
            </button>
            
            <button 
              className="enhanced-quick-action-card upload-lesson"
              onClick={() => {
                setActiveMainTab('lessons');
                // Small delay to ensure tab switch, then trigger upload
                setTimeout(() => {
                  // This will be handled by the LessonsManager component
                  const uploadButton = document.querySelector('[data-action="upload-lesson"]');
                  if (uploadButton) {
                    uploadButton.click();
                  }
                }, 100);
              }}
            >
              <div className="enhanced-action-icon">📚</div>
              <div className="enhanced-action-content">
                <div className="enhanced-action-title">העלה שיעור</div>
                <div className="enhanced-action-desc">העלה הקלטת שיעור או קובץ מדיה</div>
              </div>
              <div className="enhanced-action-arrow">→</div>
            </button>
          </div>
        </div>

        {/* Recent Activity List - Enhanced */}
        {recentActivity.length > 0 && (
          <div className="overview-section">
            <h3 className="section-title">🕒 פעילות אחרונה</h3>
            <div className="enhanced-recent-activity-list">
              {recentActivity.map((item, index) => (
                <div 
                  key={item.id} 
                  className="enhanced-activity-item"
                  onClick={item.onClick}
                >
                  <div className="enhanced-activity-icon">
                    {item.icon}
                  </div>
                  <div className="enhanced-activity-content">
                    <div className="enhanced-activity-header">
                      <h6 className="enhanced-activity-title">{item.title}</h6>
                      {item.badge && (
                        <span className={`enhanced-activity-badge ${item.badgeClass || ''}`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="enhanced-activity-subtitle">{item.subtitle}</p>
                    <div className="enhanced-activity-meta">
                      <span className="enhanced-activity-date">
                        {item.date.toLocaleDateString('he-IL', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      <span className="enhanced-activity-type">
                        {item.type === 'summary' ? 'סיכום' : 
                         item.type === 'test' ? 'מבחן' : 'שיעור'}
                      </span>
                    </div>
                  </div>
                  <div className="enhanced-activity-arrow">→</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compact Statistics Grid */}
        <div className="overview-section">
          <h3 className="section-title">📊 סטטיסטיקות כלליות</h3>
          <div className="compact-stats-grid">
            <div className="compact-stat-card">
              <div className="compact-stat-icon">📝</div>
              <div className="compact-stat-info">
                <div className="compact-stat-number">{summaryStats.totalSummaries}</div>
                <div className="compact-stat-label">סיכומים כולל</div>
              </div>
            </div>
            <div className="compact-stat-card">
              <div className="compact-stat-icon">✍️</div>
              <div className="compact-stat-info">
                <div className="compact-stat-number">{summaryStats.manualSummaries || 0}</div>
                <div className="compact-stat-label">סיכומים ידניים</div>
              </div>
            </div>
            <div className="compact-stat-card">
              <div className="compact-stat-icon">🤖</div>
              <div className="compact-stat-info">
                <div className="compact-stat-number">{summaryStats.lessonSummaries || 0}</div>
                <div className="compact-stat-label">סיכומי שיעורים</div>
              </div>
            </div>
            <div className="compact-stat-card">
              <div className="compact-stat-icon">📚</div>
              <div className="compact-stat-info">
                <div className="compact-stat-number">{lessonStats.totalLessons}</div>
                <div className="compact-stat-label">שיעורים</div>
              </div>
            </div>
            <div className="compact-stat-card">
              <div className="compact-stat-icon">📋</div>
              <div className="compact-stat-info">
                <div className="compact-stat-number">{testStats.totalTests}</div>
                <div className="compact-stat-label">מבחנים</div>
              </div>
            </div>
            <div className="compact-stat-card">
              <div className="compact-stat-icon">🎴</div>
              <div className="compact-stat-info">
                <div className="compact-stat-number">{memoryCardStats.totalSets}</div>
                <div className="compact-stat-label">כרטיסי זיכרון</div>
              </div>
            </div>
            <div className="compact-stat-card">
              <div className="compact-stat-icon">🌐</div>
              <div className="compact-stat-info">
                <div className="compact-stat-number">{summaryStats.publicSummaries}</div>
                <div className="compact-stat-label">תוכן ציבורי</div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Quick Actions */}
        <div className="overview-section">
          <h3 className="section-title">🔧 פעולות נוספות</h3>
          <div className="secondary-quick-actions-grid">
            <button 
              className="secondary-quick-action-card"
              onClick={() => {
                setActiveMainTab('content');
                setActiveContentSubTab('flashcards');
              }}
            >
              <div className="secondary-action-icon">🎴</div>
              <div className="secondary-action-title">כרטיסי זיכרון</div>
              <div className="secondary-action-desc">צור וערוך כרטיסי זיכרון</div>
            </button>
            <button 
              className="secondary-quick-action-card"
              onClick={() => setActiveMainTab('media')}
            >
              <div className="secondary-action-icon">🎬</div>
              <div className="secondary-action-title">מדיה</div>
              <div className="secondary-action-desc">נהל קבצי אודיו ווידאו</div>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Media Tab Content with Sub-tabs
  const MediaContent = () => (
    <div className="media-container">
      <div className="sub-tabs">
        <button
          className={`sub-tab ${activeMediaSubTab === 'audio' ? 'active' : ''}`}
          onClick={() => setActiveMediaSubTab('audio')}
        >
          🎵 אודיו
        </button>
        <button
          className={`sub-tab ${activeMediaSubTab === 'video' ? 'active' : ''}`}
          onClick={() => setActiveMediaSubTab('video')}
        >
          🎬 ווידאו
        </button>
        <button
          className={`sub-tab ${activeMediaSubTab === 'images' ? 'active' : ''}`}
          onClick={() => setActiveMediaSubTab('images')}
        >
          🖼️ תמונות
        </button>
        <button
          className={`sub-tab ${activeMediaSubTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveMediaSubTab('documents')}
        >
          📄 מסמכים
        </button>
      </div>
      
      <div className="sub-tab-content">
        {activeMediaSubTab === 'audio' && <AudioManager t={t} />}
        {activeMediaSubTab === 'video' && <VideoManager t={t} />}
        {activeMediaSubTab === 'images' && <ImagesManager t={t} />}
        {activeMediaSubTab === 'documents' && <DocumentsManager t={t} />}
      </div>
    </div>
  );

  // Content Tab Content with Sub-tabs
  const ContentContent = () => (
    <div className="content-container">
      <div className="sub-tabs">
        <button
          className={`sub-tab ${activeContentSubTab === 'flashcards' ? 'active' : ''}`}
          onClick={() => setActiveContentSubTab('flashcards')}
        >
          🎴 כרטיסי זיכרון
        </button>
        <button
          className={`sub-tab ${activeContentSubTab === 'tests' ? 'active' : ''}`}
          onClick={() => setActiveContentSubTab('tests')}
        >
          📋 מבחנים
        </button>
        <button
          className={`sub-tab ${activeContentSubTab === 'summaries' ? 'active' : ''}`}
          onClick={() => setActiveContentSubTab('summaries')}
        >
          📝 סיכומים
        </button>
      </div>
      
      <div className="sub-tab-content">
        {activeContentSubTab === 'flashcards' && (
          showMemoryCardForm ? (
            <MemoryCardManager 
              userId={user.id}
              onCardCreated={handleMemoryCardCreated}
              onCancel={handleCancelCardCreation}
            />
          ) : (
            <FlashcardsOverview />
          )
        )}
        {activeContentSubTab === 'tests' && <TestsManager user={user} t={t} />}
        {activeContentSubTab === 'summaries' && <SummariesManager />}
      </div>
    </div>
  );

  // Flashcards Overview Component
  const FlashcardsOverview = () => (
    <div className="flashcards-overview">
      <div className="flashcards-header">
        <div className="flashcards-title">
          <h3>🎴 כרטיסי זיכרון</h3>
          <p>נהל וצור כרטיסי זיכרון לתלמידים שלך</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={handleCreateNewCard}
          disabled={showMemoryCardForm}
        >
          + צור כרטיס חדש
        </button>
      </div>

      {loadingMemoryCards ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>טוען כרטיסי זיכרון...</p>
        </div>
      ) : (
        <>
          {/* Statistics Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{memoryCardStats.totalSets}</div>
              <div className="stat-label">סטים</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{memoryCardStats.totalCards}</div>
              <div className="stat-label">כרטיסים</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{memoryCardSets.filter(set => set.isPublic).length}</div>
              <div className="stat-label">סטים ציבוריים</div>
            </div>
          </div>

          {/* Recent Sets */}
          {memoryCardSets.length > 0 ? (
            <div className="memory-card-sets">
              <h4>הסטים שלך</h4>
              <div className="sets-grid">
                {memoryCardSets.map(set => (
                  <div key={set.id} className="set-card">
                    <div className="set-header">
                      <h5>{set.name}</h5>
                      <span className="set-card-count">{set.totalCards || 0} כרטיסים</span>
                    </div>
                    {set.description && (
                      <p className="set-description">{set.description}</p>
                    )}
                    <div className="set-meta">
                      {set.subjectArea && <span className="set-subject">{set.subjectArea}</span>}
                      {set.gradeLevel && <span className="set-grade">כיתה {set.gradeLevel}</span>}
                    </div>
                    <div className="set-actions">
                      <button 
                        className="btn btn-sm btn-outline"
                        onClick={() => handleEditSet(set)}
                      >
                        עריכה
                      </button>
                      <button 
                        className="btn btn-sm btn-outline"
                        onClick={() => handleViewSet(set)}
                      >
                        צפייה
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">🎴</div>
              <h4>אין לך כרטיסי זיכרון עדיין</h4>
              <p>צור את הכרטיס הראשון שלך כדי להתחיל</p>
              <button 
                className="btn btn-primary"
                onClick={handleCreateNewCard}
              >
                צור כרטיס ראשון
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );

  // Render editor as separate page
  if (currentPage === 'editor' && editingSet) {
    return (
      <div className="fullscreen-page">
        <MemoryCardSetEditor
          setId={editingSet.id}
          onClose={handleCloseEditor}
          onSave={handleSetSaved}
        />
      </div>
    );
  }

  // Default dashboard view
  return (
    <>
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            {t('dashboard.teacherDashboard')}
          </h2>
          <p className="card-subtitle">
            {t('dashboard.welcome')}, {user.firstName} {user.lastName}!
          </p>
        </div>
        
        {/* Main Navigation Tabs - 4 main tabs as requested */}
        <div className="main-nav-tabs">
          <div className="main-nav-tabs-header">
            <button
              className={`main-nav-tab ${activeMainTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveMainTab('overview')}
            >
              📊 סקירה כללית
            </button>
            <button
              className={`main-nav-tab ${activeMainTab === 'media' ? 'active' : ''}`}
              onClick={() => setActiveMainTab('media')}
            >
              🎬 מדיה
            </button>
            <button
              className={`main-nav-tab ${activeMainTab === 'content' ? 'active' : ''}`}
              onClick={() => setActiveMainTab('content')}
            >
              📚 תוכן
            </button>
            <button
              className={`main-nav-tab ${activeMainTab === 'lessons' ? 'active' : ''}`}
              onClick={() => setActiveMainTab('lessons')}
            >
              🎓 שיעורים
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeMainTab === 'overview' && <OverviewContent />}
          {activeMainTab === 'media' && <MediaContent />}
          {activeMainTab === 'content' && <ContentContent />}
          {activeMainTab === 'lessons' && <LessonsManager t={t} />}
        </div>
      </div>

      {/* Memory Card Set Viewer Popup */}
      {viewingSet && currentPage === 'viewer' && (
        <div className="modal-overlay" onClick={handleCloseViewer}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <MemoryCardSetViewer
              setId={viewingSet.id}
              onClose={handleCloseViewer}
              onEdit={handleEditFromViewer}
            />
          </div>
        </div>
      )}

      <style jsx>{`
        .fullscreen-page {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--color-background, #f8f9fa);
          z-index: 1000;
          overflow-y: auto;
          padding: 1rem;
        }

        .main-nav-tabs {
          margin-bottom: 2rem;
        }

        .main-nav-tabs-header {
          display: flex;
          gap: 0.5rem;
          background: var(--color-surfaceElevated, #f8f9fa);
          border-radius: var(--radius-md, 8px);
          padding: 0.5rem;
          border: 1px solid var(--color-border, #e9ecef);
          overflow-x: auto;
        }

        .main-nav-tab {
          padding: 1rem 1.5rem;
          border: none;
          border-radius: var(--radius-sm, 4px);
          font-family: 'Heebo', sans-serif;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          background: transparent;
          color: var(--color-text, #2c3e50);
          white-space: nowrap;
          min-width: fit-content;
        }

        .main-nav-tab:hover {
          background: var(--color-surface, #ffffff);
          color: var(--color-primary, #3498db);
        }

        .main-nav-tab.active {
          background: var(--color-primary, #3498db);
          color: var(--color-textOnPrimary, #ffffff);
          box-shadow: 0 2px 8px rgba(52, 152, 219, 0.3);
        }

        .tab-content {
          min-height: 400px;
        }

        .sub-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          background: var(--color-surfaceElevated, #f8f9fa);
          border-radius: var(--radius-md, 8px);
          padding: 0.25rem;
          border: 1px solid var(--color-border, #e9ecef);
        }

        .sub-tab {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: var(--radius-sm, 4px);
          font-family: 'Heebo', sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          background: transparent;
          color: var(--color-text, #2c3e50);
          flex: 1;
        }

        .sub-tab:hover {
          background: var(--color-surface, #ffffff);
          color: var(--color-primary, #3498db);
        }

        .sub-tab.active {
          background: var(--color-primary, #3498db);
          color: var(--color-textOnPrimary, #ffffff);
          box-shadow: 0 2px 8px rgba(52, 152, 219, 0.3);
        }

        .sub-tab-content {
          margin-top: 1rem;
        }

        .overview-container {
          padding: 1rem;
        }

        .overview-section {
          margin-bottom: 2rem;
        }

        .section-title {
          margin: 0 0 1rem 0;
          color: var(--color-primary, #3498db);
          font-size: 1.3rem;
          font-weight: 600;
        }

        .compact-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .compact-stat-card {
          background: var(--color-surface, #ffffff);
          border: 2px solid var(--color-border, #e9ecef);
          border-radius: var(--radius-md, 8px);
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: all 0.3s ease;
        }

        .compact-stat-card:hover {
          border-color: var(--color-primary, #3498db);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(52, 152, 219, 0.15);
        }

        .compact-stat-icon {
          font-size: 2rem;
          flex-shrink: 0;
        }

        .compact-stat-info {
          flex: 1;
        }

        .compact-stat-number {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-primary, #3498db);
          margin-bottom: 0.2rem;
        }

        .compact-stat-label {
          color: var(--color-textSecondary, #7f8c8d);
          font-weight: 500;
          font-size: 0.9rem;
        }

        .recent-activity-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1rem;
        }

        .recent-activity-card {
          background: var(--color-surface, #ffffff);
          border: 2px solid var(--color-border, #e9ecef);
          border-radius: var(--radius-md, 8px);
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: all 0.3s ease;
        }

        .recent-activity-card:hover {
          border-color: var(--color-primary, #3498db);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(52, 152, 219, 0.15);
        }

        .activity-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .activity-content {
          flex: 1;
        }

        .activity-content h6 {
          margin: 0 0 0.2rem 0;
          color: var(--color-text, #2c3e50);
          font-size: 0.9rem;
          font-weight: 600;
        }

        .activity-content p {
          margin: 0;
          color: var(--color-textSecondary, #7f8c8d);
          font-size: 0.8rem;
        }

        .activity-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.2rem;
        }

        .summary-type-badge {
          padding: 0.2rem 0.5rem;
          border-radius: var(--radius-sm, 4px);
          font-size: 0.7rem;
          font-weight: 500;
          white-space: nowrap;
        }

        .lesson-badge {
          background: var(--color-info, #17a2b8);
          color: white;
        }

        .manual-badge {
          background: var(--color-warning, #ffc107);
          color: var(--color-text, #2c3e50);
        }

        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .quick-action-card {
          background: var(--color-surface, #ffffff);
          border: 2px solid var(--color-border, #e9ecef);
          border-radius: var(--radius-md, 8px);
          padding: 1.5rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: 'Heebo', sans-serif;
        }

        .quick-action-card:hover {
          border-color: var(--color-primary, #3498db);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(52, 152, 219, 0.15);
        }

        .quick-action-icon {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }

        .quick-action-title {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--color-text, #2c3e50);
          margin-bottom: 0.5rem;
        }

        .quick-action-desc {
          font-size: 0.9rem;
          color: var(--color-textSecondary, #7f8c8d);
        }

        .flashcards-overview {
          padding: 1.5rem;
        }

        .flashcards-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .flashcards-title h3 {
          margin: 0 0 0.5rem 0;
          color: var(--color-primary, #3498db);
          font-size: 1.5rem;
        }

        .flashcards-title p {
          margin: 0;
          color: var(--color-textSecondary, #7f8c8d);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: var(--color-surface, #ffffff);
          border: 2px solid var(--color-border, #e9ecef);
          border-radius: var(--radius-md, 8px);
          padding: 1.5rem;
          text-align: center;
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          border-color: var(--color-primary, #3498db);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(52, 152, 219, 0.15);
        }

        .stat-number {
          font-size: 2rem;
          font-weight: 700;
          color: var(--color-primary, #3498db);
          margin-bottom: 0.5rem;
        }

        .stat-label {
          color: var(--color-textSecondary, #7f8c8d);
          font-weight: 500;
        }

        .memory-card-sets h4 {
          margin-bottom: 1rem;
          color: var(--color-text, #2c3e50);
        }

        .sets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
        }

        .set-card {
          background: var(--color-surface, #ffffff);
          border: 2px solid var(--color-border, #e9ecef);
          border-radius: var(--radius-md, 8px);
          padding: 1.5rem;
          transition: all 0.3s ease;
        }

        .set-card:hover {
          border-color: var(--color-primary, #3498db);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(52, 152, 219, 0.15);
        }

        .set-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.5rem;
        }

        .set-header h5 {
          margin: 0;
          color: var(--color-text, #2c3e50);
          font-size: 1.1rem;
        }

        .set-card-count {
          background: var(--color-primary, #3498db);
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm, 4px);
          font-size: 0.8rem;
          font-weight: 500;
        }

        .set-description {
          color: var(--color-textSecondary, #7f8c8d);
          margin: 0.5rem 0;
          font-size: 0.9rem;
          line-height: 1.4;
        }

        .set-meta {
          display: flex;
          gap: 0.5rem;
          margin: 1rem 0;
          flex-wrap: wrap;
        }

        .set-subject,
        .set-grade {
          background: var(--color-surfaceHover, #f8f9fa);
          color: var(--color-text, #2c3e50);
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-sm, 4px);
          font-size: 0.8rem;
          border: 1px solid var(--color-border, #e9ecef);
        }

        .set-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: var(--color-textSecondary, #7f8c8d);
        }

        .empty-state-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .empty-state h4 {
          color: var(--color-text, #2c3e50);
          margin-bottom: 0.5rem;
        }

        .empty-state p {
          margin-bottom: 2rem;
        }

        .loading-container {
          text-align: center;
          padding: 2rem;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid var(--color-border, #e9ecef);
          border-top: 4px solid var(--color-primary, #3498db);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem auto;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          backdrop-filter: blur(4px);
        }

        .modal-content {
          background: var(--color-background, #f8f9fa);
          border-radius: var(--radius-lg, 12px);
          max-width: 95vw;
          max-height: 95vh;
          width: 100%;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: modalSlideIn 0.3s ease-out;
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        /* Enhanced Quick Actions Styles */
        .enhanced-quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .enhanced-quick-action-card {
          background: var(--color-surface, #ffffff);
          border: 2px solid var(--color-border, #e9ecef);
          border-radius: var(--radius-lg, 12px);
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: 'Heebo', sans-serif;
          text-align: right;
          position: relative;
          overflow: hidden;
        }

        .enhanced-quick-action-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(52, 152, 219, 0.2);
        }

        .enhanced-quick-action-card.create-test {
          border-color: #e74c3c;
        }

        .enhanced-quick-action-card.create-test:hover {
          border-color: #c0392b;
          box-shadow: 0 8px 25px rgba(231, 76, 60, 0.2);
        }

        .enhanced-quick-action-card.create-summary {
          border-color: #f39c12;
        }

        .enhanced-quick-action-card.create-summary:hover {
          border-color: #e67e22;
          box-shadow: 0 8px 25px rgba(243, 156, 18, 0.2);
        }

        .enhanced-quick-action-card.upload-lesson {
          border-color: #27ae60;
        }

        .enhanced-quick-action-card.upload-lesson:hover {
          border-color: #229954;
          box-shadow: 0 8px 25px rgba(39, 174, 96, 0.2);
        }

        .enhanced-action-icon {
          font-size: 2.5rem;
          flex-shrink: 0;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-md, 8px);
          background: var(--color-surfaceElevated, #f8f9fa);
          transition: all 0.3s ease;
        }

        .create-test .enhanced-action-icon {
          background: linear-gradient(135deg, #e74c3c, #c0392b);
          color: white;
        }

        .create-summary .enhanced-action-icon {
          background: linear-gradient(135deg, #f39c12, #e67e22);
          color: white;
        }

        .upload-lesson .enhanced-action-icon {
          background: linear-gradient(135deg, #27ae60, #229954);
          color: white;
        }

        .enhanced-action-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .enhanced-action-title {
          font-size: 1.3rem;
          font-weight: 700;
          color: var(--color-text, #2c3e50);
          margin: 0;
        }

        .enhanced-action-desc {
          font-size: 0.95rem;
          color: var(--color-textSecondary, #7f8c8d);
          line-height: 1.4;
          margin: 0;
        }

        .enhanced-action-arrow {
          font-size: 1.5rem;
          color: var(--color-textSecondary, #7f8c8d);
          flex-shrink: 0;
          transition: all 0.3s ease;
        }

        .enhanced-quick-action-card:hover .enhanced-action-arrow {
          transform: translateX(-5px);
          color: var(--color-primary, #3498db);
        }

        /* Enhanced Recent Activity Styles */
        .enhanced-recent-activity-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          background: var(--color-surface, #ffffff);
          border-radius: var(--radius-lg, 12px);
          padding: 1.5rem;
          border: 2px solid var(--color-border, #e9ecef);
        }

        .enhanced-activity-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-radius: var(--radius-md, 8px);
          cursor: pointer;
          transition: all 0.3s ease;
          border: 1px solid transparent;
        }

        .enhanced-activity-item:hover {
          background: var(--color-surfaceHover, #f8f9fa);
          border-color: var(--color-primary, #3498db);
          transform: translateX(-5px);
        }

        .enhanced-activity-icon {
          font-size: 1.8rem;
          flex-shrink: 0;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-md, 8px);
          background: var(--color-surfaceElevated, #f8f9fa);
          border: 1px solid var(--color-border, #e9ecef);
        }

        .enhanced-activity-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .enhanced-activity-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
        }

        .enhanced-activity-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text, #2c3e50);
          margin: 0;
          line-height: 1.3;
        }

        .enhanced-activity-badge {
          padding: 0.2rem 0.6rem;
          border-radius: var(--radius-sm, 4px);
          font-size: 0.75rem;
          font-weight: 500;
          white-space: nowrap;
        }

        .enhanced-activity-badge.lesson-badge {
          background: var(--color-info, #17a2b8);
          color: white;
        }

        .enhanced-activity-badge.manual-badge {
          background: var(--color-warning, #ffc107);
          color: var(--color-text, #2c3e50);
        }

        .enhanced-activity-subtitle {
          font-size: 0.9rem;
          color: var(--color-textSecondary, #7f8c8d);
          margin: 0;
          line-height: 1.3;
        }

        .enhanced-activity-meta {
          display: flex;
          gap: 1rem;
          align-items: center;
          margin-top: 0.25rem;
        }

        .enhanced-activity-date {
          font-size: 0.8rem;
          color: var(--color-textTertiary, #95a5a6);
          font-weight: 500;
        }

        .enhanced-activity-type {
          font-size: 0.8rem;
          color: var(--color-primary, #3498db);
          font-weight: 600;
          background: var(--color-primaryLight, #ebf3fd);
          padding: 0.2rem 0.5rem;
          border-radius: var(--radius-sm, 4px);
        }

        .enhanced-activity-arrow {
          font-size: 1.2rem;
          color: var(--color-textSecondary, #7f8c8d);
          flex-shrink: 0;
          transition: all 0.3s ease;
        }

        .enhanced-activity-item:hover .enhanced-activity-arrow {
          transform: translateX(-3px);
          color: var(--color-primary, #3498db);
        }

        /* Secondary Quick Actions */
        .secondary-quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .secondary-quick-action-card {
          background: var(--color-surface, #ffffff);
          border: 2px solid var(--color-border, #e9ecef);
          border-radius: var(--radius-md, 8px);
          padding: 1.5rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: 'Heebo', sans-serif;
        }

        .secondary-quick-action-card:hover {
          border-color: var(--color-primary, #3498db);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(52, 152, 219, 0.15);
        }

        .secondary-action-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .secondary-action-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text, #2c3e50);
          margin-bottom: 0.5rem;
        }

        .secondary-action-desc {
          font-size: 0.85rem;
          color: var(--color-textSecondary, #7f8c8d);
        }

        @media (max-width: 768px) {
          .main-nav-tabs-header {
            flex-wrap: wrap;
          }

          .main-nav-tab {
            flex: 1;
            min-width: 120px;
          }

          .flashcards-header {
            flex-direction: column;
            align-items: stretch;
          }

          .stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          }

          .sets-grid {
            grid-template-columns: 1fr;
          }

          .set-header {
            flex-direction: column;
            gap: 0.5rem;
          }

          .set-actions {
            flex-direction: column;
          }

          .compact-stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          }

          .quick-actions-grid {
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          }

          .enhanced-quick-actions-grid {
            grid-template-columns: 1fr;
          }

          .enhanced-quick-action-card {
            flex-direction: column;
            text-align: center;
            gap: 1rem;
          }

          .enhanced-action-content {
            text-align: center;
          }

          .enhanced-activity-item {
            flex-direction: column;
            text-align: center;
            gap: 0.75rem;
          }

          .enhanced-activity-header {
            flex-direction: column;
            gap: 0.5rem;
          }

          .enhanced-activity-meta {
            justify-content: center;
          }

          .secondary-quick-actions-grid {
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          }
        }
      `}</style>
    </>
  );
};

export default TeacherDashboard;
