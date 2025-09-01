import React, { useState, useEffect } from 'react';
import MemoryCardManager from './MemoryCardManager';
import MemoryCardSetViewer from './MemoryCardSetViewer';
import MemoryCardSetEditor from './MemoryCardSetEditor';
import RecordingInterface from './RecordingInterface';
import SessionManager from './SessionManager';
import LessonsManager from './LessonsManager';

const TeacherDashboard = ({ user, t, onLogout, fileStorageService, isProcessingRecording, setIsProcessingRecording }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showMemoryCardForm, setShowMemoryCardForm] = useState(false);
  const [viewingSet, setViewingSet] = useState(null);
  const [editingSet, setEditingSet] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard'); // 'dashboard', 'viewer', 'editor'
  const [memoryCardSets, setMemoryCardSets] = useState([]);
  const [loadingMemoryCards, setLoadingMemoryCards] = useState(false);
  const [memoryCardStats, setMemoryCardStats] = useState({
    totalSets: 0,
    totalCards: 0,
    recentCards: []
  });
  const [successMessage, setSuccessMessage] = useState('');

  // Load memory card data when component mounts or when memory cards tab is active
  useEffect(() => {
    if (activeTab === 'memory-cards') {
      loadMemoryCardData();
    }
  }, [activeTab]);

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
      setActiveTab('lessons');
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

  // Memory Cards Overview Component
  const MemoryCardsOverview = () => (
    <div className="memory-cards-overview">
      <div className="memory-cards-header">
        <div className="memory-cards-title">
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
        
        <div className="nav-tabs">
          <div className="nav-tabs-header">
            <button
              className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              סקירה כללית
            </button>
            <button
              className={`nav-tab ${activeTab === 'lessons' ? 'active' : ''}`}
              onClick={() => setActiveTab('lessons')}
            >
              שיעורים
            </button>
            <button
              className={`nav-tab ${activeTab === 'memory-cards' ? 'active' : ''}`}
              onClick={() => setActiveTab('memory-cards')}
            >
              כרטיסי זיכרון
            </button>
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="d-flex gap-2" style={{ flexWrap: 'wrap' }}>
            <div className="card" style={{ flex: '1', minWidth: '200px', marginBottom: '1rem' }}>
              <h3 className="card-title">
                {t('dashboard.recentActivity')}
              </h3>
              <p className="card-subtitle">
                {t('forms.noData')}
              </p>
            </div>
            <div className="card" style={{ flex: '1', minWidth: '200px', marginBottom: '1rem' }}>
              <h3 className="card-title">
                {t('dashboard.quickActions')}
              </h3>
              <div className="quick-actions">
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={() => setActiveTab('memory-cards')}
                >
                  🎴 כרטיסי זיכרון
                </button>
                <button 
                  className="btn btn-outline btn-sm"
                  onClick={() => setActiveTab('lessons')}
                >
                  📚 שיעורים
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'memory-cards' && (
          showMemoryCardForm ? (
            <MemoryCardManager 
              userId={user.id}
              onCardCreated={handleMemoryCardCreated}
              onCancel={handleCancelCardCreation}
            />
          ) : (
            <MemoryCardsOverview />
          )
        )}
      </div>

      {activeTab === 'record' && (
        <RecordingInterface t={t} onRecordingComplete={handleRecordingComplete} />
      )}

      {activeTab === 'sessions' && (
        <SessionManager t={t} />
      )}

      {activeTab === 'lessons' && (
        <LessonsManager t={t} />
      )}

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

        .memory-cards-overview {
          padding: 1.5rem;
        }

        .memory-cards-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .memory-cards-title h3 {
          margin: 0 0 0.5rem 0;
          color: var(--color-primary, #3498db);
          font-size: 1.5rem;
        }

        .memory-cards-title p {
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

        .quick-actions {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
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

        @media (max-width: 768px) {
          .memory-cards-header {
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
        }
      `}</style>
    </>
  );
};

export default TeacherDashboard;
