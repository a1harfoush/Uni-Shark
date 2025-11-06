# 🦈 UniShark - Your Ultimate Academic Assistant

<div align="center">

![UniShark Logo](logo/_Image%2022.png)

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14+-black.svg)](https://nextjs.org)
[![Heroku](https://img.shields.io/badge/Deployed%20on-Heroku-purple.svg)](https://heroku.com)

**🎓 Never miss a deadline again! UniShark automatically monitors your university portal and keeps you informed.**

[🚀 Live Demo](https://unishark.site) • [📖 Documentation](#documentation) • [🐛 Report Bug](https://github.com/yourusername/unishark/issues) • [💡 Request Feature](https://github.com/yourusername/unishark/issues)

</div>

---

## 🌟 What is UniShark?

UniShark is an intelligent academic monitoring system that automatically tracks your university assignments, deadlines, absences, and course registrations. Built specifically for DULMS (Damascus University Learning Management System), it provides real-time notifications across multiple platforms to ensure you never miss important academic updates.

### 🎯 Key Features

<details>
<summary>🤖 <strong>Automated Monitoring</strong></summary>

- **Smart Scraping**: Automatically logs into your university portal
- **Real-time Updates**: Monitors changes every few hours (customizable)
- **Intelligent Detection**: Identifies new assignments, deadlines, and absences
- **Background Processing**: Runs silently using Celery task queues

</details>

<details>
<summary>🔔 <strong>Multi-Platform Notifications</strong></summary>

- **Discord Webhooks**: Rich embedded notifications with assignment details
- **Telegram Bot**: Instant messages with markdown formatting
- **Email Alerts**: Professional HTML emails via Brevo
- **Customizable Timing**: Set how many hours before deadlines to notify

</details>

<details>
<summary>🛡️ <strong>Advanced Security</strong></summary>

- **CAPTCHA Bypass**: Integrates with NopeCHA and FreeCaptchaBypass APIs
- **Secure Authentication**: Uses Clerk for user management
- **Encrypted Storage**: User credentials stored securely in Supabase
- **Rate Limiting**: Prevents detection by university systems

</details>

<details>
<summary>📊 <strong>Comprehensive Dashboard</strong></summary>

- **Assignment Tracking**: View all assignments with status and deadlines
- **Absence Monitoring**: Track attendance records
- **Course Registration**: Monitor available courses and registration periods
- **Statistics**: Detailed analytics of your academic performance

</details>

---

## 🏗️ Architecture Overview

```mermaid
graph TB
    A[🌐 Next.js Frontend] --> B[🔐 Clerk Authentication]
    A --> C[⚡ FastAPI Backend]
    C --> D[🗄️ Supabase Database]
    C --> E[🔴 Redis Queue]
    E --> F[⚙️ Celery Workers]
    F --> G[🕷️ Web Scraper]
    G --> H[🎓 DULMS Portal]
    F --> I[🔔 Notification Service]
    I --> J[💬 Discord]
    I --> K[📱 Telegram]
    I --> L[📧 Email]
    G --> M[🤖 CAPTCHA Bypass]
    M --> N[🔓 NopeCHA API]
    M --> O[🔓 FreeCaptchaBypass API]
```

### 🛠️ Tech Stack

#### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Clerk** - Authentication and user management
- **React Query** - Server state management

#### Backend
- **FastAPI** - High-performance Python API framework
- **Celery** - Distributed task queue
- **Redis** - Message broker and caching
- **Supabase** - PostgreSQL database with real-time features
- **BeautifulSoup** - Web scraping library
- **Selenium** - Browser automation

#### Infrastructure
- **Heroku** - Cloud platform deployment
- **Docker** - Containerization
- **GitHub Actions** - CI/CD pipeline

---

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- Redis server
- PostgreSQL database (or Supabase account)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/unishark.git
cd unishark
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your configuration
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set environment variables
cp .env.local.example .env.local
# Edit .env.local with your configuration

# Run development server
npm run dev
```

### 4. Start Services

```bash
# Terminal 1: Start Redis
redis-server

# Terminal 2: Start Celery Worker
cd backend
celery -A celery_app worker --loglevel=info

# Terminal 3: Start Celery Beat (scheduler)
cd backend
celery -A celery_app beat --loglevel=info

# Terminal 4: Start FastAPI
cd backend
uvicorn main:app --reload

# Terminal 5: Start Next.js (if not already running)
cd frontend
npm run dev
```

---

## ⚙️ Configuration

### Environment Variables

#### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/unishark
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-key

# Authentication
CLERK_SECRET_KEY=sk_live_your-clerk-secret-key
CLERK_WEBHOOK_SIGNING_SECRET=whsec_your-webhook-secret

# Notifications
DISCORD_FEEDBACK_WEBHOOK_URL=https://discord.com/api/webhooks/your-webhook
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
BREVO_API_KEY=your-brevo-api-key
BREVO_SENDER_EMAIL=alerts@unishark.site
BREVO_SENDER_NAME=UniShark

# Task Queue
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Environment
ENVIRONMENT=development
SECRET_KEY=your-secret-key
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your-clerk-publishable-key
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

---

## 🔧 CAPTCHA Bypass Setup

UniShark supports multiple CAPTCHA bypass services to handle university portal security:

### NopeCHA API
1. Sign up at [NopeCHA](https://nopecha.com)
2. Get your API key
3. Users enter their API key in settings

### FreeCaptchaBypass API
1. Sign up at [FreeCaptchaBypass](https://freecaptchabypass.com)
2. Get your API key
3. Users enter their API key in settings

### Usage in Settings
```typescript
// Users configure in their dashboard
{
  "fcb_api_key": "your-freecaptchabypass-key",
  "nopecha_api_key": "your-nopecha-key"
}
```

---

## 📱 Notification Setup

### Discord Webhook
1. Create a Discord server
2. Go to Server Settings → Integrations → Webhooks
3. Create a new webhook and copy the URL
4. Add to environment variables

### Telegram Bot
1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Create a new bot with `/newbot`
3. Get your bot token
4. Users get their chat ID by messaging [@userinfobot](https://t.me/userinfobot)

### Email (Brevo)
1. Sign up at [Brevo](https://brevo.com)
2. Get your API key from account settings
3. Configure sender email and name

---

## 🧪 Testing

### Run Comprehensive Tests
```bash
cd backend
python test_heroku.py
```

This will test:
- ✅ Environment variables
- ✅ Database connections
- ✅ Authentication endpoints
- ✅ Notification services
- ✅ CAPTCHA bypass APIs
- ✅ Scraping functionality

### Manual Testing
```bash
# Test Discord webhook
curl -X GET http://localhost:8000/api/feedback/test

# Test specific user scraping
python -c "from tasks import execute_scrape_task; execute_scrape_task.delay(user_id=1, trigger='manual')"
```

---

## 🚢 Deployment

### Heroku Deployment

1. **Create Heroku App**
```bash
heroku create your-app-name
```

2. **Set Environment Variables**
```bash
heroku config:set DATABASE_URL=your-database-url
heroku config:set SUPABASE_URL=your-supabase-url
# ... set all other environment variables
```

3. **Deploy**
```bash
git push heroku main
```

4. **Scale Workers**
```bash
heroku ps:scale web=1 worker=1 beat=1
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d
```

---

## 📊 Usage Analytics

UniShark provides detailed analytics:

- **Assignment Completion Rate**: Track your productivity
- **Deadline Adherence**: Monitor how often you meet deadlines
- **Attendance Patterns**: Analyze your class attendance
- **Course Performance**: Compare performance across subjects

---

## 🛡️ Privacy & Security

### Data Protection
- All user credentials are encrypted before storage
- No passwords are stored in plain text
- Regular security audits and updates
- GDPR compliant data handling

### University Portal Safety
- Respectful scraping with delays
- User-agent rotation to avoid detection
- Rate limiting to prevent overload
- Graceful error handling

---

## 🤝 Contributing

We welcome contributions! However, please note that this is a proprietary project with specific licensing terms.

### Development Guidelines
1. Fork the repository (for viewing only)
2. Create a feature branch
3. Follow the existing code style
4. Add tests for new features
5. Submit a pull request

### Code Style
- Python: Follow PEP 8
- TypeScript: Use Prettier and ESLint
- Commit messages: Use conventional commits

---

## 📄 License

**Proprietary License - All Rights Reserved**

This software is proprietary and confidential. Unauthorized copying, distribution, or modification is strictly prohibited.

### Educational Use Only
This project is intended for educational purposes only. Users are responsible for complying with their university's terms of service and applicable laws.

### Viewing vs. Usage Rights
- ✅ **Allowed**: Viewing source code for educational purposes
- ✅ **Allowed**: Learning from implementation techniques
- ❌ **Prohibited**: Forking or creating derivative works
- ❌ **Prohibited**: Commercial use without permission
- ❌ **Prohibited**: Redistribution in any form

For licensing inquiries, contact: [your-email@domain.com]

---

## 🆘 Support

### Getting Help
- 📖 [Documentation](https://docs.unishark.site)
- 💬 [Discord Community](https://discord.gg/unishark)
- 📧 [Email Support](mailto:support@unishark.site)
- 🐛 [Bug Reports](https://github.com/yourusername/unishark/issues)

### FAQ

<details>
<summary><strong>Q: Is UniShark safe to use with my university account?</strong></summary>

A: Yes! UniShark uses the same login process as you would manually, with additional security measures like rate limiting and respectful scraping practices.
</details>

<details>
<summary><strong>Q: How often does UniShark check for updates?</strong></summary>

A: You can customize the check interval from 1-24 hours. The default is every 4 hours.
</details>

<details>
<summary><strong>Q: What happens if my university changes their portal?</strong></summary>

A: UniShark is designed to be adaptable. We monitor for changes and update the scraping logic accordingly.
</details>

<details>
<summary><strong>Q: Can I use UniShark for other universities?</strong></summary>

A: Currently, UniShark is specifically designed for DULMS. However, the architecture can be adapted for other systems.
</details>

---

## 🎉 Acknowledgments

- **Damascus University** - For providing the learning management system
- **Open Source Community** - For the amazing tools and libraries
- **Beta Testers** - For their valuable feedback and bug reports
- **Contributors** - For their dedication to improving UniShark

---

## 📈 Roadmap

### Upcoming Features
- 🔄 **Multi-University Support**: Expand beyond DULMS
- 📱 **Mobile App**: Native iOS and Android applications
- 🤖 **AI Assistant**: Smart recommendations and study planning
- 📊 **Advanced Analytics**: Predictive insights and performance trends
- 🔗 **Calendar Integration**: Sync with Google Calendar, Outlook
- 👥 **Study Groups**: Collaborative features for students

### Version History
- **v2.0.0** (Current) - Multi-platform notifications, enhanced UI
- **v1.5.0** - CAPTCHA bypass integration
- **v1.0.0** - Initial release with basic scraping and notifications

---

<div align="center">

**Made with ❤️ for students, by students**

🦈 **UniShark** - Swimming through academia, one deadline at a time!

[⭐ Star this repo](https://github.com/yourusername/unishark) • [🐦 Follow us on Twitter](https://twitter.com/unishark) • [💼 LinkedIn](https://linkedin.com/company/unishark)

</div>