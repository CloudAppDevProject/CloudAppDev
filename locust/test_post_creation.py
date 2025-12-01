"""
Diagnostic Test: Verify POST itinerary creation tasks actually work
This script simulates what the load test does to verify tasks create data
"""

import requests
import json
import random
import time
from datetime import datetime, timedelta

BASE_URL = "http://localhost:3000"

def get_random_dates():
    """Generate random start and end dates"""
    start = datetime.now() + timedelta(days=random.randint(1, 30))
    end = start + timedelta(days=random.randint(1, 14))
    return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d")

def register_user():
    """Register a new user"""
    email = f"testuser{int(time.time() * 1000)}@test.com"
    response = requests.post(f"{BASE_URL}/api/auth/register", json={
        "name": "Test User",
        "email": email,
        "password": "TestPassword123!"
    })

    if response.status_code == 201:
        data = response.json()
        if "user" in data and "id" in data["user"]:
            user_id = data["user"]["id"]
            print(f"[OK] User registered: ID {user_id}")
            return user_id

    print(f"[FAIL] Registration failed: {response.status_code}")
    return None

def get_itineraries():
    """Fetch available itineraries"""
    response = requests.get(f"{BASE_URL}/api/itineraries?page=1&limit=100")

    if response.status_code == 200:
        data = response.json()
        itineraries = data.get('data', []) if isinstance(data, dict) else data
        print(f"[OK] Fetched {len(itineraries)} itineraries")
        return [item['id'] for item in itineraries if 'id' in item]

    print(f"[FAIL] Fetch failed: {response.status_code}")
    return []

def create_first_itinerary(user_id):
    """Simulate: NewUserJourney.create_first_itinerary()"""
    destinations = [
        "Paris, France", "Tokyo, Japan", "Barcelona, Spain",
        "Bali, Indonesia", "New Zealand", "Swiss Alps"
    ]
    destination = random.choice(destinations)
    start_date, end_date = get_random_dates()

    response = requests.post(f"{BASE_URL}/api/itineraries", json={
        "title": f"My First Trip to {destination.split(',')[0]}",
        "destination": destination,
        "start_date": start_date,
        "short_desc": f"Excited to visit {destination}!",
        "detail_desc": f"Planning my first adventure to {destination}. Can't wait!",
        "userId": user_id,
        "locations": [{
            "name": f"Stop 1 in {destination.split(',')[0]}",
            "start_date": start_date,
            "end_date": end_date,
            "short_desc": "Starting the journey!",
            "images": []
        }]
    })

    if response.status_code == 201:
        data = response.json()
        itinerary_id = data.get('id')
        print(f"  [OK] create_first_itinerary: Created itinerary ID {itinerary_id}")
        return itinerary_id
    else:
        print(f"  [FAIL] create_first_itinerary failed: {response.status_code}")
        print(f"    Response: {response.text[:200]}")
        return None

def create_new_itinerary(user_id):
    """Simulate: ActiveUserJourney.create_new_itinerary()"""
    destinations = [
        "Tokyo, Japan", "Paris, France", "Rome, Italy",
        "New York, USA", "London, UK", "Sydney, Australia"
    ]
    destination = random.choice(destinations)
    start_date, end_date = get_random_dates()

    num_locations = random.randint(2, 4)
    locations = []
    for i in range(num_locations):
        locations.append({
            "name": f"Stop {i+1} - {destination.split(',')[0]}",
            "start_date": start_date,
            "end_date": end_date,
            "short_desc": f"Exploring location {i+1}",
            "images": []
        })

    response = requests.post(f"{BASE_URL}/api/itineraries", json={
        "title": f"Trip to {destination.split(',')[0]}",
        "destination": destination,
        "start_date": start_date,
        "short_desc": "Another amazing adventure!",
        "detail_desc": "Planning an incredible journey!",
        "userId": user_id,
        "locations": locations
    })

    if response.status_code == 201:
        data = response.json()
        itinerary_id = data.get('id')
        print(f"  [OK] create_new_itinerary: Created itinerary ID {itinerary_id}")
        return itinerary_id
    else:
        print(f"  [FAIL] create_new_itinerary failed: {response.status_code}")
        print(f"    Response: {response.text[:200]}")
        return None

