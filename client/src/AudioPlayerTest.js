import React, { useState, useEffect } from 'react';
import AudioPlayer from './components/AudioPlayer';
import { heTranslations } from './translations';

// Translation helper function
const getNestedTranslation = (obj, path) => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

const t = (key, params = {}) => {
  let translation = getNestedTranslation(heTranslations, key) || key;
  
  // Replace parameters in translation
  Object.keys(params).forEach(param => {
    translation = translation.replace(`{{${param}}}`, params[param]);
  });
  
  return translation;
};

// Function to create a test audio blob
const createTestAudioBlob = () => {
  return new Promise((resolve) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const duration = 3; // 3 seconds
    const frameCount = sampleRate * duration;
    
    const audioBuffer = audioContext.createBuffer(1, frameCount, sampleRate);
    const channelData = audioBuffer.getChannelData(0);
    
    // Generate a simple melody for testing
    for (let i = 0; i < frameCount; i++) {
      const time = i / sampleRate;
      // Create a simple melody with multiple frequencies
      const freq1 = 440; // A note
      const freq2 = 554.37; // C# note
      const freq3 = 659.25; // E note
      
      let sample = 0;
      if (time < 1) {
        sample = Math.sin(2 * Math.PI * freq1 * time) * 0.1;
      } else if (time < 2) {
        sample = Math.sin(2 * Math.PI * freq2 * time) * 0.1;
      } else {
        sample = Math.sin(2 * Math.PI * freq3 * time) * 0.1;
      }
      
      channelData[i] = sample;
    }

    // Convert to WAV blob
    const wavBlob = audioBufferToWav(audioBuffer);
    resolve(wavBlob);
  });
};

// Function to convert AudioBuffer to WAV blob
const audioBufferToWav = (buffer) => {
  const length = buffer.length;
  const arrayBuffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(arrayBuffer);
  const channelData = buffer.getChannelData(0);

  // WAV header
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length * 2, true);

  // Convert float samples to 16-bit PCM
  let offset = 44;
  for (let i = 0; i < length; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, sample * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
};

const AudioPlayerTest = () => {
  const [audioBlob, setAudioBlob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeTest = async () => {
      try {
        console.log('Creating test audio blob...');
        const blob = await createTestAudioBlob();
        console.log('Test audio blob created:', {
          size: blob.size,
          type: blob.type
        });
        setAudioBlob(blob);
      } catch (err) {
        console.error('Error creating test audio:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initializeTest();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center',
        fontFamily: 'Heebo, sans-serif',
        direction: 'rtl'
      }}>
        יוצר אודיו לבדיקה...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center',
        fontFamily: 'Heebo, sans-serif',
        direction: 'rtl',
        color: 'red'
      }}>
        שגיאה: {error}
      </div>
    );
  }

  const testMetadata = {
    lessonName: 'בדיקת נגן אודיו',
    subject: 'בדיקה',
    classLevel: 'כיתה א',
    curriculum: 'בדיקת מערכת',
    createdAt: new Date().toISOString(),
    duration: 3000, // 3 seconds in milliseconds
    fileSize: audioBlob?.size || 0
  };

  return (
    <div style={{ 
      padding: '2rem',
      fontFamily: 'Heebo, sans-serif',
      direction: 'rtl',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh'
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>
        בדיקת נגן אודיו
      </h1>
      
      <div style={{ 
        backgroundColor: 'white',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3>פרטי הבדיקה:</h3>
        <p>גודל קובץ: {(audioBlob?.size / 1024).toFixed(2)} KB</p>
        <p>סוג קובץ: {audioBlob?.type}</p>
        <p>משך: 3 שניות</p>
        <p>תוכן: מלודיה פשוטה (A-C#-E)</p>
      </div>

      {audioBlob && (
        <AudioPlayer
          audioBlob={audioBlob}
          title="בדיקת נגן אודיו"
          metadata={testMetadata}
          t={t}
          onBookmarkAdd={(bookmark) => console.log('Bookmark added:', bookmark)}
          onBookmarkRemove={(id) => console.log('Bookmark removed:', id)}
        />
      )}
      
      <div style={{ 
        backgroundColor: 'white',
        padding: '1rem',
        borderRadius: '8px',
        marginTop: '1rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3>הוראות לבדיקה:</h3>
        <ol>
          <li>לחץ על כפתור הנגינה (▶️) למטה</li>
          <li>אמור לשמוע מלודיה פשוטה של 3 שניות</li>
          <li>בדוק את הקונסול לפרטים נוספים</li>
          <li>נסה את הפקדים השונים (עוצמה, מהירות וכו')</li>
        </ol>
      </div>
    </div>
  );
};

export default AudioPlayerTest;
