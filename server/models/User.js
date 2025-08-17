const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query, run } = require('../config/database-sqlite');

class User {
  constructor(userData) {
    this.id = userData.id;
    this.email = userData.email;
    this.role = userData.role;
    this.firstName = userData.first_name;
    this.lastName = userData.last_name;
    this.phone = userData.phone;
    this.schoolId = userData.school_id;
    this.isVerified = userData.is_verified;
    this.createdAt = userData.created_at;
    this.updatedAt = userData.updated_at;
  }

  // Create a new user
  static async create(userData) {
    const { email, password, role, firstName, lastName, phone, schoolId } = userData;
    
    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    const queryText = `
      INSERT INTO users (email, password_hash, role, first_name, last_name, phone, school_id, verification_token)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [email, passwordHash, role, firstName, lastName, phone, schoolId, verificationToken];
    
    try {
      const result = await run(queryText, values);
      // Get the created user
      const getUserQuery = 'SELECT * FROM users WHERE id = ?';
      const userResult = await query(getUserQuery, [result.lastID]);
      return new User(userResult.rows[0]);
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error('משתמש עם כתובת אימייל זו כבר קיים במערכת');
      }
      throw error;
    }
  }

  // Find user by email
  static async findByEmail(email) {
    const queryText = 'SELECT * FROM users WHERE email = ?';
    const result = await query(queryText, [email]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return new User(result.rows[0]);
  }

  // Find user by ID
  static async findById(id) {
    const queryText = 'SELECT * FROM users WHERE id = ?';
    const result = await query(queryText, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return new User(result.rows[0]);
  }

  // Verify password
  async verifyPassword(password) {
    const queryText = 'SELECT password_hash FROM users WHERE id = ?';
    const result = await query(queryText, [this.id]);
    
    if (result.rows.length === 0) {
      return false;
    }
    
    return await bcrypt.compare(password, result.rows[0].password_hash);
  }

  // Generate JWT token
  generateToken() {
    const payload = {
      id: this.id,
      email: this.email,
      role: this.role,
      firstName: this.firstName,
      lastName: this.lastName
    };
    
    return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });
  }

  // Verify JWT token
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (error) {
      throw new Error('טוקן לא תקין');
    }
  }

  // Verify user account
  async verifyAccount(token) {
    const queryText = `
      UPDATE users 
      SET is_verified = true, verification_token = NULL 
      WHERE id = $1 AND verification_token = $2
      RETURNING *
    `;
    
    const result = await query(queryText, [this.id, token]);
    
    if (result.rows.length === 0) {
      throw new Error('טוקן אימות לא תקין');
    }
    
    this.isVerified = true;
    return this;
  }

  // Generate password reset token
  async generatePasswordResetToken() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now
    
    const queryText = `
      UPDATE users 
      SET reset_password_token = $1, reset_password_expires = $2 
      WHERE id = $3
      RETURNING *
    `;
    
    await query(queryText, [resetToken, resetExpires, this.id]);
    return resetToken;
  }

  // Reset password
  static async resetPassword(token, newPassword) {
    const queryText = `
      SELECT * FROM users 
      WHERE reset_password_token = $1 AND reset_password_expires > NOW()
    `;
    
    const result = await query(queryText, [token]);
    
    if (result.rows.length === 0) {
      throw new Error('טוקן איפוס סיסמה לא תקין או פג תוקף');
    }
    
    const user = new User(result.rows[0]);
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    
    const updateQuery = `
      UPDATE users 
      SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL 
      WHERE id = $2
      RETURNING *
    `;
    
    const updateResult = await query(updateQuery, [passwordHash, user.id]);
    return new User(updateResult.rows[0]);
  }

  // Update user profile
  async updateProfile(updateData) {
    const allowedFields = ['first_name', 'last_name', 'phone'];
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }
    
    if (updates.length === 0) {
      return this;
    }
    
    values.push(this.id);
    const queryText = `
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await query(queryText, values);
    return new User(result.rows[0]);
  }

  // Get users by school (for teachers to see their students)
  static async getBySchool(schoolId, role = null) {
    let queryText = 'SELECT * FROM users WHERE school_id = $1';
    const values = [schoolId];
    
    if (role) {
      queryText += ' AND role = $2';
      values.push(role);
    }
    
    queryText += ' ORDER BY last_name, first_name';
    
    const result = await query(queryText, values);
    return result.rows.map(row => new User(row));
  }

  // Convert to JSON (exclude sensitive data)
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      role: this.role,
      firstName: this.firstName,
      lastName: this.lastName,
      phone: this.phone,
      schoolId: this.schoolId,
      isVerified: this.isVerified,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = User;
