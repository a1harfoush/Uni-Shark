import os
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Enable logging with reduced verbosity
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.WARNING
)
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)  # Keep our bot logs but reduce httpx noise

# Reduce httpx logging noise
logging.getLogger("httpx").setLevel(logging.WARNING)

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Sends a message when the command /start is issued."""
    user = update.effective_user
    chat_id = update.effective_chat.id
    
    logger.info(f"User {user.full_name} (ID: {user.id}) started the bot. Chat ID: {chat_id}")
    
    message = (
        f"<b>👋 Welcome to UniShark Bot, {user.first_name}!</b> 🦈\n\n"
        "I'm here to help you stay on top of your university tasks. Here is your unique ID to connect me to your account:\n\n"
        f"🔑 <b>Your Personal Chat ID is:</b> <code>{chat_id}</code>\n\n"
        "<b>Action Required:</b>\n"
        "1️⃣ Copy the Chat ID above.\n"
        "2️⃣ Go to your UniShark settings page.\n"
        "3️⃣ Paste the ID into the 'Telegram Chat ID' field.\n\n"
        "Once connected, I'll send you instant notifications for:\n"
        "- 📝 New Assignments\n"
        "- ❓ New Quizzes\n"
        "- ⏰ Approaching Deadlines\n\n"
        "Good luck with your studies! 🎓"
    )
    
    keyboard = [
        [InlineKeyboardButton("Go to UniShark Website", url="https://unishark.site")],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_html(
        message,
        reply_markup=reply_markup,
        disable_web_page_preview=True,
    )

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle regular text messages."""
    message_text = update.message.text
    
    if "كسمك" in message_text:
        await update.message.reply_text("الله يسامحك")
    elif "حرفوش" in message_text:
        await update.message.reply_text("حرفوش عمك")

def main() -> None:
    """Start the bot with resource optimizations."""
    if not TELEGRAM_BOT_TOKEN:
        logger.error("TELEGRAM_BOT_TOKEN is not set. The bot cannot start.")
        return

    # Create the Application with optimizations and proper timeouts
    application = (Application.builder()
                  .token(TELEGRAM_BOT_TOKEN)
                  .concurrent_updates(1)  # Limit concurrent updates
                  .get_updates_read_timeout(30)  # Proper way to set read timeout
                  .get_updates_write_timeout(30)  # Proper way to set write timeout
                  .get_updates_connect_timeout(30)  # Proper way to set connect timeout
                  .build())

    # Add handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    # Run with optimized settings
    logger.info("Bot is starting with resource optimizations...")
    application.run_polling(
        poll_interval=30.0,  # Much longer polling interval (30 seconds)
        timeout=20,          # Timeout for getUpdates
        bootstrap_retries=2  # Fewer bootstrap retries
    )
    logger.info("Bot has stopped.")

if __name__ == "__main__":
    main()