# DULMS Watcher - University Course Monitoring System

A comprehensive web application that monitors university course information, assignments, and deadlines with automated notifications.

## 🏗️ Architecture

- **Backend**: FastAPI with Celery for background tasks
- **Frontend**: Next.js with TypeScript and Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Queue**: Redis
- **Authentication**: Clerk
- **Notifications**: Email (Brevo) + Telegram Bot

## 🚀 Deployment

This application is designed for separate deployment of backend and frontend services.

### Backend Service

```bash
cd backend
docker build -t dulms-backend .
docker run -p 8000:8000 --env-file ../.env dulms-backend
```

### Frontend Service

```bash
cd frontend
npm install
npm run build
npm start
```

### Using Docker Compose (Full Stack)

```bash
# Start all services
docker-compose up -d
```

## 📋 Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Database
DATABASE_URL=your_postgresql_url
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_WEBHOOK_SIGNING_SECRET=your_clerk_webhook_secret

# Redis & Celery
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# Email Notifications
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_NAME=your_sender_name
BREVO_SENDER_EMAIL=your_sender_email

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# Security
SECRET_KEY=your_secret_key

# Discord (Optional)
DISCORD_FEEDBACK_WEBHOOK_URL=your_discord_webhook_url
```

## 🔧 Local Development

### Prerequisites

- Python 3.11+
- Node.js 18+
- Redis
- Docker (optional)

### Quick Start

1. **Start Redis**:
   ```bash
   docker run -d -p 6379:6379 redis:7-alpine
   ```

2. **Backend**:
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   python -m uvicorn main:app --reload
   ```

3. **Celery Worker**:
   ```bash
   cd backend
   celery -A tasks worker --loglevel=info
   ```

4. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## 📁 Project Structure

```
├── backend/                 # FastAPI backend
│   ├── api/                # API routes
│   ├── core/               # Core business logic
│   ├── db/                 # Database configuration
│   ├── scraper/            # Web scraping modules
│   ├── utils/              # Utility functions
│   ├── main.py             # FastAPI app entry point
│   ├── tasks.py            # Celery tasks
│   ├── telegram_bot.py     # Telegram bot service (run separately)
│   └── requirements.txt    # Python dependencies
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Next.js pages
│   │   └── lib/            # Utility libraries
│   └── package.json        # Node.js dependencies
├── docker-compose.yml      # Multi-service deployment
└── README.md              # This file
```

## 🔍 Key Features

- **Automated Course Monitoring**: Scrapes university portal for updates
- **Smart Notifications**: Email and Telegram alerts for deadlines
- **User Dashboard**: Real-time course information and settings
- **Background Processing**: Celery-based task queue for scraping
- **Responsive Design**: Mobile-friendly interface
- **Secure Authentication**: Clerk-based user management

## 🛠️ Development Commands

- `docker-compose up -d` - Start all services
- `docker-compose logs -f [service]` - View service logs
- `celery -A tasks worker --loglevel=info` - Start Celery worker
- `celery -A tasks beat --loglevel=info` - Start Celery scheduler

## 🤖 Telegram Bot Setup

The Telegram bot provides instant notifications for assignments, quizzes, and deadlines.

### Bot Configuration

1. **Create a Telegram Bot**:
   - Message [@BotFather](https://t.me/botfather) on Telegram
   - Use `/newbot` command and follow instructions
   - Copy the bot token to your `.env` file

2. **Add Bot Token to Environment**:
   ```env
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   ```

3. **Start the Bot** (Optional - Run Separately):
   ```bash
   # Run standalone (outside Docker)
   cd backend
   python telegram_bot.py
   ```

4. **Connect Users**:
   - Users start the bot with `/start`
   - Bot provides their unique Chat ID
   - Users add Chat ID to their UniShark settings

### Bot Features

- **Welcome Message**: Provides user's unique Chat ID
- **Instant Notifications**: Assignment and quiz alerts
- **Deadline Reminders**: Automated deadline notifications
- **Error Handling**: Robust restart and retry logic

## 📊 Monitoring

- Backend health check: `GET /api/health`
- Task status: `GET /api/scrape/task-status/{task_id}`
- Scheduler status: `GET /api/scheduler-status`

## 🔒 Security

- Environment variables for sensitive data
- JWT-based authentication via Clerk
- Input validation and sanitization
- Rate limiting on API endpoints

## 📝 License

This project is private and proprietary.