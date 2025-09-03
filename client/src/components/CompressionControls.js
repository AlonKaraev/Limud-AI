import React, { useState } from 'react';
import styled from 'styled-components';
import { supportsCompression, getEstimatedCompressedSize, getCompressionRatio } from '../utils/mediaCompression';

const CompressionSection = styled.div`
  background: var(--color-surfaceElevated, #f8f9fa);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 1rem;
  margin: 1rem 0;
`;

const CompressionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const CompressionTitle = styled.h4`
  color: var(--color-text);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CompressionToggle = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: var(--color-text);
  font-weight: 500;
`;

const ToggleSwitch = styled.input`
  appearance: none;
  width: 44px;
  height: 24px;
  background: var(--color-border);
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  transition: var(--transition-fast);

  &:checked {
    background: var(--color-primary);
  }

  &::before {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    top: 2px;
    left: 2px;
    transition: var(--transition-fast);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  &:checked::before {
    transform: translateX(20px);
  }
`;

const CompressionSettings = styled.div`
  display: ${props => props.show ? 'block' : 'none'};
  animation: ${props => props.show ? 'slideDown 0.3s ease-out' : 'none'};

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const QualitySlider = styled.div`
  margin: 1rem 0;
`;

const QualityLabel = styled.label`
  display: block;
  color: var(--color-text);
  font-weight: 500;
  margin-bottom: 0.5rem;
`;

const SliderContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const Slider = styled.input`
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: var(--color-border);
  outline: none;
  -webkit-appearance: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--color-primary);
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--color-primary);
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
`;

const QualityValue = styled.span`
  color: var(--color-text);
  font-weight: 500;
  min-width: 60px;
  text-align: center;
`;

const CompressionPreview = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0.75rem;
  margin-top: 1rem;
`;

const PreviewRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0.25rem 0;
  font-size: 0.9rem;
`;

const PreviewLabel = styled.span`
  color: var(--color-textSecondary);
`;

const PreviewValue = styled.span`
  color: var(--color-text);
  font-weight: 500;
`;

const SavingsIndicator = styled.span`
  color: var(--color-success);
  font-weight: 600;
`;

const CompressionNote = styled.div`
  background: var(--color-warningLight, #fff3cd);
  color: var(--color-warning, #856404);
  border: 1px solid var(--color-warningBorder, #ffeaa7);
  border-radius: var(--radius-sm);
  padding: 0.75rem;
  margin-top: 1rem;
  font-size: 0.85rem;
  line-height: 1.4;
`;

const CompressionControls = ({ 
  files = [], 
  compressionEnabled, 
  onCompressionToggle, 
  compressionQuality, 
  onQualityChange,
  showPreview = true 
}) => {
  const [hoveredQuality, setHoveredQuality] = useState(null);

  // Check if any files support compression
  const compressibleFiles = files.filter(file => 
    supportsCompression(file.type || file.file?.type)
  );

  if (compressibleFiles.length === 0) {
    return null;
  }

  // Calculate total sizes and savings
  const totalOriginalSize = compressibleFiles.reduce((sum, file) => 
    sum + (file.size || file.file?.size || 0), 0
  );

  const currentQuality = hoveredQuality !== null ? hoveredQuality : compressionQuality;
  const estimatedCompressedSize = getEstimatedCompressedSize(totalOriginalSize, currentQuality);
  const compressionRatio = getCompressionRatio(totalOriginalSize, estimatedCompressedSize);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getQualityLabel = (quality) => {
    if (quality >= 0.8) return 'גבוהה';
    if (quality >= 0.6) return 'בינונית';
    if (quality >= 0.4) return 'נמוכה';
    return 'מינימלית';
  };

  return (
    <CompressionSection>
      <CompressionHeader>
        <CompressionTitle>
          🗜️ דחיסת קבצים
        </CompressionTitle>
        <CompressionToggle>
          <ToggleSwitch
            type="checkbox"
            checked={compressionEnabled}
            onChange={(e) => onCompressionToggle(e.target.checked)}
          />
          <span>{compressionEnabled ? 'מופעל' : 'כבוי'}</span>
        </CompressionToggle>
      </CompressionHeader>

      <CompressionSettings show={compressionEnabled}>
        <QualitySlider>
          <QualityLabel>איכות דחיסה</QualityLabel>
          <SliderContainer>
            <Slider
              type="range"
              min="0.3"
              max="0.9"
              step="0.1"
              value={compressionQuality}
              onChange={(e) => onQualityChange(parseFloat(e.target.value))}
              onMouseMove={(e) => setHoveredQuality(parseFloat(e.target.value))}
              onMouseLeave={() => setHoveredQuality(null)}
            />
            <QualityValue>
              {getQualityLabel(currentQuality)}
            </QualityValue>
          </SliderContainer>
        </QualitySlider>

        {showPreview && totalOriginalSize > 0 && (
          <CompressionPreview>
            <PreviewRow>
              <PreviewLabel>גודל מקורי:</PreviewLabel>
              <PreviewValue>{formatFileSize(totalOriginalSize)}</PreviewValue>
            </PreviewRow>
            <PreviewRow>
              <PreviewLabel>גודל משוער לאחר דחיסה:</PreviewLabel>
              <PreviewValue>{formatFileSize(estimatedCompressedSize)}</PreviewValue>
            </PreviewRow>
            <PreviewRow>
              <PreviewLabel>חיסכון משוער:</PreviewLabel>
              <SavingsIndicator>
                {formatFileSize(totalOriginalSize - estimatedCompressedSize)} ({compressionRatio}%)
              </SavingsIndicator>
            </PreviewRow>
            <PreviewRow>
              <PreviewLabel>קבצים הניתנים לדחיסה:</PreviewLabel>
              <PreviewValue>{compressibleFiles.length} מתוך {files.length}</PreviewValue>
            </PreviewRow>
          </CompressionPreview>
        )}

        <CompressionNote>
          <strong>הערה:</strong> דחיסה עלולה להשפיע על איכות הקבצים. איכות גבוהה יותר = גודל קובץ גדול יותר אך איכות טובה יותר.
          קבצי אודיו יומרו לפורמט WAV, קבצי וידאו יומרו לפורמט WebM, ותמונות יומרו לפורמט JPEG.
        </CompressionNote>
      </CompressionSettings>
    </CompressionSection>
  );
};

export default CompressionControls;
