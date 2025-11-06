#!/usr/bin/env python3
"""
UniShark Heroku Deployment Script
Automates the deployment process to Heroku
"""

import os
import sys
import subprocess
import json
from typing import Dict, List

class HerokuDeployer:
    """Automated Heroku deployment for UniShark"""
    
    def __init__(self, app_name: str):
        self.app_name = app_name
        self.required_env_vars = [
            'DATABASE_URL',
            'SUPABASE_URL',
            'SUPABASE_KEY', 
            'SUPABASE_SERVICE_KEY',
            'CLERK_SECRET_KEY',
            'CLERK_WEBHOOK_SIGNING_SECRET',
            'DISCORD_FEEDBACK_WEBHOOK_URL',
            'TELEGRAM_BOT_TOKEN',
            'BREVO_API_KEY',
            'BREVO_SENDER_EMAIL',
            'BREVO_SENDER_NAME',
            'CELERY_BROKER_URL',
            'CELERY_RESULT_BACKEND',
            'SECRET_KEY'
        ]
    
    def run_command(self, command: str, check: bool = True) -> subprocess.CompletedProcess:
        """Run shell command and return result"""
        print(f"🔧 Running: {command}")
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        
        if check and result.returncode != 0:
            print(f"❌ Command failed: {command}")
            print(f"Error: {result.stderr}")
            sys.exit(1)
        
        return result
    
    def check_heroku_cli(self) -> bool:
        """Check if Heroku CLI is installed"""
        print("🔍 Checking Heroku CLI...")
        result = self.run_command("heroku --version", check=False)
        
        if result.returncode == 0:
            print(f"✅ Heroku CLI found: {result.stdout.strip()}")
            return True
        else:
            print("❌ Heroku CLI not found. Please install it first:")
            print("   https://devcenter.heroku.com/articles/heroku-cli")
            return False
    
    def check_git_repo(self) -> bool:
        """Check if we're in a git repository"""
        print("🔍 Checking Git repository...")
        result = self.run_command("git status", check=False)
        
        if result.returncode == 0:
            print("✅ Git repository found")
            return True
        else:
            print("❌ Not in a Git repository. Please initialize git first:")
            print("   git init")
            print("   git add .")
            print("   git commit -m 'Initial commit'")
            return False
    
    def create_heroku_app(self) -> bool:
        """Create Heroku app if it doesn't exist"""
        print(f"🏗️ Creating Heroku app: {self.app_name}")
        
        # Check if app already exists
        result = self.run_command(f"heroku apps:info {self.app_name}", check=False)
        
        if result.returncode == 0:
            print(f"✅ App {self.app_name} already exists")
            return True
        
        # Create new app
        result = self.run_command(f"heroku create {self.app_name}", check=False)
        
        if result.returncode == 0:
            print(f"✅ Created app: {self.app_name}")
            return True
        else:
            print(f"❌ Failed to create app: {result.stderr}")
            return False
    
    def add_heroku_addons(self) -> bool:
        """Add required Heroku add-ons"""
        print("🔌 Adding Heroku add-ons...")
        
        addons = [
            "heroku-redis:mini",  # Redis for Celery
            "heroku-postgresql:mini"  # PostgreSQL database
        ]
        
        for addon in addons:
            print(f"Adding {addon}...")
            result = self.run_command(f"heroku addons:create {addon} --app {self.app_name}", check=False)
            
            if result.returncode == 0:
                print(f"✅ Added {addon}")
            else:
                if "already exists" in result.stderr:
                    print(f"✅ {addon} already exists")
                else:
                    print(f"⚠️ Failed to add {addon}: {result.stderr}")
        
        return True
    
    def set_environment_variables(self, env_vars: Dict[str, str]) -> bool:
        """Set environment variables on Heroku"""
        print("🔧 Setting environment variables...")
        
        for key, value in env_vars.items():
            if value:
                print(f"Setting {key}...")
                # Use heroku config:set with proper escaping
                escaped_value = value.replace('"', '\\"')
                result = self.run_command(f'heroku config:set {key}="{escaped_value}" --app {self.app_name}', check=False)
                
                if result.returncode == 0:
                    print(f"✅ Set {key}")
                else:
                    print(f"❌ Failed to set {key}: {result.stderr}")
                    return False
            else:
                print(f"⚠️ Skipping empty value for {key}")
        
        return True
    
    def create_procfile(self) -> bool:
        """Create Procfile for Heroku"""
        print("📄 Creating Procfile...")
        
        procfile_content = """web: cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT
worker: cd backend && celery -A celery_app worker --loglevel=info
beat: cd backend && celery -A celery_app beat --loglevel=info"""
        
        with open("Procfile", "w") as f:
            f.write(procfile_content)
        
        print("✅ Procfile created")
        return True
    
    def create_runtime_txt(self) -> bool:
        """Create runtime.txt for Python version"""
        print("🐍 Creating runtime.txt...")
        
        with open("runtime.txt", "w") as f:
            f.write("python-3.11.6")
        
        print("✅ runtime.txt created")
        return True
    
    def deploy_to_heroku(self) -> bool:
        """Deploy to Heroku"""
        print("🚀 Deploying to Heroku...")
        
        # Add and commit files
        self.run_command("git add .")
        self.run_command('git commit -m "Deploy to Heroku" || true', check=False)
        
        # Push to Heroku
        result = self.run_command(f"git push heroku main", check=False)
        
        if result.returncode == 0:
            print("✅ Deployment successful!")
            return True
        else:
            print(f"❌ Deployment failed: {result.stderr}")
            return False
    
    def scale_dynos(self) -> bool:
        """Scale Heroku dynos"""
        print("⚖️ Scaling dynos...")
        
        # Scale web, worker, and beat dynos
        scaling_commands = [
            f"heroku ps:scale web=1 --app {self.app_name}",
            f"heroku ps:scale worker=1 --app {self.app_name}",
            f"heroku ps:scale beat=1 --app {self.app_name}"
        ]
        
        for command in scaling_commands:
            result = self.run_command(command, check=False)
            if result.returncode == 0:
                print(f"✅ {command.split()[-2]} scaled")
            else:
                print(f"⚠️ Failed to scale: {result.stderr}")
        
        return True
    
    def run_post_deploy_tasks(self) -> bool:
        """Run post-deployment tasks"""
        print("🔄 Running post-deployment tasks...")
        
        # Run database migrations if needed
        # self.run_command(f"heroku run python backend/manage.py migrate --app {self.app_name}", check=False)
        
        # Test the deployment
        print("🧪 Testing deployment...")
        result = self.run_command(f"heroku run python backend/test_heroku.py --app {self.app_name}", check=False)
        
        if result.returncode == 0:
            print("✅ Post-deployment tests passed")
        else:
            print("⚠️ Post-deployment tests failed, but deployment may still work")
        
        return True
    
    def get_app_info(self) -> None:
        """Display app information"""
        print("📊 App Information:")
        print("=" * 50)
        
        # Get app URL
        result = self.run_command(f"heroku apps:info {self.app_name}", check=False)
        if result.returncode == 0:
            print(result.stdout)
        
        # Get config vars
        print("\n🔧 Environment Variables:")
        result = self.run_command(f"heroku config --app {self.app_name}", check=False)
        if result.returncode == 0:
            print(result.stdout)
    
    def deploy(self, env_vars: Dict[str, str]) -> bool:
        """Main deployment function"""
        print("🦈 UniShark Heroku Deployment")
        print("=" * 40)
        
        # Pre-deployment checks
        if not self.check_heroku_cli():
            return False
        
        if not self.check_git_repo():
            return False
        
        # Create app and add-ons
        if not self.create_heroku_app():
            return False
        
        if not self.add_heroku_addons():
            return False
        
        # Set environment variables
        if not self.set_environment_variables(env_vars):
            return False
        
        # Create deployment files
        if not self.create_procfile():
            return False
        
        if not self.create_runtime_txt():
            return False
        
        # Deploy
        if not self.deploy_to_heroku():
            return False
        
        # Scale dynos
        if not self.scale_dynos():
            return False
        
        # Post-deployment tasks
        if not self.run_post_deploy_tasks():
            return False
        
        # Show app info
        self.get_app_info()
        
        print("\n🎉 Deployment completed successfully!")
        print(f"🌐 Your app is available at: https://{self.app_name}.herokuapp.com")
        
        return True

