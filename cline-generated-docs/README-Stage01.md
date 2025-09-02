# LimudAI - Stage 1 Implementation

## Overview
Stage 1 implements the core infrastructure and user management system for LimudAI, a Hebrew-language educational platform. This stage provides secure authentication, role-based access control, and a complete Hebrew-language user interface.

## Features Implemented

### 🔐 Authentication System
- **JWT-based Authentication**: Secure token-based authentication with configurable expiration
- **User Registration**: Complete registration flow with validation
- **Login/Logout**: Secure login with rate limiting and session management
- **Password Security**: Bcrypt hashing with configurable salt rounds
- **Account Verification**: Email verification system (ready for email integration)
- **Password Reset**: Secure password reset with time-limited tokens

### 👥 User Management
- **Role-based System**: Support for teachers and students
- **Profile Management**: Users can update their personal information
- **School Association**: Users are linked to specific schools
- **Data Validation**: Comprehensive input validation with Hebrew error messages

### 🌐 Hebrew Language Support
- **RTL Layout**: Complete right-to-left text direction support
- **Hebrew Fonts**: Heebo font family optimized for Hebrew text
- **Internationalization**: Comprehensive Hebrew translation system
- **Form Validation**: Hebrew error messages and validation feedback
- **Accessibility**: ARIA labels and keyboard navigation in Hebrew

### 🛡️ Security Features
- **Rate Limiting**: Protection against brute force attacks
- **CORS Configuration**: Secure cross-origin resource sharing
- **Security Headers**: Helmet.js for security headers
- **Input Sanitization**: Express-validator for input validation
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Content Security Policy implementation

### 🎨 User Interface
- **Responsive Design**: Mobile-first responsive layout
- **Clean Aesthetics**: Minimal, professional design
- **Role-based Dashboards**: Separate interfaces for teachers and students
- **Loading States**: User feedback during async operations
- **Error Handling**: Comprehensive error display system

## Project Structure

```
limud-ai/
├── server/                 # Backend Express.js application
│   ├── config/
│   │   └── database.js     # PostgreSQL connection configuration
│   ├── models/
│   │   └── User.js         # User model with authentication methods
│   ├── middleware/
│   │   └── auth.js         # Authentication and authorization middleware
│   ├── routes/
│   │   └── auth.js         # Authentication API routes
│   └── app.js              # Main server application
├── client/                 # React frontend application
│   ├── public/
│   │   └── index.html      # HTML template with Hebrew support
│   ├── src/
│   │   ├── App.js          # Main React application component
│   │   └── index.js        # React entry point
│   └── package.json        # Frontend dependencies
├── shared/                 # Shared utilities and translations
│   └── i18n/
│       └── he.json         # Hebrew translations
├── database/
│   └── schema.sql          # Database schema with Hebrew support
├── .env.example            # Environment variables template
└── package.json            # Main project configuration
```

## Database Schema

### Users Table
- **id**: Primary key (SERIAL)
- **email**: Unique email address
- **password_hash**: Bcrypt hashed password
- **role**: 'teacher' or 'student'
- **first_name**: Hebrew-supported first name
- **last_name**: Hebrew-supported last name
- **phone**: Israeli phone number format
- **school_id**: Foreign key to schools table
- **is_verified**: Account verification status
- **verification_token**: Email verification token
- **reset_password_token**: Password reset token
- **reset_password_expires**: Token expiration timestamp
- **created_at/updated_at**: Automatic timestamps

### Schools Table
- **id**: Primary key (SERIAL)
- **name**: School name (Hebrew supported)
- **address**: School address
- **phone**: Contact phone number
- **email**: Contact email
- **created_at/updated_at**: Automatic timestamps

## API Endpoints

### Authentication Routes (`/api/auth`)

