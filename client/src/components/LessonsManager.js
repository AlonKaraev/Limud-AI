import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import AudioRecordingService from '../services/AudioRecordingService';
import AudioPlayer from './AudioPlayer';

const Container = styled.div`
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #ecf0f1;
`;

const HeaderButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const UploadButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: #27ae60;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Heebo', sans-serif;
  transition: background-color 0.2s;

  &:hover {
    background-color: #229954;
  }

  &:disabled {
    background-color: #bdc3c7;
    cursor: not-allowed;
  }

  &.record {
    background-color: #e74c3c;
    
    &:hover {
      background-color: #c0392b;
    }
  }
`;

const Title = styled.h2`
  color: #2c3e50;
  margin: 0;
`;

const RefreshButton = styled.button`
  padding: 0.5rem 1rem;
  background-color: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Heebo', sans-serif;
  transition: background-color 0.2s;

  &:hover {
    background-color: #2980b9;
  }

  &:disabled {
    background-color: #bdc3c7;
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
  border: 1px solid #ecf0f1;
  border-radius: 8px;
  padding: 1.5rem;
  background: #fafbfc;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
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
  color: #2c3e50;
  margin: 0;
  font-size: 1.1rem;
`;

const LessonDate = styled.span`
  color: #7f8c8d;
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
  color: #7f8c8d;
`;

const InfoValue = styled.span`
  color: #2c3e50;
  font-weight: 500;
`;

const StatusBadge = styled.span`
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  
  &.completed {
    background-color: #d5f4e6;
    color: #27ae60;
  }
  
  &.processing {
    background-color: #fef9e7;
    color: #f39c12;
  }
  
  &.failed {
    background-color: #fadbd8;
    color: #e74c3c;
  }
  
  &.pending {
    background-color: #ebf3fd;
    color: #3498db;
  }
`;

const ContentSection = styled.div`
  margin-bottom: 1rem;
`;

const ContentTitle = styled.h4`
  color: #2c3e50;
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
`;

const ContentPreview = styled.div`
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  padding: 0.75rem;
  font-size: 0.9rem;
  color: #555;
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
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #2c3e50;
`;

const RecordingDetail = styled.span`
  font-weight: 500;
`;

// Enhanced Text-Based Action Buttons
const TextActionButton = styled.button`
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-family: 'Heebo', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
  min-width: 100px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  }
  
  &.play {
    background: linear-gradient(135deg, #3498db, #2980b9);
    color: white;
    
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, #2980b9, #1f5f8b);
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
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    
    &:hover {
      transform: none;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
  }
`;

// AI Actions Button - Static Blue Styling
const AIActionsButton = styled(TextActionButton)`
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
  min-width: 80px;
  
  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #2980b9, #1f5f8b);
  }
`;

// AI Status Button - Dynamic Styling Based on Status
const AIStatusButton = styled(TextActionButton)`
  min-width: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &.ai-completed {
    background: linear-gradient(135deg, #27ae60, #229954);
    color: white;
    
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, #229954, #1e8449);
    }
  }
  
  &.ai-processing {
    background: linear-gradient(135deg, #f39c12, #e67e22);
    color: white;
    animation: aiPulse 2s infinite;
    
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, #e67e22, #d35400);
    }
  }
  
  &.ai-failed {
    background: linear-gradient(135deg, #e74c3c, #c0392b);
    color: white;
    
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, #c0392b, #a93226);
    }
  }
  
  &.ai-pending {
    background: linear-gradient(135deg, #95a5a6, #7f8c8d);
    color: white;
    
    &:hover:not(:disabled) {
      background: linear-gradient(135deg, #7f8c8d, #6c7b7d);
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
  border-radius: 8px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  overflow: hidden;
  transition: all 0.3s ease;
`;

const AIStatusHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  cursor: pointer;
  background: ${props => {
    switch (props.status) {
      case 'completed': return 'linear-gradient(135deg, #d5f4e6, #c8e6c9)';
      case 'processing': return 'linear-gradient(135deg, #fef9e7, #fff3cd)';
      case 'failed': return 'linear-gradient(135deg, #fadbd8, #f8d7da)';
      default: return 'linear-gradient(135deg, #ebf3fd, #d1ecf1)';
    }
  }};
  border-bottom: ${props => props.expanded ? '1px solid #e9ecef' : 'none'};
  transition: all 0.3s ease;
  
  &:hover {
    background: ${props => {
      switch (props.status) {
        case 'completed': return 'linear-gradient(135deg, #c8e6c9, #a5d6a7)';
        case 'processing': return 'linear-gradient(135deg, #fff3cd, #ffe082)';
        case 'failed': return 'linear-gradient(135deg, #f8d7da, #f5c6cb)';
        default: return 'linear-gradient(135deg, #d1ecf1, #b3e5fc)';
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
  color: white;
  background: ${props => {
    switch (props.status) {
      case 'completed': return '#27ae60';
      case 'processing': return '#f39c12';
      case 'failed': return '#e74c3c';
      default: return '#3498db';
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
  color: #2c3e50;
`;

const AIStatusSubtitle = styled.span`
  font-size: 0.85rem;
  color: #666;
  font-weight: 500;
`;

const AIStatusToggle = styled.div`
  font-size: 1.2rem;
  color: #666;
  transition: transform 0.3s ease;
  transform: ${props => props.expanded ? 'rotate(180deg)' : 'rotate(0deg)'};
`;

const AIStatusContent = styled.div`
  padding: ${props => props.expanded ? '1.5rem' : '0'};
  max-height: ${props => props.expanded ? '500px' : '0'};
  overflow: hidden;
  transition: all 0.3s ease;
  background: white;
`;

const AIStagesGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const AIStageCard = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #fafbfc;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  transition: all 0.2s ease;
  
  &:hover {
    background: #f5f6fa;
    border-color: #e9ecef;
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
    animation: stagePulse 1.5s infinite;
  }
  
  &.pending {
    background-color: #bdc3c7;
    color: white;
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
  color: #2c3e50;
`;

const AIStageCardStatus = styled.span`
  font-size: 0.85rem;
  color: #666;
  font-weight: 500;
`;

const AIStageCardMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: #999;
`;

const ErrorExpandSection = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: #fff5f5;
  border: 1px solid #fed7d7;
  border-radius: 8px;
`;

const ErrorExpandHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  color: #e74c3c;
  font-weight: 600;
  margin-bottom: 0.5rem;
`;

const ErrorExpandContent = styled.div`
  max-height: ${props => props.expanded ? '200px' : '0'};
  overflow: hidden;
  transition: max-height 0.3s ease;
  color: #c53030;
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
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
`;

const AIMenuHeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.5rem;
  font-size: 1rem;
`;

const AIMenuHeaderStatus = styled.div`
  font-size: 0.85rem;
  color: #666;
  font-weight: 500;
`;

const AIMenuStages = styled.div`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f0f0f0;
`;

const AIMenuStagesHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  padding: 0.25rem 0;
  font-size: 0.9rem;
  font-weight: 500;
  color: #2c3e50;
  
  &:hover {
    color: #3498db;
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
  background: #fafbfc;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
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

const AIMenuStageText = styled.span`
  flex: 1;
  color: #2c3e50;
  font-weight: 500;
`;

const AIMenuStageStatus = styled.span`
  font-size: 0.8rem;
  color: #666;
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
  color: #7f8c8d;
  font-size: 1.1rem;
`;

const ErrorMessage = styled.div`
  background-color: #fadbd8;
  color: #e74c3c;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #7f8c8d;
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
  background: white;
  padding: 2rem;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  text-align: center;
`;

const ModalTitle = styled.h3`
  color: #2c3e50;
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
  color: #2c3e50;
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

// Toggle Button for Error Details
const ToggleErrorButton = styled.button`
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Heebo', sans-serif;
  font-size: 0.85rem;
  transition: all 0.2s;
  background-color: #e74c3c;
  color: white;
  margin-top: 0.5rem;
  
  &:hover {
    background-color: #c0392b;
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
  
  &.available {
    background-color: #27ae60;
  }
  
  &.unavailable {
    background-color: #bdc3c7;
  }
  
  &.generate {
    background-color: #f39c12;
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
  const [expandedAIActions, setExpandedAIActions] = useState({});
  const [expandedAIStatus, setExpandedAIStatus] = useState({});

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
          return 'תפריט AI (אין תוכן זמין)';
        }
        return `תפריט AI (${availableCount} פריטים זמינים)`;

      case 'ai-status':
        return `${statusInfo.text} - לחץ לפרטים נוספים`;

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
        throw new Error('No authentication token found');
      }

      const response = await fetch('/api/recordings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please log in again.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (response.status >= 500) {
          throw new Error('Server temporarily unavailable. Please try again later.');
        } else if (response.status === 404) {
          throw new Error('Recordings endpoint not found. Please check server configuration.');
        }
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
              console.warn(`AI content fetch failed for recording ${recording.id}: ${contentResponse.status}`);
            }
          } catch (error) {
            console.error(`Error fetching AI content for recording ${recording.id}:`, error);
            // Don't throw - just log and continue with null aiContent
          }

          return lessonData;
        })
      );

      setLessons(lessonsWithContent);
      console.log(`Successfully loaded ${lessonsWithContent.length} lessons`);
    } catch (error) {
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
    
    // Check if there's an active processing job
    if (job) {
      if (job.status === 'failed') {
        return {
          status: 'failed',
          text: 'נכשל',
          details: job.error_message || 'עיבוד AI נכשל',
          showError: true
        };
      } else if (job.status === 'processing') {
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

    // Check AI content status
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
        status: 'processing',
        text: 'הושלם חלקית',
        details: `הושלם: ${completed.join(', ')}`,
        showWarning: true
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

                    {/* AI Actions Button */}
                    <TooltipContainer>
                      <AIActionsButton
                        onMouseEnter={() => showTooltip(lesson.id, 'ai-actions', 'פעולות AI')}
                        onMouseLeave={() => hideTooltip(lesson.id, 'ai-actions')}
                        onClick={() => {
                          setExpandedAIActions(prev => ({
                            ...prev,
                            [lesson.id]: !prev[lesson.id]
                          }));
                        }}
                      >
                        AI
                      </AIActionsButton>
                      <Tooltip show={tooltips[`${lesson.id}-ai-actions`]}>
                        {tooltips[`${lesson.id}-ai-actions`]}
                      </Tooltip>
                    </TooltipContainer>

                    {/* AI Status Button */}
                    <TooltipContainer>
                      <AIStatusButton
                        className={getAIButtonClass(statusInfo)}
                        onMouseEnter={() => showTooltip(lesson.id, 'ai-status', getTooltipText(lesson, 'ai-status'))}
                        onMouseLeave={() => hideTooltip(lesson.id, 'ai-status')}
                        onClick={() => {
                          setExpandedAIStatus(prev => ({
                            ...prev,
                            [lesson.id]: !prev[lesson.id]
                          }));
                        }}
                      >
                        <AIStatusButtonIcon>{getAIButtonIcon(statusInfo)}</AIStatusButtonIcon>
                        <AIStatusButtonText>{statusInfo.text}</AIStatusButtonText>
                      </AIStatusButton>
                      <Tooltip show={tooltips[`${lesson.id}-ai-status`]}>
                        {tooltips[`${lesson.id}-ai-status`]}
                      </Tooltip>
                    </TooltipContainer>
                  </ButtonsRow>

                  {/* Row 4 - Expandable AI Status */}
                  <ExpandableAIStatus>
                    <AIStatusHeader
                      status={statusInfo.status}
                      expanded={expandedAIStatus[lesson.id]}
                      onClick={() => {
                        setExpandedAIStatus(prev => ({
                          ...prev,
                          [lesson.id]: !prev[lesson.id]
                        }));
                      }}
                    >
                      <AIStatusHeaderContent>
                        <AIStatusIcon status={statusInfo.status}>
                          {getAIStatusIcon(statusInfo.status)}
                        </AIStatusIcon>
                        <AIStatusText>
                          <AIStatusTitle>סטטוס AI: {statusInfo.text}</AIStatusTitle>
                          <AIStatusSubtitle>{statusInfo.details}</AIStatusSubtitle>
                        </AIStatusText>
                      </AIStatusHeaderContent>
                      <AIStatusToggle expanded={expandedAIStatus[lesson.id]}>
                        ▼
                      </AIStatusToggle>
                    </AIStatusHeader>
                    
                    <AIStatusContent expanded={expandedAIStatus[lesson.id]}>
                      <AIStagesGrid>
                        <AIStageCard>
                          <AIStageCardIcon className={getAIStageStatus(lesson, 'transcription')}>
                            {getAIStageIcon(getAIStageStatus(lesson, 'transcription'))}
                          </AIStageCardIcon>
                          <AIStageCardContent>
                            <AIStageCardTitle>תמליל</AIStageCardTitle>
                            <AIStageCardStatus>
                              {getAIStageStatus(lesson, 'transcription') === 'success' ? 'הושלם בהצלחה' :
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

                        <AIStageCard>
                          <AIStageCardIcon className={getAIStageStatus(lesson, 'summary')}>
                            {getAIStageIcon(getAIStageStatus(lesson, 'summary'))}
                          </AIStageCardIcon>
                          <AIStageCardContent>
                            <AIStageCardTitle>סיכום</AIStageCardTitle>
                            <AIStageCardStatus>
                              {getAIStageStatus(lesson, 'summary') === 'success' ? 'הושלם בהצלחה' :
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

                        <AIStageCard>
                          <AIStageCardIcon className={getAIStageStatus(lesson, 'questions')}>
                            {getAIStageIcon(getAIStageStatus(lesson, 'questions'))}
                          </AIStageCardIcon>
                          <AIStageCardContent>
                            <AIStageCardTitle>שאלות בחינה</AIStageCardTitle>
                            <AIStageCardStatus>
                              {getAIStageStatus(lesson, 'questions') === 'success' ? `${aiContent?.questions?.length || 0} שאלות` :
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
                      </AIStagesGrid>

                      {/* Error Details Section */}
                      {statusInfo.showError && (
                        <ErrorExpandSection>
                          <ErrorExpandHeader
                            onClick={() => {
                              setVisibleErrors(prev => ({
                                ...prev,
                                [lesson.id]: !prev[lesson.id]
                              }));
                            }}
                          >
                            <span>פרטי שגיאה</span>
                            <span>{visibleErrors[lesson.id] ? '▼' : '▶'}</span>
                          </ErrorExpandHeader>
                          <ErrorExpandContent expanded={visibleErrors[lesson.id]}>
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
                          </ErrorExpandContent>
                        </ErrorExpandSection>
                      )}
                    </AIStatusContent>
                  </ExpandableAIStatus>

                  {/* Expandable AI Actions */}
                  {expandedAIActions[lesson.id] && (
                    <ExpandableAIActions>
                      <AIActionsContent expanded={expandedAIActions[lesson.id]}>
                        <AIActionsGrid>
                          {/* Generate AI Content Action */}
                          {(statusInfo.status === 'pending' || statusInfo.status === 'failed') && (
                            <AIActionCard
                              onClick={() => {
                                setProcessingModal(lesson);
                                setExpandedAIActions(prev => ({
                                  ...prev,
                                  [lesson.id]: false
                                }));
                              }}
                            >
                              <AIActionCardIcon className="generate">
                                +
                              </AIActionCardIcon>
                              <AIActionCardContent>
                                <AIActionCardTitle>צור תוכן AI</AIActionCardTitle>
                                <AIActionCardDescription>
                                  {statusInfo.status === 'failed' ? 'נסה שוב ליצור תמליל, סיכום ושאלות' : 'צור תמליל, סיכום ושאלות בחינה'}
                                </AIActionCardDescription>
                              </AIActionCardContent>
                            </AIActionCard>
                          )}

                          {/* View Transcription Action */}
                          <AIActionCard
                            disabled={!aiContent?.transcription?.transcription_text}
                            onClick={() => {
                              if (aiContent?.transcription?.transcription_text) {
                                setTranscriptionModal({
                                  title: `תמליל - ${lesson.metadata?.lessonName || `הקלטה ${lesson.id}`}`,
                                  content: aiContent.transcription.transcription_text
                                });
                                setExpandedAIActions(prev => ({
                                  ...prev,
                                  [lesson.id]: false
                                }));
                              }
                            }}
                          >
                            <AIActionCardIcon className={aiContent?.transcription?.transcription_text ? 'available' : 'unavailable'}>
                              📄
                            </AIActionCardIcon>
                            <AIActionCardContent>
                              <AIActionCardTitle>צפה בתמליל</AIActionCardTitle>
                              <AIActionCardDescription>
                                {aiContent?.transcription?.transcription_text ? 'תמליל מלא של השיעור זמין' : 'תמליל לא זמין'}
                              </AIActionCardDescription>
                              {aiContent?.transcription?.transcription_text && (
                                <AIActionCardBadge>
                                  {Math.round(aiContent.transcription.transcription_text.length / 100)} מילים
                                </AIActionCardBadge>
                              )}
                            </AIActionCardContent>
                          </AIActionCard>

                          {/* View Summary Action */}
                          <AIActionCard
                            disabled={!aiContent?.summary?.summary_text}
                            onClick={() => {
                              if (aiContent?.summary?.summary_text) {
                                alert(aiContent.summary.summary_text);
                                setExpandedAIActions(prev => ({
                                  ...prev,
                                  [lesson.id]: false
                                }));
                              }
                            }}
                          >
                            <AIActionCardIcon className={aiContent?.summary?.summary_text ? 'available' : 'unavailable'}>
                              📋
                            </AIActionCardIcon>
                            <AIActionCardContent>
                              <AIActionCardTitle>צפה בסיכום</AIActionCardTitle>
                              <AIActionCardDescription>
                                {aiContent?.summary?.summary_text ? 'סיכום השיעור זמין' : 'סיכום לא זמין'}
                              </AIActionCardDescription>
                              {aiContent?.summary?.summary_text && (
                                <AIActionCardBadge>
                                  {Math.round(aiContent.summary.summary_text.length / 50)} מילים
                                </AIActionCardBadge>
                              )}
                            </AIActionCardContent>
                          </AIActionCard>

                          {/* View Test Action */}
                          <AIActionCard
                            disabled={!aiContent?.questions?.length}
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
                                setExpandedAIActions(prev => ({
                                  ...prev,
                                  [lesson.id]: false
                                }));
                              }
                            }}
                          >
                            <AIActionCardIcon className={aiContent?.questions?.length > 0 ? 'available' : 'unavailable'}>
                              📝
                            </AIActionCardIcon>
                            <AIActionCardContent>
                              <AIActionCardTitle>צפה במבחן</AIActionCardTitle>
                              <AIActionCardDescription>
                                {aiContent?.questions?.length > 0 ? 'שאלות בחינה זמינות' : 'מבחן לא זמין'}
                              </AIActionCardDescription>
                              {aiContent?.questions?.length > 0 && (
                                <AIActionCardBadge>
                                  {aiContent.questions.length} שאלות
                                </AIActionCardBadge>
                              )}
                            </AIActionCardContent>
                          </AIActionCard>

                          {/* Regenerate AI Content Action */}
                          {(statusInfo.status === 'completed' || statusInfo.status === 'failed') && (
                            <AIActionCard
                              onClick={() => {
                                setProcessingModal(lesson);
                                setExpandedAIActions(prev => ({
                                  ...prev,
                                  [lesson.id]: false
                                }));
                              }}
                            >
                              <AIActionCardIcon className="generate">
                                🔄
                              </AIActionCardIcon>
                              <AIActionCardContent>
                                <AIActionCardTitle>צור תוכן AI מחדש</AIActionCardTitle>
                                <AIActionCardDescription>
                                  צור מחדש תמליל, סיכום ושאלות בחינה
                                </AIActionCardDescription>
                              </AIActionCardContent>
                            </AIActionCard>
                          )}
                        </AIActionsGrid>
                      </AIActionsContent>
                    </ExpandableAIActions>
                  )}

                  {/* Row 5 - Lesson Metadata (if available) */}
                  {lesson.metadata && (lesson.metadata.subject || lesson.metadata.classLevel || lesson.metadata.curriculum) && (
                    <LessonInfo>
                      {lesson.metadata.subject && (
                        <InfoRow>
                          <InfoLabel>מקצוע:</InfoLabel>
                          <InfoValue>{lesson.metadata.subject}</InfoValue>
                        </InfoRow>
                      )}
                      {lesson.metadata.classLevel && (
                        <InfoRow>
                          <InfoLabel>כיתה:</InfoLabel>
                          <InfoValue>{lesson.metadata.classLevel}</InfoValue>
                        </InfoRow>
                      )}
                      {lesson.metadata.curriculum && (
                        <InfoRow>
                          <InfoLabel>תכנית לימודים:</InfoLabel>
                          <InfoValue>{lesson.metadata.curriculum}</InfoValue>
                        </InfoRow>
                      )}
                    </LessonInfo>
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
    </>
  );
};

export default LessonsManager;
