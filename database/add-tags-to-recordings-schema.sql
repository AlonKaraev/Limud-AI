-- Add tags support to recordings table for media items tagging system
-- This migration adds tags column to the recordings table to support tagging functionality

-- Add tags column to recordings table
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';

-- Create index for tags to support efficient searching
CREATE INDEX IF NOT EXISTS idx_recordings_tags ON recordings USING GIN(tags);

-- Add comment for documentation
COMMENT ON COLUMN recordings.tags IS 'JSON array of tags for categorization and search of media items';

-- Update existing records to have empty tags array if NULL
UPDATE recordings SET tags = '[]' WHERE tags IS NULL;