#### POST `/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "שם",
  "lastName": "משפחה",
  "phone": "0501234567",
  "role": "student",
  "schoolId": 1
}
```

#### POST `/login`
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

#### GET `/profile`
Get current user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

#### PUT `/profile`
Update user profile (requires authentication).

#### POST `/verify/:token`
Verify user account with verification token.

#### POST `/reset-password`
Request password reset token.

#### POST `/reset-password/:token`
Reset password with reset token.

#### POST `/logout`
Logout user (client-side token invalidation).

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=limudai_db
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

## Installation and Setup

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Database Setup
1. Create PostgreSQL database:
```sql
CREATE DATABASE limudai_db WITH ENCODING 'UTF8' LC_COLLATE='he_IL.UTF-8' LC_CTYPE='he_IL.UTF-8';
```

2. Run database migration:
```bash
npm run db:migrate
```

### Application Setup
1. Install dependencies:
```bash
npm run install-deps
```

2. Create environment file:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start development servers:
```bash
npm run dev
```

This will start:
- Backend server on http://localhost:5000
- Frontend development server on http://localhost:3000

## Usage

### For Teachers
1. Register with role "teacher"
2. Access teacher dashboard with class management features
3. View and manage students in their school

### For Students
1. Register with role "student"
2. Access student dashboard with learning features
3. View assignments and progress (future stages)

## Security Considerations

### Implemented Security Measures
- **Password Hashing**: Bcrypt with 12 salt rounds
- **JWT Security**: Secure token generation and validation
- **Rate Limiting**: 5 login attempts per 15 minutes per IP
- **Input Validation**: Comprehensive validation with Hebrew support
- **CORS Protection**: Configured for specific origins
- **Security Headers**: CSP, XSS protection, etc.
- **SQL Injection Prevention**: Parameterized queries only

### Production Recommendations
- Use HTTPS in production
- Configure proper CORS origins
- Set up email service for verification
- Implement proper logging and monitoring
- Use environment-specific JWT secrets
- Configure database connection pooling
- Set up backup procedures

## Testing

### Manual Testing Checklist
- [ ] User registration with Hebrew names
- [ ] User login and logout
- [ ] Profile updates
- [ ] Role-based dashboard access
- [ ] Form validation with Hebrew messages
- [ ] Responsive design on mobile devices
- [ ] RTL text direction throughout app

### API Testing
Use tools like Postman or curl to test API endpoints:

```bash
# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456","firstName":"תלמיד","lastName":"בדיקה","role":"student","schoolId":1}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}'
```

## Known Limitations

1. **Email Service**: Email verification requires external email service configuration
2. **File Uploads**: Not implemented in Stage 1
3. **Advanced Validation**: Some complex business rules pending
4. **Caching**: Redis caching not implemented yet
5. **Logging**: Basic console logging only

## Next Steps (Future Stages)

1. **Lesson Management**: Create and manage lessons
2. **Assessment Tools**: Quiz and test creation
3. **AI Integration**: Automated content generation
4. **Analytics**: Learning progress tracking
5. **Communication**: Messaging between teachers and students
6. **Mobile App**: Native mobile applications

## Troubleshooting

### Common Issues

**Database Connection Error:**
- Verify PostgreSQL is running
- Check database credentials in .env
- Ensure database exists and is accessible

**Frontend Build Errors:**
- Clear node_modules and reinstall dependencies
- Check Node.js version compatibility
- Verify all required dependencies are installed

**Authentication Issues:**
- Check JWT_SECRET is set in environment
- Verify token expiration settings
- Clear browser localStorage if needed

**Hebrew Text Issues:**
- Ensure UTF-8 encoding in database
- Check font loading in browser
- Verify RTL CSS is applied correctly

## Contributing

When contributing to Stage 1:
1. Follow Hebrew RTL design patterns
2. Include Hebrew translations for new text
3. Test with Hebrew input data
4. Maintain security best practices
5. Update documentation for new features

## License

This project is part of the LimudAI educational platform. All rights reserved.
