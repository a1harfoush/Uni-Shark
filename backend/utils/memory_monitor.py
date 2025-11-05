#!/usr/bin/env python3
"""
Memory monitoring utility for Heroku worker dyno
"""

import psutil
import logging
import os
from typing import Dict

logger = logging.getLogger(__name__)

def get_memory_usage() -> Dict[str, float]:
    """Get current memory usage statistics"""
    process = psutil.Process(os.getpid())
    memory_info = process.memory_info()
    
    return {
        'rss_mb': memory_info.rss / 1024 / 1024,  # Resident Set Size in MB
        'vms_mb': memory_info.vms / 1024 / 1024,  # Virtual Memory Size in MB
        'percent': process.memory_percent(),       # Percentage of system memory
        'available_mb': psutil.virtual_memory().available / 1024 / 1024
    }

def log_memory_usage(context: str = ""):
    """Log current memory usage with context"""
    try:
        memory = get_memory_usage()
        logger.info(f"Memory usage {context}: RSS={memory['rss_mb']:.1f}MB, "
                   f"VMS={memory['vms_mb']:.1f}MB, "
                   f"Percent={memory['percent']:.1f}%, "
                   f"Available={memory['available_mb']:.1f}MB")
    except Exception as e:
        logger.warning(f"Failed to get memory usage: {e}")

def check_memory_limit(max_memory_mb: int = 200) -> bool:
    """Check if memory usage exceeds limit"""
    try:
        memory = get_memory_usage()
        if memory['rss_mb'] > max_memory_mb:
            logger.warning(f"Memory usage ({memory['rss_mb']:.1f}MB) exceeds limit ({max_memory_mb}MB)")
            return True
        return False
    except Exception as e:
        logger.error(f"Failed to check memory limit: {e}")
        return False