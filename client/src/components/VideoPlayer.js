import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

const VideoPlayerContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 800px;
  background: #000;
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: 0 4px 12px var(--color-shadowMedium);
`;

const VideoElement = styled.video`
  width: 100%;
  height: auto;
  display: block;
  outline: none;
`;

const VideoControls = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0,0,0,0.8));
  padding: 1rem;
  transform: ${props => props.visible ? 'translateY(0)' : 'translateY(100%)'};
  transition: transform 0.3s ease;
`;

const ControlsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
`;

const PlayButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(255,255,255,0.2);
  }

  &:focus {
    outline: 2px solid var(--color-primary);
  }
`;

const TimeDisplay = styled.div`
  color: white;
  font-size: 0.9rem;
  font-family: 'Heebo', sans-serif;
  min-width: 100px;
  text-align: center;
`;

const ProgressBarContainer = styled.div`
  flex: 1;
  height: 6px;
  background: rgba(255,255,255,0.3);
  border-radius: 3px;
  cursor: pointer;
  position: relative;
`;

const ProgressBar = styled.div`
  height: 100%;
  background: var(--color-primary);
  border-radius: 3px;
  width: ${props => props.progress}%;
  transition: width 0.1s ease;
`;

const ProgressHandle = styled.div`
  position: absolute;
  top: 50%;
  right: ${props => 100 - props.progress}%;
  transform: translate(50%, -50%);
  width: 12px;
  height: 12px;
  background: var(--color-primary);
  border-radius: 50%;
  cursor: pointer;
  opacity: ${props => props.visible ? 1 : 0};
  transition: opacity 0.2s;
`;

const VolumeContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const VolumeButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;

  &:hover {
    background-color: rgba(255,255,255,0.2);
  }
`;

const VolumeSlider = styled.input`
  width: 80px;
  height: 4px;
  background: rgba(255,255,255,0.3);
  border-radius: 2px;
  outline: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 12px;
    height: 12px;
    background: var(--color-primary);
    border-radius: 50%;
    cursor: pointer;
  }

  &::-moz-range-thumb {
    width: 12px;
    height: 12px;
    background: var(--color-primary);
    border-radius: 50%;
    cursor: pointer;
    border: none;
  }
`;

const SpeedButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-family: 'Heebo', sans-serif;
  min-width: 40px;

  &:hover {
    background-color: rgba(255,255,255,0.2);
  }
`;

const FullscreenButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;

  &:hover {
    background-color: rgba(255,255,255,0.2);
  }
`;

const VideoOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.3);
  cursor: pointer;
  opacity: ${props => props.visible ? 1 : 0};
  transition: opacity 0.3s ease;
`;

const PlayOverlayButton = styled.button`
  background: rgba(0,0,0,0.7);
  border: none;
  color: white;
  font-size: 4rem;
  cursor: pointer;
  padding: 1rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: rgba(0,0,0,0.9);
    transform: scale(1.1);
  }
`;

const VideoInfo = styled.div`
  position: absolute;
  top: 1rem;
  left: 1rem;
  right: 1rem;
  color: white;
  background: rgba(0,0,0,0.7);
  padding: 1rem;
  border-radius: var(--radius-sm);
  opacity: ${props => props.visible ? 1 : 0};
  transition: opacity 0.3s ease;
`;

const VideoTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
  font-family: 'Heebo', sans-serif;
`;

const VideoMetadata = styled.div`
  font-size: 0.9rem;
  color: rgba(255,255,255,0.8);
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
`;

const LoadingSpinner = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255,255,255,0.3);
  border-top: 3px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% { transform: translate(-50%, -50%) rotate(0deg); }
    100% { transform: translate(-50%, -50%) rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  text-align: center;
  background: rgba(220, 53, 69, 0.9);
  padding: 1rem;
  border-radius: var(--radius-sm);
  font-family: 'Heebo', sans-serif;
`;

