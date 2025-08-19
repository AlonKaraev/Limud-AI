import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import FileStorageService from '../services/FileStorageService';
import AudioPlayer from './AudioPlayer';

// Styled components for session manager
const SessionContainer = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
  direction: rtl;
`;

const SessionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #ecf0f1;
`;

const SessionTitle = styled.h2`
  color: #2c3e50;
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
`;

const SessionControls = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const Button = styled.button`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-family: 'Heebo', sans-serif;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &.primary {
    background-color: #3498db;
    color: white;
    
    &:hover:not(:disabled) {
      background-color: #2980b9;
    }
  }
  
  &.secondary {
    background-color: #95a5a6;
    color: white;
    
    &:hover:not(:disabled) {
      background-color: #7f8c8d;
    }
  }
  
  &.danger {
    background-color: #e74c3c;
    color: white;
    
    &:hover:not(:disabled) {
      background-color: #c0392b;
    }
  }
`;

const SearchAndFilter = styled.div`
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 1rem;
  margin-bottom: 2rem;
  align-items: center;
`;

const SearchInput = styled.input`
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-family: 'Heebo', sans-serif;
  direction: rtl;
  
  &:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-family: 'Heebo', sans-serif;
  background: white;
  direction: rtl;
  
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const SessionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const SessionItem = styled.div`
  border: 1px solid #ecf0f1;
  border-radius: 8px;
  padding: 1.5rem;
  background: #f8f9fa;
  transition: all 0.2s;
  
  &:hover {
    border-color: #3498db;
    box-shadow: 0 2px 8px rgba(52, 152, 219, 0.1);
  }
`;

const SessionItemHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const SessionInfo = styled.div`
  flex: 1;
`;

const SessionName = styled.h3`
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
  font-size: 1.1rem;
  font-weight: 600;
`;

const SessionMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.9rem;
  color: #7f8c8d;
`;

const SessionActions = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
`;

const SmallButton = styled.button`
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 4px;
  font-family: 'Heebo', sans-serif;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &.play {
    background-color: #27ae60;
    color: white;
    
    &:hover {
      background-color: #229954;
    }
  }
  
  &.download {
    background-color: #3498db;
    color: white;
    
    &:hover {
      background-color: #2980b9;
    }
  }
  
  &.delete {
    background-color: #e74c3c;
    color: white;
    
    &:hover {
      background-color: #c0392b;
    }
  }
`;

const StatusBadge = styled.span`
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 500;
  
  &.completed {
    background-color: #d5f4e6;
    color: #27ae60;
  }
  
  &.processing {
    background-color: #fef5e7;
    color: #f39c12;
  }
  
  &.failed {
    background-color: #fadbd8;
    color: #e74c3c;
  }
`;

const StatsSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 600;
  color: #2c3e50;
`;

const StatLabel = styled.div`
  font-size: 0.8rem;
  color: #7f8c8d;
  margin-top: 0.25rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #7f8c8d;
`;