def add_like(user_id, itinerary_id):
    """Simulate: Browse tasks + like"""
    response = requests.post(f"{BASE_URL}/api/likes", json={
        "userId": user_id,
        "itineraryId": itinerary_id
    })

    if response.status_code == 200:
        print(f"  [OK] Like added to itinerary {itinerary_id}")
        return True
    else:
        print(f"  [FAIL] Like failed: {response.status_code}")
        return False

def add_comment(user_id, itinerary_id):
    """Simulate: Browse tasks + comment"""
    response = requests.post(f"{BASE_URL}/api/comments", json={
        "userId": user_id,
        "itineraryId": itinerary_id,
        "text": "This looks amazing!"
    })

    if response.status_code == 200 or response.status_code == 201:
        print(f"  [OK] Comment added to itinerary {itinerary_id}")
        return True
    else:
        print(f"  [FAIL] Comment failed: {response.status_code}")
        return False

def view_itinerary_details(itinerary_id):
    """Simulate: Browse tasks trying to GET itinerary by ID (FIXED ROUTE)"""
    response = requests.get(f"{BASE_URL}/api/itineraries?id={itinerary_id}")

    if response.status_code == 200:
        print(f"  [OK] View details: Got itinerary {itinerary_id}")
        return True
    else:
        print(f"  [FAIL] View details failed: {response.status_code} (Should be 200)")
        return False

def main():
    print("\n" + "="*70)
    print("LOAD TEST DIAGNOSTIC: Verify POST Creation Tasks Work")
    print("="*70 + "\n")

    # Test 1: NewUserJourney workflow
    print("TEST 1: NewUserJourney (Register -> Browse -> Create First Itinerary)")
    print("-" * 70)
    user1_id = register_user()
    if not user1_id:
        print("Failed to register user 1\n")
        return

    # Get itineraries to browse
    itinerary_ids = get_itineraries()

    # Simulate create_first_itinerary task
    print("Simulating: create_first_itinerary task...")
    new_id_1 = create_first_itinerary(user1_id)

    if new_id_1:
        # Try to view the details (fixed route)
        print("Simulating: view_details task (fixed route)...")
        view_itinerary_details(new_id_1)

        # Try to like it
        print("Simulating: like task...")
        add_like(user1_id, new_id_1)

        # Try to comment
        print("Simulating: comment task...")
        add_comment(user1_id, new_id_1)

    print()

    # Test 2: ActiveUserJourney workflow
    print("TEST 2: ActiveUserJourney (Register -> Create New Itinerary)")
    print("-" * 70)
    user2_id = register_user()
    if not user2_id:
        print("Failed to register user 2\n")
        return

    print("Simulating: create_new_itinerary task...")
    new_id_2 = create_new_itinerary(user2_id)

    if new_id_2:
        print("Simulating: like task...")
        add_like(user2_id, new_id_2)

    print()

    # Test 3: Multiple iterations
    print("TEST 3: Rapid Fire - 10 Create Operations")
    print("-" * 70)
    user3_id = register_user()
    if not user3_id:
        print("Failed to register user 3\n")
        return

    created_ids = []
    for i in range(5):
        print(f"\nIteration {i+1}:")
        new_id = create_first_itinerary(user3_id)
        if new_id:
            created_ids.append(new_id)

        new_id = create_new_itinerary(user3_id)
        if new_id:
            created_ids.append(new_id)

    print()
    print("="*70)
    print("SUMMARY")
    print("="*70)
    print(f"Total itineraries created: {len(created_ids)}")
    print(f"Itinerary IDs: {created_ids}")

    if len(created_ids) >= 10:
        print("\n[OK] SUCCESS: POST creation tasks work correctly!")
        print("  The load test should create data when run with fixed routes.")
    else:
        print(f"\n[FAIL] ISSUE: Expected 10+ creations, got {len(created_ids)}")
        print("  Check the API logs for errors.")

if __name__ == "__main__":
    main()
