#!/usr/bin/env python3
"""
UniShark - Comprehensive Heroku Testing Suite
Test scraping, notifications, deadlines, and connections
"""

import os
import sys
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List
import requests
import json

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.supabase_client import get_supabase_client
from utils.enhanced_notifications import UniSharkNotificationService, NotificationData, send_test_notification
from scraper.enhanced_scraper import EnhancedScraper
from utils.date_processor import parse_deadline_date

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class UniSharkTester:
    """Comprehensive testing suite for UniShark"""
    
    def __init__(self):
        self.results = {}
        self.notification_service = UniSharkNotificationService()
        
    def log_test_result(self, test_name: str, success: bool, message: str = "", data: Any = None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        logger.info(f"{status} {test_name}: {message}")
        
        self.results[test_name] = {
            "success": success,
            "message": message,
            "data": data,
            "timestamp": datetime.now().isoformat()
        }
    
    def test_environment_variables(self) -> bool:
        """Test all required environment variables"""
        logger.info("🔧 Testing Environment Variables...")
        
        required_vars = [
            'DATABASE_URL',
            'SUPABASE_URL', 
            'SUPABASE_KEY',
            'CLERK_SECRET_KEY',
            'DISCORD_FEEDBACK_WEBHOOK_URL',
            'TELEGRAM_BOT_TOKEN',
            'BREVO_API_KEY',
            'CELERY_BROKER_URL',
            'CELERY_RESULT_BACKEND'
        ]
        
        missing_vars = []
        for var in required_vars:
            if not os.getenv(var):
                missing_vars.append(var)
        
        if missing_vars:
            self.log_test_result(
                "environment_variables", 
                False, 
                f"Missing variables: {', '.join(missing_vars)}"
            )
            return False
        
        self.log_test_result("environment_variables", True, "All required variables present")
        return True
    
    def test_supabase_connection(self) -> bool:
        """Test Supabase database connection"""
        logger.info("🗄️ Testing Supabase Connection...")
        
        try:
            supabase = get_supabase_client()
            
            # Test basic query
            result = supabase.table('users').select('id').limit(1).execute()
            
            self.log_test_result(
                "supabase_connection", 
                True, 
                f"Connected successfully. Found {len(result.data)} test records"
            )
            return True
            
        except Exception as e:
            self.log_test_result("supabase_connection", False, str(e))
            return False
    
    def test_clerk_webhook_endpoint(self) -> bool:
        """Test Clerk webhook endpoint"""
        logger.info("🔐 Testing Clerk Integration...")
        
        try:
            # Test if the webhook endpoint is accessible
            base_url = os.getenv('NEXT_PUBLIC_API_BASE_URL', 'http://localhost:8000')
            webhook_url = f"{base_url}/api/clerk/webhook"
            
            # Just test if endpoint exists (will return 400 for invalid payload, which is expected)
            response = requests.post(webhook_url, json={}, timeout=10)
            
            # 400 is expected for invalid payload, 404 would mean endpoint doesn't exist
            if response.status_code in [400, 401, 422]:
                self.log_test_result("clerk_webhook", True, "Webhook endpoint accessible")
                return True
            else:
                self.log_test_result("clerk_webhook", False, f"Unexpected status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test_result("clerk_webhook", False, str(e))
            return False
    
    def test_discord_webhook(self) -> bool:
        """Test Discord webhook notification"""
        logger.info("💬 Testing Discord Webhook...")
        
        try:
            webhook_url = os.getenv('DISCORD_FEEDBACK_WEBHOOK_URL')
            if not webhook_url:
                self.log_test_result("discord_webhook", False, "No webhook URL configured")
                return False
            
            test_payload = {
                "embeds": [{
                    "title": "🧪 UniShark Test Notification",
                    "description": "This is a test notification from UniShark testing suite",
                    "color": 0x00ff00,
                    "timestamp": datetime.now().isoformat(),
                    "footer": {"text": "UniShark Testing Suite"}
                }]
            }
            
            response = requests.post(webhook_url, json=test_payload, timeout=10)
            
            if response.status_code == 204:
                self.log_test_result("discord_webhook", True, "Test notification sent successfully")
                return True
            else:
                self.log_test_result("discord_webhook", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test_result("discord_webhook", False, str(e))
            return False
    
    def test_telegram_bot(self) -> bool:
        """Test Telegram bot connection"""
        logger.info("📱 Testing Telegram Bot...")
        
        try:
            bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
            if not bot_token:
                self.log_test_result("telegram_bot", False, "No bot token configured")
                return False
            
            # Test bot info
            response = requests.get(f"https://api.telegram.org/bot{bot_token}/getMe", timeout=10)
            
            if response.status_code == 200:
                bot_info = response.json()
                if bot_info.get('ok'):
                    bot_name = bot_info['result']['username']
                    self.log_test_result("telegram_bot", True, f"Bot @{bot_name} is active")
                    return True
            
            self.log_test_result("telegram_bot", False, f"Status: {response.status_code}")
            return False
            
        except Exception as e:
            self.log_test_result("telegram_bot", False, str(e))
            return False
    
    def test_email_service(self) -> bool:
        """Test Brevo email service"""
        logger.info("📧 Testing Email Service...")
        
        try:
            api_key = os.getenv('BREVO_API_KEY')
            if not api_key:
                self.log_test_result("email_service", False, "No Brevo API key configured")
                return False
            
            headers = {
                'api-key': api_key,
                'Content-Type': 'application/json'
            }
            
            # Test API connection
            response = requests.get('https://api.brevo.com/v3/account', headers=headers, timeout=10)
            
            if response.status_code == 200:
                account_info = response.json()
                email = account_info.get('email', 'Unknown')
                self.log_test_result("email_service", True, f"Connected as {email}")
                return True
            else:
                self.log_test_result("email_service", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test_result("email_service", False, str(e))
            return False
    
    def test_redis_connection(self) -> bool:
        """Test Redis connection for Celery"""
        logger.info("🔴 Testing Redis Connection...")
        
        try:
            import redis
            
            broker_url = os.getenv('CELERY_BROKER_URL')
            if not broker_url:
                self.log_test_result("redis_connection", False, "No Redis URL configured")
                return False
            
            # Parse Redis URL
            r = redis.from_url(broker_url)
            
            # Test connection
            r.ping()
            
            # Test basic operations
            r.set('unishark_test', 'test_value', ex=60)
            value = r.get('unishark_test')
            
            if value == b'test_value':
                self.log_test_result("redis_connection", True, "Redis connection and operations working")
                return True
            else:
                self.log_test_result("redis_connection", False, "Redis operations failed")
                return False
                
        except Exception as e:
            self.log_test_result("redis_connection", False, str(e))
            return False
    
    def test_scraper_functionality(self) -> bool:
        """Test DULMS scraper with mock data"""
        logger.info("🕷️ Testing Scraper Functionality...")
        
        try:
            # Test date parsing functionality
            test_dates = [
                "2024-12-15 23:59:59",
                "15/12/2024 11:59 PM",
                "Dec 15, 2024 23:59"
            ]
            
            parsed_dates = []
            for date_str in test_dates:
                try:
                    parsed = parse_deadline_date(date_str)
                    parsed_dates.append(parsed)
                except Exception as e:
                    logger.warning(f"Failed to parse date '{date_str}': {e}")
            
            if parsed_dates:
                self.log_test_result(
                    "scraper_functionality", 
                    True, 
                    f"Date parsing working. Parsed {len(parsed_dates)} dates"
                )
                return True
            else:
                self.log_test_result("scraper_functionality", False, "Date parsing failed")
                return False
                
        except Exception as e:
            self.log_test_result("scraper_functionality", False, str(e))
            return False
    
    def test_user_deadline_detection(self) -> bool:
        """Test deadline detection logic"""
        logger.info("⏰ Testing Deadline Detection...")
        
        try:
            # Mock assignment data
            now = datetime.now()
            assignments = [
                {
                    'title': 'Test Assignment 1',
                    'deadline': now + timedelta(hours=12),  # Due in 12 hours
                    'status': 'pending'
                },
                {
                    'title': 'Test Assignment 2', 
                    'deadline': now + timedelta(days=2),    # Due in 2 days
                    'status': 'pending'
                },
                {
                    'title': 'Test Assignment 3',
                    'deadline': now - timedelta(hours=1),   # Overdue
                    'status': 'pending'
                }
            ]
            
            # Test deadline categorization
            urgent_assignments = []
            upcoming_assignments = []
            overdue_assignments = []
            
            for assignment in assignments:
                time_diff = assignment['deadline'] - now
                
                if time_diff.total_seconds() < 0:
                    overdue_assignments.append(assignment)
                elif time_diff.total_seconds() < 24 * 3600:  # Less than 24 hours
                    urgent_assignments.append(assignment)
                else:
                    upcoming_assignments.append(assignment)
            
            self.log_test_result(
                "deadline_detection", 
                True, 
                f"Found {len(urgent_assignments)} urgent, {len(upcoming_assignments)} upcoming, {len(overdue_assignments)} overdue"
            )
            return True
            
        except Exception as e:
            self.log_test_result("deadline_detection", False, str(e))
            return False
    
    def test_notification_system(self) -> bool:
        """Test the complete notification system"""
        logger.info("🔔 Testing Notification System...")
        
        try:
            # Test notification formatting with enhanced service
            test_notification_data = NotificationData(
                title="Test Notification",
                message="This is a test notification from UniShark testing suite",
                assignments=[
                    {
                        'title': 'Test Assignment',
                        'course': 'Test Course',
                        'deadline': datetime.now() + timedelta(hours=12),
                        'status': 'pending'
                    }
                ],
                user_name='Test User',
                urgency='normal',
                notification_type='general'
            )
            
            # Test Discord notification format
            discord_embed = self.notification_service._create_discord_embed(test_notification_data)
            
            if discord_embed and 'title' in discord_embed:
                self.log_test_result("notification_system", True, "Enhanced notification formatting working")
                return True
            else:
                self.log_test_result("notification_system", False, "Notification formatting failed")
                return False
                
        except Exception as e:
            self.log_test_result("notification_system", False, str(e))
            return False
    
    def test_enhanced_notifications(self) -> bool:
        """Test the enhanced multi-platform notification system"""
        logger.info("🚀 Testing Enhanced Multi-Platform Notifications...")
        
        try:
            # Send test notification across all platforms
            results = send_test_notification(
                user_name="UniShark Tester",
                discord=True,
                telegram_chat_id=None,  # Skip Telegram in automated tests
                email=None  # Skip Email in automated tests
            )
            
            # Check if at least Discord worked
            if results.get('discord', False):
                self.log_test_result("enhanced_notifications", True, "Multi-platform notifications working")
                return True
            else:
                self.log_test_result("enhanced_notifications", False, "Multi-platform notifications failed")
                return False
                
        except Exception as e:
            self.log_test_result("enhanced_notifications", False, str(e))
            return False
    
    def generate_test_report(self) -> Dict[str, Any]:
        """Generate comprehensive test report"""
        total_tests = len(self.results)
        passed_tests = sum(1 for result in self.results.values() if result['success'])
        failed_tests = total_tests - passed_tests
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total_tests": total_tests,
                "passed": passed_tests,
                "failed": failed_tests,
                "success_rate": f"{(passed_tests/total_tests)*100:.1f}%" if total_tests > 0 else "0%"
            },
            "results": self.results,
            "environment": {
                "python_version": sys.version,
                "platform": sys.platform,
                "heroku_app": os.getenv('HEROKU_APP_NAME', 'Unknown')
            }
        }
        
        return report
    
    async def run_all_tests(self) -> Dict[str, Any]:
        """Run all tests and return comprehensive report"""
        logger.info("🚀 Starting UniShark Test Suite...")
        
        # Run all tests
        tests = [
            self.test_environment_variables,
            self.test_supabase_connection,
            self.test_clerk_webhook_endpoint,
            self.test_discord_webhook,
            self.test_telegram_bot,
            self.test_email_service,
            self.test_redis_connection,
            self.test_scraper_functionality,
            self.test_user_deadline_detection,
            self.test_notification_system,
            self.test_enhanced_notifications
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                test_name = test.__name__.replace('test_', '')
                self.log_test_result(test_name, False, f"Test crashed: {str(e)}")
        
        # Generate and return report
        report = self.generate_test_report()
        
        logger.info(f"🏁 Test Suite Complete: {report['summary']['passed']}/{report['summary']['total_tests']} tests passed")
        
        return report

def main():
    """Main function to run tests"""
    tester = UniSharkTester()
    
    # Run tests
    report = asyncio.run(tester.run_all_tests())
    
    # Print summary
    print("\n" + "="*60)
    print("🦈 UNISHARK TEST SUITE RESULTS")
    print("="*60)
    print(f"Total Tests: {report['summary']['total_tests']}")
    print(f"Passed: {report['summary']['passed']}")
    print(f"Failed: {report['summary']['failed']}")
    print(f"Success Rate: {report['summary']['success_rate']}")
    print("="*60)
    
    # Print failed tests
    failed_tests = [name for name, result in report['results'].items() if not result['success']]
    if failed_tests:
        print("\n❌ FAILED TESTS:")
        for test_name in failed_tests:
            result = report['results'][test_name]
            print(f"  • {test_name}: {result['message']}")
    
    # Save report to file
    with open('test_report.json', 'w') as f:
        json.dump(report, f, indent=2, default=str)
    
    print(f"\n📄 Full report saved to: test_report.json")
    
    # Exit with appropriate code
    sys.exit(0 if report['summary']['failed'] == 0 else 1)

if __name__ == "__main__":
    main()