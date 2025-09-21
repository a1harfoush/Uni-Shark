# /backend/scraper/notifications.py
# DEPRECATED: This module is deprecated in favor of notifications/unified_notifier.py
# The new system supports multi-platform notifications (Email, Telegram, Discord)
# and handles first-scrape confirmations properly.

import requests
import logging
from datetime import datetime, timedelta
import re

# --- Constants ---
DEADLINE_THRESHOLD_DAYS = 7 # Increased threshold for testing

# --- Logging Setup ---
logger = logging.getLogger(__name__)

# --- Date Parsing ---
def parse_date(date_str):
    if not date_str or any(s in date_str for s in ["N/A", "Unknown"]): return None
    date_str = date_str.replace('\n', ' ').strip()
    relative_match = re.search(r"Will be closed after:.*?(\d+)\s*days?.*?(\d+)\s*hours?", date_str, re.IGNORECASE)
    if relative_match:
        try:
            return datetime.now() + timedelta(days=int(relative_match.group(1)), hours=int(relative_match.group(2)))
        except (ValueError, IndexError): pass
    formats_to_try = ["%b %d, %Y at %I:%M %p", "%B %d, %Y at %I:%M %p", "%d/%m/%Y %I:%M %p"]
    for fmt in formats_to_try:
        try: return datetime.strptime(date_str, fmt)
        except ValueError: continue
    logger.warning(f"Could not parse date: {date_str}")
    return None

# --- Alerting Functions ---
def send_discord_alert(webhook_url, content=None, embeds=None):
    if not webhook_url or "discord.com" not in webhook_url:
        logger.error("Invalid or missing Discord webhook URL.")
        return
    payload = {"content": content, "embeds": embeds if embeds else []}
    try:
        response = requests.post(webhook_url, json=payload, timeout=15)
        response.raise_for_status()
        logger.info(f"Discord alert sent successfully (Status: {response.status_code}).")
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to send Discord alert: {e}")

def send_deadline_alerts(data, webhook_url):
    upcoming = []
    now = datetime.now()
    all_tasks = data.get("assignments", {}).get("assignments", []) + data.get("quizzes", {}).get("quizzes_without_results", [])
    for task in all_tasks:
        deadline = parse_date(task.get("closed_at"))
        if deadline and deadline > now and (deadline - now).days <= DEADLINE_THRESHOLD_DAYS:
            upcoming.append({"course": task.get("course"), "name": task.get("name"), "due_date_obj": deadline, "type": task.get("type")})
    
    if not upcoming:
        logger.info("No upcoming deadlines to report.")
        return 0
        
    upcoming.sort(key=lambda x: x["due_date_obj"])
    embeds = []
    for task in upcoming[:10]: # Limit to 10 embeds per message
        embeds.append({
            "title": f"🔔 {task['type']}: {task.get('name', 'Unnamed Task')}",
            "color": 15158332, # Red
            "fields": [
                {"name": "Course", "value": task.get('course', 'N/A'), "inline": True},
                {"name": "Due Date", "value": task['due_date_obj'].strftime("%a, %b %d at %I:%M %p"), "inline": True},
            ]
        })
    send_discord_alert(webhook_url, content="**❗ Upcoming Deadlines Alert!**", embeds=embeds)
    return len(upcoming)

def check_and_send_new_absence_alerts(old_absences, new_absences, webhook_url):
    """(REFINED) Compares new and old absence data and sends alerts only for new absences."""
    if not new_absences:
        logger.info("No absences found in the current run.")
        return 0

    old_absence_set = { (a['course'], a['date'], a['type']) for a in old_absences }
    newly_recorded = [a for a in new_absences if (a['course'], a['date'], a['type']) not in old_absence_set]

    if not newly_recorded:
        logger.info("No new absences detected since last run.")
        return 0

    logger.info(f"Found {len(newly_recorded)} new absence records.")
    embeds = []
    for absence in newly_recorded[:10]:
        embeds.append({
            "title": f"Absence Recorded: {absence.get('course', 'N/A')}",
            "color": 16729420, # Orange/Yellow
            "fields": [
                {"name": "Lecture/Practical", "value": absence.get('type', 'N/A'), "inline": True},
                {"name": "Date", "value": absence.get('date', 'N/A'), "inline": True},
                {"name": "Status", "value": f"**{absence.get('status', 'N/A')}**", "inline": True},
            ]
        })
    send_discord_alert(webhook_url, content="**⚠️ New Absence(s) Recorded!**", embeds=embeds)
    return len(newly_recorded)

def check_and_send_new_course_alerts(old_data, new_data, webhook_url):
    if not new_data.get("available_courses"):
        logger.info("No course registration data to process for alerts.")
        return 0
    old_course_names = {c.get("name") for c in old_data.get("available_courses", [])}
    newly_added = [c for c in new_data["available_courses"] if c.get("name") not in old_course_names]
    if not newly_added:
        logger.info("No new courses detected since last run.")
        return 0
    logger.info(f"Found {len(newly_added)} new courses.")
    embeds = []
    for course in newly_added[:10]:
        embeds.append({
            "title": f"🚀 New Course Available: {course.get('name', 'N/A')}",
            "color": 3066993, # Green
            "fields": [
                {"name": "Hours", "value": course.get('hours', 'N/A'), "inline": True},
                {"name": "Fees", "value": course.get('fees', 'N/A'), "inline": True},
            ]
        })
    end_date_info = f"Registration Ends: **{new_data.get('registration_end_date', 'N/A')}**"
    send_discord_alert(webhook_url, content=f"**✅ New Courses for Registration!**\n{end_date_info}", embeds=embeds)
    return len(newly_added)

# --- Main Comparison Function ---
def compare_and_notify(old_data: dict, new_data: dict, webhook_url: str):
    """
    Compares old and new scrape results and triggers all relevant notifications.
    Returns the number of new items found across all categories.
    """
    if not webhook_url or "discord.com" not in webhook_url:
        logger.warning("Skipping notifications due to invalid or missing webhook URL.")
        return 0
    
    total_new_items = 0
    
    try:
        # Deadlines (Quizzes and Assignments) - This should always run
        total_new_items += send_deadline_alerts(new_data, webhook_url)

        # Absences
        old_absences = old_data.get("absences", {}).get("absences", [])
        new_absences = new_data.get("absences", {}).get("absences", [])
        total_new_items += check_and_send_new_absence_alerts(old_absences, new_absences, webhook_url)

        # Courses
        old_courses = old_data.get("course_registration", {})
        new_courses = new_data.get("course_registration", {})
        total_new_items += check_and_send_new_course_alerts(old_courses, new_courses, webhook_url)
        
    except Exception as e:
        logger.error(f"An error occurred during the notification process: {e}", exc_info=True)

    logger.info(f"Notification process finished. Found a total of {total_new_items} new items to report.")
    return total_new_items