-- Video Integration Schema Updates for LimudAI
-- Extends existing recordings table and adds video-specific functionality

-- Add video support columns to existing recordings table
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS media_type VARCHAR(10) DEFAULT 'audio' CHECK (media_type IN ('audio', 'video'));
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS video_metadata JSONB DEFAULT '{}';
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'));
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS thumbnail_path TEXT;

-- Create video thumbnails table
CREATE TABLE IF NOT EXISTS video_thumbnails (
    id SERIAL PRIMARY KEY,
    recording_id INTEGER NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
    timestamp_percent DECIMAL(5,2) NOT NULL, -- 0.00 to 100.00
    thumbnail_path TEXT NOT NULL,
    thumbnail_size VARCHAR(10) NOT NULL CHECK (thumbnail_size IN ('small', 'medium', 'large')),
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    file_size INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for video thumbnails
CREATE INDEX IF NOT EXISTS idx_video_thumbnails_recording_id ON video_thumbnails(recording_id);
CREATE INDEX IF NOT EXISTS idx_video_thumbnails_timestamp ON video_thumbnails(timestamp_percent);
CREATE INDEX IF NOT EXISTS idx_video_thumbnails_size ON video_thumbnails(thumbnail_size);

-- Create video processing jobs table for tracking async operations
CREATE TABLE IF NOT EXISTS video_processing_jobs (
    id SERIAL PRIMARY KEY,
    recording_id INTEGER NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
    job_type VARCHAR(20) NOT NULL CHECK (job_type IN ('thumbnail_generation', 'metadata_extraction', 'format_conversion', 'compression')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    error_message TEXT,
    job_data JSONB DEFAULT '{}',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for video processing jobs
CREATE INDEX IF NOT EXISTS idx_video_processing_jobs_recording_id ON video_processing_jobs(recording_id);
CREATE INDEX IF NOT EXISTS idx_video_processing_jobs_status ON video_processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_video_processing_jobs_type ON video_processing_jobs(job_type);

-- Apply update trigger to video processing jobs
CREATE TRIGGER IF NOT EXISTS update_video_processing_jobs_updated_at 
    BEFORE UPDATE ON video_processing_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update existing recordings to have media_type = 'audio' where not set
UPDATE recordings SET media_type = 'audio' WHERE media_type IS NULL;

-- Add video format support to metadata indexing
CREATE INDEX IF NOT EXISTS idx_recordings_media_type ON recordings(media_type);
CREATE INDEX IF NOT EXISTS idx_recordings_processing_status ON recordings(processing_status);
CREATE INDEX IF NOT EXISTS idx_recordings_video_metadata ON recordings USING GIN(video_metadata) WHERE media_type = 'video';

-- Create view for video lessons with thumbnails
CREATE OR REPLACE VIEW video_lessons_with_thumbnails AS
SELECT 
    r.*,
    COALESCE(
        json_agg(
            json_build_object(
                'id', vt.id,
                'timestamp_percent', vt.timestamp_percent,
                'thumbnail_path', vt.thumbnail_path,
                'thumbnail_size', vt.thumbnail_size,
                'width', vt.width,
                'height', vt.height,
                'file_size', vt.file_size
            ) ORDER BY vt.timestamp_percent, vt.thumbnail_size
        ) FILTER (WHERE vt.id IS NOT NULL),
        '[]'::json
    ) as thumbnails
FROM recordings r
LEFT JOIN video_thumbnails vt ON r.id = vt.recording_id
WHERE r.media_type = 'video'
GROUP BY r.id;

-- Insert sample video metadata structure for documentation
INSERT INTO recordings (
    user_id, recording_id, filename, file_path, file_size, 
    media_type, metadata, video_metadata, processing_status
) VALUES (
    1, 'sample_video_doc', 'sample_structure.mp4', '/dev/null', 0,
    'video',
    '{
        "lessonName": "Sample Video Lesson",
        "subject": "Mathematics",
        "classLevel": "Grade 5",
        "curriculum": "Israeli Curriculum",
        "uploadedAt": "2025-01-02T10:22:00Z",
        "originalFileName": "math_lesson_fractions.mp4"
    }',
    '{
        "duration": 1800.5,
        "resolution": {
            "width": 1920,
            "height": 1080
        },
        "codec": "h264",
        "bitrate": 2500000,
        "frameRate": 30,
        "audioCodec": "aac",
        "audioBitrate": 128000,
        "audioChannels": 2,
        "format": "mp4",
        "hasAudio": true,
        "hasVideo": true,
        "chapters": [
            {
                "title": "Introduction",
                "startTime": 0,
                "endTime": 300
            },
            {
                "title": "Basic Concepts",
                "startTime": 300,
                "endTime": 900
            },
            {
                "title": "Examples",
                "startTime": 900,
                "endTime": 1500
            },
            {
                "title": "Summary",
                "startTime": 1500,
                "endTime": 1800
            }
        ]
    }',
    'completed'
) ON CONFLICT (recording_id) DO NOTHING;

-- Remove the sample record (it was just for documentation)
DELETE FROM recordings WHERE recording_id = 'sample_video_doc';

-- Add comments for documentation
COMMENT ON COLUMN recordings.media_type IS 'Type of media file: audio or video';
COMMENT ON COLUMN recordings.video_metadata IS 'Video-specific metadata including resolution, codec, duration, etc.';
COMMENT ON COLUMN recordings.processing_status IS 'Status of video processing: pending, processing, completed, failed';
COMMENT ON COLUMN recordings.thumbnail_path IS 'Path to the primary thumbnail image';

COMMENT ON TABLE video_thumbnails IS 'Generated thumbnails for video lessons at different timestamps and sizes';
COMMENT ON COLUMN video_thumbnails.timestamp_percent IS 'Percentage of video duration where thumbnail was captured (0-100)';
COMMENT ON COLUMN video_thumbnails.thumbnail_size IS 'Size category: small (320x180), medium (640x360), large (1280x720)';

COMMENT ON TABLE video_processing_jobs IS 'Tracks asynchronous video processing operations';
COMMENT ON COLUMN video_processing_jobs.job_type IS 'Type of processing: thumbnail_generation, metadata_extraction, format_conversion, compression';
COMMENT ON COLUMN video_processing_jobs.progress IS 'Processing progress percentage (0-100)';
