#!/usr/bin/env python3
"""
UniShark Quick Test Script
Run specific tests quickly during development
"""

import os
import sys
import asyncio
from datetime import datetime

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.enhanced_notifications import send_test_notification, send_deadline_alert
from test_heroku import UniSharkTester

def test_notifications():
    """Quick test of notification system"""
    print("🧪 Testing UniShark Notifications...")
    
    # Test basic notification
    results = send_test_notification(
        user_name="Quick Test User",
        discord=True
    )
    
    print(f"Discord: {'✅' if results.get('discord') else '❌'}")
    print(f"Results: {results}")

def test_deadline_alert():
    """Test deadline alert specifically"""
    print("⏰ Testing Deadline Alert...")
    
    test_assignments = [
        {
            'title': 'Mathematics Assignment',
            'course': 'MATH 101',
            'deadline': datetime.now(),
            'status': 'pending'
        },
        {
            'title': 'Physics Lab Report',
            'course': 'PHYS 201', 
            'deadline': datetime.now(),
            'status': 'pending'
        }
    ]
    
    results = send_deadline_alert(
        assignments=test_assignments,
        user_name="Test Student",
        urgency="high",
        discord=True
    )
    
    print(f"Deadline Alert Results: {results}")

def test_environment():
    """Quick environment test"""
    print("🔧 Testing Environment...")
    
    tester = UniSharkTester()
    success = tester.test_environment_variables()
    print(f"Environment: {'✅' if success else '❌'}")

def test_database():
    """Quick database test"""
    print("🗄️ Testing Database...")
    
    tester = UniSharkTester()
    success = tester.test_supabase_connection()
    print(f"Database: {'✅' if success else '❌'}")

def main():
    """Main function with menu"""
    if len(sys.argv) > 1:
        test_type = sys.argv[1].lower()
        
        if test_type == "notifications":
            test_notifications()
        elif test_type == "deadline":
            test_deadline_alert()
        elif test_type == "env":
            test_environment()
        elif test_type == "db":
            test_database()
        elif test_type == "all":
            test_environment()
            test_database()
            test_notifications()
            test_deadline_alert()
        else:
            print("❌ Unknown test type")
            print("Usage: python quick_test.py [notifications|deadline|env|db|all]")
    else:
        print("🦈 UniShark Quick Test Menu")
        print("=" * 30)
        print("1. Test Notifications")
        print("2. Test Deadline Alert")
        print("3. Test Environment")
        print("4. Test Database")
        print("5. Test All")
        print("0. Exit")
        
        choice = input("\nEnter your choice (0-5): ")
        
        if choice == "1":
            test_notifications()
        elif choice == "2":
            test_deadline_alert()
        elif choice == "3":
            test_environment()
        elif choice == "4":
            test_database()
        elif choice == "5":
            test_environment()
            test_database()
            test_notifications()
            test_deadline_alert()
        elif choice == "0":
            print("👋 Goodbye!")
        else:
            print("❌ Invalid choice")

if __name__ == "__main__":
    main()