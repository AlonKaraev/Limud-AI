import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import AudioRecordingService from '../services/AudioRecordingService';
import AudioPlayer from './AudioPlayer';
import ErrorLogger from '../utils/ErrorLogger';

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

const HeaderButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const UploadButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: var(--color-success);
  color: var(--color-textOnPrimary);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: 'Heebo', sans-serif;
  transition: var(--transition-fast);

  &:hover {
    background-color: var(--color-successHover);
  }

  &:disabled {
    background-color: var(--color-disabled);
    cursor: not-allowed;
  }

  &.record {
    background-color: var(--color-danger);
    
    &:hover {
      background-color: var(--color-dangerHover);
    }
  }
`;

const Title = styled.h2`
  color: var(--color-text);
  margin: 0;
`;

const RefreshButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: var(--color-primary);
  color: var(--color-textOnPrimary);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: 'Heebo', sans-serif;
  transition: var(--transition-fast);

  &:hover {
    background-color: var(--color-primaryHover);
  }

  &:disabled {
    background-color: var(--color-disabled);
    cursor: not-allowed;
  }
`;

const LessonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
`;

const LessonCard = styled.div`
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  background: var(--color-surfaceElevated);
  transition: var(--transition-medium);

  &:hover {
    box-shadow: 0 4px 12px var(--color-shadowMedium);
    transform: translateY(-2px);
  }
`;

const LessonHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const LessonTitle = styled.h3`
  color: var(--color-text);
  margin: 0;
  font-size: 1.1rem;
`;

const LessonDate = styled.span`
  color: var(--color-textSecondary);
  font-size: 0.9rem;
`;

const LessonInfo = styled.div`
  margin-bottom: 1rem;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
`;

const InfoLabel = styled.span`
  color: var(--color-textSecondary);
`;

const InfoValue = styled.span`
  color: var(--color-text);
  font-weight: 500;
`;

const StatusBadge = styled.span`
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  
  &.completed {
    background-color: var(--color-successLight);
    color: var(--color-success);
  }
  
  &.processing {
    background-color: var(--color-warningLight);
    color: var(--color-warning);
  }
  
  &.failed {
    background-color: var(--color-dangerLight);
    color: var(--color-danger);
  }
  
  &.pending {
    background-color: var(--color-primaryLight);
    color: var(--color-primary);
  }
`;

const ContentSection = styled.div`
  margin-bottom: 1rem;
`;

const ContentTitle = styled.h4`
  color: var(--color-text);
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
`;

const ContentPreview = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0.75rem;
  font-size: 0.9rem;
  color: var(--color-textSecondary);
  max-height: 100px;
  overflow-y: auto;
  line-height: 1.4;
`;

// New UI Components for improved lesson card layout

// Row 2 - Recording Details
const RecordingDetailsRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: var(--color-surfaceElevated);
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
  color: var(--color-text);
`;

const RecordingDetail = styled.span`
  font-weight: 500;
`;

// Enhanced Text-Based Action Buttons
const TextActionButton = styled.button`
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-family: 'Heebo', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  transition: var(--transition-medium);
  position: relative;
  z-index: 1;
  min-width: 100px;
  text-align: center;
  box-shadow: var(--shadow-sm);
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  
  &.play {
    background: linear-gradient(135deg, var(--color-primary), var(--color-primaryHover));
    color: var(--color-textOnPrimary);
    
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, var(--color-primaryHover), var(--color-primaryActive));
    }
  }
  
  &.delete {
    background: linear-gradient(135deg, #e74c3c, #c0392b);
    color: white;
    
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, #c0392b, #a93226);
    }
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: var(--shadow-xs);
    
    &:hover {
      transform: none;
      box-shadow: var(--shadow-xs);
    }
  }
`;

// AI Actions Button - Static Blue Styling
const AIActionsButton = styled(TextActionButton)`
  background: linear-gradient(135deg, var(--color-primary), var(--color-primaryHover));
  color: var(--color-textOnPrimary);
  min-width: 80px;
  
  &:hover:not(:disabled) {
    background: linear-gradient(135deg, var(--color-primaryHover), var(--color-primaryActive));
  }
`;

// AI Expanded Menu Button - Dynamic Styling Based on Status
const AIExpandedMenuButton = styled(TextActionButton)`
  min-width: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &.ai-completed {
    background: linear-gradient(135deg, var(--color-success), var(--color-successHover));
    color: var(--color-textOnPrimary);
    
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, var(--color-successHover), var(--color-successActive));
    }
  }
  
  &.ai-processing {
    background: linear-gradient(135deg, var(--color-warning), var(--color-warningHover));
    color: var(--color-textOnPrimary);
    animation: aiPulse 2s infinite;
    
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, var(--color-warningHover), var(--color-warningActive));
    }
  }
  
  &.ai-failed {
    background: linear-gradient(135deg, var(--color-danger), var(--color-dangerHover));
    color: var(--color-textOnPrimary);
    
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, var(--color-dangerHover), var(--color-dangerActive));
    }
  }
  
  &.ai-pending {
    background: linear-gradient(135deg, var(--color-disabled), var(--color-textSecondary));
    color: var(--color-textOnPrimary);
    
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, var(--color-textSecondary), var(--color-text));
    }
  }
  
  @keyframes aiPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
`;

const AIStatusButtonIcon = styled.span`
  font-size: 1rem;
  font-weight: bold;
`;

const AIStatusButtonText = styled.span`
  font-size: 0.85rem;
  font-weight: 600;
`;

// Expandable AI Status Components
const ExpandableAIStatus = styled.div`
  margin-bottom: 1rem;
  border-radius: var(--radius-md);
  background: var(--color-surfaceElevated);
  border: 1px solid var(--color-border);
  overflow: hidden;
  transition: var(--transition-medium);
`;

const AIStatusHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  cursor: pointer;
  background: ${props => {
    switch (props.status) {
      case 'completed': return 'linear-gradient(135deg, var(--color-successLight), var(--color-successLighter))';
      case 'processing': return 'linear-gradient(135deg, var(--color-warningLight), var(--color-warningLighter))';
      case 'failed': return 'linear-gradient(135deg, var(--color-dangerLight), var(--color-dangerLighter))';
      default: return 'linear-gradient(135deg, var(--color-primaryLight), var(--color-primaryLighter))';
    }
  }};
  border-bottom: ${props => props.expanded ? `1px solid var(--color-border)` : 'none'};
  transition: var(--transition-medium);
  
  &:hover {
    background: ${props => {
      switch (props.status) {
        case 'completed': return 'linear-gradient(135deg, var(--color-successLighter), var(--color-success))';
        case 'processing': return 'linear-gradient(135deg, var(--color-warningLighter), var(--color-warning))';
        case 'failed': return 'linear-gradient(135deg, var(--color-dangerLighter), var(--color-danger))';
        default: return 'linear-gradient(135deg, var(--color-primaryLighter), var(--color-primary))';
      }
    }};
  }
`;

const AIStatusHeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const AIStatusIcon = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  color: var(--color-textOnPrimary);
  background: ${props => {
    switch (props.status) {
      case 'completed': return 'var(--color-success)';
      case 'processing': return 'var(--color-warning)';
      case 'failed': return 'var(--color-danger)';
      default: return 'var(--color-primary)';
    }
  }};
  
  ${props => props.status === 'processing' && `
    animation: statusPulse 2s infinite;
  `}
  
  @keyframes statusPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.1); }
  }
`;

const AIStatusText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const AIStatusTitle = styled.span`
  font-weight: 600;
  font-size: 1rem;
  color: var(--color-text);
`;

const AIStatusSubtitle = styled.span`
  font-size: 0.85rem;
  color: var(--color-textSecondary);
  font-weight: 500;
`;

const AIStatusToggle = styled.div`
  font-size: 1.2rem;
  color: var(--color-textSecondary);
  transition: var(--transition-medium);
  transform: ${props => props.expanded ? 'rotate(180deg)' : 'rotate(0deg)'};
`;

const AIStatusContent = styled.div`
  padding: ${props => props.expanded ? '1.5rem' : '0'};
  max-height: ${props => props.expanded ? '400px' : '0'};
  overflow-y: ${props => props.expanded ? 'auto' : 'hidden'};
  overflow-x: hidden;
  transition: var(--transition-medium);
  background: var(--color-surface);
  
  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: var(--color-surfaceElevated);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 3px;
    
    &:hover {
      background: var(--color-textSecondary);
    }
  }
`;

const AIStagesGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
  
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const AIStageCard = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: var(--color-surfaceElevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: var(--transition-fast);
  font-family: 'Heebo', sans-serif;
  text-align: right;
  width: 100%;
  
  &:hover:not(:disabled) {
    background: var(--color-surface);
    border-color: var(--color-borderHover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }
  
  &:disabled {
    cursor: not-allowed;
  }
  
  &:not(:disabled) {
    cursor: pointer;
  }
`;

const AIStageCardIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  flex-shrink: 0;
  
  &.success {
    background-color: var(--color-success);
    color: var(--color-textOnPrimary);
  }
  
  &.failed {
    background-color: var(--color-danger);
    color: var(--color-textOnPrimary);
  }
  
  &.processing {
    background-color: var(--color-warning);
    color: var(--color-textOnPrimary);
    animation: stagePulse 1.5s infinite;
  }
  
  &.pending {
    background-color: var(--color-disabled);
    color: var(--color-textOnPrimary);
  }
  
  @keyframes stagePulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.05); }
  }
`;

const AIStageCardContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const AIStageCardTitle = styled.span`
  font-weight: 600;
  font-size: 1rem;
  color: var(--color-text);
`;

const AIStageCardStatus = styled.span`
  font-size: 0.85rem;
  color: var(--color-textSecondary);
  font-weight: 500;
`;

const AIStageCardMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--color-textTertiary);
`;

const ErrorExpandSection = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: var(--color-dangerLighter);
  border: 1px solid var(--color-dangerLight);
  border-radius: var(--radius-md);
`;

const ErrorExpandHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  color: var(--color-danger);
  font-weight: 600;
  margin-bottom: 0.5rem;
`;

const ErrorExpandContent = styled.div`
  max-height: ${props => props.expanded ? '200px' : '0'};
  overflow: hidden;
  transition: var(--transition-medium);
  color: var(--color-dangerDark);
  font-size: 0.85rem;
  line-height: 1.4;
`;

// Row 3 - Text Buttons
const ButtonsRow = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1rem;
  position: relative;
  z-index: 1;
`;

const AIMenuHeader = styled.div`
  padding: 1rem;
  background: var(--color-surfaceElevated);
  border-bottom: 1px solid var(--color-border);
`;

const AIMenuHeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.5rem;
  font-size: 1rem;
`;

const AIMenuHeaderStatus = styled.div`
  font-size: 0.85rem;
  color: var(--color-textSecondary);
  font-weight: 500;
`;

const AIMenuStages = styled.div`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-borderLight);
`;

const AIMenuStagesHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  padding: 0.25rem 0;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text);
  
  &:hover {
    color: var(--color-primary);
  }
`;

const AIMenuStagesList = styled.div`
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const AIMenuStageItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.85rem;
  padding: 0.5rem;
  background: var(--color-surfaceElevated);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-borderLight);
