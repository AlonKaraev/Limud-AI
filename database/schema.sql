-- LimudAI Database Schema
-- UTF-8 encoding for Hebrew text support

-- Create database (run this separately)
-- CREATE DATABASE limudai_db WITH ENCODING 'UTF8' LC_COLLATE='he_IL.UTF-8' LC_CTYPE='he_IL.UTF-8';

-- Schools table
CREATE TABLE schools (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table with Hebrew text support
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('teacher', 'student')),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    school_id INTEGER REFERENCES schools(id),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_school_id ON users(school_id);
CREATE INDEX idx_users_verification_token ON users(verification_token);
CREATE INDEX idx_users_reset_password_token ON users(reset_password_token);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Recordings table for audio lesson recordings
CREATE TABLE recordings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recording_id VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for recordings
CREATE INDEX idx_recordings_user_id ON recordings(user_id);
CREATE INDEX idx_recordings_recording_id ON recordings(recording_id);
CREATE INDEX idx_recordings_created_at ON recordings(created_at);
CREATE INDEX idx_recordings_metadata ON recordings USING GIN(metadata);

-- Apply update trigger to recordings
CREATE TRIGGER update_recordings_updated_at BEFORE UPDATE ON recordings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample school
INSERT INTO schools (name, address, phone, email) VALUES 
('בית ספר דוגמה', 'רחוב הרצל 123, תל אביב', '03-1234567', 'info@example-school.co.il');
