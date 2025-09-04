const fs = require('fs');
const path = require('path');
const { run, query } = require('../server/config/database-sqlite');

async function runDocumentTextExtractionMigration() {
  try {
    console.log('Starting document text extraction migration...');
    
    // Define the SQL statements directly to avoid parsing issues
    const statements = [
      // Create documents table
      `CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        document_id VARCHAR(255) NOT NULL UNIQUE,
        filename VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        file_path TEXT NOT NULL,
        file_size BIGINT NOT NULL,
        file_type VARCHAR(100) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        metadata TEXT DEFAULT '{}',
        tags TEXT DEFAULT '[]',
        upload_status VARCHAR(50) DEFAULT 'completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      // Create document_text_extractions table
      `CREATE TABLE IF NOT EXISTS document_text_extractions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        job_id INTEGER,
        extracted_text TEXT,
        extraction_method VARCHAR(50),
        confidence_score REAL DEFAULT 0.0,
        language_detected VARCHAR(10),
        processing_duration INTEGER,
        extraction_metadata TEXT DEFAULT '{}',
        is_edited BOOLEAN DEFAULT FALSE,
        original_text TEXT,
        edited_at DATETIME,
        edited_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (edited_by) REFERENCES users(id)
      )`,
      
      // Create text_extraction_jobs table
      `CREATE TABLE IF NOT EXISTS text_extraction_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        job_type VARCHAR(50) DEFAULT 'text_extraction',
        status VARCHAR(50) DEFAULT 'pending',
        extraction_method VARCHAR(50),
        processing_config TEXT DEFAULT '{}',
        progress_percent INTEGER DEFAULT 0,
        error_message TEXT,
        started_at DATETIME,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      // Create text_extraction_edit_history table
      `CREATE TABLE IF NOT EXISTS text_extraction_edit_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        extraction_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        original_text TEXT,
        edited_text TEXT,
        edit_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (extraction_id) REFERENCES document_text_extractions(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      // Create indexes
      'CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_documents_document_id ON documents(document_id)',
      'CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type)',
      'CREATE INDEX IF NOT EXISTS idx_text_extractions_document_id ON document_text_extractions(document_id)',
      'CREATE INDEX IF NOT EXISTS idx_text_extractions_user_id ON document_text_extractions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_text_extractions_created_at ON document_text_extractions(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_extraction_jobs_document_id ON text_extraction_jobs(document_id)',
      'CREATE INDEX IF NOT EXISTS idx_extraction_jobs_user_id ON text_extraction_jobs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_extraction_jobs_status ON text_extraction_jobs(status)',
      'CREATE INDEX IF NOT EXISTS idx_extraction_jobs_created_at ON text_extraction_jobs(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_extraction_history_extraction_id ON text_extraction_edit_history(extraction_id)',
      'CREATE INDEX IF NOT EXISTS idx_extraction_history_user_id ON text_extraction_edit_history(user_id)'
    ];
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        await run(statement);
        console.log(`✓ Statement ${i + 1} executed successfully`);
      } catch (error) {
        console.error(`✗ Error executing statement ${i + 1}:`, error.message);
        console.error('Statement:', statement.substring(0, 100) + '...');
        throw error;
      }
    }
    
    // Verify tables were created
    console.log('\nVerifying tables were created...');
    const tables = await query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('documents', 'document_text_extractions', 'text_extraction_jobs', 'text_extraction_edit_history')
      ORDER BY name
    `);
    
    console.log('Created tables:');
    tables.rows.forEach(table => {
      console.log(`✓ ${table.name}`);
    });
    
    // Verify indexes were created
    const indexes = await query(`
      SELECT name FROM sqlite_master 
      WHERE type='index' AND name LIKE 'idx_%document%' OR name LIKE 'idx_%extraction%'
      ORDER BY name
    `);
    
    console.log('\nCreated indexes:');
    indexes.rows.forEach(index => {
      console.log(`✓ ${index.name}`);
    });
    
    console.log('\n✅ Document text extraction migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runDocumentTextExtractionMigration()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { runDocumentTextExtractionMigration };