`;

const AIMenuStageIcon = styled.div`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: bold;
  flex-shrink: 0;
  
  &.success {
    background-color: var(--color-success);
    color: var(--color-textOnPrimary);
  }
  
  &.failed {
    background-color: var(--color-danger);
    color: var(--color-textOnPrimary);
  }
  
  &.processing {
    background-color: var(--color-warning);
    color: var(--color-textOnPrimary);
    animation: pulse 1.5s infinite;
  }
  
  &.pending {
    background-color: var(--color-disabled);
    color: var(--color-textOnPrimary);
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const AIMenuStageText = styled.span`
  flex: 1;
  color: var(--color-text);
  font-weight: 500;
`;

const AIMenuStageStatus = styled.span`
  font-size: 0.8rem;
  color: var(--color-textSecondary);
  font-weight: 400;
`;

const AIMenuActions = styled.div`
  padding: 0.5rem 0;
`;

const AIMenuActionItem = styled.button`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: none;
  cursor: pointer;
  font-family: 'Heebo', sans-serif;
  font-size: 0.9rem;
  color: #2c3e50;
  transition: background-color 0.2s;
  text-align: right;
  
  &:hover:not(:disabled) {
    background: #f8f9fa;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    color: #999;
  }
`;

const AIMenuActionIcon = styled.span`
  font-size: 1.1rem;
  width: 20px;
  display: flex;
  justify-content: center;
  flex-shrink: 0;
`;

const AIMenuActionText = styled.span`
  flex: 1;
  font-weight: 500;
`;

const AIMenuActionBadge = styled.span`
  background: #e9ecef;
  color: #666;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  flex-shrink: 0;
`;

const AIDropdownMenu = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1000;
  min-width: 180px;
  padding: 0.5rem 0;
  margin-top: 0.25rem;
`;

const AIDropdownItem = styled.button`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  background: none;
  cursor: pointer;
  font-family: 'Heebo', sans-serif;
  font-size: 0.9rem;
  color: #2c3e50;
  transition: background-color 0.2s;
  text-align: right;
  
  &:hover:not(:disabled) {
    background: #f8f9fa;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    color: #999;
  }
`;

const AIDropdownIcon = styled.span`
  font-size: 1.1rem;
  width: 20px;
  display: flex;
  justify-content: center;
`;

// Tooltip Component
const TooltipContainer = styled.div`
  position: relative;
  display: inline-block;
`;

const Tooltip = styled.div`
  position: absolute;
  background: #2c3e50;
  color: white;
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  font-size: 0.8rem;
  white-space: nowrap;
  z-index: 1001;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 0.5rem;
  opacity: ${props => props.show ? 1 : 0};
  visibility: ${props => props.show ? 'visible' : 'hidden'};
  transition: opacity 0.2s, visibility 0.2s;
  
  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: #2c3e50;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const ActionButton = styled.button`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Heebo', sans-serif;
  font-size: 0.9rem;
  transition: all 0.2s;

  &.primary {
    background-color: #3498db;
    color: white;
  }

  &.primary:hover {
    background-color: #2980b9;
  }

  &.secondary {
    background-color: #95a5a6;
    color: white;
  }

  &.secondary:hover {
    background-color: #7f8c8d;
  }

  &.success {
    background-color: #27ae60;
    color: white;
  }

  &.success:hover {
    background-color: #229954;
  }

  &:disabled {
    background-color: #bdc3c7;
    cursor: not-allowed;
  }
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: var(--color-textSecondary);
  font-size: 1.1rem;
`;

const ErrorMessage = styled.div`
  background-color: var(--color-dangerLight);
  color: var(--color-danger);
  padding: 1rem;
  border-radius: var(--radius-sm);
  margin-bottom: 1rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: var(--color-textSecondary);
`;

const ProcessingModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: var(--color-surface);
  padding: 2rem;
  border-radius: var(--radius-md);
  max-width: 500px;
  width: 90%;
  text-align: center;
`;

const ModalTitle = styled.h3`
  color: var(--color-text);
  margin-bottom: 1rem;
`;

const ProcessingOptions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 1.5rem 0;
`;

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-align: right;
`;

const Checkbox = styled.input`
  margin: 0;
`;

const CheckboxLabel = styled.label`
  color: var(--color-text);
  cursor: pointer;
`;

const AIStatusSection = styled.div`
  margin-bottom: 1rem;
  padding: 0.75rem;
  border-radius: 4px;
  background: #f8f9fa;
  border-left: 4px solid #3498db;
`;

const StatusDetails = styled.div`
  font-size: 0.85rem;
  color: #666;
  margin-top: 0.5rem;
`;

const AIStagesList = styled.div`
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const AIStage = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  padding: 0.25rem 0;
`;

const StageIcon = styled.div`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
  
  &.success {
    background-color: #27ae60;
    color: white;
  }
  
  &.failed {
    background-color: #e74c3c;
    color: white;
  }
  
  &.processing {
    background-color: #f39c12;
    color: white;
    animation: pulse 1.5s infinite;
  }
  
  &.pending {
    background-color: #bdc3c7;
    color: white;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

const StageText = styled.span`
  color: #2c3e50;
  
  &.success {
    color: #27ae60;
  }
  
  &.failed {
    color: #e74c3c;
  }
  
  &.processing {
    color: #f39c12;
  }
`;

const ViewButton = styled.button`
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Heebo', sans-serif;
  font-size: 0.85rem;
  transition: all 0.2s;
  
  &.available {
    background-color: #3498db;
    color: white;
    
    &:hover {
      background-color: #2980b9;
    }
  }
  
  &.unavailable {
    background-color: #ecf0f1;
    color: #95a5a6;
    cursor: not-allowed;
  }
  
  &.error {
    background-color: #e74c3c;
    color: white;
    
    &:hover {
      background-color: #c0392b;
    }
  }
`;

const ViewButtonsRow = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
`;

const ErrorDetails = styled.div`
  background-color: #fff5f5;
  border: 1px solid #fed7d7;
  border-radius: 4px;
  padding: 0.75rem;
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #c53030;
`;

const WarningDetails = styled.div`
  background-color: #fffbeb;
  border: 1px solid #fed7aa;
  border-radius: 4px;
  padding: 0.75rem;
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #d97706;
`;

const ServiceHealthIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  
  &.healthy {
    background-color: #f0f9ff;
    color: #0369a1;
    border: 1px solid #bae6fd;
  }
  
  &.unhealthy {
    background-color: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
  }
`;

const HealthDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  
  &.healthy {
    background-color: #10b981;
  }
  
  &.unhealthy {
    background-color: #ef4444;
  }
`;

const UploadModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const UploadModalContent = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  text-align: center;
`;

const UploadErrorMessage = styled.div`
  background-color: #fadbd8;
  color: #e74c3c;
  padding: 1rem;
  border-radius: 4px;
  margin: 1rem 0;
  text-align: right;
  border: 1px solid #f5b7b1;
`;

const UploadSuccessMessage = styled.div`
  background-color: #d5f4e6;
  color: #27ae60;
  padding: 1rem;
  border-radius: 4px;
  margin: 1rem 0;
  text-align: right;
  border: 1px solid #a9dfbf;
`;

const RetryButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: #f39c12;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Heebo', sans-serif;
  transition: background-color 0.2s;
  margin: 0 0.5rem;

  &:hover {
    background-color: #e67e22;
  }

  &:disabled {
    background-color: #bdc3c7;
    cursor: not-allowed;
  }
`;

const FileInput = styled.input`
  display: none;
`;

const FileInputLabel = styled.label`
  display: inline-block;
  padding: 1rem 2rem;
  background-color: #3498db;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Heebo', sans-serif;
  transition: background-color 0.2s;
  margin: 1rem 0;

  &:hover {
    background-color: #2980b9;
  }
`;

const UploadArea = styled.div`
  border: 2px dashed #bdc3c7;
  border-radius: 8px;
  padding: 2rem;
  margin: 1rem 0;
  text-align: center;
  transition: border-color 0.2s;

  &.dragover {
    border-color: #3498db;
    background-color: #f8f9fa;
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background-color: #ecf0f1;
  border-radius: 4px;
  margin: 1rem 0;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background-color: #27ae60;
  transition: width 0.3s ease;
  width: ${props => props.progress}%;
`;

const FormGroup = styled.div`
  margin: 1rem 0;
  text-align: right;
`;

const FormLabel = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: #2c3e50;
  font-weight: 500;
`;

const FormInput = styled.input`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #bdc3c7;
  border-radius: 4px;
  font-family: 'Heebo', sans-serif;
  direction: rtl;

  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

// Search and Filter Components
const SearchAndFilterSection = styled.div`
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 1rem;
  align-items: end;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const SearchInput = styled.input`
  padding: 0.75rem;
  border: 1px solid #bdc3c7;
  border-radius: 4px;
  font-family: 'Heebo', sans-serif;
  direction: rtl;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
  }

  &::placeholder {
    color: #7f8c8d;
  }
`;

const FilterSelect = styled.select`
  padding: 0.75rem;
  border: 1px solid #bdc3c7;
  border-radius: 4px;
  font-family: 'Heebo', sans-serif;
  background: white;
  direction: rtl;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
  }
`;

const FilterGroup = styled.div`
  display: flex;
  gap: 0.5rem;
`;

// Recording Modal Components
const RecordingModalContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const RecordingModalContent = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 12px;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
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

const InfoItemLabel = styled.span`
  font-size: 0.9rem;
  color: #7f8c8d;
  font-weight: 500;
`;

const InfoItemValue = styled.span`
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

const RecordingFormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const RecordingLabel = styled.label`
  font-weight: 500;
  color: #2c3e50;
  font-size: 0.9rem;
`;

const RecordingInput = styled.input`
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

const RecordingCheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  grid-column: 1 / -1;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #ddd;
`;

const RecordingCheckboxItem = styled.label`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  font-weight: 500;
  color: #2c3e50;
  
  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }
`;

const AIOptionsTitle = styled.h4`
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
  font-size: 1rem;
  font-weight: 600;
`;

const RecordingErrorMessage = styled.div`
  background: #fff5f5;
  border: 1px solid #fed7d7;
  color: #e53e3e;
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
`;

// Delete Modal Components
const DeleteModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const DeleteModalContent = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 8px;
  max-width: 400px;
  width: 90%;
  text-align: center;
`;

const DeleteButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Heebo', sans-serif;
  transition: background-color 0.2s;

  &:hover {
    background-color: #c0392b;
  }

  &:disabled {
    background-color: #bdc3c7;
    cursor: not-allowed;
  }
`;

// Transcription Modal Components
const TranscriptionModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const TranscriptionModalContent = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 12px;
  max-width: 800px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  direction: rtl;
`;

const TranscriptionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #ecf0f1;
`;

const TranscriptionTitle = styled.h2`
  color: #2c3e50;
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
`;

const TranscriptionContent = styled.div`
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1.5rem;
  font-size: 1rem;
  line-height: 1.6;
  color: #2c3e50;
  white-space: pre-wrap;
  word-wrap: break-word;
  max-height: 60vh;
  overflow-y: auto;
`;

const CloseButton = styled.button`
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  cursor: pointer;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;

  &:hover {
    background: #5a6268;
  }
`;

// Summary Modal Components (reuse TranscriptionModal styling)
const SummaryModal = styled(TranscriptionModal)``;
const SummaryModalContent = styled(TranscriptionModalContent)``;
const SummaryHeader = styled(TranscriptionHeader)``;
const SummaryTitle = styled(TranscriptionTitle)``;
const SummaryContent = styled(TranscriptionContent)``;

// Test Modal Components
const TestModal = styled(TranscriptionModal)``;
const TestModalContent = styled(TranscriptionModalContent)``;
const TestHeader = styled(TranscriptionHeader)``;
const TestTitle = styled(TranscriptionTitle)``;

// Share Modal Components
const ShareModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ShareModalContent = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 12px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  direction: rtl;
`;

const ShareModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #ecf0f1;
`;

const ShareModalTitle = styled.h2`
  color: #2c3e50;
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
`;

const ShareSection = styled.div`
  margin-bottom: 2rem;
`;

const ShareSectionTitle = styled.h3`
  color: #2c3e50;
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 600;
`;

const ContentTypeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const ContentTypeCard = styled.div`
  border: 2px solid ${props => props.selected ? '#27ae60' : '#e9ecef'};
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  background: ${props => props.selected ? '#f8fff8' : 'white'};
  
  &:hover {
    border-color: ${props => props.selected ? '#27ae60' : '#3498db'};
    background: ${props => props.selected ? '#f8fff8' : '#f8f9fa'};
  }
  
  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #f8f9fa;
    border-color: #e9ecef;
  }
`;

const ContentTypeHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
`;

const ContentTypeIcon = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  color: white;
  background: ${props => {
    if (props.available) return '#27ae60';
    if (props.processing) return '#f39c12';
    if (props.failed) return '#e74c3c';
    return '#bdc3c7';
  }};
`;

const ContentTypeTitle = styled.span`
  font-weight: 600;
  font-size: 1rem;
  color: #2c3e50;
`;

const ContentTypeDescription = styled.p`
  margin: 0;
  font-size: 0.85rem;
  color: #666;
  line-height: 1.4;
`;

const ContentTypeStatus = styled.div`
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: ${props => {
    if (props.available) return '#27ae60';
    if (props.processing) return '#f39c12';
    if (props.failed) return '#e74c3c';
    return '#7f8c8d';
  }};
  font-weight: 500;
`;

const ClassSelectionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const ClassCard = styled.div`
  border: 2px solid ${props => props.selected ? '#3498db' : '#e9ecef'};
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  background: ${props => props.selected ? '#f0f8ff' : 'white'};
  
  &:hover {
    border-color: #3498db;
    background: #f0f8ff;
  }
`;

const ClassName = styled.div`
  font-weight: 600;
  font-size: 1rem;
  color: #2c3e50;
  margin-bottom: 0.25rem;
`;

const ClassDescription = styled.div`
  font-size: 0.85rem;
  color: #666;
`;

const ScheduleSection = styled.div`
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const ScheduleGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const ScheduleFormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ScheduleLabel = styled.label`
  font-weight: 500;
  color: #2c3e50;
  font-size: 0.9rem;
`;

const ScheduleInput = styled.input`
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: 'Heebo', sans-serif;
  direction: ltr;
  
  &:focus {
    outline: none;
    border-color: #3498db;
  }
`;

const ShareActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid #e9ecef;
`;

const ShareButton = styled.button`
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 8px;
  font-family: 'Heebo', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  
  &.primary {
    background: linear-gradient(135deg, #27ae60, #229954);
    color: white;
    
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, #229954, #1e8449);
    }
  }
  
  &.secondary {
    background: #6c757d;
    color: white;
    
    &:hover:not(:disabled) {
      background: #5a6268;
    }
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const TestContent = styled.div`
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1.5rem;
  font-size: 1rem;
  line-height: 1.6;
  color: #2c3e50;
  max-height: 60vh;
  overflow-y: auto;
  direction: rtl;
`;

const QuestionItem = styled.div`
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
`;

const QuestionNumber = styled.div`
  font-weight: 700;
  font-size: 1.1rem;
  color: #2c3e50;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #3498db;
`;

const QuestionText = styled.div`
  font-size: 1rem;
  color: #2c3e50;
  margin-bottom: 1rem;
  line-height: 1.5;
  font-weight: 500;
`;

const AnswerOptions = styled.div`
  margin: 1rem 0;
`;

const AnswerOption = styled.div`
  padding: 0.75rem;
  margin: 0.5rem 0;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  font-size: 0.95rem;
  color: #2c3e50;
  transition: all 0.2s;
  
  &:hover {
    background: #e9ecef;
  }
`;

const CorrectAnswer = styled.div`
  margin-top: 1rem;
  padding: 0.75rem;
  background: #d5f4e6;
  border: 1px solid #a9dfbf;
  border-radius: 6px;
  color: #27ae60;
  font-weight: 600;
  font-size: 0.95rem;
`;

// Toggle Button for Error Details
const ToggleErrorButton = styled.button`
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-family: 'Heebo', sans-serif;
  font-size: 0.85rem;
  transition: var(--transition-fast);
  background-color: var(--color-danger);
  color: var(--color-textOnPrimary);
  margin-top: 0.5rem;
  display: inline-block;
  visibility: visible;
  opacity: 1;
  min-height: 32px;
  min-width: 80px;
  z-index: 10;
  
  &:hover:not(:disabled) {
    background-color: var(--color-dangerHover);
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background-color: var(--color-disabled);
  }
`;

// AI Actions Expandable Content
const ExpandableAIActions = styled.div`
  margin-top: 1rem;
  border-radius: 8px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  overflow: hidden;
  transition: all 0.3s ease;
`;

const AIActionsContent = styled.div`
  padding: ${props => props.expanded ? '1.5rem' : '0'};
  max-height: ${props => props.expanded ? '400px' : '0'};
  overflow: hidden;
  transition: all 0.3s ease;
  background: white;
`;

const AIActionsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
`;

const AIActionCard = styled.button`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #fafbfc;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  transition: all 0.2s ease;
  cursor: pointer;
  font-family: 'Heebo', sans-serif;
  text-align: right;
  width: 100%;
  
  &:hover:not(:disabled) {
    background: #f5f6fa;
    border-color: #e9ecef;
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #f8f9fa;
  }
`;

const AIActionCardIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  flex-shrink: 0;
  background-color: #3498db;
  color: white;
  transition: all 0.3s ease;
  
  &.available {
    background-color: #27ae60;
    
    &:hover {
      background-color: #229954;
      transform: scale(1.05);
    }
  }
  
  &.unavailable {
    background-color: #bdc3c7;
    opacity: 0.6;
  }
  
  &.generate {
    background-color: #f39c12;
    animation: generatePulse 2s infinite;
    
    &:hover {
      background-color: #e67e22;
      transform: scale(1.05);
    }
  }
  
  &.processing {
    background-color: #f39c12;
    animation: processingRotate 1.5s linear infinite;
  }
  
  &.failed {
    background-color: #e74c3c;
    
    &:hover {
      background-color: #c0392b;
      transform: scale(1.05);
    }
  }
  
  @keyframes generatePulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  
  @keyframes processingRotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const AIActionCardContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: flex-end;
`;

const AIActionCardTitle = styled.span`
  font-weight: 600;
  font-size: 1rem;
  color: #2c3e50;
`;

const AIActionCardDescription = styled.span`
  font-size: 0.85rem;
  color: #666;
  font-weight: 500;
`;

const AIActionCardBadge = styled.span`
  background: #e9ecef;
  color: #666;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  margin-top: 0.25rem;
