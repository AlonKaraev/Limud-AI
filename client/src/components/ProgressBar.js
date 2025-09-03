import React from 'react';
import styled, { keyframes, css } from 'styled-components';

const shimmer = keyframes`
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
`;

const ProgressContainer = styled.div`
  width: 100%;
  margin: 1rem 0;
  padding: 0.5rem;
  background: var(--color-surfaceElevated, #f8f9fa);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
`;

const ProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const ProgressTitle = styled.div`
  font-weight: 500;
  color: var(--color-text);
  font-size: 0.9rem;
`;

const ProgressPercentage = styled.div`
  font-weight: 600;
  color: var(--color-primary);
  font-size: 0.9rem;
`;

const ProgressBarContainer = styled.div`
  width: 100%;
  height: 8px;
  background: var(--color-border);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
`;

const ProgressBarFill = styled.div`
  height: 100%;
  background: ${props => {
    if (props.status === 'compressing') {
      return 'linear-gradient(90deg, #ff6b6b, #ffa726)';
    } else if (props.status === 'saving') {
      return 'linear-gradient(90deg, #4ecdc4, #45b7d1)';
    } else if (props.status === 'complete') {
      return 'linear-gradient(90deg, #96ceb4, #85c88a)';
    }
    return 'linear-gradient(90deg, #667eea, #764ba2)';
  }};
  width: ${props => props.progress}%;
  transition: width 0.3s ease;
  border-radius: 4px;
  position: relative;
  
  ${props => props.animated && css`
    background-image: linear-gradient(
      45deg,
      rgba(255, 255, 255, 0.2) 25%,
      transparent 25%,
      transparent 50%,
      rgba(255, 255, 255, 0.2) 50%,
      rgba(255, 255, 255, 0.2) 75%,
      transparent 75%,
      transparent
    );
    background-size: 20px 20px;
    animation: ${shimmer} 1s linear infinite;
  `}
`;

const ProgressStatus = styled.div`
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: var(--color-textSecondary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const StatusIcon = styled.span`
  font-size: 1rem;
`;

const ProgressBar = ({ 
  progress = 0, 
  status = 'idle', 
  title = '', 
  message = '',
  animated = false,
  showPercentage = true 
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'compressing':
        return '🗜️';
      case 'saving':
        return '💾';
      case 'complete':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '⏳';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'compressing':
        return 'דוחס...';
      case 'saving':
        return 'שומר...';
      case 'complete':
        return 'הושלם';
      case 'error':
        return 'שגיאה';
      default:
        return 'ממתין...';
    }
  };

  return (
    <ProgressContainer>
      <ProgressHeader>
        <ProgressTitle>{title}</ProgressTitle>
        {showPercentage && (
          <ProgressPercentage>{Math.round(progress)}%</ProgressPercentage>
        )}
      </ProgressHeader>
      
      <ProgressBarContainer>
        <ProgressBarFill 
          progress={progress} 
          status={status}
          animated={animated && progress > 0 && progress < 100}
        />
      </ProgressBarContainer>
      
      <ProgressStatus>
        <StatusIcon>{getStatusIcon()}</StatusIcon>
        <span>{getStatusText()}</span>
        {message && <span>• {message}</span>}
      </ProgressStatus>
    </ProgressContainer>
  );
};

export default ProgressBar;
