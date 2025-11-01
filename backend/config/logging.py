# /backend/config/logging.py
import logging
import sys
from datetime import datetime
import pytz

def setup_production_logging():
    """
    Configure logging for production environment on Heroku
    """
    # Set Cairo timezone
    cairo_tz = pytz.timezone('Africa/Cairo')
    
    # Create custom formatter with Cairo timezone
    class CairoFormatter(logging.Formatter):
        def formatTime(self, record, datefmt=None):
            dt = datetime.fromtimestamp(record.created, tz=cairo_tz)
            if datefmt:
                return dt.strftime(datefmt)
            return dt.strftime('%Y-%m-%d %H:%M:%S %Z')
    
    # Configure root logger
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    
    # Remove existing handlers
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    
    # Create console handler for Heroku logs
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    
    # Set formatter
    formatter = CairoFormatter(
        fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S %Z'
    )
    console_handler.setFormatter(formatter)
    
    # Add handler to logger
    logger.addHandler(console_handler)
    
    # Configure specific loggers
    logging.getLogger('uvicorn').setLevel(logging.INFO)
    logging.getLogger('uvicorn.access').setLevel(logging.INFO)
    logging.getLogger('celery').setLevel(logging.INFO)
    
    logger.info("Production logging configured with Cairo timezone")
    return logger