# /backend/utils/logging_config.py
"""
Custom logging configuration to use local timezone
"""

import logging
import time
from datetime import datetime
import pytz

class CairoTimeFormatter(logging.Formatter):
    """Custom formatter that uses Cairo timezone for log timestamps"""
    
    def __init__(self, fmt=None, datefmt=None):
        super().__init__(fmt, datefmt)
        self.cairo_tz = pytz.timezone('Africa/Cairo')
    
    def formatTime(self, record, datefmt=None):
        """Override formatTime to use Cairo timezone"""
        # Convert the record time to Cairo timezone
        dt = datetime.fromtimestamp(record.created, tz=self.cairo_tz)
        
        if datefmt:
            return dt.strftime(datefmt)
        else:
            # Default format: YYYY-MM-DD HH:MM:SS,mmm
            return dt.strftime('%Y-%m-%d %H:%M:%S,%f')[:-3]

def configure_cairo_logging():
    """Configure logging to use Cairo timezone"""
    # Get the root logger
    root_logger = logging.getLogger()
    
    # Create formatter with Cairo timezone
    formatter = CairoTimeFormatter(
        fmt='[%(asctime)s: %(levelname)s/%(processName)s] %(message)s'
    )
    
    # Update all existing handlers
    for handler in root_logger.handlers:
        handler.setFormatter(formatter)
    
    # Also configure Celery loggers specifically
    celery_loggers = [
        'celery',
        'celery.worker',
        'celery.task',
        'celery.beat',
        'celery.redirected'
    ]
    
    for logger_name in celery_loggers:
        logger = logging.getLogger(logger_name)
        for handler in logger.handlers:
            handler.setFormatter(formatter)
    
    # If no handlers exist, create a console handler
    if not root_logger.handlers:
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        root_logger.addHandler(console_handler)
        root_logger.setLevel(logging.INFO)