-- Lesson Naming Schema Extension
-- Adds support for teacher-provided lesson names and AI naming preferences

-- Add lesson naming fields to content_shares table
ALTER TABLE content_shares ADD COLUMN lesson_name VARCHAR(255) NULL;
ALTER TABLE content_shares ADD COLUMN use_ai_naming BOOLEAN DEFAULT 0;

-- Add index for lesson_name for better search performance
CREATE INDEX IF NOT EXISTS idx_content_shares_lesson_name ON content_shares(lesson_name);

-- Update existing content_shares to have use_ai_naming = 0 by default
UPDATE content_shares SET use_ai_naming = 0 WHERE use_ai_naming IS NULL;
