# 🚀 DULMS Watcher - Quick Start Guide

## 🔧 **Production Ready Deployment**

### **Deployment Features:**
✅ Separate backend and frontend services  
✅ Docker containerization support  
✅ Redis queue management  
✅ Automated background processing  
✅ Comprehensive monitoring endpoints  

---

## **Option 1: Quick Start (All Services)**
```bash
# Start everything at once
.\start_all_services.bat
```

## **Option 2: Step-by-Step Setup**

### **Step 1: Start Redis**
```bash
# Using Docker (Recommended)
.\start_redis_docker.bat

# OR manually if you have Redis installed
redis-server
```

### **Step 2: Check Redis Connection**
```bash
.\check_redis.bat
```

### **Step 3: Start Celery Worker**
```bash
.\start_celery_worker.bat
```

### **Step 4: Start Backend API**
```bash
cd backend
.\venv\Scripts\activate
python -m uvicorn main:app --reload --port 8000
```

### **Step 5: Start Frontend**
```bash
cd frontend
npm run dev
```

---

## **🧪 Testing the Scheduler (No Celery Beat Required!)**

1. **Open Dashboard**: http://localhost:3000/dashboard
2. **Find AutomationTester Component**
3. **Use These Buttons:**

   - **`TEST_SCHEDULER`** - Tests scheduler logic without Celery Beat
   - **`FORCE_QUEUE_ALL`** - Queues all active users immediately  
   - **`TEST_SCRAPE`** - Queues single scrape for current user
   - **`GET_STATUS`** - Shows detailed automation status

---

## **🎯 Why This Works Better:**

### **Before (Problematic):**
- ❌ Celery Beat unreliable on Windows
- ❌ Had to wait for scheduler intervals
- ❌ No way to test scheduler logic
- ❌ Limited debugging capabilities

### **After (Fixed):**
- ✅ Manual scheduler endpoints work instantly
- ✅ Can test without Celery Beat running
- ✅ Detailed status and debugging info
- ✅ Windows-optimized Celery configuration
- ✅ Production-ready for Linux deployment

---

## **🔍 Troubleshooting:**

### **Redis Issues:**
```bash
# Check Redis status
.\check_redis.bat

# Start Redis with Docker
.\start_redis_docker.bat

# Manual Redis check
docker ps | findstr redis
```

### **Celery Worker Issues:**
```bash
# Check worker logs in the terminal window
# Look for connection errors or import issues
# Ensure Redis is running first
```

### **Scheduler Testing:**
```bash
# Use dashboard buttons instead of waiting for Celery Beat
# Check backend logs for task execution details
# Verify user automation settings in database
```

---

## **📁 Key Files Created/Modified:**

### **Backend:**
- `backend/api/scheduler.py` - Manual scheduler endpoints
- `backend/celery_app.py` - Enhanced Windows configuration  
- `backend/check_redis.py` - Redis connection tester

### **Frontend:**
- `frontend/src/components/dashboard/AutomationTester.tsx` - Enhanced testing UI

### **Scripts:**
- `start_redis_docker.bat` - Redis startup with Docker
- `check_redis.bat` - Redis connection checker
- `start_celery_worker.bat` - Optimized worker startup
- `start_all_services.bat` - Complete environment startup

### **Documentation:**
- `CELERY_SETUP_GUIDE.md` - Detailed setup instructions
- `README_SCHEDULER.md` - Implementation details
- `QUICK_START.md` - This guide

---

## **🚀 Next Steps:**

1. **Test the scheduler** using dashboard buttons
2. **Set up user automation** in settings
3. **Monitor scrape history** for results
4. **Deploy to Linux** for production (Celery Beat will work reliably there)

**The scheduler is now reliable and testable on Windows! 🎉**