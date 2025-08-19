import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import AudioRecordingService from '../services/AudioRecordingService';

// Styled components for recording interface
const RecordingContainer = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
  direction: rtl;
`;

const RecordingHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #ecf0f1;
`;

const RecordingTitle = styled.h2`
  color: #2c3e50;
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  
  &.recording {
    color: #e74c3c;
  }
  
  &.paused {
    color: #f39c12;
  }
  
  &.stopped {
    color: #7f8c8d;
  }
  
  &.ready {
    color: #27ae60;
  }
`;

const StatusDot = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: currentColor;
  
  &.recording {
    animation: pulse 1.5s infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
`;

const ControlsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const MainControls = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

const ControlButton = styled.button`
  padding: 1rem 2rem;
  border: none;
  border-radius: 8px;
  font-family: 'Heebo', sans-serif;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 120px;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &.primary {
    background-color: #e74c3c;
    color: white;
    
    &:hover:not(:disabled) {
      background-color: #c0392b;
    }
  }
  
  &.secondary {
    background-color: #3498db;
    color: white;
    
    &:hover:not(:disabled) {
      background-color: #2980b9;
    }
  }
  
  &.success {
    background-color: #27ae60;
    color: white;
    
    &:hover:not(:disabled) {
      background-color: #229954;
    }
  }
  
  &.warning {
    background-color: #f39c12;
    color: white;
    
    &:hover:not(:disabled) {
      background-color: #e67e22;
    }
  }
`;

const InfoSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const InfoLabel = styled.span`
  font-size: 0.9rem;
  color: #7f8c8d;
  font-weight: 500;
`;

const InfoValue = styled.span`
  font-size: 1.1rem;
  color: #2c3e50;
  font-weight: 600;
`;

const AudioLevelMeter = styled.div`
  width: 100%;
  height: 8px;
  background: #ecf0f1;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
`;

const AudioLevelBar = styled.div`
  height: 100%;
  background: ${props => {
    if (props.level > 0.8) return '#e74c3c';
    if (props.level > 0.6) return '#f39c12';
    return '#27ae60';
  }};
  width: ${props => props.level * 100}%;
  transition: width 0.1s ease;
`;

const DeviceSelector = styled.select`
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: 'Heebo', sans-serif;
  background: white;
  direction: rtl;
  
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const MetadataForm = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 500;
  color: #2c3e50;
  font-size: 0.9rem;
`;

const Input = styled.input`
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: 'Heebo', sans-serif;
  direction: rtl;
  
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const ErrorMessage = styled.div`
  background: #fff5f5;
  border: 1px solid #fed7d7;
  color: #e53e3e;
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
`;

const QualityReport = styled.div`
  background: #f0f8ff;
  border: 1px solid #bee3f8;
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
`;

const QualityItem = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const RecordingInterface = ({ t, onRecordingComplete }) => {
  const [recordingService] = useState(() => new AudioRecordingService());
  const [isInitialized, setIsInitialized] = useState(false);
  const [recordingState, setRecordingState] = useState('stopped'); // stopped, recording, paused
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [error, setError] = useState('');
  const [qualityReport, setQualityReport] = useState(null);
  const [metadata, setMetadata] = useState({
    lessonName: '',
    subject: '',
    classLevel: '',
    curriculum: ''
  });

  const durationIntervalRef = useRef(null);

  // Initialize recording service
  useEffect(() => {
    const initializeService = async () => {
      try {
        await recordingService.initialize();
        setIsInitialized(true);
        
        // Get available devices
        const audioDevices = await recordingService.getAudioInputDevices();
        setDevices(audioDevices);
        if (audioDevices.length > 0) {
          setSelectedDevice(audioDevices[0].deviceId);
        }
      } catch (error) {
        setError(error.message);
      }
    };

    initializeService();

    // Setup event listeners
    recordingService.addEventListener('onRecordingStart', handleRecordingStart);
    recordingService.addEventListener('onRecordingStop', handleRecordingStop);
    recordingService.addEventListener('onRecordingPause', handleRecordingPause);
    recordingService.addEventListener('onRecordingResume', handleRecordingResume);
    recordingService.addEventListener('onAudioLevel', handleAudioLevel);
    recordingService.addEventListener('onError', handleError);

    return () => {
      recordingService.cleanup();
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  const handleRecordingStart = () => {
    setRecordingState('recording');
    setError('');
    
    // Start duration timer
    durationIntervalRef.current = setInterval(() => {
      setDuration(recordingService.getRecordedDuration());
    }, 100);
  };

  const handleRecordingStop = (result) => {
    setRecordingState('stopped');
    setQualityReport(result.qualityReport);
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    if (onRecordingComplete) {
      onRecordingComplete({
        ...result,
        metadata
      });
    }
  };

  const handleRecordingPause = () => {
    setRecordingState('paused');
  };

  const handleRecordingResume = () => {
    setRecordingState('recording');
  };

  const handleAudioLevel = (levelData) => {
    setAudioLevel(levelData.average);
  };

  const handleError = (errorData) => {
    setError(errorData.message);
    setRecordingState('stopped');
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      setError('');
      
      // Switch device if needed
      if (selectedDevice && selectedDevice !== recordingService.getAudioDeviceLabel()) {
        await recordingService.switchAudioDevice(selectedDevice);
      }
      
      await recordingService.startRecording();
    } catch (error) {
      setError(error.message);
    }
  };

  const stopRecording = async () => {
    try {
      await recordingService.stopRecording();
    } catch (error) {
      setError(error.message);
    }
  };

  const pauseRecording = () => {
    try {
      recordingService.pauseRecording();
    } catch (error) {
      setError(error.message);
    }
  };

  const resumeRecording = () => {
    try {
      recordingService.resumeRecording();
    } catch (error) {
      setError(error.message);
    }
  };

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (recordingState) {
      case 'recording': return t('recording.recording');
      case 'paused': return t('recording.paused');
      case 'stopped': return isInitialized ? t('recording.ready') : t('forms.loading');
      default: return t('recording.stopped');
    }
  };

  const getAudioLevelText = () => {
    if (audioLevel > 0.8) return t('recording.tooLoud');
    if (audioLevel < 0.1) return t('recording.tooQuiet');
    return t('recording.goodLevel');
  };

  if (!isInitialized) {
    return (
      <RecordingContainer>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div>{t('forms.loading')}</div>
        </div>
      </RecordingContainer>
    );
  }

  return (
    <RecordingContainer>
      <RecordingHeader>
        <RecordingTitle>{t('recording.title')}</RecordingTitle>
        <StatusIndicator className={recordingState}>
          <StatusDot className={recordingState} />
          {getStatusText()}
        </StatusIndicator>
      </RecordingHeader>

      <ControlsSection>
        <MainControls>
          {recordingState === 'stopped' && (
            <ControlButton 
              className="primary" 
              onClick={startRecording}
              disabled={!isInitialized}
            >
              {t('recording.start')}
            </ControlButton>
          )}
          
          {recordingState === 'recording' && (
            <>
              <ControlButton 
                className="warning" 
                onClick={pauseRecording}
              >
                {t('recording.pause')}
              </ControlButton>
              <ControlButton 
                className="secondary" 
                onClick={stopRecording}
              >
                {t('recording.stop')}
              </ControlButton>
            </>
          )}
          
          {recordingState === 'paused' && (
            <>
              <ControlButton 
                className="success" 
                onClick={resumeRecording}
              >
                {t('recording.resume')}
              </ControlButton>
              <ControlButton 
                className="secondary" 
                onClick={stopRecording}
              >
                {t('recording.stop')}
              </ControlButton>
            </>
          )}
        </MainControls>

        <InfoSection>
          <InfoItem>
            <InfoLabel>{t('recording.duration')}</InfoLabel>
            <InfoValue>{formatDuration(duration)}</InfoValue>
          </InfoItem>
          
          <InfoItem>
            <InfoLabel>{t('recording.device')}</InfoLabel>
            <DeviceSelector 
              value={selectedDevice} 
              onChange={(e) => setSelectedDevice(e.target.value)}
              disabled={recordingState !== 'stopped'}
            >
              {devices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </DeviceSelector>
          </InfoItem>
          
          <InfoItem>
            <InfoLabel>{t('recording.audioLevel')}</InfoLabel>
            <div>
              <AudioLevelMeter>
                <AudioLevelBar level={audioLevel} />
              </AudioLevelMeter>
              <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', color: audioLevel > 0.8 || audioLevel < 0.1 ? '#e74c3c' : '#27ae60' }}>
                {getAudioLevelText()}
              </div>
            </div>
          </InfoItem>
        </InfoSection>

        <MetadataForm>
          <FormGroup>
            <Label>{t('recording.lessonName')}</Label>
            <Input
              type="text"
              value={metadata.lessonName}
              onChange={(e) => setMetadata({...metadata, lessonName: e.target.value})}
              placeholder={t('recording.lessonName')}
            />
          </FormGroup>
          
          <FormGroup>
            <Label>{t('recording.subject')}</Label>
            <Input
              type="text"
              value={metadata.subject}
              onChange={(e) => setMetadata({...metadata, subject: e.target.value})}
              placeholder={t('recording.subject')}
            />
          </FormGroup>
          
          <FormGroup>
            <Label>{t('recording.classLevel')}</Label>
            <Input
              type="text"
              value={metadata.classLevel}
              onChange={(e) => setMetadata({...metadata, classLevel: e.target.value})}
              placeholder={t('recording.classLevel')}
            />
          </FormGroup>
          
          <FormGroup>
            <Label>{t('recording.curriculum')}</Label>
            <Input
              type="text"
              value={metadata.curriculum}
              onChange={(e) => setMetadata({...metadata, curriculum: e.target.value})}
              placeholder={t('recording.curriculum')}
            />
          </FormGroup>
        </MetadataForm>

        {error && (
          <ErrorMessage>
            {error}
          </ErrorMessage>
        )}

        {qualityReport && (
          <QualityReport>
            <h3 style={{ margin: '0 0 1rem 0', color: '#2c3e50' }}>
              {t('recording.qualityReport')}
            </h3>
            <QualityItem>
              <span>{t('recording.quality')}:</span>
              <strong>{qualityReport.overallQuality}</strong>
            </QualityItem>
            <QualityItem>
              <span>{t('recording.duration')}:</span>
              <span>{formatDuration(qualityReport.duration)}</span>
            </QualityItem>
            <QualityItem>
              <span>{t('recording.fileSize')}:</span>
              <span>{qualityReport.sizeInMB} MB</span>
            </QualityItem>
            <QualityItem>
              <span>{t('recording.bitrate')}:</span>
              <span>{Math.round(qualityReport.bitrate / 1000)} kbps</span>
            </QualityItem>
            
            {qualityReport.issues.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <strong>{t('recording.issues')}:</strong>
                <ul style={{ margin: '0.5rem 0', paddingRight: '1rem' }}>
                  {qualityReport.issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {qualityReport.recommendations.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <strong>{t('recording.recommendations')}:</strong>
                <ul style={{ margin: '0.5rem 0', paddingRight: '1rem' }}>
                  {qualityReport.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </QualityReport>
        )}
      </ControlsSection>
    </RecordingContainer>
  );
};

export default RecordingInterface;