const SessionManager = ({ t }) => {
  const [fileStorageService] = useState(() => new FileStorageService());
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('dateCreated');
  const [filterBy, setFilterBy] = useState('all');
  const [selectedSessions, setSelectedSessions] = useState(new Set());
  const [playingSession, setPlayingSession] = useState(null);
  const [stats, setStats] = useState({
    local: { count: 0, size: 0 },
    server: { count: 0, size: 0 },
    total: { count: 0, size: 0 }
  });

  // Load sessions on component mount
  useEffect(() => {
    loadSessions();
    loadStats();
  }, []);

  // Filter and sort sessions when dependencies change
  useEffect(() => {
    let filtered = [...sessions];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(session =>
        session.metadata?.lessonName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.metadata?.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.filename.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(session => {
        const status = getSessionStatus(session);
        return status === filterBy;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'dateCreated':
          return new Date(b.metadata.createdAt) - new Date(a.metadata.createdAt);
        case 'lastModified':
          return new Date(b.metadata.lastModified || b.metadata.createdAt) - 
                 new Date(a.metadata.lastModified || a.metadata.createdAt);
        case 'duration':
          return (b.metadata.duration || 0) - (a.metadata.duration || 0);
        case 'fileSize':
          return (b.metadata.fileSize || 0) - (a.metadata.fileSize || 0);
        case 'name':
          return (a.metadata?.lessonName || a.filename).localeCompare(
            b.metadata?.lessonName || b.filename
          );
        default:
          return 0;
      }
    });

    setFilteredSessions(filtered);
  }, [sessions, searchTerm, sortBy, filterBy]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const localSessions = await fileStorageService.getLocalRecordings();
      setSessions(localSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const storageStats = await fileStorageService.getStorageStats();
      setStats(storageStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const getSessionStatus = (session) => {
    // Simple status determination - in a real app this would be more sophisticated
    if (session.metadata?.qualityReport) {
      return 'completed';
    }
    return 'processing';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms) => {
    if (!ms) return '0:00';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL') + ' ' + date.toLocaleTimeString('he-IL', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handlePlaySession = async (session) => {
    try {
      console.log('Attempting to play session:', session.id);
      console.log('Session metadata:', session.metadata);
      
      const fullSession = await fileStorageService.getRecording(session.id);
      console.log('Retrieved full session:', fullSession);
      
      if (fullSession && fullSession.blob) {
        console.log('Audio blob found:', {
          size: fullSession.blob.size,
          type: fullSession.blob.type
        });
        setPlayingSession(fullSession);
      } else {
        console.error('No audio blob found in session');
        alert('לא נמצא קובץ אודיו להקלטה זו. ייתכן שהקובץ נמחק או פגום.');
      }
    } catch (error) {
      console.error('Error loading session for playback:', error);
      alert('שגיאה בטעינת ההקלטה לנגינה: ' + error.message);
    }
  };

  const handleDownloadSession = async (session) => {
    try {
      const fullSession = await fileStorageService.getRecording(session.id);
      if (fullSession && fullSession.blob) {
        const url = URL.createObjectURL(fullSession.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fullSession.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading session:', error);
    }
  };

  const handleDeleteSession = async (session) => {
    if (window.confirm(t('messages.confirmDelete'))) {
      try {
        await fileStorageService.deleteLocalRecording(session.id);
        await loadSessions();
        await loadStats();
        
        // Close player if this session was playing
        if (playingSession && playingSession.id === session.id) {
          setPlayingSession(null);
        }
      } catch (error) {
        console.error('Error deleting session:', error);
      }
    }
  };

  const handleSessionSelect = (sessionId, selected) => {
    const newSelected = new Set(selectedSessions);
    if (selected) {
      newSelected.add(sessionId);
    } else {
      newSelected.delete(sessionId);
    }
    setSelectedSessions(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedSessions.size === filteredSessions.length) {
      setSelectedSessions(new Set());
    } else {
      setSelectedSessions(new Set(filteredSessions.map(s => s.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedSessions.size === 0) return;
    
    if (window.confirm(`${t('messages.confirmDelete')} ${selectedSessions.size} ${t('sessions.sessions')}?`)) {
      try {
        for (const sessionId of selectedSessions) {
          await fileStorageService.deleteLocalRecording(sessionId);
        }
        setSelectedSessions(new Set());
        await loadSessions();
        await loadStats();
      } catch (error) {
        console.error('Error batch deleting sessions:', error);
      }
    }
  };

  if (loading) {
    return (
      <SessionContainer>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          {t('forms.loading')}
        </div>
      </SessionContainer>
    );
  }

  return (
    <>
      <SessionContainer>
        <SessionHeader>
          <SessionTitle>{t('sessions.title')}</SessionTitle>
          <SessionControls>
            <Button className="secondary" onClick={loadSessions}>
              🔄 {t('forms.refresh')}
            </Button>
          </SessionControls>
        </SessionHeader>

        <StatsSection>
          <StatItem>
            <StatValue>{stats.total.count}</StatValue>
            <StatLabel>{t('sessions.totalRecordings')}</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{formatFileSize(stats.total.size)}</StatValue>
            <StatLabel>{t('sessions.totalSize')}</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{stats.local.count}</StatValue>
            <StatLabel>{t('sessions.localRecordings')}</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{stats.server.count}</StatValue>
            <StatLabel>{t('sessions.serverRecordings')}</StatLabel>
          </StatItem>
        </StatsSection>

        <SearchAndFilter>
          <SearchInput
            type="text"
            placeholder={t('sessions.searchSessions')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="dateCreated">{t('sessions.dateCreated')}</option>
            <option value="lastModified">{t('sessions.lastModified')}</option>
            <option value="duration">{t('sessions.duration')}</option>
            <option value="fileSize">{t('sessions.fileSize')}</option>
            <option value="name">{t('sessions.sessionName')}</option>
          </Select>
          
          <Select value={filterBy} onChange={(e) => setFilterBy(e.target.value)}>
            <option value="all">{t('sessions.allSessions')}</option>
            <option value="completed">{t('sessions.completed')}</option>
            <option value="processing">{t('sessions.processing')}</option>
            <option value="failed">{t('sessions.failed')}</option>
          </Select>
        </SearchAndFilter>

        {selectedSessions.size > 0 && (
          <div style={{ marginBottom: '1rem', padding: '1rem', background: '#e8f4f8', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{selectedSessions.size} {t('sessions.selected')}</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button className="danger" onClick={handleBatchDelete}>
                  {t('sessions.deleteSelected')}
                </Button>
                <Button className="secondary" onClick={() => setSelectedSessions(new Set())}>
                  {t('sessions.deselectAll')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {filteredSessions.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
              <input
                type="checkbox"
                checked={selectedSessions.size === filteredSessions.length && filteredSessions.length > 0}
                onChange={handleSelectAll}
              />
              {t('sessions.selectAll')}
            </label>
          </div>
        )}

        <SessionsList>
          {filteredSessions.length === 0 ? (
            <EmptyState>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎙️</div>
              <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                {searchTerm ? t('sessions.noSearchResults') : t('sessions.noRecordings')}
              </div>
              <div style={{ fontSize: '0.9rem' }}>
                {searchTerm ? t('sessions.tryDifferentSearch') : t('sessions.startRecording')}
              </div>
            </EmptyState>
          ) : (
            filteredSessions.map(session => (
              <SessionItem key={session.id}>
                <SessionItemHeader>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <input
                      type="checkbox"
                      checked={selectedSessions.has(session.id)}
                      onChange={(e) => handleSessionSelect(session.id, e.target.checked)}
                      style={{ marginTop: '0.25rem' }}
                    />
                    <SessionInfo>
                      <SessionName>
                        {session.metadata?.lessonName || session.filename}
                      </SessionName>
                      <SessionMeta>
                        <span>{formatDate(session.metadata.createdAt)}</span>
                        <span>{formatDuration(session.metadata.duration)}</span>
                        <span>{formatFileSize(session.metadata.fileSize)}</span>
                        {session.metadata?.subject && <span>{session.metadata.subject}</span>}
                        {session.metadata?.classLevel && <span>{session.metadata.classLevel}</span>}
                        <StatusBadge className={getSessionStatus(session)}>
                          {t(`sessions.${getSessionStatus(session)}`)}
                        </StatusBadge>
                      </SessionMeta>
                    </SessionInfo>
                  </div>
                  
                  <SessionActions>
                    <SmallButton 
                      className="play" 
                      onClick={() => handlePlaySession(session)}
                    >
                      {t('playback.play')}
                    </SmallButton>
                    <SmallButton 
                      className="download" 
                      onClick={() => handleDownloadSession(session)}
                    >
                      {t('sessions.download')}
                    </SmallButton>
                    <SmallButton 
                      className="delete" 
                      onClick={() => handleDeleteSession(session)}
                    >
                      {t('sessions.delete')}
                    </SmallButton>
                  </SessionActions>
                </SessionItemHeader>
              </SessionItem>
            ))
          )}
        </SessionsList>
      </SessionContainer>

      {playingSession && (
        <AudioPlayer
          audioBlob={playingSession.blob}
          title={playingSession.metadata?.lessonName || playingSession.filename}
          metadata={playingSession.metadata}
          t={t}
          onClose={() => setPlayingSession(null)}
        />
      )}
    </>
  );
};

export default SessionManager;
