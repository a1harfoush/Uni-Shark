# Vercel Deployment Guide for UniShark Frontend

## 🚀 Quick Deployment Steps

### 1. **Vercel Project Configuration**

| Setting | Value |
|---------|-------|
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `.next` (default) |
| **Install Command** | `npm install` |

### 2. **Environment Variables**

Add these in Vercel Dashboard → Project → Settings → Environment Variables:

```bash
# Clerk Production Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_Y2xlcmsudW5pc2hhcmsuc2l0ZSQCLERK_SECRET_KEY=sk_live_8gXtdOGT4pjPrZmdoz41QomMaw5KHMbox1uIIAwxCP

# Backend API URL
NEXT_PUBLIC_API_BASE_URL=https://unishark-c58c316e6b65.herokuapp.com
```

### 3. **Clerk Configuration Updates**

#### A. **Update Clerk Domain**
In Clerk Dashboard:
1. Go to **Domains** section
2. Add your production domain: `https://clerk.unishark.site`
3. Set as primary domain

#### B. **Update Webhook Endpoint**
In Clerk Dashboard → Webhooks:
1. **Endpoint URL**: `https://unishark-c58c316e6b65.herokuapp.com/api/clerk-webhook`
2. **Events to Subscribe**:
   - `user.created`
   - `user.updated`
   - `user.deleted`
3. **Signing Secret**: Use the one from your backend environment

### 4. **Deploy to Vercel**

#### Option A: **Via Vercel CLI**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from frontend directory
cd frontend
vercel

# Follow prompts:
# - Link to existing project or create new
# - Set root directory to current (frontend)
# - Override build command: npm run build
```

#### Option B: **Via GitHub Integration**
1. Push your code to GitHub
2. Connect repository to Vercel
3. Set root directory to `frontend`
4. Add environment variables
5. Deploy

### 5. **Custom Domain Setup**

If using `unishark.site`:
1. In Vercel Dashboard → Domains
2. Add `unishark.site` and `www.unishark.site`
3. Update DNS records as instructed by Vercel

### 6. **Backend CORS Configuration**

Update your Heroku backend to allow your Vercel domain:

```bash
# Add to your FastAPI CORS origins
heroku config:set ALLOWED_ORIGINS="https://unishark.site,https://www.unishark.site,https://clerk.unishark.site" -a unishark
```

### 7. **Test Deployment**

After deployment, test these endpoints:
- ✅ **Frontend**: `https://your-vercel-app.vercel.app`
- ✅ **API Proxy**: `https://your-vercel-app.vercel.app/api/health`
- ✅ **Clerk Auth**: Login/signup functionality
- ✅ **Backend Connection**: Dashboard data loading

### 8. **Environment-Specific Configuration**

Your app now supports:
- **Development**: `localhost:3000` → `localhost:8000`
- **Production**: `vercel-app.vercel.app` → `unishark.herokuapp.com`

## 🔧 **Troubleshooting**

### **Common Issues:**

1. **API Calls Failing**
   - Check `NEXT_PUBLIC_API_BASE_URL` in Vercel env vars
   - Verify Heroku app is running: `heroku ps -a unishark`

2. **Clerk Authentication Issues**
   - Verify production keys in Vercel
   - Check domain configuration in Clerk Dashboard
   - Ensure webhook endpoint is accessible

3. **CORS Errors**
   - Add Vercel domain to backend CORS origins
   - Check browser network tab for specific errors

### **Useful Commands:**
```bash
# Check Vercel deployment logs
vercel logs

# Test API connection
curl https://your-vercel-app.vercel.app/api/health

# Check Heroku backend
heroku logs --tail -a unishark
```

## 🎯 **Final Architecture**

```
Frontend (Vercel) → Backend (Heroku) → Redis Cloud
     ↓                    ↓
Clerk Auth          Celery Workers
```

Your UniShark app will be fully deployed with:
- ✅ **Frontend**: Fast, global CDN via Vercel
- ✅ **Backend**: Scalable API + workers via Heroku  
- ✅ **Database**: Supabase PostgreSQL
- ✅ **Cache/Queue**: Redis Cloud
- ✅ **Auth**: Clerk with custom domain

Total cost: ~$12/month for a production-ready application! 🚀