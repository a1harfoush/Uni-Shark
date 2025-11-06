
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
