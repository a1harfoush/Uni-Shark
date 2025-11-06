"""
UniShark Enhanced Notification System
Supports Discord, Telegram, and Email notifications with rich formatting
"""

import os
import requests
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import json

logger = logging.getLogger(__name__)

@dataclass
class NotificationData:
    """Data structure for notifications"""
    title: str
    message: str
    assignments: List[Dict] = None
    user_name: str = "Student"
    urgency: str = "normal"  # low, normal, high, critical
    notification_type: str = "general"  # deadline, absence, registration, general

class UniSharkNotificationService:
    """Enhanced notification service for UniShark"""
    
    def __init__(self):
        self.discord_webhook_url = os.getenv('DISCORD_FEEDBACK_WEBHOOK_URL')
        self.telegram_bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
        self.brevo_api_key = os.getenv('BREVO_API_KEY')
        self.brevo_sender_email = os.getenv('BREVO_SENDER_EMAIL', 'alerts@unishark.site')
        self.brevo_sender_name = os.getenv('BREVO_SENDER_NAME', 'UniShark')
    
    def _get_urgency_color(self, urgency: str) -> int:
        """Get Discord embed color based on urgency"""
        colors = {
            'low': 0x00ff00,      # Green
            'normal': 0x0099ff,   # Blue  
            'high': 0xff9900,     # Orange
            'critical': 0xff0000  # Red
        }
        return colors.get(urgency, 0x0099ff)
    
    def _get_urgency_emoji(self, urgency: str) -> str:
        """Get emoji based on urgency"""
        emojis = {
            'low': '💚',
            'normal': '💙', 
            'high': '🧡',
            'critical': '❤️'
        }
        return emojis.get(urgency, '💙')
    
    def _create_discord_embed(self, notification_data: NotificationData) -> Dict:
        """Create rich Discord embed with UniShark branding"""
        
        # Base embed
        embed = {
            "title": f"🦈 {notification_data.title}",
            "description": notification_data.message,
            "color": self._get_urgency_color(notification_data.urgency),
            "timestamp": datetime.now().isoformat(),
            "footer": {
                "text": "UniShark - Your Academic Assistant",
                "icon_url": "https://raw.githubusercontent.com/yourusername/unishark/main/logo/unishark-icon.png"
            },
            "author": {
                "name": f"Notification for {notification_data.user_name}",
                "icon_url": "https://raw.githubusercontent.com/yourusername/unishark/main/logo/student-icon.png"
            }
        }
        
        # Add assignments field if provided
        if notification_data.assignments:
            assignments_text = ""
            for i, assignment in enumerate(notification_data.assignments[:5]):  # Limit to 5
                deadline = assignment.get('deadline', 'No deadline')
                if isinstance(deadline, datetime):
                    deadline = deadline.strftime('%Y-%m-%d %H:%M')
                
                status_emoji = "⏳" if assignment.get('status') == 'pending' else "✅"
                assignments_text += f"{status_emoji} **{assignment.get('title', 'Unknown')}**\n"
                assignments_text += f"   📚 {assignment.get('course', 'Unknown Course')}\n"
                assignments_text += f"   ⏰ Due: {deadline}\n\n"
            
            if len(notification_data.assignments) > 5:
                assignments_text += f"... and {len(notification_data.assignments) - 5} more assignments"
            
            embed["fields"] = [{
                "name": f"📋 Assignments ({len(notification_data.assignments)})",
                "value": assignments_text[:1024],  # Discord field limit
                "inline": False
            }]
        
        # Add urgency indicator
        urgency_emoji = self._get_urgency_emoji(notification_data.urgency)
        embed["fields"] = embed.get("fields", []) + [{
            "name": "Priority Level",
            "value": f"{urgency_emoji} {notification_data.urgency.title()}",
            "inline": True
        }]
        
        return embed
    
    def send_discord_notification(self, notification_data: NotificationData) -> bool:
        """Send enhanced Discord notification"""
        if not self.discord_webhook_url or "discord.com" not in self.discord_webhook_url:
            logger.warning("Discord webhook URL not configured")
            return False
        
        try:
            embed = self._create_discord_embed(notification_data)
            
            payload = {
                "username": "UniShark Bot",
                "avatar_url": "https://raw.githubusercontent.com/yourusername/unishark/main/logo/unishark-avatar.png",
                "embeds": [embed]
            }
            
            response = requests.post(
                self.discord_webhook_url,
                json=payload,
                timeout=10
            )
            
            if response.status_code == 204:
                logger.info(f"Discord notification sent successfully for {notification_data.user_name}")
                return True
            else:
                logger.error(f"Discord notification failed: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Discord notification error: {str(e)}")
            return False
    
    def send_telegram_notification(self, chat_id: str, notification_data: NotificationData) -> bool:
        """Send Telegram notification with rich formatting"""
        if not self.telegram_bot_token or not chat_id:
            logger.warning("Telegram bot token or chat ID not configured")
            return False
        
        try:
            # Create formatted message
            urgency_emoji = self._get_urgency_emoji(notification_data.urgency)
            
            message = f"🦈 *UniShark Notification*\n\n"
            message += f"{urgency_emoji} *{notification_data.title}*\n\n"
            message += f"{notification_data.message}\n\n"
            
            if notification_data.assignments:
                message += f"📋 *Assignments ({len(notification_data.assignments)}):*\n"
                for assignment in notification_data.assignments[:3]:  # Limit for Telegram
                    deadline = assignment.get('deadline', 'No deadline')
                    if isinstance(deadline, datetime):
                        deadline = deadline.strftime('%Y-%m-%d %H:%M')
                    
                    status_emoji = "⏳" if assignment.get('status') == 'pending' else "✅"
                    message += f"{status_emoji} *{assignment.get('title', 'Unknown')}*\n"
                    message += f"   📚 {assignment.get('course', 'Unknown Course')}\n"
                    message += f"   ⏰ Due: {deadline}\n\n"
                
                if len(notification_data.assignments) > 3:
                    message += f"... and {len(notification_data.assignments) - 3} more assignments\n\n"
            
            message += f"Priority: {urgency_emoji} {notification_data.urgency.title()}\n"
            message += f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
            
            url = f"https://api.telegram.org/bot{self.telegram_bot_token}/sendMessage"
            
            payload = {
                "chat_id": chat_id,
                "text": message,
                "parse_mode": "Markdown",
                "disable_web_page_preview": True
            }
            
            response = requests.post(url, json=payload, timeout=10)
            
            if response.status_code == 200:
                logger.info(f"Telegram notification sent successfully to {chat_id}")
                return True
            else:
                logger.error(f"Telegram notification failed: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Telegram notification error: {str(e)}")
            return False
    
    def send_email_notification(self, recipient_email: str, notification_data: NotificationData) -> bool:
        """Send email notification using Brevo"""
        if not self.brevo_api_key or not recipient_email:
            logger.warning("Brevo API key or recipient email not configured")
            return False
        
        try:
            # Create HTML email content
            urgency_color = {
                'low': '#28a745',
                'normal': '#007bff', 
                'high': '#fd7e14',
                'critical': '#dc3545'
            }.get(notification_data.urgency, '#007bff')
            
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>UniShark Notification</title>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center; }}
                    .content {{ background: #f8f9fa; padding: 20px; border-radius: 0 0 10px 10px; }}
                    .urgency {{ background: {urgency_color}; color: white; padding: 10px; border-radius: 5px; text-align: center; margin: 10px 0; }}
                    .assignment {{ background: white; padding: 15px; margin: 10px 0; border-left: 4px solid {urgency_color}; border-radius: 5px; }}
                    .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🦈 UniShark</h1>
                        <h2>{notification_data.title}</h2>
                    </div>
                    <div class="content">
                        <div class="urgency">
                            Priority: {notification_data.urgency.title()}
                        </div>
                        <p>{notification_data.message}</p>
            """
            
            if notification_data.assignments:
                html_content += f"<h3>📋 Your Assignments ({len(notification_data.assignments)}):</h3>"
                for assignment in notification_data.assignments:
                    deadline = assignment.get('deadline', 'No deadline')
                    if isinstance(deadline, datetime):
                        deadline = deadline.strftime('%Y-%m-%d %H:%M')
                    
                    status = "Pending" if assignment.get('status') == 'pending' else "Completed"
                    html_content += f"""
                    <div class="assignment">
                        <h4>{assignment.get('title', 'Unknown Assignment')}</h4>
                        <p><strong>Course:</strong> {assignment.get('course', 'Unknown Course')}</p>
                        <p><strong>Deadline:</strong> {deadline}</p>
                        <p><strong>Status:</strong> {status}</p>
                    </div>
                    """
            
            html_content += f"""
                    </div>
                    <div class="footer">
                        <p>This notification was sent by UniShark at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                        <p>UniShark - Your Academic Assistant 🦈</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Send email via Brevo
            url = "https://api.brevo.com/v3/smtp/email"
            
            headers = {
                "api-key": self.brevo_api_key,
                "Content-Type": "application/json"
            }
            
            payload = {
                "sender": {
                    "name": self.brevo_sender_name,
                    "email": self.brevo_sender_email
                },
                "to": [{"email": recipient_email, "name": notification_data.user_name}],
                "subject": f"🦈 UniShark: {notification_data.title}",
                "htmlContent": html_content
            }
            
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            
            if response.status_code == 201:
                logger.info(f"Email notification sent successfully to {recipient_email}")
                return True
            else:
                logger.error(f"Email notification failed: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Email notification error: {str(e)}")
            return False
    
    def send_multi_platform_notification(
        self, 
        notification_data: NotificationData,
        discord: bool = True,
        telegram_chat_id: Optional[str] = None,
        email: Optional[str] = None
    ) -> Dict[str, bool]:
        """Send notification across multiple platforms"""
        results = {}
        
        if discord:
            results['discord'] = self.send_discord_notification(notification_data)
        
        if telegram_chat_id:
            results['telegram'] = self.send_telegram_notification(telegram_chat_id, notification_data)
        
        if email:
            results['email'] = self.send_email_notification(email, notification_data)
        
        # Log summary
        successful = sum(1 for success in results.values() if success)
        total = len(results)
        logger.info(f"Multi-platform notification: {successful}/{total} platforms successful")
        
        return results

# Convenience functions for common notification types
def send_deadline_alert(
    assignments: List[Dict],
    user_name: str = "Student",
    urgency: str = "high",
    **kwargs
) -> Dict[str, bool]:
    """Send deadline alert notification"""
    service = UniSharkNotificationService()
    
    notification_data = NotificationData(
        title="Upcoming Assignment Deadlines!",
        message=f"You have {len(assignments)} assignments with upcoming deadlines.",
        assignments=assignments,
        user_name=user_name,
        urgency=urgency,
        notification_type="deadline"
    )
    
    return service.send_multi_platform_notification(notification_data, **kwargs)

def send_absence_alert(
    absences: List[Dict],
    user_name: str = "Student",
    urgency: str = "normal",
    **kwargs
) -> Dict[str, bool]:
    """Send absence alert notification"""
    service = UniSharkNotificationService()
    
    notification_data = NotificationData(
        title="New Absences Recorded",
        message=f"You have {len(absences)} new absences recorded in your account.",
        assignments=absences,  # Reuse assignments structure for absences
        user_name=user_name,
        urgency=urgency,
        notification_type="absence"
    )
    
    return service.send_multi_platform_notification(notification_data, **kwargs)

def send_registration_alert(
    courses: List[Dict],
    user_name: str = "Student",
    urgency: str = "normal",
    **kwargs
) -> Dict[str, bool]:
    """Send course registration alert"""
    service = UniSharkNotificationService()
    
    notification_data = NotificationData(
        title="New Courses Available for Registration",
        message=f"There are {len(courses)} new courses available for registration.",
        assignments=courses,  # Reuse assignments structure for courses
        user_name=user_name,
        urgency=urgency,
        notification_type="registration"
    )
    
    return service.send_multi_platform_notification(notification_data, **kwargs)

def send_test_notification(user_name: str = "Test User", **kwargs) -> Dict[str, bool]:
    """Send test notification"""
    service = UniSharkNotificationService()
    
    test_assignments = [
        {
            'title': 'Sample Assignment 1',
            'course': 'Computer Science 101',
            'deadline': datetime.now() + timedelta(hours=12),
            'status': 'pending'
        },
        {
            'title': 'Sample Assignment 2', 
            'course': 'Mathematics 201',
            'deadline': datetime.now() + timedelta(days=2),
            'status': 'pending'
        }
    ]
    
    notification_data = NotificationData(
        title="Test Notification - UniShark is Working!",
        message="This is a test notification to verify that UniShark's notification system is working correctly.",
        assignments=test_assignments,
        user_name=user_name,
        urgency="normal",
        notification_type="general"
    )
    
    return service.send_multi_platform_notification(notification_data, **kwargs)