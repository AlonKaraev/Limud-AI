# Principal User Type Implementation - Limud AI

This document describes the implementation of the Principal user type in Limud AI, which provides administrative capabilities for school management.

## Overview

The Principal user type has been added to enable school administrators to:
- Create and manage classes with Hebrew naming (ב' 1, ג' 2, etc.)
- Assign students to classes
- Create and manage teacher and student accounts
- Grant principal permissions to other users
- View school-wide statistics and reports
- Manage school settings

## Database Changes

### New Tables

1. **principal_permissions** - Manages granular permissions for principals
2. **principal_audit_log** - Tracks all principal actions for accountability
3. **school_settings** - Stores school-specific configuration
4. **class_templates** - Predefined class templates for easy creation

### Updated Tables

- **users** - Added 'principal' role to the role constraint
- **classes** - Added `created_by` and `managed_by` columns

### Permission Types

- `class_management` - Create/manage classes and assign students
- `user_management` - Create/manage teachers and students
- `permission_management` - Grant/revoke principal permissions
- `school_administration` - Manage school settings
- `content_oversight` - Access to all school content

## Backend Implementation

### Services

**PrincipalService** (`server/services/PrincipalService.js`)
- Handles all principal-specific business logic
- Permission checking and validation
- Audit logging for all actions
- School-scoped operations

### Routes

**Principal API** (`server/routes/principal.js`)
- `/api/principal/dashboard/stats` - School statistics
- `/api/principal/classes` - Class management
- `/api/principal/users` - User management
- `/api/principal/permissions` - Permission management
- `/api/principal/school/settings` - School settings

### Middleware

**Enhanced Authentication** (`server/middleware/auth.js`)
- `authorizePrincipal(permissionType)` - Check specific principal permissions
- `authorizeTeacherOrPrincipal(principalPermission)` - Combined authorization

## Frontend Implementation

### Components

**PrincipalDashboard** (`client/src/components/PrincipalDashboard.js`)
- Comprehensive dashboard with multiple tabs
- Class creation with Hebrew grade levels
- Student assignment interface
- User management with role filtering
- Permission overview

**Styling** (`client/src/components/PrincipalDashboard.css`)
- RTL support for Hebrew interface
- Responsive design for mobile devices
- Accessible color scheme and focus states

## Hebrew Grade Level Support

The system supports Hebrew grade naming convention:
- א' (Aleph) - 1st grade
- ב' (Bet) - 2nd grade  
- ג' (Gimel) - 3rd grade
- ד' (Dalet) - 4th grade
- ה' (He) - 5th grade
- ו' (Vav) - 6th grade

Classes can be named like: "ב' 1", "ג' 2", etc.

## Security Features

### Permission System
- Granular permissions prevent unauthorized access
- School-scoped operations ensure data isolation
- Audit logging tracks all administrative actions

### Authentication
- JWT-based authentication with role verification
- Permission expiration support
- Rate limiting on administrative endpoints

## Installation & Setup

### 1. Run Database Setup

```bash
cd database
node fix-users-table.js
```

This will:
- Update the database schema to support principal role
- Preserve existing users
- Create sample principal user
- Set up default permissions

### 2. Sample Principal Account

After migration, you can log in with:
- **Email**: `principal@example-school.co.il`
- **Password**: `principal123`

### 3. Start the Application

```bash
# Backend
cd server
npm start

# Frontend  
cd client
npm start
```

## API Usage Examples

### Create a Class

```javascript
POST /api/principal/classes
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "ב' 1",
  "description": "כיתה ב' מספר 1",
  "teacherId": 5,
  "gradeLevel": "ב'",
  "subjectArea": "כללי",
  "academicYear": "2024-2025"
}
```

### Assign Students to Class

```javascript
POST /api/principal/classes/1/students
Authorization: Bearer <token>
Content-Type: application/json

{
  "studentIds": [10, 11, 12, 13]
}
```

### Create a User

```javascript
POST /api/principal/users
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "teacher@school.co.il",
  "password": "secure123",
  "role": "teacher",
  "firstName": "שרה",
  "lastName": "לוי",
  "phone": "050-1234567"
}
```

### Grant Permission

```javascript
POST /api/principal/permissions/grant
Authorization: Bearer <token>
Content-Type: application/json

{
  "principalId": 3,
  "permissionType": "class_management",
  "notes": "Granted for semester management",
  "expiresAt": "2025-06-30T23:59:59Z"
}
```

## Error Handling

The system implements comprehensive error handling:

### Frontend
- User-friendly Hebrew error messages
- Loading states during operations
- Form validation with real-time feedback
- Network error handling

### Backend
- Proper HTTP status codes
- Detailed error logging
- Permission validation
- School boundary enforcement

## Audit Trail

All principal actions are logged with:
- Action type and target
- Old and new values (for updates)
- IP address and user agent
- Timestamp and principal ID

Access audit logs via:
```javascript
GET /api/principal/audit-log?actionType=user_created&startDate=2024-01-01
```

## Testing

### Manual Testing Checklist

1. **Authentication**
   - [ ] Principal can log in
   - [ ] Non-principals cannot access principal routes
   - [ ] Permissions are properly checked

2. **Class Management**
   - [ ] Create class with Hebrew name
   - [ ] Assign multiple students
   - [ ] Remove students from class
   - [ ] View class statistics

3. **User Management**
   - [ ] Create teacher account
   - [ ] Create student account
   - [ ] View user lists with filtering

4. **Permissions**
   - [ ] Grant permission to another principal
   - [ ] Revoke permissions
   - [ ] View permission history

5. **School Settings**
   - [ ] Update school settings
   - [ ] View current configuration

## Future Enhancements

### Planned Features
- Bulk student import from CSV
- Class scheduling integration
- Parent account management
- Advanced reporting dashboard
- Multi-school support for district administrators

### Technical Improvements
- Real-time notifications
- Advanced search and filtering
- Export functionality
- Mobile app support

## Troubleshooting

### Common Issues

**Migration Fails**
- Ensure database file exists
- Check file permissions
- Verify Node.js dependencies

**Permission Denied**
- Check user role in database
- Verify principal_permissions table
- Ensure JWT token is valid

**Hebrew Text Issues**
- Verify UTF-8 encoding
- Check database collation
- Ensure proper font support

### Debug Commands

```bash
# Check database schema
sqlite3 server/database/limudai.db ".schema users"

# View principal permissions
sqlite3 server/database/limudai.db "SELECT * FROM principal_permissions;"

# Check audit log
sqlite3 server/database/limudai.db "SELECT * FROM principal_audit_log ORDER BY created_at DESC LIMIT 10;"
```

## Contributing

When extending principal functionality:

1. Update database schema if needed
2. Add appropriate permissions checks
3. Include audit logging
4. Update API documentation
5. Add frontend validation
6. Test with Hebrew content
7. Ensure mobile responsiveness

## Support

For issues or questions regarding the principal implementation:
1. Check the audit logs for error details
2. Verify permissions in the database
3. Test with the sample principal account
4. Review the API response codes and messages

---

**Implementation Status**: ✅ Complete
**Last Updated**: January 2025
**Version**: 1.0.0
