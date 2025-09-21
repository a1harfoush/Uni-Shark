@echo off
echo Starting Redis using Docker...
echo.

REM Check if Docker is available
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not available!
    echo.
    echo Please install Docker Desktop or use a manual Redis installation.
    echo Manual Redis for Windows: https://github.com/microsoftarchive/redis/releases
    pause
    exit /b 1
)

echo Stopping any existing Redis container...
docker stop dulms-redis 2>nul
docker rm dulms-redis 2>nul

echo Starting new Redis container...
docker run -d -p 6379:6379 --name dulms-redis redis:alpine

if %errorlevel% equ 0 (
    echo ✅ Redis started successfully!
    echo.
    echo Redis is now running on localhost:6379
    echo Container name: dulms-redis
    echo.
    echo To stop Redis later: docker stop dulms-redis
    echo To view Redis logs: docker logs dulms-redis
    echo.
    
    REM Wait a moment for Redis to fully start
    timeout /t 2 /nobreak >nul
    
    echo Testing Redis connection...
    cd backend
    if exist "venv\Scripts\activate.bat" (
        call venv\Scripts\activate.bat
    )
    python check_redis.py
) else (
    echo ❌ Failed to start Redis container!
    echo.
    echo Please check Docker Desktop is running and try again.
    pause
)