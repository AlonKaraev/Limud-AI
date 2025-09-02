-- Video Integration Schema Updates for LimudAI (SQLite Compatible)
-- Extends existing recordings table and adds video-specific functionality

-- Add video support columns to existing recordings table
-- SQLite doesn't support IF NOT EXISTS in ALTER TABLE, so we'll handle errors gracefully
ALTER TABLE recordings ADD COLUMN media_type TEXT DEFAULT 'audio' CHECK (media_type IN ('audio', 'video'));
ALTER TABLE recordings ADD COLUMN video_metadata TEXT DEFAULT '{}';
ALTER TABLE recordings ADD COLUMN processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'));
ALTER TABLE recordings ADD COLUMN thumbnail_path TEXT;

-- Create video thumbnails table
CREATE TABLE IF NOT EXISTS video_thumbnails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recording_id INTEGER NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
    timestamp_percent REAL NOT NULL, -- 0.00 to 100.00
    thumbnail_path TEXT NOT NULL,
    thumbnail_size TEXT NOT NULL CHECK (thumbnail_size IN ('small', 'medium', 'large')),
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    file_size INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for video thumbnails
CREATE INDEX IF NOT EXISTS idx_video_thumbnails_recording_id ON video_thumbnails(recording_id);
CREATE INDEX IF NOT EXISTS idx_video_thumbnails_timestamp ON video_thumbnails(timestamp_percent);
CREATE INDEX IF NOT EXISTS idx_video_thumbnails_size ON video_thumbnails(thumbnail_size);

-- Create video processing jobs table for tracking async operations
CREATE TABLE IF NOT EXISTS video_processing_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recording_id INTEGER NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL CHECK (job_type IN ('thumbnail_generation', 'metadata_extraction', 'format_conversion', 'compression')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    error_message TEXT,
    job_data TEXT DEFAULT '{}',
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for video processing jobs
CREATE INDEX IF NOT EXISTS idx_video_processing_jobs_recording_id ON video_processing_jobs(recording_id);
CREATE INDEX IF NOT EXISTS idx_video_processing_jobs_status ON video_processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_video_processing_jobs_type ON video_processing_jobs(job_type);

-- Update existing recordings to have media_type = 'audio' where not set
UPDATE recordings SET media_type = 'audio' WHERE media_type IS NULL;

-- Add video format support to metadata indexing
CREATE INDEX IF NOT EXISTS idx_recordings_media_type ON recordings(media_type);
CREATE INDEX IF NOT EXISTS idx_recordings_processing_status ON recordings(processing_status);

-- Create view for video lessons with thumbnails (SQLite compatible)
CREATE VIEW IF NOT EXISTS video_lessons_with_thumbnails AS
SELECT 
    r.*,
    CASE 
        WHEN COUNT(vt.id) > 0 THEN
            '[' || GROUP_CONCAT(
                '{"id":' || vt.id || 
                ',"timestamp_percent":' || vt.timestamp_percent || 
                ',"thumbnail_path":"' || vt.thumbnail_path || '"' ||
                ',"thumbnail_size":"' || vt.thumbnail_size || '"' ||
                ',"width":' || vt.width || 
                ',"height":' || vt.height || 
                ',"file_size":' || vt.file_size || '}'
            ) || ']'
        ELSE '[]'
    END as thumbnails_json
FROM recordings r
LEFT JOIN video_thumbnails vt ON r.id = vt.recording_id
WHERE r.media_type = 'video'
GROUP BY r.id;
