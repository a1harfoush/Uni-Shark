#!/usr/bin/env python3
"""
Redis connection test script for Heroku deployment
"""
import os
import redis
from datetime import datetime

def test_redis_connection():
    """Test Redis connection and basic operations"""
    
    # Get Redis URL from environment
    redis_url = os.getenv('CELERY_BROKER_URL')
    
    if not redis_url:
        print("❌ CELERY_BROKER_URL environment variable not found")
        return False
    
    print(f"🔗 Testing Redis connection...")
    print(f"📍 Redis URL: {redis_url[:50]}...")
    
    try:
        # Create Redis connection
        r = redis.from_url(redis_url)
        
        # Test basic ping
        print("🏓 Testing ping...")
        ping_result = r.ping()
        print(f"✅ Ping successful: {ping_result}")
        
        # Test set/get operations
        print("📝 Testing set/get operations...")
        test_key = f"test_key_{datetime.now().timestamp()}"
        test_value = "Hello from UniShark!"
        
        # Set a value
        r.set(test_key, test_value, ex=60)  # Expires in 60 seconds
        print(f"✅ Set key '{test_key}' = '{test_value}'")
        
        # Get the value
        retrieved_value = r.get(test_key)
        if retrieved_value:
            retrieved_value = retrieved_value.decode('utf-8')
            print(f"✅ Retrieved value: '{retrieved_value}'")
        
        # Verify values match
        if retrieved_value == test_value:
            print("✅ Set/Get test passed!")
        else:
            print("❌ Set/Get test failed - values don't match")
            return False
        
        # Test Redis info
        print("ℹ️  Redis server info:")
        info = r.info()
        print(f"   Redis version: {info.get('redis_version', 'Unknown')}")
        print(f"   Connected clients: {info.get('connected_clients', 'Unknown')}")
        print(f"   Used memory: {info.get('used_memory_human', 'Unknown')}")
        print(f"   Total commands processed: {info.get('total_commands_processed', 'Unknown')}")
        
        # Clean up test key
        r.delete(test_key)
        print(f"🧹 Cleaned up test key")
        
        print("🎉 All Redis tests passed!")
        return True
        
    except redis.ConnectionError as e:
        print(f"❌ Redis connection error: {e}")
        return False
    except redis.AuthenticationError as e:
        print(f"❌ Redis authentication error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 UniShark Redis Connection Test")
    print("=" * 40)
    
    success = test_redis_connection()
    
    print("=" * 40)
    if success:
        print("✅ Redis connection test completed successfully!")
        exit(0)
    else:
        print("❌ Redis connection test failed!")
        exit(1)