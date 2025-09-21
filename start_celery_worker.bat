@echo off
echo Starting Celery Worker for DULMS Watcher...
echo.
echo Make sure Redis is running before starting this!
echo.

cd /d "%~dp0backend"

REM Activate virtual environment if it exists
if exist "venv\Scripts\activate.bat" (
    echo Activating virtual environment...
    call venv\Scripts\activate.bat
)

echo Starting Celery Worker...
echo.
echo Press Ctrl+C to stop the worker
echo.

celery -A celery_app worker --loglevel=info --pool=solo --concurrency=1

pause