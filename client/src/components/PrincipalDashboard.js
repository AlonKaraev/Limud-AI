import React, { useState, useEffect } from 'react';
import './PrincipalDashboard.css';

const PrincipalDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardStats, setDashboardStats] = useState(null);
  const [classes, setClasses] = useState([]);
  const [users, setUsers] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [schoolSettings, setSchoolSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [newClassForm, setNewClassForm] = useState({
    name: '',
    description: '',
    teacherId: '',
    gradeLevel: '',
    subjectArea: '',
    academicYear: '2024-2025'
  });

  const [newUserForm, setNewUserForm] = useState({
    email: '',
    password: '',
    role: 'student',
    firstName: '',
    lastName: '',
    phone: ''
  });

  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);

  // Hebrew grade levels
  const gradeLevels = ['א\'', 'ב\'', 'ג\'', 'ד\'', 'ה\'', 'ו\''];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const [statsRes, classesRes, usersRes, permissionsRes, settingsRes] = await Promise.all([
        fetch('/api/principal/dashboard/stats', { headers }),
        fetch('/api/principal/classes', { headers }),
        fetch('/api/principal/users', { headers }),
        fetch('/api/principal/permissions', { headers }),
        fetch('/api/principal/school/settings', { headers })
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setDashboardStats(statsData.data);
      }

      if (classesRes.ok) {
        const classesData = await classesRes.json();
        setClasses(classesData.data);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.data);
      }

      if (permissionsRes.ok) {
        const permissionsData = await permissionsRes.json();
        setPermissions(permissionsData.data);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSchoolSettings(settingsData.data);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('שגיאה בטעינת נתוני לוח הבקרה');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/principal/classes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newClassForm)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('כיתה נוצרה בהצלחה');
        setNewClassForm({
          name: '',
          description: '',
          teacherId: '',
          gradeLevel: '',
          subjectArea: '',
          academicYear: '2024-2025'
        });
        loadDashboardData(); // Refresh data
      } else {
        setError(data.error || 'שגיאה ביצירת כיתה');
      }
    } catch (error) {
      console.error('Error creating class:', error);
      setError('שגיאה ביצירת כיתה');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/principal/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newUserForm)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('משתמש נוצר בהצלחה');
        setNewUserForm({
          email: '',
          password: '',
          role: 'student',
          firstName: '',
          lastName: '',
          phone: ''
        });
        loadDashboardData(); // Refresh data
      } else {
        setError(data.error || 'שגיאה ביצירת משתמש');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setError('שגיאה ביצירת משתמש');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignStudents = async () => {
    if (!selectedClass || selectedStudents.length === 0) {
      setError('יש לבחור כיתה ותלמידים');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/principal/classes/${selectedClass}/students`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ studentIds: selectedStudents })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        setSelectedStudents([]);
        setSelectedClass(null);
        loadDashboardData(); // Refresh data
      } else {
        setError(data.error || 'שגיאה בשיוך תלמידים');
      }
    } catch (error) {
      console.error('Error assigning students:', error);
      setError('שגיאה בשיוך תלמידים');
    } finally {
      setLoading(false);
    }
  };

  const renderDashboard = () => (
    <div className="dashboard-overview">
      <h2>סקירת בית הספר</h2>
      {dashboardStats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>כיתות</h3>
            <div className="stat-number">{dashboardStats.totalClasses}</div>
            <div className="stat-detail">פעילות: {dashboardStats.activeClasses}</div>
          </div>
          <div className="stat-card">
            <h3>תלמידים</h3>
            <div className="stat-number">{dashboardStats.totalStudents}</div>
            <div className="stat-detail">בכיתות: {dashboardStats.studentsInClasses}</div>
          </div>
          <div className="stat-card">
            <h3>מורים</h3>
            <div className="stat-number">{dashboardStats.totalTeachers}</div>
          </div>
          <div className="stat-card">
            <h3>סה"כ משתמשים</h3>
            <div className="stat-number">{dashboardStats.totalUsers}</div>
          </div>
        </div>
      )}

      {dashboardStats && Object.keys(dashboardStats.classesByGrade).length > 0 && (
        <div className="grade-distribution">
          <h3>התפלגות כיתות לפי רמות</h3>
          <div className="grade-grid">
            {Object.entries(dashboardStats.classesByGrade).map(([grade, count]) => (
              <div key={grade} className="grade-item">
                <span className="grade-name">{grade}</span>
                <span className="grade-count">{count} כיתות</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderClassManagement = () => (
    <div className="class-management">
      <h2>ניהול כיתות</h2>
      
      <div className="management-section">
        <h3>יצירת כיתה חדשה</h3>
        <form onSubmit={handleCreateClass} className="create-class-form">
          <div className="form-row">
            <div className="form-group">
              <label>שם הכיתה *</label>
              <input
                type="text"
                value={newClassForm.name}
                onChange={(e) => setNewClassForm({...newClassForm, name: e.target.value})}
                placeholder="לדוגמה: ב' 1"
                required
              />
            </div>
            <div className="form-group">
              <label>רמת כיתה *</label>
              <select
                value={newClassForm.gradeLevel}
                onChange={(e) => setNewClassForm({...newClassForm, gradeLevel: e.target.value})}
                required
              >
                <option value="">בחר רמת כיתה</option>
                {gradeLevels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>מורה אחראי *</label>
              <select
                value={newClassForm.teacherId}
                onChange={(e) => setNewClassForm({...newClassForm, teacherId: e.target.value})}
                required
              >
                <option value="">בחר מורה</option>
                {users.filter(u => u.role === 'teacher').map(teacher => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.first_name} {teacher.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>תחום לימוד</label>
              <input
                type="text"
                value={newClassForm.subjectArea}
                onChange={(e) => setNewClassForm({...newClassForm, subjectArea: e.target.value})}
                placeholder="לדוגמה: מתמטיקה"
              />
            </div>
          </div>

          <div className="form-group">
            <label>תיאור</label>
            <textarea
              value={newClassForm.description}
              onChange={(e) => setNewClassForm({...newClassForm, description: e.target.value})}
              placeholder="תיאור הכיתה..."
              rows="3"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'יוצר...' : 'צור כיתה'}
          </button>
        </form>
      </div>

      <div className="management-section">
        <h3>כיתות קיימות</h3>
        <div className="classes-list">
          {classes.map(cls => (
            <div key={cls.id} className="class-item">
              <div className="class-info">
                <h4>{cls.name}</h4>
                <p>מורה: {cls.teacher_name}</p>
                <p>תלמידים: {cls.student_count}</p>
                <p>רמה: {cls.grade_level}</p>
                {cls.subject_area && <p>תחום: {cls.subject_area}</p>}
              </div>
              <div className="class-actions">
                <button 
                  onClick={() => setSelectedClass(cls.id)}
                  className={selectedClass === cls.id ? 'btn-selected' : 'btn-secondary'}
                >
                  {selectedClass === cls.id ? 'נבחר' : 'בחר לשיוך'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedClass && (
        <div className="management-section">
          <h3>שיוך תלמידים לכיתה</h3>
          <div className="students-selection">
            {users.filter(u => u.role === 'student').map(student => (
              <label key={student.id} className="student-checkbox">
                <input
                  type="checkbox"
                  checked={selectedStudents.includes(student.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedStudents([...selectedStudents, student.id]);
                    } else {
                      setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                    }
                  }}
                />
                {student.first_name} {student.last_name}
              </label>
            ))}
          </div>
          <div className="assignment-actions">
            <button onClick={handleAssignStudents} disabled={loading} className="btn-primary">
              שייך תלמידים נבחרים ({selectedStudents.length})
            </button>
            <button onClick={() => {setSelectedClass(null); setSelectedStudents([]);}} className="btn-secondary">
              ביטול
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderUserManagement = () => (
    <div className="user-management">
      <h2>ניהול משתמשים</h2>
      
      <div className="management-section">
        <h3>יצירת משתמש חדש</h3>
        <form onSubmit={handleCreateUser} className="create-user-form">
          <div className="form-row">
            <div className="form-group">
              <label>שם פרטי *</label>
              <input
                type="text"
                value={newUserForm.firstName}
                onChange={(e) => setNewUserForm({...newUserForm, firstName: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>שם משפחה *</label>
              <input
                type="text"
                value={newUserForm.lastName}
                onChange={(e) => setNewUserForm({...newUserForm, lastName: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>אימייל *</label>
              <input
                type="email"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>תפקיד *</label>
              <select
                value={newUserForm.role}
                onChange={(e) => setNewUserForm({...newUserForm, role: e.target.value})}
                required
              >
                <option value="student">תלמיד</option>
                <option value="teacher">מורה</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>סיסמה *</label>
              <input
                type="password"
                value={newUserForm.password}
                onChange={(e) => setNewUserForm({...newUserForm, password: e.target.value})}
                required
                minLength="6"
              />
            </div>
            <div className="form-group">
              <label>טלפון</label>
              <input
                type="tel"
                value={newUserForm.phone}
                onChange={(e) => setNewUserForm({...newUserForm, phone: e.target.value})}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'יוצר...' : 'צור משתמש'}
          </button>
        </form>
      </div>

      <div className="management-section">
        <h3>משתמשים קיימים</h3>
        <div className="users-list">
          <div className="users-filters">
            <button 
              onClick={() => setActiveTab('users-all')}
              className={activeTab === 'users-all' ? 'btn-selected' : 'btn-secondary'}
            >
              כולם ({users.length})
            </button>
            <button 
              onClick={() => setActiveTab('users-teachers')}
              className={activeTab === 'users-teachers' ? 'btn-selected' : 'btn-secondary'}
            >
              מורים ({users.filter(u => u.role === 'teacher').length})
            </button>
            <button 
              onClick={() => setActiveTab('users-students')}
              className={activeTab === 'users-students' ? 'btn-selected' : 'btn-secondary'}
            >
              תלמידים ({users.filter(u => u.role === 'student').length})
            </button>
          </div>

          <div className="users-grid">
            {users
              .filter(user => {
                if (activeTab === 'users-teachers') return user.role === 'teacher';
                if (activeTab === 'users-students') return user.role === 'student';
                return true;
              })
              .map(user => (
                <div key={user.id} className="user-item">
                  <div className="user-info">
                    <h4>{user.first_name} {user.last_name}</h4>
                    <p>{user.email}</p>
                    <p>תפקיד: {user.role === 'teacher' ? 'מורה' : 'תלמיד'}</p>
                    <p>סטטוס: {user.is_verified ? 'מאומת' : 'לא מאומת'}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPermissions = () => (
    <div className="permissions-management">
      <h2>הרשאות מנהל</h2>
      <div className="permissions-list">
        {permissions.map(permission => (
          <div key={permission.id} className="permission-item">
            <div className="permission-info">
              <h4>{permission.permission_type}</h4>
              <p>הוענק על ידי: {permission.granted_by_name}</p>
              <p>תאריך: {new Date(permission.granted_at).toLocaleDateString('he-IL')}</p>
              {permission.expires_at && (
                <p>פג תוקף: {new Date(permission.expires_at).toLocaleDateString('he-IL')}</p>
              )}
              <p>סטטוס: {permission.is_active ? 'פעיל' : 'לא פעיל'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="principal-dashboard">
      <div className="dashboard-header">
        <h1>לוח בקרה מנהל</h1>
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
      </div>

      <div className="dashboard-nav">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={activeTab === 'dashboard' ? 'nav-btn active' : 'nav-btn'}
        >
          סקירה כללית
        </button>
        <button 
          onClick={() => setActiveTab('classes')}
          className={activeTab === 'classes' ? 'nav-btn active' : 'nav-btn'}
        >
          ניהול כיתות
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={activeTab === 'users' ? 'nav-btn active' : 'nav-btn'}
        >
          ניהול משתמשים
        </button>
        <button 
          onClick={() => setActiveTab('permissions')}
          className={activeTab === 'permissions' ? 'nav-btn active' : 'nav-btn'}
        >
          הרשאות
        </button>
      </div>

      <div className="dashboard-content">
        {loading && <div className="loading">טוען...</div>}
        
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'classes' && renderClassManagement()}
        {activeTab === 'users' && renderUserManagement()}
        {activeTab === 'permissions' && renderPermissions()}
      </div>
    </div>
  );
};

export default PrincipalDashboard;
