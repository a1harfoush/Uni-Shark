@echo off
echo Starting Celery Beat Scheduler for DULMS Watcher...
echo.
echo WARNING: Celery Beat on Windows is not recommended for production!
echo For production, use a Linux environment or the manual scheduler endpoints.
echo.
echo Make sure Redis is running and the Celery Worker is started first!
echo.

cd /d "%~dp0backend"

REM Activate virtual environment if it exists
if exist "venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call venv\Scripts\activate.bat
)

echo Starting Celery Beat Scheduler...
echo.
echo Press Ctrl+C to stop the scheduler
echo.

celery -A celery_app beat --loglevel=info

pause