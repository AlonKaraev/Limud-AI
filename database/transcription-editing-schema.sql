-- Transcription Editing Schema Extension
-- Adds support for manual transcription editing

-- Add columns to transcriptions table to track editing
ALTER TABLE transcriptions ADD COLUMN original_text TEXT;
ALTER TABLE transcriptions ADD COLUMN is_edited BOOLEAN DEFAULT FALSE;
ALTER TABLE transcriptions ADD COLUMN edited_at TIMESTAMP;
ALTER TABLE transcriptions ADD COLUMN edited_by INTEGER REFERENCES users(id);

-- Create transcription edit history table
CREATE TABLE transcription_edit_history (
    id SERIAL PRIMARY KEY,
    transcription_id INTEGER NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_text TEXT NOT NULL,
    edited_text TEXT NOT NULL,
    edit_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_transcription_edit_history_transcription_id ON transcription_edit_history(transcription_id);
CREATE INDEX idx_transcription_edit_history_user_id ON transcription_edit_history(user_id);
CREATE INDEX idx_transcription_edit_history_created_at ON transcription_edit_history(created_at);

-- Apply update trigger to transcription_edit_history
CREATE TRIGGER update_transcription_edit_history_updated_at BEFORE UPDATE ON transcription_edit_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
