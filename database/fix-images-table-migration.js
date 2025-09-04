const fs = require('fs');
const path = require('path');
const { run, query } = require('../server/config/database-sqlite');

async function fixImagesTableMigration() {
  try {
    console.log('Starting images table fix migration...');
    
    // First, check if image_id column already exists
    const tableInfo = await query('PRAGMA table_info(images)');
    const hasImageId = tableInfo.rows.some(col => col.name === 'image_id');
    
    if (hasImageId) {
      console.log('✓ image_id column already exists, skipping migration');
      return;
    }
    
    console.log('Adding missing columns to images table...');
    
    // Add the missing image_id column
    await run(`ALTER TABLE images ADD COLUMN image_id VARCHAR(255)`);
    console.log('✓ Added image_id column');
    
    // Add the missing file_type column
    await run(`ALTER TABLE images ADD COLUMN file_type VARCHAR(50)`);
    console.log('✓ Added file_type column');
    
    // Add the missing dimensions column (JSON)
    await run(`ALTER TABLE images ADD COLUMN dimensions TEXT`);
    console.log('✓ Added dimensions column');
    
    // Add the missing upload_status column
    await run(`ALTER TABLE images ADD COLUMN upload_status VARCHAR(50) DEFAULT 'completed'`);
    console.log('✓ Added upload_status column');
    
    // Now we need to populate the image_id column with unique values for existing records
    console.log('Populating image_id for existing records...');
    const existingImages = await query('SELECT id, filename FROM images WHERE image_id IS NULL');
    
    for (const image of existingImages.rows) {
      // Generate a unique image_id based on timestamp and filename
      const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${image.filename.replace(/[^a-zA-Z0-9]/g, '_')}`;
      await run('UPDATE images SET image_id = ? WHERE id = ?', [imageId, image.id]);
    }
    
    console.log(`✓ Updated ${existingImages.rows.length} existing records with image_id`);
    
    // Populate dimensions column from existing width/height columns
    console.log('Converting width/height to dimensions JSON...');
    const imagesWithDimensions = await query('SELECT id, width, height FROM images WHERE width IS NOT NULL AND height IS NOT NULL');
    
    for (const image of imagesWithDimensions.rows) {
      const dimensions = JSON.stringify({
        width: image.width,
        height: image.height
      });
      await run('UPDATE images SET dimensions = ? WHERE id = ?', [dimensions, image.id]);
    }
    
    console.log(`✓ Updated ${imagesWithDimensions.rows.length} records with dimensions JSON`);
    
    // Create unique index on image_id (we can't make it UNIQUE NOT NULL after adding data)
    try {
      await run('CREATE UNIQUE INDEX IF NOT EXISTS idx_images_image_id_unique ON images(image_id)');
      console.log('✓ Created unique index on image_id');
    } catch (error) {
      console.log('Note: Could not create unique index (may already exist or have duplicates)');
    }
    
    // Verify the migration
    console.log('\nVerifying migration results...');
    const updatedTableInfo = await query('PRAGMA table_info(images)');
    const columnNames = updatedTableInfo.rows.map(col => col.name);
    
    const requiredColumns = ['image_id', 'file_type', 'dimensions', 'upload_status'];
    const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
    
    if (missingColumns.length === 0) {
      console.log('✓ All required columns are present');
    } else {
      console.log('✗ Missing columns:', missingColumns);
    }
    
    // Check that image_id values are populated
    const nullImageIds = await query('SELECT COUNT(*) as count FROM images WHERE image_id IS NULL');
    if (nullImageIds.rows[0].count === 0) {
      console.log('✓ All records have image_id values');
    } else {
      console.log(`✗ ${nullImageIds.rows[0].count} records still have NULL image_id`);
    }
    
    console.log('\n🎉 Images table fix migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Images table fix migration failed:', error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  fixImagesTableMigration()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixImagesTableMigration };
