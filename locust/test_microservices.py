#!/usr/bin/env python3
"""
Quick test script to verify microservices are accessible and responding correctly.
Run this before starting load tests to ensure infrastructure is ready.

Note: Tests run against the Next.js frontend proxy routes (port 3000), not the API Gateway directly.
"""

import requests
import sys
import time

# Configure target - use Next.js frontend with proxy routes
GATEWAY_URL = "http://localhost:3000"

def test_endpoint(method, url, json=None, expected_status=None, name=""):
    """Test a single endpoint"""
    try:
        if method == "GET":
            response = requests.get(url, timeout=5)
        elif method == "POST":
            response = requests.post(url, json=json, timeout=5)
        else:
            print(f"  ✗ Unsupported method: {method}")
            return False
        
        status_ok = True
        if expected_status and response.status_code != expected_status:
            status_ok = False
        
        status_emoji = "✓" if status_ok else "✗"
        print(f"  {status_emoji} {name}: {response.status_code}")
        
        if response.status_code >= 500:
            print(f"     Error: {response.text[:100]}")
        
        return status_ok and response.status_code < 500
        
    except requests.exceptions.ConnectionError:
        print(f"  ✗ {name}: Connection refused - service not running?")
        return False
    except requests.exceptions.Timeout:
        print(f"  ✗ {name}: Timeout - service too slow?")
        return False
    except Exception as e:
        print(f"  ✗ {name}: {str(e)}")
        return False

def main():
    print("="*70)
    print("  CloudAppDev Microservices Health Check")
    print("="*70)
    print(f"\nTarget: {GATEWAY_URL}\n")

    all_passed = True

    # Test 1: API Gateway Health
    print("1. Testing API Gateway...")
    if not test_endpoint("GET", f"{GATEWAY_URL}/health", name="Health Check", expected_status=200):
        all_passed = False
        print("\n⚠️  API Gateway is not responding. Start services with:")
        print("   docker-compose -f docker-compose.microservices.yml up -d\n")
        sys.exit(1)

    # Test 2: User Service
    print("\n2. Testing User Service...")
    if not test_endpoint("GET", f"{GATEWAY_URL}/api/user", name="Get User"):
        all_passed = False

    # Test user registration (will fail if user exists, that's ok)
    test_user = {
        "name": "LoadTestUser",
        "email": f"loadtest_{int(time.time())}@test.com",
        "password": "TestPass123!"
    }
    if test_endpoint("POST", f"{GATEWAY_URL}/api/auth/register", json=test_user, name="Register User"):
        print("     ℹ User registration successful (or user exists)")

    # Test 3: Itinerary Service
    print("\n3. Testing Itinerary Service...")
    if not test_endpoint("GET", f"{GATEWAY_URL}/api/itineraries?page=1&limit=10", name="List Itineraries"):
        all_passed = False
        print("     ⚠️  Itinerary service may not be seeded. Run:")
        print("        npm run seed:microservices")

    # Test 4: Social Service - Comments
    print("\n4. Testing Social Service (Comments)...")
    if not test_endpoint("GET", f"{GATEWAY_URL}/api/comments?itineraryId=1", name="Get Comments"):
        all_passed = False

    # Test 5: Social Service - Likes
    print("\n5. Testing Social Service (Likes)...")
    if not test_endpoint("GET", f"{GATEWAY_URL}/api/likes", name="Get Likes"):
        all_passed = False
    
    # Summary
    print("\n" + "="*70)
    if all_passed:
        print("✓ All services are responding correctly!")
        print("\nReady for load testing. Run:")
        print("  locust -f locust/locustfile_microservices.py --host=" + GATEWAY_URL)
        print("\nOr run automated tests (uses " + GATEWAY_URL + " by default):")
        print('  .\\locust\\run_milestone2_tests.ps1')
    else:
        print("✗ Some services failed health checks.")
        print("\nTroubleshooting steps:")
        print("  1. Check services are running:")
        print("     docker-compose -f docker-compose.microservices.yml ps")
        print("  2. Check service logs:")
        print("     docker logs cloudappdev_user_service")
        print("     docker logs cloudappdev_itinerary_service")
        print("     docker logs cloudappdev_social_service")
        print("  3. Check Next.js frontend logs:")
        print("     docker logs cloudappdev_frontend")
        print("  4. Verify databases are seeded:")
        print("     npm run seed:microservices")
    print("="*70 + "\n")

    sys.exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()
