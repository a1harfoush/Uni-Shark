# /backend/notifications/providers/telegram_sender.py
import os
import asyncio
from telegram import Bot
import logging

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

async def send_telegram_message(chat_id: str, message_text: str):
    if not TELEGRAM_BOT_TOKEN:
        logging.error("TELEGRAM_BOT_TOKEN is not set.")
        return

    try:
        bot = Bot(token=TELEGRAM_BOT_TOKEN)
        await bot.send_message(
            chat_id=chat_id,
            text=message_text,
            parse_mode='MarkdownV2'
        )
        logging.info(f"Telegram message sent to chat_id: {chat_id}")
    except Exception as e:
        logging.error(f"Failed to send Telegram message to {chat_id}: {e}")

# Helper function to run async code from sync Celery tasks
def send_telegram_sync(chat_id: str, message_text: str):
    asyncio.run(send_telegram_message(chat_id, message_text))