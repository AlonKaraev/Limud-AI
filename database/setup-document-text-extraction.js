const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path
const dbPath = path.join(__dirname, '../server/database/limud_ai.db');

console.log('Setting up document text extraction tables...');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database.');
});

// Setup function
function setupDocumentTextExtraction() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log('Creating documents table...');
      
      // Documents table for storing uploaded documents
      db.run(`
        CREATE TABLE IF NOT EXISTS documents (
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
        )
      `, (err) => {
        if (err) {
          console.error('Error creating documents table:', err);
          reject(err);
          return;
        }
        console.log('✅ Documents table created successfully');
      });

      console.log('Creating text_extraction_jobs table...');
      
      // Text extraction jobs table for tracking processing status
      db.run(`
        CREATE TABLE IF NOT EXISTS text_extraction_jobs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          document_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          job_type VARCHAR(50) DEFAULT 'text_extraction',
          status VARCHAR(50) DEFAULT 'pending',
          extraction_method VARCHAR(50),
          processing_config TEXT DEFAULT '{}',
          progress_percent INTEGER DEFAULT 0,
          progress_message TEXT,
          error_message TEXT,
          started_at DATETIME,
          completed_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('Error creating text_extraction_jobs table:', err);
          reject(err);
          return;
        }
        console.log('✅ Text extraction jobs table created successfully');
      });

      console.log('Creating document_text_extractions table...');
      
      // Document text extractions table
      db.run(`
        CREATE TABLE IF NOT EXISTS document_text_extractions (
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
        )
      `, (err) => {
        if (err) {
          console.error('Error creating document_text_extractions table:', err);
          reject(err);
          return;
        }
        console.log('✅ Document text extractions table created successfully');
      });

      console.log('Creating text_extraction_edit_history table...');
      
      // Text extraction edit history
      db.run(`
        CREATE TABLE IF NOT EXISTS text_extraction_edit_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          extraction_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          original_text TEXT,
          edited_text TEXT,
          edit_reason TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (extraction_id) REFERENCES document_text_extractions(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('Error creating text_extraction_edit_history table:', err);
          reject(err);
          return;
        }
        console.log('✅ Text extraction edit history table created successfully');
      });

      console.log('Creating indexes...');
      
      // Create indexes for performance
      const indexes = [
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

      let indexCount = 0;
      indexes.forEach((indexSQL, i) => {
        db.run(indexSQL, (err) => {
          if (err) {
            console.error(`Error creating index ${i + 1}:`, err);
            reject(err);
            return;
          }
          indexCount++;
          if (indexCount === indexes.length) {
            console.log('✅ All indexes created successfully');
            resolve();
          }
        });
      });
    });
  });
}

// Run the setup
setupDocumentTextExtraction()
  .then(() => {
    console.log('✅ Document text extraction setup completed successfully!');
    console.log('');
    console.log('📋 Summary of created tables:');
    console.log('  - documents: Stores uploaded document files and metadata');
    console.log('  - text_extraction_jobs: Tracks the status and progress of text extraction jobs');
    console.log('  - document_text_extractions: Stores extracted text content from documents');
    console.log('  - text_extraction_edit_history: Maintains history of manual edits to extracted text');
    console.log('');
    console.log('🚀 You can now use the enhanced image text extraction functionality!');
    
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed.');
      }
      process.exit(0);
    });
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      }
      process.exit(1);
    });
  });
