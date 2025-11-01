#!/usr/bin/env python3
"""
Environment setup script for DULMS Watcher
Helps switch between Docker and Heroku configurations
"""

import os
import sys
from pathlib import Path

def update_env_for_docker():
    """Update .env for Docker Compose development"""
    env_path = Path('.env')
    
    if not env_path.exists():
        print("❌ .env file not found!")
        return False
    
    content = env_path.read_text()
    
    # Update Redis URLs for Docker
    content = content.replace(
        'CELERY_BROKER_URL="redis://default:', 
        'CELERY_BROKER_URL="redis://redis:6379/0"  # redis://default:'
    )
    content = content.replace(
        'CELERY_RESULT_BACKEND="redis://default:', 
        'CELERY_RESULT_BACKEND="redis://redis:6379/0"  # redis://default:'
    )
    
    # Set development environment
    if 'ENVIRONMENT=' in content:
        content = content.replace('ENVIRONMENT="production"', 'ENVIRONMENT="development"')
    else:
        content += '\nENVIRONMENT="development"\n'
    
    env_path.write_text(content)
    print("✅ .env configured for Docker development")
    return True

def show_heroku_setup():
    """Show instructions for Heroku setup"""
    print("\n🚀 Heroku Deployment Setup:")
    print("1. Set up Redis Cloud (free): https://redis.com/try-free/")
    print("2. Get your Redis connection string")
    print("3. Run these commands:")
    print("\n   heroku config:set CELERY_BROKER_URL='redis://default:password@host:port/0'")
    print("   heroku config:set CELERY_RESULT_BACKEND='redis://default:password@host:port/0'")
    print("   heroku config:set ENVIRONMENT='production'")
    print("\n📖 See deploy-heroku.md for complete instructions")

def main():
    if len(sys.argv) != 2 or sys.argv[1] not in ['docker', 'heroku']:
        print("Usage: python setup-env.py [docker|heroku]")
        print("  docker  - Configure for local Docker development")
        print("  heroku  - Show Heroku deployment instructions")
        sys.exit(1)
    
    mode = sys.argv[1]
    
    if mode == 'docker':
        update_env_for_docker()
    elif mode == 'heroku':
        show_heroku_setup()

if __name__ == '__main__':
    main()