`;

const LessonsManager = ({ t }) => {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingModal, setProcessingModal] = useState(null);
  const [processingOptions, setProcessingOptions] = useState({
    generateSummary: true,
    generateQuestions: true
  });
  const [processingJobs, setProcessingJobs] = useState({});
  const [aiServiceHealth, setAiServiceHealth] = useState(null);
  const [uploadModal, setUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [lessonName, setLessonName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  // New state for transcription modal
  const [transcriptionModal, setTranscriptionModal] = useState(null);

  // New state for summary and test modals
  const [summaryModal, setSummaryModal] = useState(null);
  const [testModal, setTestModal] = useState(null);

  // Recording functionality state
  const [recordingService] = useState(() => new AudioRecordingService());
  const [isRecordingInitialized, setIsRecordingInitialized] = useState(false);
  const [recordingState, setRecordingState] = useState('stopped');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingDevices, setRecordingDevices] = useState([]);
  const [selectedRecordingDevice, setSelectedRecordingDevice] = useState('');
  const [recordingError, setRecordingError] = useState('');
  const [recordingModal, setRecordingModal] = useState(false);
  const [recordingMetadata, setRecordingMetadata] = useState({
    lessonName: '',
    subject: '',
    classLevel: '',
    curriculum: ''
  });
  const [recordingAiOptions, setRecordingAiOptions] = useState({
    generateSummary: false,
    generateTest: false
  });

  // Audio player state
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [audioPlayerData, setAudioPlayerData] = useState(null);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [filteredLessons, setFilteredLessons] = useState([]);

  // Delete confirmation state
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // New UI state for improved lesson cards
  const [tooltips, setTooltips] = useState({});
  const [visibleErrors, setVisibleErrors] = useState({});
  const [expandedAIMenu, setExpandedAIMenu] = useState({});

  // Content sharing state
  const [shareModal, setShareModal] = useState(null);
  const [classes, setClasses] = useState([]);
  const [shareOptions, setShareOptions] = useState({
    transcription: false,
    summary: false,
    test: false,
    flashcards: false
  });
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [shareSchedule, setShareSchedule] = useState({
    startDate: '',
    endDate: ''
  });
  const [sharing, setSharing] = useState(false);
  const [userRole, setUserRole] = useState(null);

  // Flashcard creation state
  const [flashcardModal, setFlashcardModal] = useState(null);
  const [flashcardConfig, setFlashcardConfig] = useState({
    cardCount: 10,
    difficultyLevel: 'medium',
    subjectArea: '',
    gradeLevel: '',
    language: 'hebrew'
  });
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false);
  const [flashcardProgress, setFlashcardProgress] = useState(0);

  const durationIntervalRef = useRef(null);

  // Helper functions for tooltips and UI interactions
  const showTooltip = (lessonId, buttonType, text) => {
    setTooltips(prev => ({
      ...prev,
      [`${lessonId}-${buttonType}`]: text
    }));
  };

  const hideTooltip = (lessonId, buttonType) => {
    setTooltips(prev => {
      const newTooltips = { ...prev };
      delete newTooltips[`${lessonId}-${buttonType}`];
      return newTooltips;
    });
  };


  const getTooltipText = (lesson, buttonType) => {
    const statusInfo = getAIStatusInfo(lesson);
    const { aiContent } = lesson;

    switch (buttonType) {
      case 'play':
        if (currentlyPlaying === lesson.id && audioPlayerData?.loading) {
          return 'טוען נגן שמע...';
        }
        return 'השמע הקלטה';

      case 'generate':
        if (statusInfo.status === 'pending') {
          return 'צור תוכן AI (סיכום ושאלות)';
        } else if (statusInfo.status === 'failed') {
          return 'נסה שוב ליצור תוכן AI';
        } else if (statusInfo.status === 'processing') {
          return 'עיבוד AI בתהליך...';
        }
        return 'תוכן AI כבר קיים';

      case 'delete':
        if (deleting) {
          return 'מוחק שיעור...';
        }
        return 'מחק שיעור';

      case 'ai-menu':
        const availableCount = [
          aiContent?.transcription?.transcription_text,
          aiContent?.summary?.summary_text,
          aiContent?.questions?.length > 0
        ].filter(Boolean).length;
        
        if (availableCount === 0) {
          return `תפריט AI - ${statusInfo.text} (אין תוכן זמין)`;
        }
        return `תפריט AI - ${statusInfo.text} (${availableCount} פריטים זמינים)`;

      case 'transcript':
        if (aiContent?.transcription?.transcription_text) {
          return 'צפה בתמליל המלא';
        } else if (statusInfo.status === 'processing') {
          return 'תמליל בעיבוד...';
        } else if (statusInfo.status === 'failed') {
          return 'יצירת תמליל נכשלה';
        }
        return 'תמליל לא זמין - צור תוכן AI תחילה';

      case 'summary':
        if (aiContent?.summary?.summary_text) {
          return 'צפה בסיכום השיעור';
        } else if (statusInfo.status === 'processing') {
          return 'סיכום בעיבוד...';
        } else if (statusInfo.status === 'failed') {
          return 'יצירת סיכום נכשלה';
        }
        return 'סיכום לא זמין - צור תוכן AI תחילה';

      case 'test':
        if (aiContent?.questions?.length > 0) {
          return `צפה במבחן (${aiContent.questions.length} שאלות)`;
        } else if (statusInfo.status === 'processing') {
          return 'שאלות בחינה בעיבוד...';
        } else if (statusInfo.status === 'failed') {
          return 'יצירת שאלות נכשלה';
        }
        return 'מבחן לא זמין - צור תוכן AI תחילה';

      default:
        return '';
    }
  };

  const getAIStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'processing':
        return '⏳';
      case 'failed':
        return '❌';
      case 'pending':
      default:
        return '⏸️';
    }
  };

  // Enhanced AI Button Helper Functions
  const getAIButtonClass = (statusInfo) => {
    switch (statusInfo.status) {
      case 'completed': return 'ai-completed';
      case 'processing': return 'ai-processing';
      case 'failed': return 'ai-failed';
      case 'pending': 
      default: return 'ai-pending';
    }
  };

  const getAIButtonIcon = (statusInfo) => {
    switch (statusInfo.status) {
      case 'completed': return '✓';
      case 'processing': return '⟳';
      case 'failed': return '✗';
      case 'pending': 
      default: return '○';
    }
  };

  const getAIMenuHeaderText = (statusInfo) => {
    switch (statusInfo.status) {
      case 'completed': return 'עיבוד AI הושלם';
      case 'processing': return 'עיבוד AI בתהליך';
      case 'failed': return 'עיבוד AI נכשל';
      case 'pending': 
      default: return 'עיבוד AI ממתין';
    }
  };

  const getAIStageDisplayText = (lesson, contentType) => {
    const status = getAIStageStatus(lesson, contentType);
    const count = getAIStageCount(lesson, contentType);
    
    switch (contentType) {
      case 'transcription':
        return status === 'success' ? 'תמליל - Completed' : 'תמליל';
      case 'summary':
        return status === 'success' ? 'סיכום - Completed' : 'סיכום';
      case 'questions':
        if (status === 'success' && count > 0) {
          return `שאלות בחינה - ${count} questions`;
        }
        return 'שאלות בחינה';
      default:
        return contentType;
    }
  };

  const getAIStageStatus = (lesson, contentType) => {
    const job = processingJobs[lesson.id];
    const { aiContent } = lesson;
    
    if (job && job.job_type === contentType) {
      if (job.status === 'processing') return 'processing';
      if (job.status === 'failed') return 'failed';
    }
    
    if (!aiContent) return 'pending';
    
    const content = aiContent[contentType];
    if (content?.error) return 'failed';
    if (content && (contentType === 'questions' ? content.length > 0 : content.transcription_text || content.summary_text)) {
      return 'success';
    }
    
    return 'pending';
  };

  const getAIStageIcon = (status) => {
    switch (status) {
      case 'success': return '✓';
      case 'failed': return '✗';
      case 'processing': return '⟳';
      case 'pending': 
      default: return '○';
    }
  };

  const getAIStageCount = (lesson, contentType) => {
    const { aiContent } = lesson;
    if (!aiContent) return null;
    
    if (contentType === 'questions') {
      return aiContent.questions?.length || 0;
    }
    
    return null;
  };

  useEffect(() => {
    fetchLessons();
    fetchAIServiceHealth();
    fetchUserRole();
    fetchClasses();
    // Set up periodic refresh for processing jobs
    const interval = setInterval(() => {
      fetchProcessingJobs();
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Initialize recording service when modal opens
  useEffect(() => {
    if (recordingModal) {
      initializeRecordingService();
    }
    
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [recordingModal]);

  const initializeRecordingService = async () => {
    try {
      setRecordingError('');
      await recordingService.initialize();
      setIsRecordingInitialized(true);
      
      // Get available devices
      const audioDevices = await recordingService.getAudioInputDevices();
      setRecordingDevices(audioDevices);
      if (audioDevices.length > 0) {
        setSelectedRecordingDevice(audioDevices[0].deviceId);
      }

      // Setup event listeners
      recordingService.addEventListener('onRecordingStart', handleRecordingStart);
      recordingService.addEventListener('onRecordingStop', handleRecordingStop);
      recordingService.addEventListener('onRecordingPause', handleRecordingPause);
      recordingService.addEventListener('onRecordingResume', handleRecordingResume);
      recordingService.addEventListener('onAudioLevel', handleAudioLevel);
      recordingService.addEventListener('onError', handleRecordingError);
    } catch (error) {
      setRecordingError(error.message);
    }
  };

  const handleRecordingStart = () => {
    console.log('Recording started event received');
    setRecordingState('recording');
    setRecordingError('');
    setRecordingDuration(0);
    
    // Start duration timer
    durationIntervalRef.current = setInterval(() => {
      const currentDuration = recordingService.getRecordedDuration();
      setRecordingDuration(currentDuration);
    }, 100);
  };

  const handleRecordingStop = async (result) => {
    setRecordingState('stopped');
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    try {
      // Upload the recording
      await uploadRecording(result);
    } catch (error) {
      setRecordingError(`שגיאה בשמירת ההקלטה: ${error.message}`);
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

  const handleRecordingError = (errorData) => {
    setRecordingError(errorData.message);
    setRecordingState('stopped');
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      setRecordingError('');
      
      // Switch device if needed
      if (selectedRecordingDevice && selectedRecordingDevice !== recordingService.getAudioDeviceLabel()) {
        await recordingService.switchAudioDevice(selectedRecordingDevice);
      }
      
      await recordingService.startRecording();
    } catch (error) {
      setRecordingError(error.message);
    }
  };

  const stopRecording = async () => {
    try {
      await recordingService.stopRecording();
    } catch (error) {
      setRecordingError(error.message);
    }
  };

  const pauseRecording = () => {
    try {
      recordingService.pauseRecording();
    } catch (error) {
      setRecordingError(error.message);
    }
  };

  const resumeRecording = () => {
    try {
      recordingService.resumeRecording();
    } catch (error) {
      setRecordingError(error.message);
    }
  };

  const uploadRecording = async (recordingResult) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('לא נמצא טוקן אימות. אנא התחבר מחדש.');
      }

      const formData = new FormData();
      formData.append('audio', recordingResult.audioBlob, 'recording.webm');
      formData.append('recordingId', `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
      formData.append('metadata', JSON.stringify({
        ...recordingMetadata,
        duration: recordingDuration / 1000, // Convert to seconds
        recordedAt: new Date().toISOString(),
        qualityReport: recordingResult.qualityReport
      }));

      const response = await fetch('/api/recordings/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('שגיאה בהעלאת ההקלטה');
      }

      const result = await response.json();
      
      if (result.success) {
        // Process AI content if requested
        if (recordingAiOptions.generateSummary || recordingAiOptions.generateTest) {
          try {
            await fetch(`/api/ai-content/process/${result.recordingId}`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                generateSummary: recordingAiOptions.generateSummary,
                generateQuestions: recordingAiOptions.generateTest
              })
            });
          } catch (aiError) {
            console.error('AI processing failed:', aiError);
            // Don't fail the whole process if AI fails
          }
        }

        // Close modal and refresh lessons
        setRecordingModal(false);
        resetRecordingState();
        fetchLessons();
        
        alert('ההקלטה נשמרה בהצלחה!');
      } else {
        throw new Error(result.error || 'שגיאה בשמירת ההקלטה');
      }
    } catch (error) {
      console.error('Upload recording error:', error);
      throw error;
    }
  };

  const resetRecordingState = () => {
    setRecordingState('stopped');
    setRecordingDuration(0);
    setAudioLevel(0);
    setRecordingError('');
    setIsRecordingInitialized(false);
    setRecordingMetadata({
      lessonName: '',
      subject: '',
      classLevel: '',
      curriculum: ''
    });
    setRecordingAiOptions({
      generateSummary: false,
      generateTest: false
    });
    
    if (recordingService) {
      recordingService.cleanup();
    }
  };

  const formatRecordingDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    }
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  const getRecordingStatusText = () => {
    switch (recordingState) {
      case 'recording': return 'מקליט';
      case 'paused': return 'מושהה';
      case 'stopped': return isRecordingInitialized ? 'מוכן' : 'טוען...';
      default: return 'עצור';
    }
  };

  const getAudioLevelText = () => {
    if (audioLevel > 0.8) return 'רמה גבוהה מדי';
    if (audioLevel < 0.1) return 'רמה נמוכה מדי';
    return 'רמה טובה';
  };

  // Filter and sort lessons based on search term and sort options
  useEffect(() => {
    let filtered = [...lessons];

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(lesson => {
        const lessonName = lesson.metadata?.lessonName?.toLowerCase() || '';
        const filename = lesson.filename?.toLowerCase() || '';
        const subject = lesson.metadata?.subject?.toLowerCase() || '';
        const classLevel = lesson.metadata?.classLevel?.toLowerCase() || '';
        const curriculum = lesson.metadata?.curriculum?.toLowerCase() || '';
        
        return lessonName.includes(searchLower) ||
               filename.includes(searchLower) ||
               subject.includes(searchLower) ||
               classLevel.includes(searchLower) ||
               curriculum.includes(searchLower);
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'filename':
          aValue = a.filename || '';
          bValue = b.filename || '';
          break;
        case 'file_size':
          aValue = a.file_size || 0;
          bValue = b.file_size || 0;
          break;
        case 'created_at':
        default:
          aValue = new Date(a.created_at || 0);
          bValue = new Date(b.created_at || 0);
          break;
      }

      if (sortOrder === 'ASC') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredLessons(filtered);
  }, [lessons, searchTerm, sortBy, sortOrder]);

  const fetchLessons = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      if (!token) {
        const errorDetails = {
          operation: 'fetchLessons',
          step: 'token_validation',
          reason: 'No authentication token found in localStorage',
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        };
        
        ErrorLogger.logClientError('MISSING_AUTH_TOKEN', errorDetails);
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/recordings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorDetails = {
          operation: 'fetchLessons',
          step: 'api_request',
          status: response.status,
          statusText: response.statusText,
          url: '/api/recordings',
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        };

        if (response.status === 401) {
          ErrorLogger.logClientError('FETCH_LESSONS_AUTH_FAILED', {
            ...errorDetails,
            reason: 'Authentication failed - token may be expired or invalid'
          });
          throw new Error('Authentication failed. Please log in again.');
        } else if (response.status === 429) {
          ErrorLogger.logClientError('FETCH_LESSONS_RATE_LIMITED', {
            ...errorDetails,
            reason: 'Rate limit exceeded'
          });
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (response.status >= 500) {
          ErrorLogger.logClientError('FETCH_LESSONS_SERVER_ERROR', {
            ...errorDetails,
            reason: 'Server error - service temporarily unavailable'
          });
          throw new Error('Server temporarily unavailable. Please try again later.');
        } else if (response.status === 404) {
          ErrorLogger.logClientError('FETCH_LESSONS_ENDPOINT_NOT_FOUND', {
            ...errorDetails,
            reason: 'Recordings endpoint not found'
          });
          throw new Error('Recordings endpoint not found. Please check server configuration.');
        }
        
        ErrorLogger.logClientError('FETCH_LESSONS_HTTP_ERROR', {
          ...errorDetails,
          reason: `HTTP error ${response.status}`
        });
        throw new Error(`Failed to fetch recordings: ${response.status}`);
      }

      const data = await response.json();
      
      // Ensure we have recordings array
      const recordings = data.recordings || [];
      
      // Fetch AI content for each recording with better error handling
      const lessonsWithContent = await Promise.all(
        recordings.map(async (recording) => {
          // Always return the recording, even if AI content fetch fails
          const lessonData = {
            ...recording,
            aiContent: null
          };

          try {
            const contentResponse = await fetch(`/api/ai-content/content/${recording.id}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (contentResponse.ok) {
              const contentData = await contentResponse.json();
              // Validate the content structure
              if (contentData && contentData.content) {
                lessonData.aiContent = contentData.content;
              }
            } else {
              ErrorLogger.logClientError('AI_CONTENT_FETCH_FAILED', {
                operation: 'fetchLessons',
                step: 'ai_content_fetch',
                recordingId: recording.id,
                status: contentResponse.status,
                statusText: contentResponse.statusText,
                reason: `AI content fetch failed for recording ${recording.id}`,
                timestamp: new Date().toISOString()
              });
              console.warn(`AI content fetch failed for recording ${recording.id}: ${contentResponse.status}`);
            }
          } catch (error) {
            ErrorLogger.logClientError('AI_CONTENT_FETCH_ERROR', {
              operation: 'fetchLessons',
              step: 'ai_content_fetch',
              recordingId: recording.id,
              error: error.message,
              stack: error.stack,
              reason: `Network or parsing error fetching AI content for recording ${recording.id}`,
              timestamp: new Date().toISOString()
            });
            console.error(`Error fetching AI content for recording ${recording.id}:`, error);
            // Don't throw - just log and continue with null aiContent
          }

          return lessonData;
        })
      );

      setLessons(lessonsWithContent);
      console.log(`Successfully loaded ${lessonsWithContent.length} lessons`);
    } catch (error) {
      ErrorLogger.logClientError('FETCH_LESSONS_ERROR', {
        operation: 'fetchLessons',
        error: error.message,
        stack: error.stack,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        reason: 'General error in fetchLessons function'
      });
      
      console.error('Error fetching lessons:', error);
      setError(`שגיאה בטעינת השיעורים: ${error.message}`);
      // Set empty lessons array so UI doesn't break
      setLessons([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProcessingJobs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ai-content/jobs', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const jobsMap = {};
        data.jobs.forEach(job => {
          jobsMap[job.recording_id] = job;
        });
        setProcessingJobs(jobsMap);
      }
    } catch (error) {
      console.error('Error fetching processing jobs:', error);
    }
  };

  const fetchAIServiceHealth = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/ai-content/health', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAiServiceHealth(data.health);
      }
    } catch (error) {
      console.error('Error fetching AI service health:', error);
    }
  };

  const fetchUserRole = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Try to decode the JWT token to get user role
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUserRole(payload.role || 'student');
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole('student'); // Default to student
    }
  };

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/content-sharing/classes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      setClasses([]);
    }
  };

  const startAIProcessing = async (recordingId) => {
    try {
      const token = localStorage.getItem('token');
      const processingTypes = [];
      
      if (processingOptions.generateSummary) {
        processingTypes.push('summary');
      }
      if (processingOptions.generateQuestions) {
        processingTypes.push('questions');
      }
      
      const response = await fetch(`/api/ai-content/process/${recordingId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          generateSummary: processingOptions.generateSummary,
          generateQuestions: processingOptions.generateQuestions
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start AI processing');
      }

      const data = await response.json();
      console.log('AI processing started:', data);

      // Close modal and refresh lessons
      setProcessingModal(null);
      fetchLessons();

      // Show success message
      alert('עיבוד AI התחיל בהצלחה! תוכל לראות את התוצאות כאן כשהעיבוד יסתיים.');
    } catch (error) {
      console.error('Error starting AI processing:', error);
      alert('שגיאה בהתחלת עיבוד AI');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getAIStatusInfo = (lesson) => {
    const job = processingJobs[lesson.id];
    const { aiContent } = lesson;
    
    // Priority 1: Check if there's an active processing job (including retries)
    if (job) {
      if (job.status === 'processing') {
        return {
          status: 'processing',
          text: 'בעיבוד',
          details: `מעבד ${job.job_type}...`,
          showProgress: true
        };
      } else if (job.status === 'pending') {
        return {
          status: 'processing',
          text: 'ממתין בתור',
          details: 'המשימה ממתינה לעיבוד',
          showProgress: true
        };
      }
    }

    // Priority 2: Check AI content status (successful content overrides failed jobs)
    if (aiContent) {
      const { transcription, summary, questions } = aiContent;
      
      // Check for errors in content
      const hasErrors = (transcription?.error) || (summary?.error) || (questions?.error);
      if (hasErrors) {
        const errors = [];
        if (transcription?.error) errors.push(`תמליל: ${transcription.error}`);
        if (summary?.error) errors.push(`סיכום: ${summary.error}`);
        if (questions?.error) errors.push(`שאלות: ${questions.error}`);
        
        return {
          status: 'failed',
          text: 'נכשל חלקית',
          details: 'חלק מהעיבוד נכשל',
          showError: true,
          errors
        };
      }
      
      // Check completion status
      if (transcription && summary && questions?.length > 0) {
        return {
          status: 'completed',
          text: 'הושלם',
          details: `תמליל, סיכום ו-${questions.length} שאלות`
        };
      } else if (transcription || summary || questions?.length > 0) {
        const completed = [];
        if (transcription) completed.push('תמליל');
        if (summary) completed.push('סיכום');
        if (questions?.length > 0) completed.push(`${questions.length} שאלות`);
        
        return {
          status: 'completed',
          text: 'הושלם חלקית',
          details: `הושלם: ${completed.join(', ')}`,
          showWarning: true
        };
      }
    }

    // Priority 3: Check for failed jobs (only if no successful content exists)
    if (job && job.status === 'failed') {
      return {
        status: 'failed',
        text: 'נכשל',
        details: job.error_message || 'עיבוד AI נכשל',
        showError: true
      };
    }

    // Priority 4: Default pending state
    if (!aiContent) {
      // Check if AI service is healthy
      if (aiServiceHealth && !aiServiceHealth.configuration.valid) {
        return {
          status: 'failed',
          text: 'שירות לא זמין',
          details: 'שירותי AI אינם מוגדרים כראוי',
          showError: true,
          configIssues: aiServiceHealth.configuration.issues
        };
      }
      return {
        status: 'pending',
        text: 'ממתין',
        details: 'לא הופק תוכן AI עדיין'
      };
    }

    return {
      status: 'pending',
      text: 'ממתין',
      details: 'לא הופק תוכן AI עדיין'
    };
  };

  const renderAIStatusSection = (lesson) => {
    const statusInfo = getAIStatusInfo(lesson);
    const { aiContent } = lesson;
    const job = processingJobs[lesson.id];
    const isErrorVisible = visibleErrors[lesson.id] || false;
    
    // Determine stage statuses
    const getStageStatus = (contentType) => {
      if (job && job.job_type === contentType) {
        if (job.status === 'processing') return 'processing';
        if (job.status === 'failed') return 'failed';
      }
      
      if (!aiContent) return 'pending';
      
      const content = aiContent[contentType];
      if (content?.error) return 'failed';
      if (content && (contentType === 'questions' ? content.length > 0 : content.transcription_text || content.summary_text)) {
        return 'success';
      }
      
      return 'pending';
    };

    const transcriptionStatus = getStageStatus('transcription');
    const summaryStatus = getStageStatus('summary');
    const questionsStatus = getStageStatus('questions');
    
    return (
      <AIStatusSection>
        <InfoRow>
          <InfoLabel>סטטוס AI:</InfoLabel>
          <StatusBadge className={statusInfo.status}>
            {statusInfo.text}
          </StatusBadge>
        </InfoRow>
        
        <StatusDetails>
          {statusInfo.details}
        </StatusDetails>

        {/* AI Processing Stages */}
        <AIStagesList>
          <AIStage>
            <StageIcon className={transcriptionStatus}>
              {transcriptionStatus === 'success' ? '✓' : transcriptionStatus === 'failed' ? '✗' : transcriptionStatus === 'processing' ? '⟳' : '○'}
            </StageIcon>
            <StageText className={transcriptionStatus}>תמליל</StageText>
          </AIStage>
          
          <AIStage>
            <StageIcon className={summaryStatus}>
              {summaryStatus === 'success' ? '✓' : summaryStatus === 'failed' ? '✗' : summaryStatus === 'processing' ? '⟳' : '○'}
            </StageIcon>
            <StageText className={summaryStatus}>סיכום</StageText>
          </AIStage>
          
          <AIStage>
            <StageIcon className={questionsStatus}>
              {questionsStatus === 'success' ? '✓' : questionsStatus === 'failed' ? '✗' : questionsStatus === 'processing' ? '⟳' : '○'}
            </StageIcon>
            <StageText className={questionsStatus}>שאלות בחינה</StageText>
          </AIStage>
        </AIStagesList>

        {/* View Buttons Row */}
        <ViewButtonsRow>
          <ViewButton 
            className={aiContent?.transcription?.transcription_text ? 'available' : 'unavailable'}
            onClick={() => {
              if (aiContent?.transcription?.transcription_text) {
                setTranscriptionModal({
                  title: `תמליל - ${lesson.metadata?.lessonName || `הקלטה ${lesson.id}`}`,
                  content: aiContent.transcription.transcription_text
                });
              }
            }}
            disabled={!aiContent?.transcription?.transcription_text}
          >
            צפה בתמליל
          </ViewButton>
          
          <ViewButton 
            className={aiContent?.summary?.summary_text ? 'available' : 'unavailable'}
            onClick={() => {
              if (aiContent?.summary?.summary_text) {
                alert(aiContent.summary.summary_text);
              }
            }}
            disabled={!aiContent?.summary?.summary_text}
          >
            צפה בסיכום
          </ViewButton>
          
          <ViewButton 
            className={aiContent?.questions?.length > 0 ? 'available' : 'unavailable'}
            onClick={() => {
              if (aiContent?.questions?.length > 0) {
                const questionsText = aiContent.questions
                  .filter(q => q && q.question_text)
                  .map((q, i) => {
                    let questionText = `שאלה ${i + 1}: ${q.question_text}\n`;
                    
                    if (q.answer_options && Array.isArray(q.answer_options)) {
                      questionText += q.answer_options.map((opt, j) => 
                        `${String.fromCharCode(97 + j)}) ${opt}`
                      ).join('\n') + '\n';
                    }
                    
                    if (q.correct_answer) {
                      questionText += `תשובה נכונה: ${q.correct_answer}\n`;
                    }
                    
                    return questionText;
                  })
                  .join('\n---\n');
                
                if (questionsText.trim()) {
                  alert(questionsText);
                } else {
                  alert('אין שאלות זמינות');
                }
              }
            }}
            disabled={!aiContent?.questions?.length}
          >
            צפה במבחן
          </ViewButton>
          
          {/* Toggle Error Button - only show if there are errors */}
          {statusInfo.showError && (
            <ToggleErrorButton
              onClick={() => {
                setVisibleErrors(prev => ({
                  ...prev,
                  [lesson.id]: !prev[lesson.id]
                }));
              }}
            >
              {isErrorVisible ? 'הסתר שגיאה' : 'הצג שגיאה'}
            </ToggleErrorButton>
          )}
        </ViewButtonsRow>

        {/* Show error details only when toggled on */}
        {statusInfo.showError && isErrorVisible && (
          <ErrorDetails>
            <strong>שגיאה:</strong> {statusInfo.details}
            {statusInfo.errors && (
              <div style={{ marginTop: '0.5rem' }}>
                {statusInfo.errors.map((error, index) => (
                  <div key={index}>• {error}</div>
                ))}
              </div>
            )}
            {statusInfo.configIssues && (
              <div style={{ marginTop: '0.5rem' }}>
                <strong>בעיות תצורה:</strong>
                {statusInfo.configIssues.map((issue, index) => (
                  <div key={index}>• {issue}</div>
                ))}
              </div>
            )}
          </ErrorDetails>
        )}

        {statusInfo.showWarning && (
          <WarningDetails>
            <strong>התראה:</strong> העיבוד לא הושלם במלואו. ייתכן שחלק מהשירותים נכשלו.
          </WarningDetails>
        )}
      </AIStatusSection>
    );
  };

  const handleFileSelect = (file) => {
    // Clear previous errors
    setUploadError('');
    setUploadSuccess('');
    
    // Validate file type - be more specific about supported formats
    const supportedTypes = [
      'audio/mpeg',     // MP3
      'audio/mp3',      // MP3 (alternative)
      'audio/wav',      // WAV
      'audio/webm',     // WebM
      'audio/ogg',      // OGG
      'audio/m4a',      // M4A
      'audio/mp4',      // MP4 audio
      'audio/x-m4a'     // M4A (alternative)
    ];
    
    const isValidType = file.type.startsWith('audio/') || supportedTypes.includes(file.type);
    
    if (!isValidType) {
      setUploadError('אנא בחר קובץ אודיו תקין (MP3, WAV, WebM, M4A, OGG)');
      return;
    }

    // Additional validation for file extensions
    const fileName = file.name.toLowerCase();
    const supportedExtensions = ['.mp3', '.wav', '.webm', '.ogg', '.m4a', '.mp4'];
    const hasValidExtension = supportedExtensions.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension) {
      setUploadError('אנא בחר קובץ עם סיומת תקינה: MP3, WAV, WebM, M4A, OGG');
      return;
    }

    // Validate file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      setUploadError('גודל הקובץ חייב להיות קטן מ-100MB');
      return;
    }

    // Warn about large files that might cause transcription timeouts
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 15) {
      console.warn(`Large file detected: ${fileSizeMB.toFixed(1)}MB. Transcription may take longer.`);
    }

    setSelectedFile(file);
    
    // Auto-generate lesson name from file name if not set
    if (!lessonName) {
      const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
      setLessonName(fileName);
    }
  };

  const handleUpload = async (isRetry = false) => {
    if (!selectedFile) {
      setUploadError('אנא בחר קובץ לעלות');
      return;
    }

    if (!lessonName.trim()) {
      setUploadError('אנא הכנס שם לשיעור');
      return;
    }

    // Clear previous messages
    setUploadError('');
    setUploadSuccess('');

    try {
      setUploading(true);
      setUploadProgress(0);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('לא נמצא טוקן אימות. אנא התחבר מחדש.');
      }

      const formData = new FormData();
      formData.append('audio', selectedFile);
      formData.append('recordingId', `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
      formData.append('metadata', JSON.stringify({
        lessonName: lessonName.trim(),
        uploadedAt: new Date().toISOString(),
        originalFileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        retryAttempt: isRetry ? retryCount + 1 : 0
      }));

      const xhr = new XMLHttpRequest();
      let uploadStartTime = Date.now();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
          
          // Calculate upload speed and ETA
          const elapsed = (Date.now() - uploadStartTime) / 1000;
          const speed = e.loaded / elapsed;
          const remaining = (e.total - e.loaded) / speed;
          
          console.log(`Upload progress: ${progress}% (${formatFileSize(e.loaded)}/${formatFileSize(e.total)}) - ETA: ${Math.round(remaining)}s`);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        try {
          console.log('Upload completed with status:', xhr.status);
          
          if (xhr.status === 200 || xhr.status === 201) {
            let response;
            try {
              response = JSON.parse(xhr.responseText);
            } catch (parseError) {
              console.error('Failed to parse response:', xhr.responseText);
              throw new Error('תגובת השרת אינה תקינה');
            }
            
            console.log('Upload response:', response);
            
            if (response.success) {
              setUploadSuccess('הקובץ הועלה בהצלחה! מרענן את רשימת השיעורים...');
              setRetryCount(0);
              
              // Wait a moment to show success message
              setTimeout(() => {
                setUploadModal(false);
                setSelectedFile(null);
                setLessonName('');
                setUploadProgress(0);
                setUploading(false);
                setUploadError('');
                setUploadSuccess('');
                
                // Refresh lessons list
                fetchLessons();
              }, 2000);
            } else {
              throw new Error(response.error || 'העלאה נכשלה - תגובת שרת לא תקינה');
            }
          } else if (xhr.status === 413) {
            throw new Error('הקובץ גדול מדי. אנא בחר קובץ קטן יותר (עד 100MB)');
          } else if (xhr.status === 401) {
            throw new Error('אין הרשאה. אנא התחבר מחדש למערכת');
          } else if (xhr.status === 400) {
            let errorMessage = 'בקשה לא תקינה';
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              errorMessage = errorResponse.error || errorMessage;
            } catch (e) {
              // Use default message if can't parse
            }
            throw new Error(errorMessage);
          } else if (xhr.status >= 500) {
            throw new Error(`שגיאת שרת (${xhr.status}). אנא נסה שוב מאוחר יותר`);
          } else {
            let errorMessage = `שגיאה לא צפויה: ${xhr.status}`;
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              errorMessage = errorResponse.error || errorMessage;
            } catch (e) {
              errorMessage = xhr.statusText || errorMessage;
            }
            throw new Error(errorMessage);
          }
        } catch (error) {
          console.error('Error processing upload response:', error);
          throw error;
        }
      });

      // Handle network errors
      xhr.addEventListener('error', (e) => {
        console.error('Network error during upload:', e);
        const errorMsg = 'שגיאת רשת - בדוק את החיבור לאינטרנט ושהשרת פועל';
        throw new Error(errorMsg);
      });

      // Handle timeout
      xhr.addEventListener('timeout', () => {
        console.error('Upload timeout');
        throw new Error('זמן ההעלאה פג. הקובץ גדול מדי או החיבור איטי');
      });

      // Handle abort
      xhr.addEventListener('abort', () => {
        console.log('Upload aborted');
        throw new Error('העלאה בוטלה');
      });

      // Set timeout based on file size (minimum 2 minutes, up to 10 minutes for large files)
      const timeoutMinutes = Math.min(10, Math.max(2, selectedFile.size / (1024 * 1024))); // 1 minute per MB, min 2, max 10
      xhr.timeout = timeoutMinutes * 60 * 1000;

      // Start upload
      xhr.open('POST', '/api/recordings/upload');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      
      console.log('Starting upload:', {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        timeout: `${timeoutMinutes} minutes`,
        isRetry: isRetry,
        retryCount: retryCount
      });
      
      xhr.send(formData);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(`שגיאה בהעלאת הקובץ: ${error.message}`);
      setUploading(false);
      setUploadProgress(0);
      
      // Increment retry count for network-related errors
      if (error.message.includes('רשת') || error.message.includes('זמן') || error.message.includes('שרת')) {
        setRetryCount(prev => prev + 1);
      }
    }
  };

  const resetUploadModal = () => {
    setUploadModal(false);
    setSelectedFile(null);
    setLessonName('');
    setUploadProgress(0);
    setUploading(false);
    setUploadError('');
    setUploadSuccess('');
    setRetryCount(0);
    setDragOver(false);
  };

  // Delete lesson functionality
  const handleDeleteLesson = async (lesson) => {
    try {
      setDeleting(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/recordings/${lesson.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete lesson');
      }

      // Remove lesson from state
      setLessons(prev => prev.filter(l => l.id !== lesson.id));
      setDeleteModal(null);
      
      alert('השיעור נמחק בהצלחה');
    } catch (error) {
      console.error('Error deleting lesson:', error);
      alert('שגיאה במחיקת השיעור');
    } finally {
      setDeleting(false);
    }
  };

  // Enhanced content sharing functionality with better error handling
  const handleShare = async () => {
    if (!shareModal || selectedClasses.length === 0 || Object.values(shareOptions).every(v => !v)) {
      alert('אנא בחר תוכן וכיתות לשיתוף');
      return;
    }

    setSharing(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('לא נמצא טוקן אימות. אנא התחבר מחדש.');
      }

      console.log('Sharing content:', {
        recordingId: shareModal.id,
        contentTypes: Object.keys(shareOptions).filter(key => shareOptions[key]),
        classIds: selectedClasses,
        startDate: shareSchedule.startDate || null,
        endDate: shareSchedule.endDate || null
      });

      const response = await fetch('/api/content-sharing/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recordingId: shareModal.id,
          contentTypes: Object.keys(shareOptions).filter(key => shareOptions[key]),
          classIds: selectedClasses,
          startDate: shareSchedule.startDate || null,
          endDate: shareSchedule.endDate || null
        })
      });

      const data = await response.json();
      console.log('Share response:', data);

      if (response.ok && data.success) {
        // Show detailed success message
        const sharedTypes = Object.keys(shareOptions).filter(key => shareOptions[key]);
        const typeNames = {
          transcription: 'תמליל',
          summary: 'סיכום',
          test: 'מבחן'
        };
        const sharedTypeNames = sharedTypes.map(type => typeNames[type]).join(', ');
        
        alert(`התוכן שותף בהצלחה!\n\nתוכן שהושתף: ${sharedTypeNames}\nמספר כיתות: ${selectedClasses.length}\n${data.details?.totalStudents ? `סה"כ תלמידים: ${data.details.totalStudents}` : ''}`);
        
        // Reset modal state
        setShareModal(null);
        setShareOptions({ transcription: false, summary: false, test: false });
        setSelectedClasses([]);
        setShareSchedule({ startDate: '', endDate: '' });
      } else {
        // Handle different types of errors with user-friendly messages
        let errorMessage = 'שגיאה בשיתוף התוכן';
        
        if (data.userFriendlyMessage) {
          errorMessage = data.userFriendlyMessage;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (response.status === 401) {
          errorMessage = 'אין הרשאה. אנא התחבר מחדש למערכת.';
        } else if (response.status === 403) {
          errorMessage = 'אין לך הרשאה לבצע פעולה זו. פעולה זו מיועדת למורים בלבד.';
        } else if (response.status === 404) {
          errorMessage = 'ההקלטה או הכיתות שבחרת לא נמצאו. ייתכן שהן נמחקו.';
        } else if (response.status === 400) {
          if (data.code === 'CONTENT_NOT_AVAILABLE') {
            errorMessage = `לא ניתן לשתף את התוכן המבוקש:\n${data.error}\n\nאנא צור תחילה את התוכן החסר באמצעות עיבוד AI.`;
          } else if (data.code === 'VALIDATION_ERROR') {
            errorMessage = 'הנתונים שהוזנו אינם תקינים. אנא בדוק את הפרטים ונסה שוב.';
          } else {
            errorMessage = data.error || 'נתונים לא תקינים';
          }
        } else if (response.status >= 500) {
          errorMessage = 'שגיאה בשרת. אנא נסה שוב מאוחר יותר.';
        }

        // Show detailed error information in development
        if (process.env.NODE_ENV === 'development' && data.details) {
          console.error('Detailed error:', data.details);
          errorMessage += `\n\nפרטי שגיאה (מצב פיתוח):\n${data.details.message || 'לא זמין'}`;
        }

        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error sharing content:', error);
      
      // Handle network errors
      let displayError = error.message;
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        displayError = 'שגיאת רשת. אנא בדוק את החיבור לאינטרנט ונסה שוב.';
      } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        displayError = 'לא ניתן להתחבר לשרת. אנא בדוק את החיבור לאינטרנט ונסה שוב.';
      }
      
      alert(`שגיאה בשיתוף התוכן:\n\n${displayError}`);
    } finally {
      setSharing(false);
    }
  };

  // Flashcard generation functionality
  const handleGenerateFlashcards = async () => {
    if (!flashcardModal) return;

    setGeneratingFlashcards(true);
    setFlashcardProgress(0);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('לא נמצא טוקן אימות. אנא התחבר מחדש.');
      }

      // Auto-populate config from lesson metadata
      const updatedConfig = {
        ...flashcardConfig,
        subjectArea: flashcardModal.metadata?.subject || flashcardConfig.subjectArea,
        gradeLevel: flashcardModal.metadata?.classLevel || flashcardConfig.gradeLevel
      };

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setFlashcardProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 15;
        });
      }, 500);

      console.log('Generating flashcards for lesson:', flashcardModal.id, 'with config:', updatedConfig);

      const response = await fetch(`/api/memory-cards/generate/from-lesson/${flashcardModal.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ config: updatedConfig })
      });

      clearInterval(progressInterval);
      setFlashcardProgress(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'שגיאה ביצירת כרטיסי זיכרון');
      }

      const result = await response.json();
      
      if (result.success && result.cards) {
        // Show success message
        const lessonName = flashcardModal.metadata?.lessonName || `הקלטה ${flashcardModal.id}`;
        alert(`נוצרו ${result.cards.length} כרטיסי זיכרון בהצלחה עבור השיעור "${lessonName}"!\n\nהכרטיסים נשמרו ויהיו זמינים בלשונית "כרטיסי זיכרון".`);
        
        // Close modal and reset state
        setFlashcardModal(null);
        setFlashcardProgress(0);
        setFlashcardConfig({
          cardCount: 10,
          difficultyLevel: 'medium',
          subjectArea: '',
          gradeLevel: '',
          language: 'hebrew'
        });
      } else {
        throw new Error('לא הצלחנו ליצור כרטיסי זיכרון');
      }

    } catch (error) {
      console.error('Error generating flashcards:', error);
      alert(`שגיאה ביצירת כרטיסי זיכרון:\n\n${error.message}`);
    } finally {
      setGeneratingFlashcards(false);
      setFlashcardProgress(0);
    }
  };

  if (loading) {
    return (
      <Container>
        <LoadingMessage>טוען שיעורים...</LoadingMessage>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorMessage>{error}</ErrorMessage>
        <RefreshButton onClick={fetchLessons}>נסה שוב</RefreshButton>
      </Container>
    );
  }

  return (
    <>
      <Container>
        <Header>
          <Title>שיעורים</Title>
          <HeaderButtons>
            <UploadButton className="record" onClick={() => setRecordingModal(true)}>
              הקלט שיעור
            </UploadButton>
            <UploadButton onClick={() => setUploadModal(true)}>
              העלה הקלטה
            </UploadButton>
            <RefreshButton onClick={fetchLessons}>רענן</RefreshButton>
          </HeaderButtons>
        </Header>

        {/* AI Service Health Indicator */}
        {aiServiceHealth && (
          <ServiceHealthIndicator className={aiServiceHealth.configuration.valid ? 'healthy' : 'unhealthy'}>
            <HealthDot className={aiServiceHealth.configuration.valid ? 'healthy' : 'unhealthy'} />
            {aiServiceHealth.configuration.valid ? 'שירותי AI פעילים' : 'שירותי AI לא זמינים'}
            {!aiServiceHealth.configuration.valid && aiServiceHealth.configuration.issues && (
              <span style={{ marginRight: '0.5rem' }}>
                - {aiServiceHealth.configuration.issues[0]}
              </span>
            )}
          </ServiceHealthIndicator>
        )}

        {/* Search and Filter Section */}
        {lessons.length > 0 && (
          <SearchAndFilterSection>
            <SearchInput
              type="text"
              placeholder="חפש שיעורים..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <FilterSelect
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="created_at">תאריך יצירה</option>
              <option value="filename">שם קובץ</option>
              <option value="file_size">גודל קובץ</option>
            </FilterSelect>
            <FilterGroup>
              <FilterSelect
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="DESC">יורד</option>
                <option value="ASC">עולה</option>
              </FilterSelect>
            </FilterGroup>
          </SearchAndFilterSection>
        )}

        {lessons.length === 0 ? (
          <EmptyState>
            <h3>אין שיעורים עדיין</h3>
            <p>השתמש בלשונית "הקלטת שיעור" כדי להקליט שיעור חדש</p>
          </EmptyState>
        ) : (
          <LessonGrid>
            {(filteredLessons.length > 0 ? filteredLessons : lessons).map((lesson) => {
              const statusInfo = getAIStatusInfo(lesson);
              const { aiContent } = lesson;

              return (
                <LessonCard key={lesson.id}>
                  {/* Row 1 - Header (Time, Date, Lesson Name) */}
                  <LessonHeader>
                    <LessonTitle>
                      {lesson.metadata?.lessonName || `הקלטה ${lesson.id}`}
                    </LessonTitle>
                    <LessonDate>{formatDate(lesson.created_at)}</LessonDate>
                  </LessonHeader>

                  {/* Row 2 - Recording Details */}
                  <RecordingDetailsRow>
                    <RecordingDetail>
                      משך: {formatDuration(lesson.metadata?.duration || 0)}
                    </RecordingDetail>
                    <RecordingDetail>
                      גודל: {formatFileSize(lesson.file_size)}
                    </RecordingDetail>
                  </RecordingDetailsRow>

                  {/* Row 3 - Text-Based Action Buttons */}
                  <ButtonsRow>
                    {/* Play Button */}
                    <TooltipContainer>
                      <TextActionButton
                        className="play"
                        disabled={currentlyPlaying === lesson.id && audioPlayerData?.loading}
                        onMouseEnter={() => showTooltip(lesson.id, 'play', getTooltipText(lesson, 'play'))}
                        onMouseLeave={() => hideTooltip(lesson.id, 'play')}
                        onClick={async () => {
                          try {
                            setCurrentlyPlaying(lesson.id);
                            
                            // Show loading state
                            setAudioPlayerData({
                              id: lesson.id,
                              title: lesson.metadata?.lessonName || `הקלטה ${lesson.id}`,
                              loading: true
                            });
                            
                            // Fetch audio data and convert to blob
                            const token = localStorage.getItem('token');
                            const response = await fetch(`/api/recordings/${lesson.id}/download`, {
                              headers: {
                                'Authorization': `Bearer ${token}`
                              }
                            });
                            
                            if (!response.ok) {
                              throw new Error(`Failed to fetch audio: ${response.status}`);
                            }
                            
                            const audioBlob = await response.blob();
                            
                            setAudioPlayerData({
                              id: lesson.id,
                              title: lesson.metadata?.lessonName || `הקלטה ${lesson.id}`,
                              audioBlob: audioBlob,
                              metadata: lesson.metadata || {},
                              loading: false
                            });
                          } catch (error) {
                            console.error('Error loading audio:', error);
                            alert('שגיאה בטעינת הקובץ השמע: ' + error.message);
                            setAudioPlayerData(null);
                            setCurrentlyPlaying(null);
                          }
                        }}
                      >
                        {currentlyPlaying === lesson.id && audioPlayerData?.loading ? 'טוען...' : 'השמע'}
                      </TextActionButton>
                      <Tooltip show={tooltips[`${lesson.id}-play`]}>
                        {tooltips[`${lesson.id}-play`]}
                      </Tooltip>
                    </TooltipContainer>

                    {/* Delete Button */}
                    <TooltipContainer>
                      <TextActionButton
                        className="delete"
                        disabled={deleting}
                        onMouseEnter={() => showTooltip(lesson.id, 'delete', getTooltipText(lesson, 'delete'))}
                        onMouseLeave={() => hideTooltip(lesson.id, 'delete')}
                        onClick={() => setDeleteModal(lesson)}
                      >
                        {deleting ? 'מוחק...' : 'מחק'}
                      </TextActionButton>
                      <Tooltip show={tooltips[`${lesson.id}-delete`]}>
                        {tooltips[`${lesson.id}-delete`]}
                      </Tooltip>
                    </TooltipContainer>

                    {/* Share Button - Only for teachers */}
                    {userRole === 'teacher' && (
                      <TooltipContainer>
                        <TextActionButton
                          className="success"
                          onMouseEnter={() => showTooltip(lesson.id, 'share', 'שתף תוכן עם תלמידים')}
                          onMouseLeave={() => hideTooltip(lesson.id, 'share')}
                          onClick={() => setShareModal(lesson)}
                        >
                          שתף
                        </TextActionButton>
                        <Tooltip show={tooltips[`${lesson.id}-share`]}>
                          {tooltips[`${lesson.id}-share`]}
                        </Tooltip>
                      </TooltipContainer>
                    )}

                    {/* Merged AI Menu Button */}
                    <TooltipContainer>
                      <AIExpandedMenuButton
                        className={getAIButtonClass(statusInfo)}
                        onMouseEnter={() => showTooltip(lesson.id, 'ai-menu', getTooltipText(lesson, 'ai-menu'))}
                        onMouseLeave={() => hideTooltip(lesson.id, 'ai-menu')}
                        onClick={() => {
                          setExpandedAIMenu(prev => ({
                            ...prev,
                            [lesson.id]: !prev[lesson.id]
                          }));
                        }}
                      >
                        <AIStatusButtonIcon>{getAIButtonIcon(statusInfo)}</AIStatusButtonIcon>
                        <AIStatusButtonText>AI - {statusInfo.text}</AIStatusButtonText>
                      </AIExpandedMenuButton>
                      <Tooltip show={tooltips[`${lesson.id}-ai-menu`]}>
                        {tooltips[`${lesson.id}-ai-menu`]}
                      </Tooltip>
                    </TooltipContainer>
                  </ButtonsRow>

                  {/* Row 4 - Merged AI Menu */}
                  {expandedAIMenu[lesson.id] && (
                    <ExpandableAIStatus>
                      <AIStatusContent expanded={true}>
                        {/* Merged AI Stages with Action Buttons - Two Column Grid */}
                        <AIStagesGrid style={{ marginBottom: '1.5rem' }}>
                          {/* Transcription Stage-Action Card */}
                          <AIStageCard
                            as="button"
                            disabled={!aiContent?.transcription?.transcription_text && getAIStageStatus(lesson, 'transcription') !== 'processing'}
                            onClick={() => {
                              if (aiContent?.transcription?.transcription_text) {
                                setTranscriptionModal({
                                  title: `תמליל - ${lesson.metadata?.lessonName || `הקלטה ${lesson.id}`}`,
                                  content: aiContent.transcription.transcription_text
                                });
                                setExpandedAIMenu(prev => ({
                                  ...prev,
                                  [lesson.id]: false
                                }));
                              }
                            }}
                            style={{ 
                              cursor: aiContent?.transcription?.transcription_text ? 'pointer' : 'default',
                              opacity: !aiContent?.transcription?.transcription_text && getAIStageStatus(lesson, 'transcription') !== 'processing' ? 0.6 : 1
                            }}
                          >
                            <AIStageCardIcon className={getAIStageStatus(lesson, 'transcription')}>
                              {getAIStageIcon(getAIStageStatus(lesson, 'transcription'))}
                            </AIStageCardIcon>
                            <AIStageCardContent>
                              <AIStageCardTitle>תמליל</AIStageCardTitle>
                              <AIStageCardStatus>
                                {getAIStageStatus(lesson, 'transcription') === 'success' ? 'הושלם בהצלחה - לחץ לצפייה' :
                                 getAIStageStatus(lesson, 'transcription') === 'processing' ? 'בעיבוד...' :
                                 getAIStageStatus(lesson, 'transcription') === 'failed' ? 'נכשל' : 'ממתין'}
                              </AIStageCardStatus>
                              {aiContent?.transcription?.transcription_text && (
                                <AIStageCardMeta>
                                  <span>{Math.round(aiContent.transcription.transcription_text.length / 100)} מילים</span>
                                  <span>•</span>
                                  <span>זמין לצפייה</span>
                                </AIStageCardMeta>
                              )}
                            </AIStageCardContent>
                          </AIStageCard>

                          {/* Summary Stage-Action Card */}
                          <AIStageCard
                            as="button"
                            disabled={!aiContent?.summary?.summary_text && getAIStageStatus(lesson, 'summary') !== 'processing'}
                            onClick={() => {
                              if (aiContent?.summary?.summary_text) {
                                setSummaryModal({
                                  title: `סיכום - ${lesson.metadata?.lessonName || `הקלטה ${lesson.id}`}`,
                                  content: aiContent.summary.summary_text
                                });
                                setExpandedAIMenu(prev => ({
                                  ...prev,
                                  [lesson.id]: false
                                }));
                              }
                            }}
                            style={{ 
                              cursor: aiContent?.summary?.summary_text ? 'pointer' : 'default',
                              opacity: !aiContent?.summary?.summary_text && getAIStageStatus(lesson, 'summary') !== 'processing' ? 0.6 : 1
                            }}
                          >
                            <AIStageCardIcon className={getAIStageStatus(lesson, 'summary')}>
                              {getAIStageIcon(getAIStageStatus(lesson, 'summary'))}
                            </AIStageCardIcon>
                            <AIStageCardContent>
                              <AIStageCardTitle>סיכום</AIStageCardTitle>
                              <AIStageCardStatus>
                                {getAIStageStatus(lesson, 'summary') === 'success' ? 'הושלם בהצלחה - לחץ לצפייה' :
                                 getAIStageStatus(lesson, 'summary') === 'processing' ? 'בעיבוד...' :
                                 getAIStageStatus(lesson, 'summary') === 'failed' ? 'נכשל' : 'ממתין'}
                              </AIStageCardStatus>
                              {aiContent?.summary?.summary_text && (
                                <AIStageCardMeta>
                                  <span>{Math.round(aiContent.summary.summary_text.length / 50)} מילים</span>
                                  <span>•</span>
                                  <span>זמין לצפייה</span>
                                </AIStageCardMeta>
                              )}
                            </AIStageCardContent>
                          </AIStageCard>

                          {/* Questions Stage-Action Card */}
                          <AIStageCard
                            as="button"
                            disabled={!aiContent?.questions?.length && getAIStageStatus(lesson, 'questions') !== 'processing'}
                            onClick={() => {
                              if (aiContent?.questions?.length > 0) {
                                setTestModal({
                                  title: `מבחן - ${lesson.metadata?.lessonName || `הקלטה ${lesson.id}`} (${aiContent.questions.length} שאלות)`,
                                  questions: aiContent.questions.filter(q => q && q.question_text)
                                });
                                setExpandedAIMenu(prev => ({
                                  ...prev,
                                  [lesson.id]: false
                                }));
                              }
                            }}
                            style={{ 
                              cursor: aiContent?.questions?.length > 0 ? 'pointer' : 'default',
                              opacity: !aiContent?.questions?.length && getAIStageStatus(lesson, 'questions') !== 'processing' ? 0.6 : 1
                            }}
                          >
                            <AIStageCardIcon className={getAIStageStatus(lesson, 'questions')}>
                              {getAIStageIcon(getAIStageStatus(lesson, 'questions'))}
                            </AIStageCardIcon>
                            <AIStageCardContent>
                              <AIStageCardTitle>שאלות בחינה</AIStageCardTitle>
                              <AIStageCardStatus>
                                {getAIStageStatus(lesson, 'questions') === 'success' ? `${aiContent?.questions?.length || 0} שאלות - לחץ לצפייה` :
                                 getAIStageStatus(lesson, 'questions') === 'processing' ? 'בעיבוד...' :
                                 getAIStageStatus(lesson, 'questions') === 'failed' ? 'נכשל' : 'ממתין'}
                              </AIStageCardStatus>
                              {aiContent?.questions?.length > 0 && (
                                <AIStageCardMeta>
                                  <span>{aiContent.questions.length} שאלות</span>
                                  <span>•</span>
                                  <span>זמין לצפייה</span>
                                </AIStageCardMeta>
                              )}
                            </AIStageCardContent>
                          </AIStageCard>

                          {/* Flashcards Stage-Action Card */}
                          <AIStageCard
                            as="button"
                            disabled={!aiContent?.transcription?.transcription_text}
                            onClick={() => {
                              if (aiContent?.transcription?.transcription_text) {
                                setFlashcardModal(lesson);
                                setExpandedAIMenu(prev => ({
                                  ...prev,
                                  [lesson.id]: false
                                }));
                              }
                            }}
                            style={{ 
                              cursor: aiContent?.transcription?.transcription_text ? 'pointer' : 'default',
                              opacity: !aiContent?.transcription?.transcription_text ? 0.6 : 1
                            }}
                          >
                            <AIStageCardIcon className="available">
                              🃏
                            </AIStageCardIcon>
                            <AIStageCardContent>
                              <AIStageCardTitle>כרטיסי זיכרון</AIStageCardTitle>
                              <AIStageCardStatus>
                                {aiContent?.transcription?.transcription_text ? 'צור כרטיסי זיכרון מהתמליל' : 'דרוש תמליל ליצירת כרטיסים'}
                              </AIStageCardStatus>
                              {aiContent?.transcription?.transcription_text && (
                                <AIStageCardMeta>
                                  <span>יצירה אוטומטית</span>
                                  <span>•</span>
                                  <span>מבוסס על תמליל</span>
                                </AIStageCardMeta>
                              )}
                            </AIStageCardContent>
                          </AIStageCard>

                          {/* Generate/Regenerate AI Content Card */}
                          <AIStageCard
                            as="button"
                            onClick={() => {
                              setProcessingModal(lesson);
                              setExpandedAIMenu(prev => ({
                                ...prev,
                                [lesson.id]: false
                              }));
                            }}
                            style={{ 
                              cursor: 'pointer',
                              background: statusInfo.status === 'pending' ? 'linear-gradient(135deg, #f39c12, #e67e22)' : 
                                         statusInfo.status === 'failed' ? 'linear-gradient(135deg, #e74c3c, #c0392b)' :
                                         'linear-gradient(135deg, #3498db, #2980b9)',
                              color: 'white',
                              border: 'none'
                            }}
                          >
                            <AIStageCardIcon style={{ 
                              background: 'rgba(255,255,255,0.2)', 
                              color: 'white',
                              animation: statusInfo.status === 'pending' ? 'generatePulse 2s infinite' : 'none'
                            }}>
                              {statusInfo.status === 'pending' ? '+' : 
                               statusInfo.status === 'failed' ? '🔄' : '🔄'}
                            </AIStageCardIcon>
                            <AIStageCardContent>
                              <AIStageCardTitle style={{ color: 'white' }}>
                                {statusInfo.status === 'pending' ? 'צור תוכן AI' :
                                 statusInfo.status === 'failed' ? 'נסה שוב' : 'צור מחדש'}
                              </AIStageCardTitle>
                              <AIStageCardStatus style={{ color: 'rgba(255,255,255,0.9)' }}>
                                {statusInfo.status === 'pending' ? 'צור תמליל, סיכום ושאלות בחינה' :
                                 statusInfo.status === 'failed' ? 'נסה שוב ליצור תוכן AI' :
                                 'צור מחדש תמליל, סיכום ושאלות'}
                              </AIStageCardStatus>
                            </AIStageCardContent>
                          </AIStageCard>
                        </AIStagesGrid>

                      {/* Error Details Section - Always visible when there are errors */}
                      {statusInfo.showError && (
                        <ErrorExpandSection>
                          <ErrorExpandHeader>
                            <span>⚠️ פרטי שגיאה</span>
                          </ErrorExpandHeader>
                          <ErrorExpandContent expanded={true}>
                            <div><strong>שגיאה:</strong> {statusInfo.details}</div>
                            {statusInfo.errors && statusInfo.errors.map((error, index) => (
                              <div key={index} style={{ marginTop: '0.5rem' }}>• {error}</div>
                            ))}
                            {statusInfo.configIssues && (
                              <div style={{ marginTop: '0.5rem' }}>
                                <strong>בעיות תצורה:</strong>
                                {statusInfo.configIssues.map((issue, index) => (
                                  <div key={index}>• {issue}</div>
                                ))}
                              </div>
                            )}
                            {/* Retry suggestion */}
                            <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f8f9fa', borderRadius: '4px', border: '1px solid #e9ecef' }}>
                              <strong>💡 הצעה:</strong> נסה ליצור תוכן AI מחדש או בדוק את הגדרות השירות
                            </div>
                          </ErrorExpandContent>
                        </ErrorExpandSection>
                      )}
                    </AIStatusContent>
                  </ExpandableAIStatus>

                  )}
                </LessonCard>
              );
            })}
          </LessonGrid>
        )}
      </Container>

      {processingModal && (
        <ProcessingModal>
          <ModalContent>
            <ModalTitle>
              {getAIStatusInfo(processingModal).status === 'failed' ? 'נסה שוב ליצור תוכן AI' : 'צור תוכן AI עבור השיעור'}
            </ModalTitle>
            <p>בחר איזה תוכן תרצה ליצור:</p>
            
            <ProcessingOptions>
              <CheckboxGroup>
                <Checkbox
                  type="checkbox"
                  id="generateSummary"
                  checked={processingOptions.generateSummary}
                  onChange={(e) => setProcessingOptions({
                    ...processingOptions,
                    generateSummary: e.target.checked
                  })}
                />
                <CheckboxLabel htmlFor="generateSummary">
                  צור סיכום של השיעור
                </CheckboxLabel>
              </CheckboxGroup>

              <CheckboxGroup>
                <Checkbox
                  type="checkbox"
                  id="generateQuestions"
                  checked={processingOptions.generateQuestions}
                  onChange={(e) => setProcessingOptions({
                    ...processingOptions,
                    generateQuestions: e.target.checked
                  })}
                />
                <CheckboxLabel htmlFor="generateQuestions">
                  צור שאלות בחינה (10 שאלות)
                </CheckboxLabel>
              </CheckboxGroup>
            </ProcessingOptions>

            <ActionButtons>
              <ActionButton 
                className="success"
                onClick={() => startAIProcessing(processingModal.id)}
                disabled={!processingOptions.generateSummary && !processingOptions.generateQuestions}
              >
                התחל עיבוד
              </ActionButton>
              <ActionButton 
                className="secondary"
                onClick={() => setProcessingModal(null)}
              >
                ביטול
              </ActionButton>
            </ActionButtons>
          </ModalContent>
        </ProcessingModal>
      )}

      {uploadModal && (
        <UploadModal>
          <UploadModalContent>
            <ModalTitle>העלה הקלטת שיעור</ModalTitle>
            
            <FormGroup>
              <FormLabel>שם השיעור</FormLabel>
              <FormInput
                type="text"
                value={lessonName}
                onChange={(e) => setLessonName(e.target.value)}
                placeholder="הכנס שם לשיעור"
              />
            </FormGroup>

            <UploadArea 
              className={dragOver ? 'dragover' : ''}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                  handleFileSelect(files[0]);
                }
              }}
            >
              {selectedFile ? (
                <div>
                  <p>קובץ נבחר: {selectedFile.name}</p>
                  <p>גודל: {formatFileSize(selectedFile.size)}</p>
                </div>
              ) : (
                <div>
                  <p>גרור קובץ אודיו לכאן או</p>
                  <FileInputLabel htmlFor="fileInput">
                    בחר קובץ
                  </FileInputLabel>
                  <FileInput
                    id="fileInput"
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      if (e.target.files.length > 0) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                  />
                  <p style={{ fontSize: '0.8rem', color: '#7f8c8d' }}>
                    קבצי אודיו עד 100MB
                  </p>
                </div>
              )}
            </UploadArea>

            {/* Error Message */}
            {uploadError && (
              <UploadErrorMessage>
                <strong>שגיאה:</strong> {uploadError}
                {retryCount > 0 && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                    ניסיון {retryCount} נכשל
                  </div>
                )}
              </UploadErrorMessage>
            )}

            {/* Success Message */}
            {uploadSuccess && (
              <UploadSuccessMessage>
                <strong>הצלחה:</strong> {uploadSuccess}
              </UploadSuccessMessage>
            )}

            {uploading && (
              <div>
                <p>מעלה קובץ...</p>
                <ProgressBar>
                  <ProgressFill progress={uploadProgress} />
                </ProgressBar>
                <p>{uploadProgress}%</p>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <p style={{ fontSize: '0.8rem', color: '#7f8c8d' }}>
                    אנא המתן, הקובץ נטען...
                  </p>
                )}
              </div>
            )}

            <ActionButtons>
              <ActionButton 
                className="success"
                onClick={() => handleUpload(false)}
                disabled={!selectedFile || uploading || !lessonName.trim()}
              >
                {uploading ? 'מעלה...' : 'העלה'}
              </ActionButton>
              
              {uploadError && retryCount < 3 && !uploading && (
                <RetryButton
                  onClick={() => handleUpload(true)}
                  disabled={uploading}
                >
                  נסה שוב ({retryCount + 1}/3)
                </RetryButton>
              )}
              
              <ActionButton 
                className="secondary"
                onClick={resetUploadModal}
                disabled={uploading}
              >
                ביטול
              </ActionButton>
            </ActionButtons>
          </UploadModalContent>
        </UploadModal>
      )}

      {/* Recording Modal */}
      {recordingModal && (
        <RecordingModalContainer>
          <RecordingModalContent>
            <RecordingHeader>
              <RecordingTitle>הקלטת שיעור</RecordingTitle>
              <StatusIndicator className={recordingState}>
                <StatusDot className={recordingState} />
                {getRecordingStatusText()}
              </StatusIndicator>
            </RecordingHeader>

            {!isRecordingInitialized ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div>טוען מערכת הקלטה...</div>
              </div>
            ) : (
              <ControlsSection>
                <MainControls>
                  {recordingState === 'stopped' && (
                    <ControlButton 
                      className="primary" 
                      onClick={startRecording}
                      disabled={!isRecordingInitialized}
                    >
                      התחל הקלטה
                    </ControlButton>
                  )}
                  
                  {recordingState === 'recording' && (
                    <>
                      <ControlButton 
                        className="warning" 
                        onClick={pauseRecording}
                      >
                        השהה
                      </ControlButton>
                      <ControlButton 
                        className="secondary" 
                        onClick={stopRecording}
                      >
                        עצור
                      </ControlButton>
                    </>
                  )}
                  
                  {recordingState === 'paused' && (
                    <>
                      <ControlButton 
                        className="success" 
                        onClick={resumeRecording}
                      >
                        המשך
                      </ControlButton>
                      <ControlButton 
                        className="secondary" 
                        onClick={stopRecording}
                      >
                        עצור
                      </ControlButton>
                    </>
                  )}
                </MainControls>

                <InfoSection>
                  <InfoItem>
                    <InfoItemLabel>משך הקלטה</InfoItemLabel>
                    <InfoItemValue>{formatRecordingDuration(recordingDuration)}</InfoItemValue>
                  </InfoItem>
                  
                  <InfoItem>
                    <InfoItemLabel>מכשיר הקלטה</InfoItemLabel>
                    <DeviceSelector 
                      value={selectedRecordingDevice} 
                      onChange={(e) => setSelectedRecordingDevice(e.target.value)}
                      disabled={recordingState !== 'stopped'}
                    >
                      {recordingDevices.map(device => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label}
                        </option>
                      ))}
                    </DeviceSelector>
                  </InfoItem>
                  
                  <InfoItem>
                    <InfoItemLabel>רמת אודיו</InfoItemLabel>
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
                  <RecordingFormGroup>
                    <RecordingLabel>שם השיעור</RecordingLabel>
                    <RecordingInput
                      type="text"
                      value={recordingMetadata.lessonName}
                      onChange={(e) => setRecordingMetadata({...recordingMetadata, lessonName: e.target.value})}
                      placeholder="הכנס שם לשיעור"
                    />
                  </RecordingFormGroup>
                  
                  <RecordingFormGroup>
                    <RecordingLabel>מקצוע</RecordingLabel>
                    <RecordingInput
                      type="text"
                      value={recordingMetadata.subject}
                      onChange={(e) => setRecordingMetadata({...recordingMetadata, subject: e.target.value})}
                      placeholder="מקצוע"
                    />
                  </RecordingFormGroup>
                  
                  <RecordingFormGroup>
                    <RecordingLabel>כיתה</RecordingLabel>
                    <RecordingInput
                      type="text"
                      value={recordingMetadata.classLevel}
                      onChange={(e) => setRecordingMetadata({...recordingMetadata, classLevel: e.target.value})}
                      placeholder="כיתה"
                    />
                  </RecordingFormGroup>
                  
                  <RecordingFormGroup>
                    <RecordingLabel>תכנית לימודים</RecordingLabel>
                    <RecordingInput
                      type="text"
                      value={recordingMetadata.curriculum}
                      onChange={(e) => setRecordingMetadata({...recordingMetadata, curriculum: e.target.value})}
                      placeholder="תכנית לימודים"
                    />
                  </RecordingFormGroup>
                  
                  <RecordingCheckboxGroup>
                    <AIOptionsTitle>אפשרויות AI</AIOptionsTitle>
                    <RecordingCheckboxItem>
                      <input
                        type="checkbox"
                        checked={recordingAiOptions.generateSummary}
                        onChange={(e) => setRecordingAiOptions({...recordingAiOptions, generateSummary: e.target.checked})}
                      />
                      צור סיכום אוטומטי
                    </RecordingCheckboxItem>
                    <RecordingCheckboxItem>
                      <input
                        type="checkbox"
                        checked={recordingAiOptions.generateTest}
                        onChange={(e) => setRecordingAiOptions({...recordingAiOptions, generateTest: e.target.checked})}
                      />
                      צור שאלות בחינה
                    </RecordingCheckboxItem>
                  </RecordingCheckboxGroup>
                </MetadataForm>

                {recordingError && (
                  <RecordingErrorMessage>
                    {recordingError}
                  </RecordingErrorMessage>
                )}
              </ControlsSection>
            )}

            <ActionButtons style={{ marginTop: '2rem', justifyContent: 'center' }}>
              <ActionButton 
                className="secondary"
                onClick={() => {
                  setRecordingModal(false);
                  resetRecordingState();
                }}
                disabled={recordingState === 'recording'}
              >
                {recordingState === 'recording' ? 'עצור הקלטה לפני סגירה' : 'סגור'}
              </ActionButton>
            </ActionButtons>
          </RecordingModalContent>
        </RecordingModalContainer>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <DeleteModal>
          <DeleteModalContent>
            <ModalTitle>מחיקת שיעור</ModalTitle>
            <p>האם אתה בטוח שברצונך למחוק את השיעור "{deleteModal.metadata?.lessonName || `הקלטה ${deleteModal.id}`}"?</p>
            <p style={{ color: '#e74c3c', fontSize: '0.9rem' }}>
              פעולה זו אינה ניתנת לביטול ותמחק את כל התוכן הקשור לשיעור.
            </p>
            
            <ActionButtons>
              <DeleteButton
                onClick={() => handleDeleteLesson(deleteModal)}
                disabled={deleting}
              >
                {deleting ? 'מוחק...' : 'מחק'}
              </DeleteButton>
              <ActionButton 
                className="secondary"
                onClick={() => setDeleteModal(null)}
                disabled={deleting}
              >
                ביטול
              </ActionButton>
            </ActionButtons>
          </DeleteModalContent>
        </DeleteModal>
      )}

      {/* Audio Player Integration */}
      {audioPlayerData && !audioPlayerData.loading && (
        <div style={{ 
          position: 'fixed', 
          bottom: '20px', 
          left: '20px', 
          right: '20px', 
          zIndex: 1000,
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          padding: '1rem'
        }}>
          <AudioPlayer
            audioBlob={audioPlayerData.audioBlob}
            title={audioPlayerData.title}
            metadata={audioPlayerData.metadata}
            t={(key) => key} // Simple translation function fallback
            onClose={() => {
              setAudioPlayerData(null);
              setCurrentlyPlaying(null);
            }}
          />
        </div>
      )}
      
      {/* Loading indicator for audio player */}
      {audioPlayerData && audioPlayerData.loading && (
        <div style={{ 
          position: 'fixed', 
          bottom: '20px', 
          left: '20px', 
          right: '20px', 
          zIndex: 1000,
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          padding: '1rem',
          textAlign: 'center'
        }}>
          <div>טוען נגן שמע...</div>
          <div style={{ marginTop: '0.5rem' }}>
            <button 
              onClick={() => {
                setAudioPlayerData(null);
                setCurrentlyPlaying(null);
              }}
              style={{
                padding: '0.5rem 1rem',
                background: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* Transcription Modal */}
      {transcriptionModal && (
        <TranscriptionModal>
          <TranscriptionModalContent>
            <TranscriptionHeader>
              <TranscriptionTitle>{transcriptionModal.title}</TranscriptionTitle>
              <CloseButton onClick={() => setTranscriptionModal(null)}>
                ✕
              </CloseButton>
            </TranscriptionHeader>
            <TranscriptionContent>
              {transcriptionModal.content}
            </TranscriptionContent>
          </TranscriptionModalContent>
        </TranscriptionModal>
      )}

      {/* Summary Modal */}
      {summaryModal && (
        <SummaryModal>
          <SummaryModalContent>
            <SummaryHeader>
              <SummaryTitle>{summaryModal.title}</SummaryTitle>
              <CloseButton onClick={() => setSummaryModal(null)}>✕</CloseButton>
            </SummaryHeader>
            <SummaryContent>{summaryModal.content}</SummaryContent>
          </SummaryModalContent>
        </SummaryModal>
      )}

      {/* Test Modal */}
      {testModal && (
        <TestModal>
          <TestModalContent>
            <TestHeader>
              <TestTitle>{testModal.title}</TestTitle>
              <CloseButton onClick={() => setTestModal(null)}>✕</CloseButton>
            </TestHeader>
            <TestContent>
              {testModal.questions.map((question, index) => (
                <QuestionItem key={index}>
                  <QuestionNumber>שאלה {index + 1}</QuestionNumber>
                  <QuestionText>{question.question_text}</QuestionText>
                  {question.answer_options && (
                    <AnswerOptions>
                      {question.answer_options.map((option, optIndex) => (
                        <AnswerOption key={optIndex}>
                          {String.fromCharCode(97 + optIndex)}) {option}
                        </AnswerOption>
                      ))}
                    </AnswerOptions>
                  )}
                  {question.correct_answer && (
                    <CorrectAnswer>תשובה נכונה: {question.correct_answer}</CorrectAnswer>
                  )}
                </QuestionItem>
              ))}
            </TestContent>
          </TestModalContent>
        </TestModal>
      )}

      {/* Share Modal */}
      {shareModal && (
        <ShareModal>
          <ShareModalContent>
            <ShareModalHeader>
              <ShareModalTitle>שתף תוכן שיעור - {shareModal.metadata?.lessonName || `הקלטה ${shareModal.id}`}</ShareModalTitle>
              <CloseButton onClick={() => {
                setShareModal(null);
                setShareOptions({ transcription: false, summary: false, test: false });
                setSelectedClasses([]);
                setShareSchedule({ startDate: '', endDate: '' });
              }}>
                ✕
              </CloseButton>
            </ShareModalHeader>

            {/* Content Type Selection */}
            <ShareSection>
              <ShareSectionTitle>בחר תוכן לשיתוף</ShareSectionTitle>
              <ContentTypeGrid>
                {/* Transcription Card */}
                <ContentTypeCard
                  selected={shareOptions.transcription}
                  className={!shareModal.aiContent?.transcription?.transcription_text ? 'disabled' : ''}
                  onClick={() => {
                    if (shareModal.aiContent?.transcription?.transcription_text) {
                      setShareOptions(prev => ({
                        ...prev,
                        transcription: !prev.transcription
                      }));
                    }
                  }}
                >
                  <ContentTypeHeader>
                    <ContentTypeIcon 
                      available={!!shareModal.aiContent?.transcription?.transcription_text}
                      processing={getAIStageStatus(shareModal, 'transcription') === 'processing'}
                      failed={getAIStageStatus(shareModal, 'transcription') === 'failed'}
                    >
                      {getAIStageIcon(getAIStageStatus(shareModal, 'transcription'))}
                    </ContentTypeIcon>
                    <ContentTypeTitle>תמליל</ContentTypeTitle>
                  </ContentTypeHeader>
                  <ContentTypeDescription>
                    תמליל מלא של השיעור המוקלט
                  </ContentTypeDescription>
                  <ContentTypeStatus 
                    available={!!shareModal.aiContent?.transcription?.transcription_text}
                    processing={getAIStageStatus(shareModal, 'transcription') === 'processing'}
                    failed={getAIStageStatus(shareModal, 'transcription') === 'failed'}
                  >
                    {getAIStageStatus(shareModal, 'transcription') === 'success' ? 'זמין לשיתוף' :
                     getAIStageStatus(shareModal, 'transcription') === 'processing' ? 'בעיבוד...' :
                     getAIStageStatus(shareModal, 'transcription') === 'failed' ? 'נכשל' : 'לא זמין'}
                  </ContentTypeStatus>
                </ContentTypeCard>

                {/* Summary Card */}
                <ContentTypeCard
                  selected={shareOptions.summary}
                  className={!shareModal.aiContent?.summary?.summary_text ? 'disabled' : ''}
                  onClick={() => {
                    if (shareModal.aiContent?.summary?.summary_text) {
                      setShareOptions(prev => ({
                        ...prev,
                        summary: !prev.summary
                      }));
                    }
                  }}
                >
                  <ContentTypeHeader>
                    <ContentTypeIcon 
                      available={!!shareModal.aiContent?.summary?.summary_text}
                      processing={getAIStageStatus(shareModal, 'summary') === 'processing'}
                      failed={getAIStageStatus(shareModal, 'summary') === 'failed'}
                    >
                      {getAIStageIcon(getAIStageStatus(shareModal, 'summary'))}
                    </ContentTypeIcon>
                    <ContentTypeTitle>סיכום</ContentTypeTitle>
                  </ContentTypeHeader>
                  <ContentTypeDescription>
                    סיכום מרוכז של נקודות המפתח בשיעור
                  </ContentTypeDescription>
                  <ContentTypeStatus 
                    available={!!shareModal.aiContent?.summary?.summary_text}
                    processing={getAIStageStatus(shareModal, 'summary') === 'processing'}
                    failed={getAIStageStatus(shareModal, 'summary') === 'failed'}
                  >
                    {getAIStageStatus(shareModal, 'summary') === 'success' ? 'זמין לשיתוף' :
                     getAIStageStatus(shareModal, 'summary') === 'processing' ? 'בעיבוד...' :
                     getAIStageStatus(shareModal, 'summary') === 'failed' ? 'נכשל' : 'לא זמין'}
                  </ContentTypeStatus>
                </ContentTypeCard>

                {/* Test Card */}
                <ContentTypeCard
                  selected={shareOptions.test}
                  className={!shareModal.aiContent?.questions?.length ? 'disabled' : ''}
                  onClick={() => {
                    if (shareModal.aiContent?.questions?.length > 0) {
                      setShareOptions(prev => ({
                        ...prev,
                        test: !prev.test
                      }));
                    }
                  }}
                >
                  <ContentTypeHeader>
                    <ContentTypeIcon 
                      available={shareModal.aiContent?.questions?.length > 0}
                      processing={getAIStageStatus(shareModal, 'questions') === 'processing'}
                      failed={getAIStageStatus(shareModal, 'questions') === 'failed'}
                    >
                      {getAIStageIcon(getAIStageStatus(shareModal, 'questions'))}
                    </ContentTypeIcon>
                    <ContentTypeTitle>מבחן</ContentTypeTitle>
                  </ContentTypeHeader>
                  <ContentTypeDescription>
                    שאלות בחינה מבוססות על תוכן השיעור
                  </ContentTypeDescription>
                  <ContentTypeStatus 
                    available={shareModal.aiContent?.questions?.length > 0}
                    processing={getAIStageStatus(shareModal, 'questions') === 'processing'}
                    failed={getAIStageStatus(shareModal, 'questions') === 'failed'}
                  >
                    {getAIStageStatus(shareModal, 'questions') === 'success' ? 
                      `זמין לשיתוף (${shareModal.aiContent?.questions?.length || 0} שאלות)` :
                     getAIStageStatus(shareModal, 'questions') === 'processing' ? 'בעיבוד...' :
                     getAIStageStatus(shareModal, 'questions') === 'failed' ? 'נכשל' : 'לא זמין'}
                  </ContentTypeStatus>
                </ContentTypeCard>

                {/* Flashcards Card */}
                <ContentTypeCard
                  selected={shareOptions.flashcards}
                  onClick={() => {
                    setShareOptions(prev => ({
                      ...prev,
                      flashcards: !prev.flashcards
                    }));
                  }}
                >
                  <ContentTypeHeader>
                    <ContentTypeIcon available={true}>
                      🃏
                    </ContentTypeIcon>
                    <ContentTypeTitle>כרטיסי זיכרון</ContentTypeTitle>
                  </ContentTypeHeader>
                  <ContentTypeDescription>
                    יצירה אוטומטית של כרטיסי זיכרון מתוכן השיעור
                  </ContentTypeDescription>
                  <ContentTypeStatus available={true}>
                    יווצרו אוטומטית מהתמליל
                  </ContentTypeStatus>
                </ContentTypeCard>
              </ContentTypeGrid>
            </ShareSection>

            {/* Class Selection */}
            <ShareSection>
              <ShareSectionTitle>בחר כיתות לשיתוף</ShareSectionTitle>
              <ClassSelectionGrid>
                {classes.map((classItem) => (
                  <ClassCard
                    key={classItem.id}
                    selected={selectedClasses.includes(classItem.id)}
                    onClick={() => {
                      setSelectedClasses(prev => 
                        prev.includes(classItem.id)
                          ? prev.filter(id => id !== classItem.id)
                          : [...prev, classItem.id]
                      );
                    }}
                  >
                    <ClassName>{classItem.name}</ClassName>
                    <ClassDescription>
                      {classItem.description || `${classItem.student_count || 0} תלמידים`}
                    </ClassDescription>
                  </ClassCard>
                ))}
                {classes.length === 0 && (
                  <div style={{ 
                    gridColumn: '1 / -1', 
                    textAlign: 'center', 
                    color: '#7f8c8d', 
                    padding: '2rem' 
                  }}>
                    אין כיתות זמינות. אנא צור קשר עם המנהל להוספת כיתות.
                  </div>
                )}
              </ClassSelectionGrid>
            </ShareSection>

            {/* Schedule Section */}
            <ShareSection>
              <ShareSectionTitle>תזמון זמינות (אופציונלי)</ShareSectionTitle>
              <ScheduleSection>
                <ScheduleGrid>
                  <ScheduleFormGroup>
                    <ScheduleLabel>תאריך התחלה</ScheduleLabel>
                    <ScheduleInput
                      type="datetime-local"
                      value={shareSchedule.startDate}
                      onChange={(e) => setShareSchedule(prev => ({
                        ...prev,
                        startDate: e.target.value
                      }))}
                    />
                  </ScheduleFormGroup>
                  <ScheduleFormGroup>
                    <ScheduleLabel>תאריך סיום</ScheduleLabel>
                    <ScheduleInput
                      type="datetime-local"
                      value={shareSchedule.endDate}
                      onChange={(e) => setShareSchedule(prev => ({
                        ...prev,
                        endDate: e.target.value
                      }))}
                    />
                  </ScheduleFormGroup>
                </ScheduleGrid>
                <p style={{ fontSize: '0.85rem', color: '#666', margin: '0.5rem 0 0 0' }}>
                  השאר ריק לזמינות מיידית וללא הגבלת זמן
                </p>
              </ScheduleSection>
            </ShareSection>

            {/* Action Buttons */}
            <ShareActions>
              <ShareButton 
                className="secondary"
                onClick={() => {
                  setShareModal(null);
                  setShareOptions({ transcription: false, summary: false, test: false });
                  setSelectedClasses([]);
                  setShareSchedule({ startDate: '', endDate: '' });
                }}
                disabled={sharing}
              >
                ביטול
              </ShareButton>
              <ShareButton 
                className="primary"
                onClick={handleShare}
                disabled={
                  sharing || 
                  selectedClasses.length === 0 || 
                  Object.values(shareOptions).every(v => !v)
                }
              >
                {sharing ? 'משתף...' : 'שתף תוכן'}
              </ShareButton>
            </ShareActions>
          </ShareModalContent>
        </ShareModal>
      )}
    </>
  );
};

export default LessonsManager;