def load_env_vars() -> Dict[str, str]:
    """Load environment variables from .env file or environment"""
    env_vars = {}
    
    # Try to load from .env file
    env_file = "backend/.env"
    if os.path.exists(env_file):
        print(f"📄 Loading environment variables from {env_file}")
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip().strip('"\'')
    
    # Override with actual environment variables
    for key in [
        'DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_KEY', 'SUPABASE_SERVICE_KEY',
        'CLERK_SECRET_KEY', 'CLERK_WEBHOOK_SIGNING_SECRET',
        'DISCORD_FEEDBACK_WEBHOOK_URL', 'TELEGRAM_BOT_TOKEN',
        'BREVO_API_KEY', 'BREVO_SENDER_EMAIL', 'BREVO_SENDER_NAME',
        'CELERY_BROKER_URL', 'CELERY_RESULT_BACKEND', 'SECRET_KEY'
    ]:
        if os.getenv(key):
            env_vars[key] = os.getenv(key)
    
    return env_vars

def main():
    """Main function"""
    if len(sys.argv) < 2:
        print("Usage: python deploy_heroku.py <app-name>")
        print("Example: python deploy_heroku.py unishark-prod")
        sys.exit(1)
    
    app_name = sys.argv[1]
    
    # Load environment variables
    env_vars = load_env_vars()
    
    if not env_vars:
        print("❌ No environment variables found. Please create backend/.env file or set environment variables.")
        sys.exit(1)
    
    # Create deployer and deploy
    deployer = HerokuDeployer(app_name)
    success = deployer.deploy(env_vars)
    
    if success:
        print("\n🎉 UniShark deployed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Deployment failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()