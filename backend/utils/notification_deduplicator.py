# /backend/utils/notification_deduplicator.py
"""
Notification deduplication system to prevent sending duplicate notifications
"""

import logging
import hashlib
import time
from typing import Dict, Optional
from db.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

class NotificationDeduplicator:
    """
    Prevents duplicate notifications from being sent within a specified time window
    """
    
    def __init__(self, user_id: str, dedup_window_minutes: int = 5):
        self.user_id = user_id
        self.dedup_window_minutes = dedup_window_minutes
        self.db = get_supabase_client()
    
    def should_send_notification(self, notification_type: str, content_hash: str) -> bool:
        """
        Check if a notification should be sent based on deduplication rules
        
        Args:
            notification_type: Type of notification (e.g., 'error', 'success', 'suspension')
            content_hash: Hash of the notification content
            
        Returns:
            True if notification should be sent, False if it's a duplicate
        """
        try:
            # Create a unique identifier for this notification
            notification_id = f"{self.user_id}:{notification_type}:{content_hash}"
            
            # Check if we've sent this notification recently
            cutoff_time = time.time() - (self.dedup_window_minutes * 60)
            
            response = self.db.table('notification_dedup').select('sent_at').eq(
                'notification_id', notification_id
            ).gte('sent_at', cutoff_time).execute()
            
            if response.data:
                logger.info(f"Duplicate notification blocked for user {self.user_id}: {notification_type}")
                return False
            
            # Record this notification
            self.db.table('notification_dedup').insert({
                'notification_id': notification_id,
                'user_id': self.user_id,
                'notification_type': notification_type,
                'content_hash': content_hash,
                'sent_at': time.time()
            }).execute()
            
            return True
            
        except Exception as e:
            logger.error(f"Error in notification deduplication for user {self.user_id}: {e}")
            # If deduplication fails, allow the notification to be sent
            return True
    
    def generate_content_hash(self, content: Dict) -> str:
        """
        Generate a hash of notification content for deduplication
        """
        try:
            # Convert content to a stable string representation
            content_str = str(sorted(content.items())) if isinstance(content, dict) else str(content)
            return hashlib.md5(content_str.encode()).hexdigest()
        except Exception as e:
            logger.error(f"Error generating content hash: {e}")
            return str(hash(str(content)))
    
    @classmethod
    def cleanup_old_records(cls, days_to_keep: int = 7):
        """
        Clean up old deduplication records
        """
        try:
            db = get_supabase_client()
            cutoff_time = time.time() - (days_to_keep * 24 * 60 * 60)
            
            db.table('notification_dedup').delete().lt('sent_at', cutoff_time).execute()
            logger.info(f"Cleaned up notification dedup records older than {days_to_keep} days")
            
        except Exception as e:
            logger.error(f"Error cleaning up notification dedup records: {e}")

def should_send_notification(user_id: str, notification_type: str, content: Dict) -> bool:
    """
    Convenience function to check if a notification should be sent
    """
    deduplicator = NotificationDeduplicator(user_id)
    content_hash = deduplicator.generate_content_hash(content)
    return deduplicator.should_send_notification(notification_type, content_hash)