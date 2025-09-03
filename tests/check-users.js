const { query } = require('../server/config/database-sqlite');

async function checkUsers() {
    try {
        console.log('Checking users in database...');
        const result = await query('SELECT email, role FROM users LIMIT 5');
        
        if (result.rows && result.rows.length > 0) {
            console.log('Users in database:');
            result.rows.forEach(user => {
                console.log(`- ${user.email} (${user.role})`);
            });
        } else {
            console.log('No users found in database');
        }
    } catch (error) {
        console.error('Error checking users:', error);
    }
}

checkUsers();
