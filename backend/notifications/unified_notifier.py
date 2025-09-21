# /backend/notifications/unified_notifier.py
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from notifications.providers.email_sender import send_email
from notifications.providers.telegram_sender import send_telegram_sync
from db.supabase_client import get_supabase_client
from utils.notification_deduplicator import NotificationDeduplicator
import requests
import re

logger = logging.getLogger(__name__)

class UnifiedNotifier:
    """
    Unified notification system that sends alerts across all enabled platforms
    (Email, Telegram, Discord) for new items and first-time scrapes.
    """
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.db = get_supabase_client()
        self.user_prefs = self._get_user_preferences()
        self.user_email = self._get_user_email()
        self.deduplicator = NotificationDeduplicator(user_id)
        
    def _get_user_preferences(self) -> Dict:
        """Get user notification preferences from database"""
        try:
            response = self.db.table('user_credentials').select(
                'notify_via_email, notify_via_telegram, telegram_chat_id, discord_webhook'
            ).eq('user_id', self.user_id).single().execute()
            return response.data if response.data else {}
        except Exception as e:
            logger.error(f"Error fetching user preferences for {self.user_id}: {e}")
            return {}
    
    def _get_user_email(self) -> Optional[str]:
        """Get user email from users table"""
        try:
            response = self.db.table('users').select('email').eq('id', self.user_id).single().execute()
            return response.data['email'] if response.data else None
        except Exception as e:
            logger.error(f"Error fetching user email for {self.user_id}: {e}")
            return None
    
    def _is_first_scrape(self) -> bool:
        """Check if this is the user's first successful scrape"""
        try:
            response = self.db.table('scrape_history').select('id').eq('user_id', self.user_id).eq('status', 'success').limit(1).execute()
            return len(response.data) == 0
        except Exception as e:
            logger.error(f"Error checking first scrape status for {self.user_id}: {e}")
            return False
    
    def _escape_markdown_v2(self, text: str) -> str:
        """Escape special characters for Telegram MarkdownV2"""
        if not text:
            return ""
        special_chars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!']
        for char in special_chars:
            text = text.replace(char, f'\\{char}')
        return text
    
    def _send_discord_notification(self, content: str, embeds: List[Dict] = None):
        """Send notification to Discord webhook"""
        webhook_url = self.user_prefs.get('discord_webhook')
        if not webhook_url or "discord.com" not in webhook_url:
            return
        
        payload = {"content": content, "embeds": embeds if embeds else []}
        try:
            response = requests.post(webhook_url, json=payload, timeout=15)
            response.raise_for_status()
            logger.info(f"Discord notification sent to user {self.user_id}")
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to send Discord notification to user {self.user_id}: {e}")
    
    def _send_email_notification(self, subject: str, html_content: str):
        """Send email notification"""
        if not self.user_prefs.get('notify_via_email') or not self.user_email:
            return
        
        try:
            send_email(self.user_email, self.user_email, subject, html_content)
            logger.info(f"Email notification sent to user {self.user_id}")
        except Exception as e:
            logger.error(f"Failed to send email notification to user {self.user_id}: {e}")
    
    def _send_telegram_notification(self, message: str):
        """Send Telegram notification"""
        if not self.user_prefs.get('notify_via_telegram') or not self.user_prefs.get('telegram_chat_id'):
            return
        
        try:
            send_telegram_sync(self.user_prefs['telegram_chat_id'], message)
            logger.info(f"Telegram notification sent to user {self.user_id}")
        except Exception as e:
            logger.error(f"Failed to send Telegram notification to user {self.user_id}: {e}")
    
    def send_first_scrape_confirmation(self, scraped_data: Dict):
        """Send confirmation notification for first scrape with all found items"""
        logger.info(f"Sending first scrape confirmation for user {self.user_id}")
        
        # Count all items
        assignments = scraped_data.get('assignments', {}).get('assignments', [])
        quizzes = scraped_data.get('quizzes', {}).get('quizzes_without_results', [])
        absences = scraped_data.get('absences', {}).get('absences', [])
        courses = scraped_data.get('course_registration', {}).get('available_courses', [])
        
        total_items = len(assignments) + len(quizzes) + len(absences) + len(courses)
        
        # Discord notification
        discord_embeds = []
        discord_embeds.append({
            "title": "🎉 UniShark Setup Complete!",
            "description": "Your DULMS monitoring is now active. Here's what we found:",
            "color": 3066993,  # Green
            "fields": [
                {"name": "📝 Assignments", "value": str(len(assignments)), "inline": True},
                {"name": "📊 Quizzes", "value": str(len(quizzes)), "inline": True},
                {"name": "📅 Absences", "value": str(len(absences)), "inline": True},
                {"name": "📚 Available Courses", "value": str(len(courses)), "inline": True},
            ]
        })
        
        self._send_discord_notification("**✅ UniShark is now monitoring your DULMS account!**", discord_embeds)
        
        # Email notification
        email_subject = "UniShark Setup Complete - Monitoring Active"
        email_html = f"""
        <h2>🎉 Welcome to UniShark!</h2>
        <p>Great news! Your DULMS monitoring is now active and working perfectly.</p>
        
        <h3>📊 Current Status Summary:</h3>
        <ul>
            <li><strong>📝 Assignments:</strong> {len(assignments)} found</li>
            <li><strong>📊 Quizzes:</strong> {len(quizzes)} found</li>
            <li><strong>📅 Absences:</strong> {len(absences)} recorded</li>
            <li><strong>📚 Available Courses:</strong> {len(courses)} available</li>
        </ul>
        
        <p><strong>Total items being monitored:</strong> {total_items}</p>
        
        <p>From now on, you'll only receive notifications when new items are detected or deadlines are approaching.</p>
        
        <p>Stay sharp! 🦈<br>
        - The UniShark Team</p>
        """
        
        self._send_email_notification(email_subject, email_html)
        
        # Telegram notification
        escaped_total = self._escape_markdown_v2(str(total_items))
        escaped_assignments = self._escape_markdown_v2(str(len(assignments)))
        escaped_quizzes = self._escape_markdown_v2(str(len(quizzes)))
        escaped_absences = self._escape_markdown_v2(str(len(absences)))
        escaped_courses = self._escape_markdown_v2(str(len(courses)))
        
        telegram_message = f"""🎉 *UniShark Setup Complete\\!*

Your DULMS monitoring is now active\\. Here's what we found:

📝 *Assignments:* {escaped_assignments}
📊 *Quizzes:* {escaped_quizzes}  
📅 *Absences:* {escaped_absences}
📚 *Available Courses:* {escaped_courses}

*Total items monitored:* {escaped_total}

From now on, you'll only get alerts for new items and upcoming deadlines\\. Stay sharp\\! 🦈"""
        
        self._send_telegram_notification(telegram_message)
    
    def send_new_items_notification(self, new_items_dict: Dict):
        """Send notifications for new items found in scrape (new format)"""
        # Count total new items
        total_new = (len(new_items_dict.get('quizzes_with_results', [])) + 
                    len(new_items_dict.get('quizzes_without_results', [])) + 
                    len(new_items_dict.get('assignments', [])) + 
                    len(new_items_dict.get('absences', [])))
        
        if total_new == 0:
            logger.info(f"No new items found for user {self.user_id}")
            return
        
        # Check for duplicate notifications
        notification_content = {
            'type': 'new_items',
            'total_new': total_new,
            'items': new_items_dict
        }
        
        if not self.deduplicator.should_send_notification('new_items', 
                                                         self.deduplicator.generate_content_hash(notification_content)):
            logger.info(f"Duplicate new items notification blocked for user {self.user_id}")
            return
        
        # Convert to the format expected by _send_new_items_alerts
        formatted_new_items = {
            'assignments': new_items_dict.get('assignments', []),
            'quizzes': new_items_dict.get('quizzes_without_results', []) + new_items_dict.get('quizzes_with_results', []),
            'absences': new_items_dict.get('absences', []),
            'courses': [],  # Not included in the new format
            'total': total_new
        }
        
        self._send_new_items_alerts(formatted_new_items)
        logger.info(f"New items notification sent for user {self.user_id}. Total: {total_new}")

    def send_new_items_notification_legacy(self, old_data: Dict, new_data: Dict):
        """Send notifications for new items found in scrape (legacy format)"""
        is_first = self._is_first_scrape()
        
        if is_first:
            self.send_first_scrape_confirmation(new_data)
            return len(self._count_all_items(new_data))
        
        # Find new items by comparing old and new data
        new_items = self._find_new_items(old_data, new_data)
        
        if not new_items['total']:
            logger.info(f"No new items found for user {self.user_id}")
            return 0
        
        self._send_new_items_alerts(new_items)
        return new_items['total']
    
    def _count_all_items(self, data: Dict) -> int:
        """Count all items in scraped data"""
        assignments = len(data.get('assignments', {}).get('assignments', []))
        quizzes = len(data.get('quizzes', {}).get('quizzes_without_results', []))
        absences = len(data.get('absences', {}).get('absences', []))
        courses = len(data.get('course_registration', {}).get('available_courses', []))
        return assignments + quizzes + absences + courses
    
    def _find_new_items(self, old_data: Dict, new_data: Dict) -> Dict:
        """Compare old and new data to find new items"""
        new_items = {
            'assignments': [],
            'quizzes': [],
            'absences': [],
            'courses': [],
            'total': 0
        }
        
        # New assignments
        old_assignments = {(a.get('course'), a.get('name')) for a in old_data.get('assignments', {}).get('assignments', [])}
        for assignment in new_data.get('assignments', {}).get('assignments', []):
            if (assignment.get('course'), assignment.get('name')) not in old_assignments:
                new_items['assignments'].append(assignment)
        
        # New quizzes
        old_quizzes = {(q.get('course'), q.get('name')) for q in old_data.get('quizzes', {}).get('quizzes_without_results', [])}
        for quiz in new_data.get('quizzes', {}).get('quizzes_without_results', []):
            if (quiz.get('course'), quiz.get('name')) not in old_quizzes:
                new_items['quizzes'].append(quiz)
        
        # New absences
        old_absences = {(a.get('course'), a.get('date'), a.get('type')) for a in old_data.get('absences', {}).get('absences', [])}
        for absence in new_data.get('absences', {}).get('absences', []):
            if (absence.get('course'), absence.get('date'), absence.get('type')) not in old_absences:
                new_items['absences'].append(absence)
        
        # New courses
        old_courses = {c.get('name') for c in old_data.get('course_registration', {}).get('available_courses', [])}
        for course in new_data.get('course_registration', {}).get('available_courses', []):
            if course.get('name') not in old_courses:
                new_items['courses'].append(course)
        
        new_items['total'] = len(new_items['assignments']) + len(new_items['quizzes']) + len(new_items['absences']) + len(new_items['courses'])
        
        return new_items
    
    def _send_new_items_alerts(self, new_items: Dict):
        """Send alerts for new items across all platforms"""
        if not new_items['total']:
            return
        
        # Discord notification
        discord_embeds = []
        
        # New assignments
        for assignment in new_items['assignments'][:5]:  # Limit to 5 per type
            discord_embeds.append({
                "title": f"📝 New Assignment: {assignment.get('name', 'Unnamed')}",
                "color": 15158332,  # Red
                "fields": [
                    {"name": "Course", "value": assignment.get('course', 'N/A'), "inline": True},
                    {"name": "Due Date", "value": assignment.get('closed_at', 'N/A'), "inline": True},
                ]
            })
        
        # New quizzes
        for quiz in new_items['quizzes'][:5]:
            discord_embeds.append({
                "title": f"📊 New Quiz: {quiz.get('name', 'Unnamed')}",
                "color": 3447003,  # Blue
                "fields": [
                    {"name": "Course", "value": quiz.get('course', 'N/A'), "inline": True},
                    {"name": "Due Date", "value": quiz.get('closed_at', 'N/A'), "inline": True},
                ]
            })
        
        # New absences
        for absence in new_items['absences'][:5]:
            discord_embeds.append({
                "title": f"📅 New Absence: {absence.get('course', 'N/A')}",
                "color": 16729420,  # Orange
                "fields": [
                    {"name": "Type", "value": absence.get('type', 'N/A'), "inline": True},
                    {"name": "Date", "value": absence.get('date', 'N/A'), "inline": True},
                    {"name": "Status", "value": absence.get('status', 'N/A'), "inline": True},
                ]
            })
        
        # New courses
        for course in new_items['courses'][:5]:
            discord_embeds.append({
                "title": f"📚 New Course Available: {course.get('name', 'N/A')}",
                "color": 3066993,  # Green
                "fields": [
                    {"name": "Hours", "value": course.get('hours', 'N/A'), "inline": True},
                    {"name": "Fees", "value": course.get('fees', 'N/A'), "inline": True},
                ]
            })
        
        self._send_discord_notification("**🚨 New Items Detected!**", discord_embeds)
        
        # Email notification
        email_subject = f"UniShark Alert: {new_items['total']} New Items Detected"
        email_html = self._build_email_html(new_items)
        self._send_email_notification(email_subject, email_html)
        
        # Telegram notification
        telegram_message = self._build_telegram_message(new_items)
        self._send_telegram_notification(telegram_message)
    
    def _build_email_html(self, new_items: Dict) -> str:
        """Build HTML content for email notification"""
        html = f"""
        <h2>🚨 New Items Detected</h2>
        <p>UniShark has detected {new_items['total']} new items in your DULMS account:</p>
        """
        
        if new_items['assignments']:
            html += "<h3>📝 New Assignments:</h3><ul>"
            for assignment in new_items['assignments']:
                html += f"<li><strong>{assignment.get('name', 'Unnamed')}</strong> - {assignment.get('course', 'N/A')} (Due: {assignment.get('closed_at', 'N/A')})</li>"
            html += "</ul>"
        
        if new_items['quizzes']:
            html += "<h3>📊 New Quizzes:</h3><ul>"
            for quiz in new_items['quizzes']:
                html += f"<li><strong>{quiz.get('name', 'Unnamed')}</strong> - {quiz.get('course', 'N/A')} (Due: {quiz.get('closed_at', 'N/A')})</li>"
            html += "</ul>"
        
        if new_items['absences']:
            html += "<h3>📅 New Absences:</h3><ul>"
            for absence in new_items['absences']:
                html += f"<li><strong>{absence.get('course', 'N/A')}</strong> - {absence.get('type', 'N/A')} on {absence.get('date', 'N/A')} ({absence.get('status', 'N/A')})</li>"
            html += "</ul>"
        
        if new_items['courses']:
            html += "<h3>📚 New Courses Available:</h3><ul>"
            for course in new_items['courses']:
                html += f"<li><strong>{course.get('name', 'N/A')}</strong> - {course.get('hours', 'N/A')} hours, {course.get('fees', 'N/A')}</li>"
            html += "</ul>"
        
        html += "<p>Stay on top of your studies! 🦈<br>- The UniShark Team</p>"
        return html
    
    def _build_telegram_message(self, new_items: Dict) -> str:
        """Build Telegram message for new items"""
        escaped_total = self._escape_markdown_v2(str(new_items['total']))
        message = f"🚨 *New Items Detected\\!*\n\nUniShark found {escaped_total} new items:\n\n"
        
        if new_items['assignments']:
            message += "📝 *New Assignments:*\n"
            for assignment in new_items['assignments'][:3]:  # Limit for readability
                name = self._escape_markdown_v2(assignment.get('name', 'Unnamed'))
                course = self._escape_markdown_v2(assignment.get('course', 'N/A'))
                due = self._escape_markdown_v2(assignment.get('closed_at', 'N/A'))
                message += f"• {name} \\- {course} \\(Due: {due}\\)\n"
            message += "\n"
        
        if new_items['quizzes']:
            message += "📊 *New Quizzes:*\n"
            for quiz in new_items['quizzes'][:3]:
                name = self._escape_markdown_v2(quiz.get('name', 'Unnamed'))
                course = self._escape_markdown_v2(quiz.get('course', 'N/A'))
                due = self._escape_markdown_v2(quiz.get('closed_at', 'N/A'))
                message += f"• {name} \\- {course} \\(Due: {due}\\)\n"
            message += "\n"
        
        if new_items['absences']:
            message += "📅 *New Absences:*\n"
            for absence in new_items['absences'][:3]:
                course = self._escape_markdown_v2(absence.get('course', 'N/A'))
                type_val = self._escape_markdown_v2(absence.get('type', 'N/A'))
                date = self._escape_markdown_v2(absence.get('date', 'N/A'))
                status = self._escape_markdown_v2(absence.get('status', 'N/A'))
                message += f"• {course} \\- {type_val} on {date} \\({status}\\)\n"
            message += "\n"
        
        if new_items['courses']:
            message += "📚 *New Courses Available:*\n"
            for course in new_items['courses'][:3]:
                name = self._escape_markdown_v2(course.get('name', 'N/A'))
                hours = self._escape_markdown_v2(course.get('hours', 'N/A'))
                fees = self._escape_markdown_v2(course.get('fees', 'N/A'))
                message += f"• {name} \\- {hours} hours, {fees}\n"
            message += "\n"
        
        message += "Stay sharp\\! 🦈"
        return message

    def send_deadline_reminder(self, task: Dict, deadline: datetime, reminder_hours: int):
        """Send deadline reminder notification across all enabled platforms"""
        task_name = task.get('name', 'Untitled Task')
        course_name = task.get('course', 'Unknown Course')
        deadline_formatted = deadline.strftime('%b %d, %Y at %I:%M %p UTC')
        
        # Discord notification
        discord_embeds = [{
            "title": f"🚨 Deadline Reminder: {task_name}",
            "description": f"Deadline approaching in {course_name}",
            "color": 15158332,  # Red
            "fields": [
                {"name": "Course", "value": course_name, "inline": True},
                {"name": "Due Date", "value": deadline_formatted, "inline": True},
                {"name": "Time Left", "value": f"Less than {reminder_hours} hours", "inline": True},
            ]
        }]
        
        self._send_discord_notification("**⏰ Deadline Alert!**", discord_embeds)
        
        # Email notification
        email_subject = f"UniShark Reminder: {task_name}"
        email_html = f"""
        <h2>⏰ Deadline Reminder</h2>
        <p>Hi there,</p>
        <p>Just a heads up! The deadline for <strong>{task_name}</strong> in course <em>{course_name}</em> is approaching.</p>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3 style="color: #856404; margin-top: 0;">📅 Due Date: {deadline_formatted}</h3>
            <p style="color: #856404; margin-bottom: 0;">⏱️ Less than {reminder_hours} hours remaining!</p>
        </div>
        
        <p>Don't let this deadline slip by. Stay on top of it! 🦈</p>
        
        <p>Best regards,<br>
        - The UniShark Team</p>
        """
        
        self._send_email_notification(email_subject, email_html)
        
        # Telegram notification
        escaped_task_name = self._escape_markdown_v2(task_name)
        escaped_course_name = self._escape_markdown_v2(course_name)
        escaped_deadline = self._escape_markdown_v2(deadline_formatted)
        escaped_hours = self._escape_markdown_v2(str(reminder_hours))
        
        telegram_message = f"""🚨 *Deadline Reminder\\!*

⏰ The deadline for *{escaped_task_name}* in course _{escaped_course_name}_ is approaching\\!

📅 *Due:* {escaped_deadline}
⏱️ *Time left:* Less than {escaped_hours} hours

Don't let this slip by\\! Stay sharp 🦈"""
        
        self._send_telegram_notification(telegram_message)

    def send_error_notification(self, error_type, friendly_message: str):
        """Send error notification to user across all enabled platforms"""
        logger.info(f"Sending error notification for user {self.user_id}: {error_type}")
        
        # Check for duplicate notifications
        notification_content = {
            'type': 'error',
            'error_type': str(error_type),
            'message': friendly_message
        }
        
        if not self.deduplicator.should_send_notification('error', 
                                                         self.deduplicator.generate_content_hash(notification_content)):
            logger.info(f"Duplicate error notification blocked for user {self.user_id}")
            return
        
        # Get error emoji and color based on type
        error_info = self._get_error_display_info(error_type)
        
        # Discord notification
        discord_embeds = [{
            "title": f"{error_info['emoji']} Scraping Error Detected",
            "description": friendly_message,
            "color": error_info['color'],
            "fields": [
                {"name": "Error Type", "value": error_info['type_name'], "inline": True},
                {"name": "Time", "value": datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC'), "inline": True},
            ]
        }]
        
        self._send_discord_notification("**⚠️ UniShark Alert: Scraping Issue**", discord_embeds)
        
        # Email notification
        email_subject = f"UniShark Alert: {error_info['type_name']}"
        email_html = f"""
        <h2>{error_info['emoji']} Scraping Error Detected</h2>
        <p>Hi there,</p>
        <p>UniShark encountered an issue while trying to scrape your DULMS account:</p>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3 style="color: #856404; margin-top: 0;">{error_info['type_name']}</h3>
            <p style="color: #856404; margin-bottom: 0;">{friendly_message}</p>
        </div>
        
        <p>Don't worry - UniShark will automatically retry on the next scheduled run. If this issue persists, please check your settings or contact support.</p>
        
        <p>Stay sharp! 🦈<br>
        - The UniShark Team</p>
        """
        
        self._send_email_notification(email_subject, email_html)
        
        # Telegram notification
        escaped_type = self._escape_markdown_v2(error_info['type_name'])
        escaped_message = self._escape_markdown_v2(friendly_message)
        
        telegram_message = f"""{error_info['emoji']} *Scraping Error Detected*

*Error Type:* {escaped_type}

{escaped_message}

Don't worry \\- UniShark will automatically retry on the next scheduled run\\. If this persists, please check your settings\\. 🦈"""
        
        self._send_telegram_notification(telegram_message)

    def send_suspension_notification(self):
        """Send notification when auto-scraping is suspended due to consecutive failures"""
        logger.info(f"Sending suspension notification for user {self.user_id}")
        
        # Check for duplicate notifications
        notification_content = {
            'type': 'suspension',
            'message': 'Auto-scraping suspended due to consecutive failures'
        }
        
        if not self.deduplicator.should_send_notification('suspension', 
                                                         self.deduplicator.generate_content_hash(notification_content)):
            logger.info(f"Duplicate suspension notification blocked for user {self.user_id}")
            return
        
        # Discord notification
        discord_embeds = [{
            "title": "🚨 Auto-Scraping Suspended",
            "description": "UniShark has temporarily suspended automatic scraping for your account due to consecutive failures.",
            "color": 15158332,  # Red
            "fields": [
                {"name": "Reason", "value": "6 consecutive scraping failures", "inline": True},
                {"name": "Action Required", "value": "Please check your settings and manually test", "inline": True},
            ]
        }]
        
        self._send_discord_notification("**🚨 URGENT: Auto-Scraping Suspended**", discord_embeds)
        
        # Email notification
        email_subject = "URGENT: UniShark Auto-Scraping Suspended"
        email_html = """
        <h2>🚨 Auto-Scraping Suspended</h2>
        <p>Hi there,</p>
        <p><strong>Important:</strong> UniShark has temporarily suspended automatic scraping for your account due to 6 consecutive failures.</p>
        
        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3 style="color: #721c24; margin-top: 0;">What this means:</h3>
            <ul style="color: #721c24;">
                <li>Automatic scraping has been paused to prevent further issues</li>
                <li>You won't receive new item notifications until this is resolved</li>
                <li>Manual scraping is still available in your dashboard</li>
            </ul>
        </div>
        
        <h3>What to do next:</h3>
        <ol>
            <li>Check your DULMS credentials in settings</li>
            <li>Verify your CAPTCHA API keys have sufficient credits</li>
            <li>Try a manual scrape to test if the issue is resolved</li>
            <li>Contact support if problems persist</li>
        </ol>
        
        <p>Once you successfully complete a manual scrape, automatic scraping will resume.</p>
        
        <p>We're here to help! 🦈<br>
        - The UniShark Team</p>
        """
        
        self._send_email_notification(email_subject, email_html)
        
        # Telegram notification
        telegram_message = """🚨 *URGENT: Auto\\-Scraping Suspended*

UniShark has temporarily suspended automatic scraping for your account due to 6 consecutive failures\\.

*What this means:*
• Automatic scraping has been paused
• You won't receive new notifications until resolved
• Manual scraping is still available

*What to do:*
1\\. Check your DULMS credentials
2\\. Verify CAPTCHA API credits
3\\. Try a manual scrape test
4\\. Contact support if needed

Once you complete a successful manual scrape, automatic scraping will resume\\. 🦈"""
        
        self._send_telegram_notification(telegram_message)

    def _get_error_display_info(self, error_type) -> Dict:
        """Get display information for different error types"""
        from utils.error_tracker import ErrorType
        
        error_display = {
            ErrorType.WRONG_CREDENTIALS: {
                'emoji': '🔐',
                'type_name': 'Wrong Credentials',
                'color': 15158332  # Red
            },
            ErrorType.WRONG_CAPTCHA: {
                'emoji': '🤖',
                'type_name': 'CAPTCHA Failed',
                'color': 16729420  # Orange
            },
            ErrorType.IP_BANNED: {
                'emoji': '🚫',
                'type_name': 'IP Banned',
                'color': 15158332  # Red
            },
            ErrorType.NO_CAPTCHA_CREDIT: {
                'emoji': '💳',
                'type_name': 'No CAPTCHA Credits',
                'color': 16729420  # Orange
            },
            ErrorType.CAPTCHA_SERVICE_ERROR: {
                'emoji': '⚙️',
                'type_name': 'CAPTCHA Service Error',
                'color': 16729420  # Orange
            },
            ErrorType.NETWORK_TIMEOUT: {
                'emoji': '⏱️',
                'type_name': 'Network Timeout',
                'color': 3447003  # Blue
            },
            ErrorType.CONNECTION_FAILED: {
                'emoji': '🌐',
                'type_name': 'Connection Failed',
                'color': 3447003  # Blue
            },
            ErrorType.PAGE_LOAD_FAILED: {
                'emoji': '📄',
                'type_name': 'Page Load Failed',
                'color': 3447003  # Blue
            },
            ErrorType.BROWSER_CRASHED: {
                'emoji': '💥',
                'type_name': 'Browser Crashed',
                'color': 15158332  # Red
            },
            ErrorType.DRIVER_ERROR: {
                'emoji': '🔧',
                'type_name': 'Driver Error',
                'color': 15158332  # Red
            },
            ErrorType.SESSION_EXPIRED: {
                'emoji': '⏰',
                'type_name': 'Session Expired',
                'color': 16729420  # Orange
            },
            ErrorType.DULMS_MAINTENANCE: {
                'emoji': '🔧',
                'type_name': 'DULMS Maintenance',
                'color': 3066993  # Green
            },
            ErrorType.DULMS_OVERLOADED: {
                'emoji': '🚦',
                'type_name': 'DULMS Overloaded',
                'color': 16729420  # Orange
            },
            ErrorType.UNEXPECTED_PAGE_STRUCTURE: {
                'emoji': '🔍',
                'type_name': 'Page Structure Changed',
                'color': 16729420  # Orange
            },
            ErrorType.UNKNOWN_ERROR: {
                'emoji': '❓',
                'type_name': 'Unknown Error',
                'color': 7506394  # Gray
            }
        }
        
        return error_display.get(error_type, {
            'emoji': '⚠️',
            'type_name': 'Error',
            'color': 16729420  # Orange
        })


def send_unified_notifications(user_id: str, old_data: Dict, new_data: Dict) -> int:
    """
    Main function to send notifications across all enabled platforms.
    Returns the number of new items found.
    """
    try:
        notifier = UnifiedNotifier(user_id)
        return notifier.send_new_items_notification(old_data, new_data)
    except Exception as e:
        logger.error(f"Error in unified notifications for user {user_id}: {e}", exc_info=True)
        return 0


def send_unified_deadline_reminder(user_id: str, task: Dict, deadline: datetime, reminder_hours: int):
    """
    Send deadline reminder across all enabled platforms.
    """
    try:
        notifier = UnifiedNotifier(user_id)
        notifier.send_deadline_reminder(task, deadline, reminder_hours)
        logger.info(f"Deadline reminder sent for user {user_id}, task: {task.get('name', 'Unknown')}")
    except Exception as e:
        logger.error(f"Error sending deadline reminder for user {user_id}: {e}", exc_info=True)