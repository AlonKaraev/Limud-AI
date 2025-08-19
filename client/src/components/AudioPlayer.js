import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

// Styled components for audio player
const PlayerContainer = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  margin-bottom: 1rem;
  direction: rtl;
`;

const PlayerHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #ecf0f1;
`;

const TrackTitle = styled.h3`
  margin: 0;
  color: #2c3e50;
  font-size: 1.1rem;
  font-weight: 600;
`;

const TrackInfo = styled.div`
  font-size: 0.9rem;
  color: #7f8c8d;
`;

const ControlsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const MainControls = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
`;

const ControlButton = styled.button`
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 50%;
  background: ${props => props.primary ? '#3498db' : '#ecf0f1'};
  color: ${props => props.primary ? 'white' : '#2c3e50'};
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  
  &:hover:not(:disabled) {
    background: ${props => props.primary ? '#2980b9' : '#d5dbdb'};
    transform: scale(1.05);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  
  &.large {
    width: 56px;
    height: 56px;
    font-size: 1.4rem;
  }
`;

const ProgressSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: #ecf0f1;
  border-radius: 3px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: #3498db;
  border-radius: 3px;
  width: ${props => props.progress}%;
  transition: width 0.1s ease;
`;

const ProgressHandle = styled.div`
  position: absolute;
  top: 50%;
  right: ${props => props.progress}%;
  transform: translate(50%, -50%);
  width: 16px;
  height: 16px;
  background: #3498db;
  border: 2px solid white;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  opacity: ${props => props.visible ? 1 : 0};
  transition: opacity 0.2s;
`;

const TimeDisplay = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  color: #7f8c8d;
`;

const AdvancedControls = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
`;

const ControlGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ControlLabel = styled.label`
  font-size: 0.8rem;
  color: #7f8c8d;
  font-weight: 500;
`;

const Slider = styled.input`
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: #ecf0f1;
  outline: none;
  -webkit-appearance: none;
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #3498db;
    cursor: pointer;
  }
  
  &::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #3498db;
    cursor: pointer;
    border: none;
  }
`;

const Select = styled.select`
  padding: 0.25rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: 'Heebo', sans-serif;
  font-size: 0.8rem;
  background: white;
  direction: rtl;
`;

const BookmarksList = styled.div`
  max-height: 150px;
  overflow-y: auto;
  border: 1px solid #ecf0f1;
  border-radius: 4px;
  background: white;
`;

const BookmarkItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  border-bottom: 1px solid #ecf0f1;
  cursor: pointer;
  
  &:hover {
    background: #f8f9fa;
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const BookmarkTime = styled.span`
  font-size: 0.8rem;
  color: #7f8c8d;
`;

const BookmarkText = styled.span`
  font-size: 0.9rem;
  color: #2c3e50;
  flex: 1;
  margin: 0 0.5rem;
`;

const SmallButton = styled.button`
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 4px;
  background: #e74c3c;
  color: white;
  font-size: 0.7rem;
  cursor: pointer;
  
  &:hover {
    background: #c0392b;
  }
`;

const VolumeControl = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const AudioPlayer = ({ 
  audioBlob, 
  title, 
  metadata = {}, 
  t, 
  onBookmarkAdd,
  onBookmarkRemove,
  onClose 
}) => {
  const audioRef = useRef(null);
  const progressBarRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [skipSilence, setSkipSilence] = useState(false);
  const [loopMode, setLoopMode] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);

  // Initialize audio
  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [audioBlob]);

  // Initialize duration from metadata immediately
  useEffect(() => {
    console.log('AudioPlayer metadata changed:', metadata);
    
    let initialDuration = 0;
    
    if (metadata?.duration && metadata.duration > 0) {
      // Use duration from recording metadata (in milliseconds, convert to seconds)
      initialDuration = metadata.duration / 1000;
      console.log('Setting initial duration from metadata.duration:', initialDuration);
    } else if (metadata?.qualityReport?.duration && metadata.qualityReport.duration > 0) {
      // Use duration from quality report (in milliseconds, convert to seconds)
      initialDuration = metadata.qualityReport.duration / 1000;
      console.log('Setting initial duration from qualityReport.duration:', initialDuration);
    }
    
    if (initialDuration > 0) {
      setDuration(initialDuration);
      setIsLoading(false);
    }
  }, [metadata]);

  // Setup audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    console.log('Setting up audio event listeners...');

    const handleLoadedMetadata = () => {
      console.log('Audio metadata loaded:', {
        duration: audio.duration,
        readyState: audio.readyState,
        isFinite: isFinite(audio.duration),
        isNaN: isNaN(audio.duration),
        metadataDuration: metadata?.duration,
        currentDurationState: duration
      });
      
      // Only update duration if we don't already have one from metadata
      if (duration === 0) {
        let audioDuration = 0;
        
        if (metadata?.duration && metadata.duration > 0) {
          // Use duration from recording metadata (in milliseconds, convert to seconds)
          audioDuration = metadata.duration / 1000;
          console.log('LoadedMetadata: Using metadata duration:', audioDuration);
        } else if (metadata?.qualityReport?.duration && metadata.qualityReport.duration > 0) {
          // Use duration from quality report (in milliseconds, convert to seconds)
          audioDuration = metadata.qualityReport.duration / 1000;
          console.log('LoadedMetadata: Using quality report duration:', audioDuration);
        } else if (isFinite(audio.duration) && !isNaN(audio.duration) && audio.duration > 0) {
          // Use duration from audio element
          audioDuration = audio.duration;
          console.log('LoadedMetadata: Using audio element duration:', audioDuration);
        } else {
          console.warn('LoadedMetadata: No valid duration found, keeping current:', duration);
        }
        
        if (audioDuration > 0) {
          setDuration(audioDuration);
        }
      } else {
        console.log('LoadedMetadata: Duration already set from metadata:', duration);
      }
      
      setIsLoading(false);
    };

    const handleCanPlay = () => {
      console.log('Audio can play, current duration state:', duration);
      
      // If we still don't have a duration, try to get it again
      if (duration === 0) {
        let audioDuration = 0;
        
        if (metadata?.duration && metadata.duration > 0) {
          audioDuration = metadata.duration / 1000;
          console.log('CanPlay: Using metadata duration:', audioDuration);
        } else if (metadata?.qualityReport?.duration && metadata.qualityReport.duration > 0) {
          audioDuration = metadata.qualityReport.duration / 1000;
          console.log('CanPlay: Using quality report duration:', audioDuration);
        } else if (isFinite(audio.duration) && !isNaN(audio.duration) && audio.duration > 0) {
          audioDuration = audio.duration;
          console.log('CanPlay: Using audio element duration:', audioDuration);
        }
        
        if (audioDuration > 0) {
          setDuration(audioDuration);
        }
      } else {
        console.log('CanPlay: Duration already set:', duration);
      }
      
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      console.log('Time update:', {
        currentTime: audio.currentTime,
        duration: audio.duration,
        isFinite: isFinite(audio.currentTime),
        isNaN: isNaN(audio.currentTime)
      });
      
      // Ensure currentTime is valid before setting
      if (isFinite(audio.currentTime) && !isNaN(audio.currentTime) && audio.currentTime >= 0) {
        setCurrentTime(audio.currentTime);
      }
      
      // Skip silence detection (basic implementation)
      if (skipSilence && audio.currentTime > 0) {
        // This would need more sophisticated silence detection
        // For now, just a placeholder
      }
    };

    const handleEnded = () => {
      if (loopMode) {
        audio.currentTime = 0;
        audio.play();
      } else {
        setIsPlaying(false);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => {
      setVolume(audio.volume);
      setIsMuted(audio.muted);
    };

    const handleError = (e) => {
      console.error('Audio error:', e);
      setIsLoading(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('volumechange', handleVolumeChange);
    audio.addEventListener('error', handleError);

    // Fallback: Force enable button after 3 seconds if still loading
    const fallbackTimeout = setTimeout(() => {
      if (isLoading) {
        console.log('Fallback: Forcing button to be enabled after timeout');
        setIsLoading(false);
      }
    }, 3000);

    return () => {
      clearTimeout(fallbackTimeout);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('volumechange', handleVolumeChange);
      audio.removeEventListener('error', handleError);
    };
  }, [skipSilence, loopMode, isLoading, duration, metadata]);

  const togglePlay = async () => {
    console.log('togglePlay called!', { isLoading, isPlaying });
    
    const audio = audioRef.current;
    if (!audio) {
      console.error('Audio element not found');
      return;
    }

    if (isPlaying) {
      try {
        console.log('Pausing audio...');
        audio.pause();
      } catch (error) {
        console.error('Error pausing audio:', error);
      }
    } else {
      try {
        console.log('Attempting to play audio...', {
          src: audio.src,
          readyState: audio.readyState,
          duration: audio.duration,
          currentTime: audio.currentTime,
          isLoading
        });

        // Check if audio source is valid
        if (!audio.src || audio.src === '') {
          console.error('No audio source available');
          alert('אין מקור אודיו זמין');
          return;
        }

        // Force set loading to false if audio is ready
        if (audio.readyState >= 2 && isLoading) {
          console.log('Audio is ready but isLoading is true, fixing...');
          setIsLoading(false);
        }

        // Wait for audio to be ready if needed
        if (audio.readyState < 2) {
          console.log('Audio not ready, waiting for canplay event...');
          setIsLoading(true);
          
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              audio.removeEventListener('canplay', onCanPlay);
              audio.removeEventListener('error', onError);
              reject(new Error('Timeout waiting for audio to load'));
            }, 10000); // 10 second timeout

            const onCanPlay = () => {
              clearTimeout(timeout);
              audio.removeEventListener('canplay', onCanPlay);
              audio.removeEventListener('error', onError);
              console.log('Audio is ready to play');
              setIsLoading(false);
              resolve();
            };
            
            const onError = (e) => {
              clearTimeout(timeout);
              audio.removeEventListener('canplay', onCanPlay);
              audio.removeEventListener('error', onError);
              console.error('Audio loading error:', e);
              setIsLoading(false);
              reject(e);
            };
            
            audio.addEventListener('canplay', onCanPlay);
            audio.addEventListener('error', onError);
            
            // Force reload if needed
            if (audio.networkState === 3) { // NETWORK_NO_SOURCE
              console.log('Reloading audio...');
              audio.load();
            }
          });
        }
        
        console.log('Starting playback...');
        await audio.play();
        console.log('Playback started successfully');
        
      } catch (error) {
        console.error('Error playing audio:', error);
        
        // Provide user-friendly error messages
        if (error.name === 'NotAllowedError') {
          console.error('Autoplay blocked by browser. User interaction required.');
          alert('לא ניתן להפעיל את השמע אוטומטית. אנא לחץ על כפתור הנגינה שוב.');
        } else if (error.name === 'NotSupportedError') {
          console.error('Audio format not supported');
          alert('פורמט השמע אינו נתמך בדפדפן זה.');
        } else if (error.name === 'AbortError') {
          console.error('Audio playback aborted');
        } else {
          console.error('Unknown playback error:', error);
          alert('שגיאה בהפעלת השמע: ' + error.message);
        }
      }
    }
  };

  const handleProgressClick = (e) => {
    const audio = audioRef.current;
    const progressBar = progressBarRef.current;
    if (!audio || !progressBar || isDragging) return;

    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleProgressMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    
    const audio = audioRef.current;
    const progressBar = progressBarRef.current;
    if (!audio || !progressBar) return;

    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * duration;
    
    setDragTime(newTime);
    
    const handleMouseMove = (moveEvent) => {
      const moveRect = progressBar.getBoundingClientRect();
      const moveX = moveEvent.clientX - moveRect.left;
      const movePercentage = Math.max(0, Math.min(1, moveX / moveRect.width));
      const moveTime = movePercentage * duration;
      
      setDragTime(moveTime);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      audio.currentTime = dragTime;
      setCurrentTime(dragTime);
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleHandleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    
    const audio = audioRef.current;
    const progressBar = progressBarRef.current;
    if (!audio || !progressBar) return;

    const handleMouseMove = (moveEvent) => {
      const rect = progressBar.getBoundingClientRect();
      const moveX = moveEvent.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, moveX / rect.width));
      const moveTime = percentage * duration;
      
      setDragTime(moveTime);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      audio.currentTime = dragTime;
      setCurrentTime(dragTime);
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleVolumeChange = (newVolume) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = newVolume;
    setVolume(newVolume);
    
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handlePlaybackRateChange = (rate) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const skipBackward = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = Math.max(0, audio.currentTime - 10);
  };

  const skipForward = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = Math.min(duration, audio.currentTime + 10);
  };

  const addBookmark = () => {
    const newBookmark = {
      id: Date.now(),
      time: currentTime,
      text: `סימנייה ${formatTime(currentTime)}`
    };
    
    const updatedBookmarks = [...bookmarks, newBookmark].sort((a, b) => a.time - b.time);
    setBookmarks(updatedBookmarks);
    
    if (onBookmarkAdd) {
      onBookmarkAdd(newBookmark);
    }
  };

  const removeBookmark = (bookmarkId) => {
    const updatedBookmarks = bookmarks.filter(b => b.id !== bookmarkId);
    setBookmarks(updatedBookmarks);
    
    if (onBookmarkRemove) {
      onBookmarkRemove(bookmarkId);
    }
  };

  const jumpToBookmark = (time) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (seconds) => {
    // Handle invalid or undefined values
    if (isNaN(seconds) || seconds === null || seconds === undefined || seconds < 0) {
      return '0:00';
    }
    
    // Handle infinity
    if (!isFinite(seconds)) {
      return '0:00';
    }
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    if (isDragging) {
      return duration > 0 ? (dragTime / duration) * 100 : 0;
    }
    return duration > 0 ? (currentTime / duration) * 100 : 0;
  };

  const getDisplayTime = () => {
    return isDragging ? dragTime : currentTime;
  };

  if (!audioUrl) {
    return (
      <PlayerContainer>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          {t('forms.loading')}
        </div>
      </PlayerContainer>
    );
  }

  return (
    <PlayerContainer>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
      />
      
      <PlayerHeader>
        <div>
          <TrackTitle>{title || t('playback.untitled')}</TrackTitle>
          {metadata.subject && (
            <TrackInfo>{metadata.subject} • {metadata.classLevel}</TrackInfo>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <ControlButton onClick={() => setShowAdvanced(!showAdvanced)}>
            ⚙️
          </ControlButton>
          {onClose && (
            <ControlButton onClick={onClose}>
              ✕
            </ControlButton>
          )}
        </div>
      </PlayerHeader>

      <ControlsSection>
        <MainControls>
          <ControlButton onClick={skipBackward} disabled={isLoading}>
            ⏪
          </ControlButton>
          
          <ControlButton 
            className="large" 
            primary 
            onClick={togglePlay} 
            disabled={isLoading}
          >
            {isPlaying ? '⏸️' : '▶️'}
          </ControlButton>
          
          <ControlButton onClick={skipForward} disabled={isLoading}>
            ⏩
          </ControlButton>
        </MainControls>

        <ProgressSection>
          <ProgressBar 
            ref={progressBarRef}
            onClick={handleProgressClick}
            onMouseDown={handleProgressMouseDown}
          >
            <ProgressFill progress={getProgress()} />
            <ProgressHandle 
              progress={getProgress()} 
              visible={!isLoading}
              onMouseDown={handleHandleMouseDown}
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            />
          </ProgressBar>
          
          <TimeDisplay>
            <span>{formatTime(getDisplayTime())}</span>
            <span>{formatTime(duration)}</span>
          </TimeDisplay>
        </ProgressSection>

        {showAdvanced && (
          <AdvancedControls>
            <ControlGroup>
              <ControlLabel>{t('playback.volume')}</ControlLabel>
              <VolumeControl>
                <ControlButton onClick={toggleMute}>
                  {isMuted ? '🔇' : volume > 0.5 ? '🔊' : '🔉'}
                </ControlButton>
                <Slider
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                />
              </VolumeControl>
            </ControlGroup>

            <ControlGroup>
              <ControlLabel>{t('playback.speed')}</ControlLabel>
              <Select
                value={playbackRate}
                onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
              >
                <option value={0.5}>0.5x</option>
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </Select>
            </ControlGroup>

            <ControlGroup>
              <ControlLabel>{t('playback.options')}</ControlLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                  <input
                    type="checkbox"
                    checked={skipSilence}
                    onChange={(e) => setSkipSilence(e.target.checked)}
                  />
                  {t('playback.skipSilence')}
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                  <input
                    type="checkbox"
                    checked={loopMode}
                    onChange={(e) => setLoopMode(e.target.checked)}
                  />
                  {t('playback.loopMode')}
                </label>
              </div>
            </ControlGroup>

            <ControlGroup>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <ControlLabel>{t('playback.bookmarks')}</ControlLabel>
                <SmallButton onClick={addBookmark}>
                  {t('playback.addBookmark')}
                </SmallButton>
              </div>
              
              {bookmarks.length > 0 ? (
                <BookmarksList>
                  {bookmarks.map(bookmark => (
                    <BookmarkItem key={bookmark.id}>
                      <BookmarkTime>{formatTime(bookmark.time)}</BookmarkTime>
                      <BookmarkText 
                        onClick={() => jumpToBookmark(bookmark.time)}
                      >
                        {bookmark.text}
                      </BookmarkText>
                      <SmallButton onClick={() => removeBookmark(bookmark.id)}>
                        ×
                      </SmallButton>
                    </BookmarkItem>
                  ))}
                </BookmarksList>
              ) : (
                <div style={{ fontSize: '0.8rem', color: '#7f8c8d', textAlign: 'center', padding: '1rem' }}>
                  {t('forms.noData')}
                </div>
              )}
            </ControlGroup>
          </AdvancedControls>
        )}
      </ControlsSection>
    </PlayerContainer>
  );
};

export default AudioPlayer;
