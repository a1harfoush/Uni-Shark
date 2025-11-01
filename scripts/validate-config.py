#!/usr/bin/env python3
"""
Configuration validation script for DULMS Watcher
Checks if Docker and Heroku configurations are properly aligned
"""

import os
import yaml
from pathlib import Path

def check_docker_config():
    """Validate Docker configuration"""
    print("🐳 Checking Docker configuration...")
    
    # Check docker-compose.yml
    compose_path = Path('docker-compose.yml')
    if not compose_path.exists():
        print("❌ docker-compose.yml not found")
        return False
    
    with open(compose_path) as f:
        compose = yaml.safe_load(f)
    
    # Validate services
    required_services = ['redis', 'api', 'worker', 'scheduler']
    services = compose.get('services', {})
    
    for service in required_services:
        if service not in services:
            print(f"❌ Missing service: {service}")
            return False
    
    print("✅ Docker Compose configuration valid")
    return True

def check_heroku_config():
    """Validate Heroku configuration"""
    print("🚀 Checking Heroku configuration...")
    
    # Check heroku.yml
    heroku_path = Path('heroku.yml')
    if not heroku_path.exists():
        print("❌ heroku.yml not found")
        return False
    
    with open(heroku_path) as f:
        heroku_config = yaml.safe_load(f)
    
    # Validate structure
    if 'build' not in heroku_config or 'run' not in heroku_config:
        print("❌ Invalid heroku.yml structure")
        return False
    
    # Check if both web and worker are defined
    build_config = heroku_config['build'].get('docker', {})
    run_config = heroku_config['run']
    
    if 'web' not in build_config or 'worker' not in build_config:
        print("❌ Missing web or worker in build config")
        return False
    
    if 'web' not in run_config or 'worker' not in run_config:
        print("❌ Missing web or worker in run config")
        return False
    
    # Check if worker has -B flag for embedded scheduler
    worker_cmd = run_config['worker']
    if '-B' not in worker_cmd:
        print("❌ Worker missing -B flag for embedded scheduler")
        return False
    
    print("✅ Heroku configuration valid")
    return True

def check_env_config():
    """Validate environment configuration"""
    print("⚙️  Checking environment configuration...")
    
    env_path = Path('.env')
    if not env_path.exists():
        print("❌ .env file not found")
        return False
    
    # Check required variables
    required_vars = [
        'DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_KEY',
        'CELERY_BROKER_URL', 'CELERY_RESULT_BACKEND',
        'SECRET_KEY', 'ENVIRONMENT'
    ]
    
    with open(env_path) as f:
        env_content = f.read()
    
    missing_vars = []
    for var in required_vars:
        if f'{var}=' not in env_content:
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        return False
    
    print("✅ Environment configuration valid")
    return True

def check_dockerfile():
    """Validate Dockerfile"""
    print("🐋 Checking Dockerfile...")
    
    dockerfile_path = Path('backend/Dockerfile')
    if not dockerfile_path.exists():
        print("❌ backend/Dockerfile not found")
        return False
    
    with open(dockerfile_path) as f:
        dockerfile_content = f.read()
    
    # Check for Chrome installation
    if 'google-chrome-stable' not in dockerfile_content:
        print("❌ Chrome installation not found in Dockerfile")
        return False
    
    # Check for chromedriver
    if 'chromedriver' not in dockerfile_content:
        print("❌ ChromeDriver installation not found in Dockerfile")
        return False
    
    # Check for cleanup commands (Heroku optimization)
    if 'apt-get clean' not in dockerfile_content:
        print("⚠️  Consider adding apt-get clean for smaller image size")
    
    print("✅ Dockerfile configuration valid")
    return True

def main():
    print("🔍 Validating DULMS Watcher configuration...\n")
    
    checks = [
        check_env_config,
        check_dockerfile,
        check_docker_config,
        check_heroku_config
    ]
    
    all_passed = True
    for check in checks:
        if not check():
            all_passed = False
        print()
    
    if all_passed:
        print("🎉 All configurations are valid!")
        print("\n📋 Next steps:")
        print("   • For Docker: docker-compose up")
        print("   • For Heroku: See deploy-heroku.md")
    else:
        print("❌ Some configurations need attention")
        return 1
    
    return 0

if __name__ == '__main__':
    exit(main())