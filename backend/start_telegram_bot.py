#!/usr/bin/env python3
"""
Telegram Bot Startup Script with Enhanced Error Handling and Logging
"""

import os
import sys
import time
import logging
from telegram_bot import main

# Configure logging for Docker environment
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('/app/logs/telegram_bot.log', mode='a') if os.path.exists('/app/logs') else logging.NullHandler()
    ]
)

logger = logging.getLogger(__name__)

def check_environment():
    """Check if required environment variables are set"""
    required_vars = ['TELEGRAM_BOT_TOKEN']
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
        return False
    
    return True

def start_bot_with_retry():
    """Start the Telegram bot with retry logic"""
    max_retries = 5
    retry_delay = 10  # seconds
    
    for attempt in range(max_retries):
        try:
            logger.info(f"Starting Telegram bot (attempt {attempt + 1}/{max_retries})...")
            
            if not check_environment():
                logger.error("Environment check failed. Exiting.")
                sys.exit(1)
            
            # Start the bot
            main()
            
        except KeyboardInterrupt:
            logger.info("Telegram bot stopped by user")
            break
            
        except Exception as e:
            logger.error(f"Telegram bot crashed: {e}", exc_info=True)
            
            if attempt < max_retries - 1:
                logger.info(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                logger.error("Max retries reached. Exiting.")
                sys.exit(1)

if __name__ == "__main__":
    logger.info("=== UniShark Telegram Bot Starting ===")
    start_bot_with_retry()