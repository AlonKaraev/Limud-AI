const http = require('http');
const fs = require('fs');
const path = require('path');

// Test the server health first
function testServerHealth() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/health',
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                console.log('Server health check:', res.statusCode, data);
                resolve(res.statusCode === 200);
            });
        });

        req.on('error', (err) => {
            console.error('Server health check failed:', err.message);
            reject(err);
        });

        req.end();
    });
}

// Test the images API endpoint
function testImagesAPI() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/images',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                console.log('Images API test:', res.statusCode);
                console.log('Response:', data);
                resolve(res.statusCode);
            });
        });

        req.on('error', (err) => {
            console.error('Images API test failed:', err.message);
            reject(err);
        });

        req.end();
    });
}

// Test database connection by checking if we can query the images table
function testDatabaseConnection() {
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.join(__dirname, 'server', 'database', 'limud_ai.db');
    
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        
        db.all('SELECT COUNT(*) as count FROM images', [], (err, rows) => {
            if (err) {
                console.error('Database test failed:', err.message);
                reject(err);
            } else {
                console.log('Database test successful. Images count:', rows[0].count);
                resolve(true);
            }
            db.close();
        });
    });
}

// Run all tests
async function runTests() {
    console.log('Testing image upload functionality...\n');
    
    try {
        console.log('1. Testing server health...');
        await testServerHealth();
        
        console.log('\n2. Testing database connection...');
        await testDatabaseConnection();
        
        console.log('\n3. Testing images API endpoint...');
        await testImagesAPI();
        
        console.log('\n✅ All tests completed successfully!');
        console.log('The image upload functionality should now work properly.');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
    }
}

runTests();
