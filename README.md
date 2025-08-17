# Limud-AI
# LimudAI - פלטפורמת הערכה חינוכית
## Educational Assessment & Curriculum Tracking Platform

### Overview
LimudAI is a comprehensive Hebrew-language educational platform that revolutionizes classroom assessment and curriculum tracking through AI-powered lesson analysis, automated test generation, and real-time teaching effectiveness monitoring.

### 🎯 Key Features

#### 📹 **Automated Lesson Recording**
- Browser-based audio recording for extended lesson periods (30+ minutes)
- High-quality audio capture optimized for classroom environments
- Automatic file management and secure cloud storage
- Progressive upload with interruption recovery

#### 🤖 **AI-Powered Content Generation**
- Hebrew speech-to-text transcription with 90%+ accuracy
- Intelligent lesson summary generation
- Automated creation of 10-question assessments
- Similar answer options designed to challenge focused students

#### 🔒 **Secure Assessment Delivery**
- Anti-cheating measures including copy-paste prevention
- Question and answer separation across pages to prevent AI assistance
- Response time tracking for each student interaction
- Session monitoring and behavioral analysis

#### 📱 **Multi-Channel Communication**
- WhatsApp Business API integration for instant notifications
- Email delivery system for test links and results
- Automated distribution of summaries and assessments
- 95%+ delivery success rate across channels

#### 📊 **Comprehensive Analytics Dashboard**
- Real-time student performance monitoring
- Response time analysis and engagement metrics
- Test result visualization and trend analysis
- Exportable reports for administrative review

#### 📚 **Curriculum Effectiveness Tracking**
- Plan vs. actual teaching analysis
- Automated curriculum coverage assessment
- Teaching effectiveness percentage calculations
- Professional development insights and recommendations

### 🛠 Technical Specifications

#### **Platform Requirements**
- **Interface**: Web-based only (no mobile app)
- **Language**: Hebrew throughout entire system
- **Design**: Formal, minimal, visually pleasing aesthetic
- **Architecture**: Separate interfaces for students and teachers

#### **Technology Stack**
- **Backend**: Node.js with Express.js
- **Frontend**: React with Hebrew RTL support
- **Database**: PostgreSQL with UTF-8 encoding
- **AI Integration**: OpenAI Whisper & GPT models
- **Communication**: WhatsApp Business API, SMTP services

#### **Security Features**
- JWT-based authentication with role-based access
- Content encryption during transmission
- Anti-cheating behavioral detection
- Comprehensive audit trails
- GDPR/privacy compliance

### 🚀 Development Stages

The platform is developed across 8 sequential stages:

1. **Core Infrastructure** - User management, Hebrew UI, authentication
2. **Audio Recording** - Browser recording, file storage, playback
3. **AI Content Generation** - Transcription, summaries, test creation
4. **Test Delivery** - Secure student portal, timing tracking
5. **Communication Integration** - WhatsApp & email automation
6. **Teacher Dashboard** - Analytics, reporting, visualization
7. **Security Implementation** - Anti-cheating, content protection
8. **Curriculum Tracking** - Plan vs actual analysis, effectiveness metrics

### 📋 Installation & Setup

#### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 13+
- OpenAI API credentials
- WhatsApp Business API access
- SMTP email service

#### Quick Start
```bash
# Clone the repository
git clone https://github.com/your-org/limudai.git
cd limudai

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Initialize database
npm run db:setup
npm run db:migrate

# Start development servers
npm run dev
```

#### Environment Configuration
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/limudai

# AI Services
OPENAI_API_KEY=your_openai_key
WHISPER_MODEL=whisper-1

# Communication
WHATSAPP_API_TOKEN=your_whatsapp_token
SMTP_HOST=your_smtp_host
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key
```

### 📖 Usage Guide

#### For Teachers
1. **Record Lessons**: Click record button in dashboard to capture lessons
2. **Review Content**: AI generates summaries and tests automatically
3. **Distribute Assessments**: Send via WhatsApp/email to students
4. **Monitor Performance**: View real-time results and analytics
5. **Track Curriculum**: Compare planned vs actual teaching effectiveness

#### For Students
1. **Receive Notifications**: Get test links via WhatsApp/email
2. **Complete Assessments**: Navigate secure test interface
3. **Submit Responses**: Answers tracked with timing data
4. **Receive Results**: Get feedback after grading completion

#### For Administrators
1. **Manage Users**: Oversee teacher and student accounts
2. **View Analytics**: Monitor system-wide performance metrics
3. **Generate Reports**: Export comprehensive assessment data
4. **Configure Settings**: Adjust security and operational parameters

### 🔧 API Documentation

#### Authentication Endpoints
```http
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
GET  /api/auth/profile
```

#### Recording Management
```http
POST /api/recordings/start
POST /api/recordings/stop
GET  /api/recordings/:id
DELETE /api/recordings/:id
```

#### Assessment Operations
```http
GET  /api/assessments
POST /api/assessments
GET  /api/assessments/:id/results
POST /api/assessments/:id/submit
```

### 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Coverage report
npm run test:coverage
```

### 🔄 Development Workflow

1. **Feature Development**: Follow stage-based development approach
2. **Code Review**: All changes require peer review
3. **Testing**: Comprehensive test coverage required
4. **Security Audit**: Regular security assessments
5. **Performance Monitoring**: Continuous performance optimization

### 📊 System Requirements

#### Minimum Server Specifications
- **CPU**: 4 cores, 2.4GHz
- **RAM**: 8GB
- **Storage**: 500GB SSD
- **Bandwidth**: 100Mbps
- **Concurrent Users**: 100+

#### Browser Compatibility
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### 🛡️ Security & Privacy

- **Data Encryption**: AES-256 encryption for sensitive data
- **Privacy Compliance**: GDPR and educational privacy standards
- **Access Control**: Role-based permissions with audit trails
- **Secure Communication**: TLS 1.3 for all data transmission
- **Regular Audits**: Quarterly security assessments

### 🤝 Contributing

We welcome contributions from the educational technology community!

#### Getting Started
1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

#### Coding Standards
- Follow ESLint configuration
- Write comprehensive tests
- Document new features
- Maintain Hebrew language support

### 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### 📞 Support & Contact

- **Documentation**: [https://docs.limudai.org](https://docs.limudai.org)
- **Issue Tracker**: [GitHub Issues](https://github.com/your-org/limudai/issues)
- **Community Forum**: [https://community.limudai.org](https://community.limudai.org)
- **Email Support**: support@limudai.org

### 🏆 Acknowledgments

- OpenAI for Whisper and GPT integration
- WhatsApp Business API team
- Hebrew NLP research community
- Educational technology advisors

---

**LimudAI** - Transforming Education Through Intelligent Assessment
*Made with ❤️ for Hebrew educators*