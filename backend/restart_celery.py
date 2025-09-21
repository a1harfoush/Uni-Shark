#!/usr/bin/env python3
"""
Script to help restart Celery services with the new unified notification system
"""

import subprocess
import sys
import time
import signal
import os

def find_and_kill_celery_processes():
    """Find and kill existing Celery processes"""
    print("🔍 Looking for existing Celery processes...")
    
    try:
        # Find Celery processes
        result = subprocess.run(['pgrep', '-f', 'celery'], capture_output=True, text=True)
        
        if result.stdout.strip():
            pids = result.stdout.strip().split('\n')
            print(f"📋 Found {len(pids)} Celery processes:")
            
            for pid in pids:
                try:
                    # Get process info
                    proc_info = subprocess.run(['ps', '-p', pid, '-o', 'pid,cmd'], 
                                             capture_output=True, text=True)
                    print(f"   PID {pid}: {proc_info.stdout.split(maxsplit=2)[-1] if proc_info.stdout else 'Unknown'}")
                    
                    # Kill the process
                    os.kill(int(pid), signal.SIGTERM)
                    print(f"   ✅ Terminated PID {pid}")
                    
                except (ValueError, ProcessLookupError):
                    print(f"   ⚠️  PID {pid} already terminated or invalid")
                except Exception as e:
                    print(f"   ❌ Error terminating PID {pid}: {e}")
            
            # Wait a moment for processes to terminate
            print("⏳ Waiting for processes to terminate...")
            time.sleep(3)
            
        else:
            print("✅ No existing Celery processes found")
            
    except FileNotFoundError:
        print("⚠️  'pgrep' command not found. Manually check for Celery processes.")
    except Exception as e:
        print(f"❌ Error finding Celery processes: {e}")

def start_celery_worker():
    """Start Celery worker"""
    print("\n🚀 Starting Celery worker...")
    
    try:
        # Start worker in background
        worker_cmd = ['celery', '-A', 'celery_app', 'worker', '--loglevel=info']
        
        print(f"📋 Command: {' '.join(worker_cmd)}")
        print("💡 Starting worker in background...")
        
        # Start the process
        worker_process = subprocess.Popen(worker_cmd)
        
        # Give it a moment to start
        time.sleep(2)
        
        # Check if it's still running
        if worker_process.poll() is None:
            print(f"✅ Celery worker started successfully (PID: {worker_process.pid})")
            return worker_process
        else:
            print("❌ Celery worker failed to start")
            return None
            
    except FileNotFoundError:
        print("❌ 'celery' command not found. Make sure Celery is installed.")
        return None
    except Exception as e:
        print(f"❌ Error starting Celery worker: {e}")
        return None

def start_celery_beat():
    """Start Celery beat scheduler"""
    print("\n⏰ Starting Celery beat scheduler...")
    
    try:
        # Start beat in background
        beat_cmd = ['celery', '-A', 'celery_app', 'beat', '--loglevel=info']
        
        print(f"📋 Command: {' '.join(beat_cmd)}")
        print("💡 Starting beat scheduler in background...")
        
        # Start the process
        beat_process = subprocess.Popen(beat_cmd)
        
        # Give it a moment to start
        time.sleep(2)
        
        # Check if it's still running
        if beat_process.poll() is None:
            print(f"✅ Celery beat started successfully (PID: {beat_process.pid})")
            return beat_process
        else:
            print("❌ Celery beat failed to start")
            return None
            
    except FileNotFoundError:
        print("❌ 'celery' command not found. Make sure Celery is installed.")
        return None
    except Exception as e:
        print(f"❌ Error starting Celery beat: {e}")
        return None

def check_celery_status():
    """Check if Celery services are running"""
    print("\n🔍 Checking Celery status...")
    
    try:
        # Check worker
        result = subprocess.run(['celery', '-A', 'celery_app', 'inspect', 'active'], 
                              capture_output=True, text=True, timeout=5)
        
        if result.returncode == 0:
            print("✅ Celery worker is responsive")
        else:
            print("❌ Celery worker is not responsive")
        
        # Check beat (this is harder to check directly)
        print("💡 Celery beat status should be visible in the beat process logs")
        
    except subprocess.TimeoutExpired:
        print("⚠️  Celery inspect timed out")
    except Exception as e:
        print(f"⚠️  Error checking Celery status: {e}")

def main():
    """Main function"""
    print("🔄 CELERY RESTART TOOL FOR UNIFIED NOTIFICATIONS")
    print("="*60)
    
    print("⚠️  This will restart your Celery services to load the new unified notification system.")
    print("💡 Make sure you're in the correct directory with celery_app.py")
    
    response = input("\nDo you want to proceed? (y/N): ").strip().lower()
    
    if response not in ['y', 'yes']:
        print("🚫 Operation cancelled.")
        return
    
    # Step 1: Kill existing processes
    find_and_kill_celery_processes()
    
    # Step 2: Start worker
    worker_process = start_celery_worker()
    
    # Step 3: Start beat
    beat_process = start_celery_beat()
    
    # Step 4: Check status
    if worker_process and beat_process:
        time.sleep(3)  # Give services time to fully start
        check_celery_status()
        
        print("\n" + "="*60)
        print("🎉 CELERY SERVICES RESTARTED")
        print("="*60)
        print("✅ Celery worker and beat are running with the new unified notification system")
        print("\n📋 Next steps:")
        print("1. Monitor the logs to ensure services are working correctly")
        print("2. Run: python test_unified_notifications_all_users.py")
        print("3. Test the new notification system")
        
        print(f"\n🔧 Process IDs:")
        print(f"   Worker PID: {worker_process.pid}")
        print(f"   Beat PID: {beat_process.pid}")
        
        print("\n💡 To stop services later:")
        print(f"   kill {worker_process.pid} {beat_process.pid}")
        
    else:
        print("\n❌ Failed to start one or more Celery services")
        print("💡 Try starting them manually:")
        print("   celery -A celery_app worker --loglevel=info")
        print("   celery -A celery_app beat --loglevel=info")

if __name__ == "__main__":
    main()