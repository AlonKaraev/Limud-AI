-- Add title metadata to all media tables
-- This migration adds a 'title' field to documents, images, and recordings tables

-- Add title field to documents table
ALTER TABLE documents ADD COLUMN title VARCHAR(255);

-- Add title field to images table  
ALTER TABLE images ADD COLUMN title VARCHAR(255);

-- Add title field to recordings table
ALTER TABLE recordings ADD COLUMN title VARCHAR(255);

-- Create indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title);
CREATE INDEX IF NOT EXISTS idx_images_title ON images(title);
CREATE INDEX IF NOT EXISTS idx_recordings_title ON recordings(title);

-- Add comments for documentation
-- title field: User-defined title for the media item, displayed instead of filename when available
