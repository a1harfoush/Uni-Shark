#!/usr/bin/env python3
# /backend/check_and_migrate_db.py
"""
Check if database migration is needed and provide instructions
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from db.supabase_client import get_supabase_client
import logging

def check_database_schema():
    """Check if the required columns and tables exist"""
    print("🔍 Checking database schema...")
    
    try:
        db = get_supabase_client()
        
        # Check if scraping_suspended column exists
        print("   Checking user_credentials table...")
        try:
            response = db.table('user_credentials').select('scraping_suspended').limit(1).execute()
            print("   ✅ scraping_suspended column exists")
            suspension_column_exists = True
        except Exception as e:
            if 'does not exist' in str(e) or '42703' in str(e):
                print("   ❌ scraping_suspended column missing")
                suspension_column_exists = False
            else:
                print(f"   ⚠️  Error checking column: {e}")
                suspension_column_exists = False
        
        # Check if scraping_errors table exists
        print("   Checking scraping_errors table...")
        try:
            response = db.table('scraping_errors').select('id').limit(1).execute()
            print("   ✅ scraping_errors table exists")
            errors_table_exists = True
        except Exception as e:
            if 'does not exist' in str(e) or '42P01' in str(e):
                print("   ❌ scraping_errors table missing")
                errors_table_exists = False
            else:
                print(f"   ⚠️  Error checking table: {e}")
                errors_table_exists = False
        
        # Check if notification_dedup table exists
        print("   Checking notification_dedup table...")
        try:
            response = db.table('notification_dedup').select('id').limit(1).execute()
            print("   ✅ notification_dedup table exists")
            dedup_table_exists = True
        except Exception as e:
            if 'does not exist' in str(e) or '42P01' in str(e):
                print("   ❌ notification_dedup table missing")
                dedup_table_exists = False
            else:
                print(f"   ⚠️  Error checking table: {e}")
                dedup_table_exists = False
        
        return {
            'suspension_column_exists': suspension_column_exists,
            'errors_table_exists': errors_table_exists,
            'dedup_table_exists': dedup_table_exists,
            'migration_needed': not (suspension_column_exists and errors_table_exists and dedup_table_exists)
        }
        
    except Exception as e:
        print(f"   ❌ Database connection failed: {e}")
        return {'migration_needed': True, 'connection_failed': True}

def show_migration_instructions(schema_status):
    """Show instructions for running the migration"""
    print("\n📋 Migration Instructions:")
    print("=" * 50)
    
    if schema_status.get('connection_failed'):
        print("❌ Database connection failed. Please check your Supabase configuration.")
        return
    
    if not schema_status['migration_needed']:
        print("✅ Database schema is up to date! No migration needed.")
        return
    
    print("⚠️  Database migration is required.")
    print("\nMissing components:")
    
    if not schema_status['suspension_column_exists']:
        print("   - scraping_suspended column in user_credentials table")
    if not schema_status['errors_table_exists']:
        print("   - scraping_errors table")
    if not schema_status['dedup_table_exists']:
        print("   - notification_dedup table")
    
    print("\n🚀 To fix this:")
    print("1. Open your Supabase dashboard")
    print("2. Go to the SQL Editor")
    print("3. Copy and paste the contents of:")
    print("   backend/db/quick_migration_fix.sql")
    print("4. Run the SQL commands")
    print("5. Restart your application")
    
    print("\n📄 The migration file contains:")
    print("   - ALTER TABLE commands to add missing columns")
    print("   - CREATE TABLE commands for new tables")
    print("   - CREATE INDEX commands for performance")
    print("   - Verification query to confirm success")
    
    print("\n⚡ Quick fix for immediate use:")
    print("   The error tracker will work in fallback mode until migration is complete.")
    print("   Error tracking will be logged to files instead of database.")

def main():
    print("🔧 DULMS Database Schema Checker")
    print("=" * 40)
    
    schema_status = check_database_schema()
    show_migration_instructions(schema_status)
    
    if schema_status['migration_needed']:
        print(f"\n📁 Migration file location:")
        migration_file = os.path.join(os.path.dirname(__file__), 'db', 'quick_migration_fix.sql')
        print(f"   {migration_file}")
        
        if os.path.exists(migration_file):
            print("   ✅ Migration file exists and is ready to use")
        else:
            print("   ❌ Migration file not found")
    
    return 0 if not schema_status['migration_needed'] else 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)