const VideoPlayer = ({ 
  videoBlob, 
  title, 
  metadata = {}, 
  onClose,
  autoPlay = false,
  showInfo = true 
}) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showOverlay, setShowOverlay] = useState(!autoPlay);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);

  const controlsTimeoutRef = useRef(null);

  // Create video URL from blob
  useEffect(() => {
    if (videoBlob) {
      const url = URL.createObjectURL(videoBlob);
      setVideoUrl(url);
      
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [videoBlob]);

  // Auto-hide controls
  useEffect(() => {
    const resetControlsTimeout = () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      
      setShowControls(true);
      
      if (isPlaying) {
        controlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
        }, 3000);
      }
    };

    resetControlsTimeout();

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  // Video event handlers
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
    setShowOverlay(false);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleError = (e) => {
    console.error('Video error:', e);
    setError('שגיאה בטעינת הווידאו');
    setIsLoading(false);
  };

  const handleCanPlay = () => {
    setIsLoading(false);
    if (autoPlay && videoRef.current) {
      videoRef.current.play().catch(console.error);
    }
  };

  // Control functions
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(console.error);
      }
    }
  };

  const handleProgressClick = (e) => {
    if (videoRef.current && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const newTime = (clickX / rect.width) * duration;
      videoRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume;
        setIsMuted(false);
      } else {
        videoRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const changePlaybackRate = () => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextRate;
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) return '🔇';
    if (volume < 0.5) return '🔉';
    return '🔊';
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <VideoPlayerContainer 
      ref={containerRef}
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {videoUrl && (
        <VideoElement
          ref={videoRef}
          src={videoUrl}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPlay={handlePlay}
          onPause={handlePause}
          onError={handleError}
          onCanPlay={handleCanPlay}
          onClick={togglePlay}
        />
      )}

      {isLoading && <LoadingSpinner />}
      
      {error && <ErrorMessage>{error}</ErrorMessage>}

      {showOverlay && !isLoading && !error && (
        <VideoOverlay visible={showOverlay} onClick={togglePlay}>
          <PlayOverlayButton>
            ▶️
          </PlayOverlayButton>
        </VideoOverlay>
      )}

      {showInfo && !isLoading && !error && (
        <VideoInfo visible={showControls}>
          <VideoTitle>{title}</VideoTitle>
          {metadata && (
            <VideoMetadata>
              {metadata.duration && (
                <span>משך: {formatTime(metadata.duration)}</span>
              )}
              {metadata.resolution && (
                <span>רזולוציה: {metadata.resolution.width}x{metadata.resolution.height}</span>
              )}
              {metadata.codec && (
                <span>קודק: {metadata.codec.toUpperCase()}</span>
              )}
              {metadata.fileSize && (
                <span>גודל: {(metadata.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
              )}
            </VideoMetadata>
          )}
        </VideoInfo>
      )}

      <VideoControls visible={showControls && !isLoading && !error}>
        <ProgressBarContainer onClick={handleProgressClick}>
          <ProgressBar progress={progress} />
          <ProgressHandle progress={progress} visible={showControls} />
        </ProgressBarContainer>
        
        <ControlsRow>
          <PlayButton onClick={togglePlay}>
            {isPlaying ? '⏸️' : '▶️'}
          </PlayButton>
          
          <TimeDisplay>
            {formatTime(currentTime)} / {formatTime(duration)}
          </TimeDisplay>
          
          <VolumeContainer>
            <VolumeButton onClick={toggleMute}>
              {getVolumeIcon()}
            </VolumeButton>
            <VolumeSlider
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
            />
          </VolumeContainer>
          
          <SpeedButton onClick={changePlaybackRate}>
            {playbackRate}x
          </SpeedButton>
          
          <FullscreenButton onClick={toggleFullscreen}>
            {isFullscreen ? '🗗' : '🗖'}
          </FullscreenButton>
          
          {onClose && (
            <FullscreenButton onClick={onClose}>
              ✕
            </FullscreenButton>
          )}
        </ControlsRow>
      </VideoControls>
    </VideoPlayerContainer>
  );
};

export default VideoPlayer;
