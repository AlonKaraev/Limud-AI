import React, { useState } from 'react';
import MediaFilteringHeader from './MediaFilteringHeader';

const MediaFilteringHeaderTest = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const handleUpload = async (files) => {
    console.log('Files to upload:', files);
    
    // Simulate upload process
    const fileData = Array.from(files).map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    }));
    
    setUploadedFiles(prev => [...prev, ...fileData]);
    
    // Simulate async upload
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('Upload completed for:', fileData);
  };

  const handleRecord = () => {
    console.log('Record button clicked');
    alert('Recording functionality will be implemented in the next phase');
  };

  const handleSearch = (query) => {
    console.log('Search query:', query);
    setSearchQuery(query);
  };

  const handleToggleExpanded = () => {
    console.log('Toggle expanded:', !isExpanded);
    setIsExpanded(!isExpanded);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem', fontFamily: 'Heebo, sans-serif' }}>
        Media Filtering Header Test
      </h1>
      
      {/* Test with different media types */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: 'Heebo, sans-serif', marginBottom: '1rem' }}>All Media</h2>
        <MediaFilteringHeader
          mediaType="all"
          onUpload={handleUpload}
          onRecord={handleRecord}
          onSearch={handleSearch}
          isExpanded={isExpanded}
          onToggleExpanded={handleToggleExpanded}
        />
      </div>

      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: 'Heebo, sans-serif', marginBottom: '1rem' }}>Audio Only</h2>
        <MediaFilteringHeader
          mediaType="audio"
          onUpload={handleUpload}
          onRecord={handleRecord}
          onSearch={handleSearch}
          isExpanded={isExpanded}
          onToggleExpanded={handleToggleExpanded}
        />
      </div>

      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: 'Heebo, sans-serif', marginBottom: '1rem' }}>Video Only</h2>
        <MediaFilteringHeader
          mediaType="video"
          onUpload={handleUpload}
          onRecord={handleRecord}
          onSearch={handleSearch}
          isExpanded={isExpanded}
          onToggleExpanded={handleToggleExpanded}
        />
      </div>

      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: 'Heebo, sans-serif', marginBottom: '1rem' }}>Documents Only</h2>
        <MediaFilteringHeader
          mediaType="documents"
          onUpload={handleUpload}
          onRecord={handleRecord}
          onSearch={handleSearch}
          isExpanded={isExpanded}
          onToggleExpanded={handleToggleExpanded}
        />
      </div>

      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: 'Heebo, sans-serif', marginBottom: '1rem' }}>Images Only</h2>
        <MediaFilteringHeader
          mediaType="images"
          onUpload={handleUpload}
          onRecord={handleRecord}
          onSearch={handleSearch}
          isExpanded={isExpanded}
          onToggleExpanded={handleToggleExpanded}
        />
      </div>

      {/* Display current state */}
      <div style={{ 
        background: '#f8f9fa', 
        padding: '1.5rem', 
        borderRadius: '8px', 
        fontFamily: 'Heebo, sans-serif',
        direction: 'rtl'
      }}>
        <h3>Current State:</h3>
        <p><strong>Expanded:</strong> {isExpanded ? 'Yes' : 'No'}</p>
        <p><strong>Search Query:</strong> {searchQuery || 'None'}</p>
        <p><strong>Uploaded Files:</strong> {uploadedFiles.length}</p>
        
        {uploadedFiles.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <h4>Uploaded Files:</h4>
            <ul>
              {uploadedFiles.map((file, index) => (
                <li key={index}>
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div style={{ 
        marginTop: '2rem', 
        padding: '1.5rem', 
        background: '#e3f2fd', 
        borderRadius: '8px',
        fontFamily: 'Heebo, sans-serif'
      }}>
        <h3>Test Instructions:</h3>
        <ul>
          <li>Click the blue "העלה קבצים" (Upload Files) button to select files</li>
          <li>Try dragging and dropping files onto the upload button</li>
          <li>Notice how the Record button only appears for Audio and Video types</li>
          <li>Type in the search bar to see search functionality</li>
          <li>Click the expand button (⌄) to toggle expanded state</li>
          <li>Test different file types to see validation in action</li>
          <li>Check the console for detailed logs</li>
        </ul>
      </div>
    </div>
  );
};

export default MediaFilteringHeaderTest;
