"""
Locust Load Testing for CloudAppDev Microservices Architecture
================================================================

This load test file is designed for the microservices architecture with server-side proxy routes.
All requests go through the Next.js frontend proxy routes (http://localhost:3000).

Architecture:
- Next.js Frontend with Proxy Routes on port 3000 (/api/*)
  ↓
- API Gateway (Nginx) on port 8000
  ↓
- Microservices (User, Itinerary, Social, Travel-Info)

Proxy Routes:
- /api/auth/register - User registration
- /api/auth/login - User login
- /api/user - Get user data
- /api/itineraries - Itinerary CRUD
- /api/comments - Social comments
- /api/likes - Social likes

Requirements for Milestone 2 Performance Testing:

5.1 Periodic Workload (2 scenarios):
- Scenario A: 100 concurrent users (peak) / 10 users (low demand) - cycling pattern
- Scenario B: 1000 concurrent users (peak) / 20 users (low demand) - cycling pattern

5.2 Once-in-a-lifetime Workload:
- Start with 10 base users, constantly add new users at a given growth rate
- Determine: no degradation threshold, with degradation threshold, failure threshold

Usage:
------
# Standard load test (use with PowerShell script for specific scenarios)
# IMPORTANT: Use http://localhost:3000 (Next.js frontend), NOT http://localhost:8000
locust -f locust/locustfile_microservices.py --host=http://localhost:3000

# Periodic workload - Scenario A (100/10 users) - uses PeriodicShapeA
LOCUST_SHAPE=periodic_a locust -f locust/locustfile_microservices.py --host=http://localhost:3000 --headless

# Periodic workload - Scenario B (1000/20 users) - uses PeriodicShapeB
LOCUST_SHAPE=periodic_b locust -f locust/locustfile_microservices.py --host=http://localhost:3000 --headless

# Once-in-a-lifetime (continuous growth from 10 users)
LOCUST_SHAPE=lifetime locust -f locust/locustfile_microservices.py --host=http://localhost:3000 --headless

# Manual mode (no shape, use --users and --spawn-rate)
locust -f locust/locustfile_microservices.py --host=http://localhost:3000 --users 100 --spawn-rate 10
"""

from locust import HttpUser, task, between, events, TaskSet, LoadTestShape
from datetime import datetime, timedelta
import random
import string
import time
from urllib.parse import quote
import json
import os
import math

# ============================================================================
# LOAD TEST SHAPES FOR DIFFERENT SCENARIOS
# ============================================================================

class PeriodicShapeA(LoadTestShape):
    """
    Periodic Workload - Scenario A: 100 peak / 10 low demand
    
    Pattern: Low(10) → Ramp up → Peak(100) → Ramp down → Low(10) → repeat
    Total duration: ~15 minutes with 2 full cycles
    """
    
    # Configuration
    peak_users = 100
    low_users = 10
    cycle_duration = 420  # 7 minutes per cycle
    ramp_time = 60  # 1 minute to ramp up/down
    peak_duration = 180  # 3 minutes at peak
    low_duration = 120  # 2 minutes at low
    total_cycles = 2
    
    def tick(self):
        run_time = self.get_run_time()
        total_duration = self.cycle_duration * self.total_cycles
        
        if run_time > total_duration:
            return None  # Stop test
        
        # Calculate position in cycle
        cycle_position = run_time % self.cycle_duration
        
        if cycle_position < self.low_duration:
            # Low demand phase
            return (self.low_users, self.low_users)  # (users, spawn_rate)
        
        elif cycle_position < self.low_duration + self.ramp_time:
            # Ramping up to peak
            progress = (cycle_position - self.low_duration) / self.ramp_time
            users = int(self.low_users + (self.peak_users - self.low_users) * progress)
            return (users, 10)  # spawn rate of 10/s
        
        elif cycle_position < self.low_duration + self.ramp_time + self.peak_duration:
            # Peak phase
            return (self.peak_users, self.peak_users)
        
        elif cycle_position < self.low_duration + self.ramp_time + self.peak_duration + self.ramp_time:
            # Ramping down to low
            ramp_down_start = self.low_duration + self.ramp_time + self.peak_duration
            progress = (cycle_position - ramp_down_start) / self.ramp_time
            users = int(self.peak_users - (self.peak_users - self.low_users) * progress)
            return (users, 10)
        
        else:
            # Back to low (end of cycle)
            return (self.low_users, self.low_users)


class PeriodicShapeB(LoadTestShape):
    """
    Periodic Workload - Scenario B: 1000 peak / 20 low demand
    
    Pattern: Low(20) → Ramp up → Peak(1000) → Ramp down → Low(20) → repeat
    Total duration: ~30 minutes with 2 full cycles
    """
    
    # Configuration
    peak_users = 1000
    low_users = 20
    cycle_duration = 900  # 15 minutes per cycle
    ramp_time = 120  # 2 minutes to ramp up/down (slower for more users)
    peak_duration = 420  # 7 minutes at peak
    low_duration = 240  # 4 minutes at low
    total_cycles = 2
    
    def tick(self):
        run_time = self.get_run_time()
        total_duration = self.cycle_duration * self.total_cycles
        
        if run_time > total_duration:
            return None  # Stop test
        
        # Calculate position in cycle
        cycle_position = run_time % self.cycle_duration
        
        if cycle_position < self.low_duration:
            # Low demand phase
            return (self.low_users, self.low_users)
        
        elif cycle_position < self.low_duration + self.ramp_time:
            # Ramping up to peak
            progress = (cycle_position - self.low_duration) / self.ramp_time
            users = int(self.low_users + (self.peak_users - self.low_users) * progress)
            return (users, 50)  # spawn rate of 50/s for faster ramp
        
        elif cycle_position < self.low_duration + self.ramp_time + self.peak_duration:
            # Peak phase
            return (self.peak_users, self.peak_users)
        
        elif cycle_position < self.low_duration + self.ramp_time + self.peak_duration + self.ramp_time:
            # Ramping down to low
            ramp_down_start = self.low_duration + self.ramp_time + self.peak_duration
            progress = (cycle_position - ramp_down_start) / self.ramp_time
            users = int(self.peak_users - (self.peak_users - self.low_users) * progress)
            return (users, 50)
        
        else:
            # Back to low (end of cycle)
            return (self.low_users, self.low_users)


class OnceInALifetimeShape(LoadTestShape):
    """
    Once-in-a-Lifetime Workload - Continuous Growth
    
    Pattern: Start with 10 users, constantly add users at a steady rate
    Goal: Find the breaking point - when the application fails
    
    Growth rate: Configurable users per minute (default: 20 users/minute)
    Max duration: 30 minutes (will reach ~610 users with default rate)
    
    The test records metrics to determine:
    - Without degradation: response time p95 < 500ms, error rate < 1%
    - With degradation: response time p95 < 2000ms, error rate < 5%
    - Failure: response time p95 > 5000ms or error rate > 10%
    """
    
    # Configuration - can be overridden via environment variables
    base_users = 10
    growth_rate = float(os.getenv('GROWTH_RATE', '20'))  # users per minute
    max_users = int(os.getenv('MAX_USERS', '3000'))  # safety limit
    max_duration = int(os.getenv('MAX_DURATION', '1800'))  # 30 minutes default
    spawn_rate = 10  # users per second when adding
    
    def tick(self):
        run_time = self.get_run_time()
        
        if run_time > self.max_duration:
            return None  # Stop test after max duration
        
        # Calculate target users: base + (growth_rate * minutes elapsed)
        minutes_elapsed = run_time / 60
        target_users = int(self.base_users + (self.growth_rate * minutes_elapsed))
        
        # Cap at max users
        target_users = min(target_users, self.max_users)
        
        return (target_users, self.spawn_rate)


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def random_email():
    """Generate random test email"""
    return ''.join(random.choices(string.ascii_lowercase, k=8)) + "@loadtest.com"

def random_name():
    """Generate random username"""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))

def safe_json_parse(response, context=""):
    """Safely parse JSON response with error handling"""
    try:
        if response.status_code >= 500:
            return None
        if not response.text:
            return None
        return response.json()
    except Exception as e:
        return None

def get_random_dates():
    """Generate random start and end dates for trips"""
    start_offset = random.randint(1, 180)
    stay_length = random.randint(3, 14)
    start_date = datetime.now() + timedelta(days=start_offset)
    end_date = start_date + timedelta(days=stay_length)
    return start_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d")

# ============================================================================
# SHARED STATE
# ============================================================================

class SharedState:
    """Shared state across all users to cache available IDs"""
    itinerary_ids = []
    user_ids = []
    last_fetch = 0
    fetch_interval = 30  # Refresh every 30 seconds

shared_state = SharedState()

# ============================================================================
# BASE USER CLASS
# ============================================================================

class BaseAPIUser(HttpUser):
    """Base class with common functionality for all user types"""
    abstract = True
    user_id = None
    test_email = None
    test_password = "LoadTest123!"
    max_retries = 3
    available_itinerary_ids = []
    
    def register_user(self):
        """Register a new user via proxy route"""
        retry_count = 0
        while self.user_id is None and retry_count < self.max_retries:
            self.test_email = random_email()
            name = random_name()

            try:
                # POST /api/auth/register - Server-side proxy to User Service
                response = self.client.post("/api/auth/register", json={
                    "name": name,
                    "email": self.test_email,
                    "password": self.test_password
                }, timeout=10, name="User Registration")
                
                if response.status_code == 201:
                    data = safe_json_parse(response, "Registration")
                    if data and data.get("id"):
                        self.user_id = data.get("id")
                        shared_state.user_ids.append(self.user_id)
                        return True
                    else:
                        retry_count += 1
                        time.sleep(2)
                else:
                    retry_count += 1
                    time.sleep(2)
            except Exception as e:
                retry_count += 1
                time.sleep(2)
        
        return self.user_id is not None
    
    def _fetch_available_itineraries(self):
        """Fetch list of available itinerary IDs"""
        current_time = time.time()

        # Use cached IDs if recently fetched
        if shared_state.itinerary_ids and (current_time - shared_state.last_fetch) < shared_state.fetch_interval:
            self.available_itinerary_ids = shared_state.itinerary_ids.copy()
            return

        try:
            # GET /api/itineraries - Server-side proxy to Itinerary Service
            with self.client.get("/api/itineraries?page=1&limit=100",
                                catch_response=True,
                                name="Fetch Available Itineraries") as response:
                if response.status_code == 200:
                    data = safe_json_parse(response, "Fetch Itineraries")
                    if data and isinstance(data, list):
                        ids = [item['id'] for item in data if 'id' in item]
                        if ids:
                            self.available_itinerary_ids = ids
                            shared_state.itinerary_ids = ids
                            shared_state.last_fetch = current_time
                    response.success()
                else:
                    response.failure(f"Failed to fetch: {response.status_code}")
        except Exception as e:
            pass
    
    def get_random_itinerary_id(self):
        """Get a random itinerary ID from available ones"""
        if not self.available_itinerary_ids:
            self._fetch_available_itineraries()
        
        if self.available_itinerary_ids:
            return random.choice(self.available_itinerary_ids)
        return None

# ============================================================================
# NEW USER JOURNEY (20% of traffic)
# ============================================================================

class NewUserJourney(TaskSet):
    """
    Represents a new user exploring the platform for the first time.
    Typical flow: Register → Browse → Search → View Details → Like → Create First Itinerary
    """
    
    def on_start(self):
        """Initialize new user"""
        if not self.user.register_user():
            self.interrupt()
        self.user._fetch_available_itineraries()
    
    @task(3)
    def browse_popular_itineraries(self):
        """Browse popular itineraries (most common new user action)"""
        if not self.user.user_id:
            return

        page = random.randint(1, 3)
        limit = random.choice([10, 20])

        # GET /api/itineraries?page=X&limit=Y - Server-side proxy
        response = self.client.get(
            f"/api/itineraries?page={page}&limit={limit}",
            name="Journey: Browse Popular"
        )
        
        # Update available IDs from response
        if response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list):
                    self.user.available_itinerary_ids = [item['id'] for item in data if 'id' in item]
            except:
                pass
        
        time.sleep(random.uniform(1, 3))  # User reads content
    
    @task(2)
    def search_destinations(self):
        """Search for specific destinations"""
        destinations = ["Paris", "Tokyo", "New York", "London", "Bali", "Barcelona", "Rome"]
        search_term = random.choice(destinations)

        # GET /api/itineraries?search=X - Server-side proxy
        self.client.get(
            f"/api/itineraries?search={quote(search_term)}",
            name="Journey: Search Destination"
        )
        time.sleep(random.uniform(0.5, 2))
    
    @task(2)
    def view_itinerary_details(self):
        """View detailed itinerary information"""
        if not self.user.user_id:
            return

        itinerary_id = self.user.get_random_itinerary_id()
        if itinerary_id:
            # GET /api/itineraries/:id - Server-side proxy
            response = self.client.get(
                f"/api/itineraries/{itinerary_id}",
                name="Journey: View Details"
            )
            time.sleep(random.uniform(1, 3))  # User reads itinerary

            # Like the itinerary (50% chance)
            if response.status_code == 200 and random.random() < 0.5:
                # POST /api/likes - Server-side proxy
                self.client.post("/api/likes", json={
                    "userId": self.user.user_id,
                    "itineraryId": itinerary_id
                }, name="Journey: Like Itinerary")
    
    @task(1)
    def create_first_itinerary(self):
        """Create their first itinerary"""
        if not self.user.user_id:
            return

        destinations = [
            "Paris, France", "Tokyo, Japan", "Barcelona, Spain",
            "Bali, Indonesia", "New Zealand", "Swiss Alps"
        ]
        destination = random.choice(destinations)
        start_date, end_date = get_random_dates()

        # POST /api/itineraries - Server-side proxy
        response = self.client.post("/api/itineraries", json={
            "title": f"My First Trip to {destination.split(',')[0]}",
            "destination": destination,
            "start_date": start_date,
            "short_desc": f"Excited to visit {destination}!",
            "detail_desc": f"Planning my first adventure to {destination}. Can't wait!",
            "userId": self.user.user_id,
            "locations": [
                {
                    "name": f"Stop 1 in {destination.split(',')[0]}",
                    "start_date": start_date,
                    "end_date": end_date,
                    "short_desc": "Starting the journey!",
                    "images": []
                }
            ]
        }, name="Journey: Create First Itinerary")
        
        # Add new itinerary to available IDs
        if response.status_code == 201:
            try:
                data = response.json()
                if data and 'id' in data:
                    new_id = data['id']
                    if new_id not in self.user.available_itinerary_ids:
                        self.user.available_itinerary_ids.append(new_id)
                        shared_state.itinerary_ids.append(new_id)
            except:
                pass
        
        time.sleep(random.uniform(1, 2))
    
    @task(1)
    def view_and_comment(self):
        """View and comment on other itineraries"""
        if not self.user.user_id:
            return

        itinerary_id = self.user.get_random_itinerary_id()
        if itinerary_id:
            # GET /api/comments - Server-side proxy
            self.client.get(
                f"/api/comments?itineraryId={itinerary_id}",
                name="Journey: View Comments"
            )
            time.sleep(random.uniform(0.5, 1.5))

            # Add a comment (50% chance)
            if random.random() < 0.5:
                comments = [
                    "This looks incredible!",
                    "Adding this to my bucket list!",
                    "Great photos!",
                    "Thanks for sharing!",
                    "Very inspiring!"
                ]

                # POST /api/comments - Server-side proxy
                self.client.post("/api/comments", json={
                    "userId": self.user.user_id,
                    "itineraryId": itinerary_id,
                    "text": random.choice(comments)
                }, name="Journey: Add Comment")

# ============================================================================
# ACTIVE USER JOURNEY (30% of traffic)
# ============================================================================

class ActiveUserJourney(TaskSet):
    """
    Represents an active user who regularly uses the platform.
    Typical flow: Login → Check Own Itineraries → Browse → Like → Comment → Create New
    """
    
    def on_start(self):
        """Initialize active user"""
        if not self.user.register_user():
            self.interrupt()
        self.user._fetch_available_itineraries()
    
    @task(4)
    def browse_and_engage(self):
        """Browse feed and engage with content"""
        if not self.user.user_id:
            return

        page = random.randint(1, 3)
        # GET /api/itineraries - Server-side proxy
        response = self.client.get(
            f"/api/itineraries?page={page}&limit=20",
            name="Journey: Browse Feed"
        )

        # Update available IDs
        if response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list):
                    self.user.available_itinerary_ids = [item['id'] for item in data if 'id' in item]
            except:
                pass

        time.sleep(random.uniform(0.5, 2))

        # Like 1-2 itineraries
        num_likes = random.randint(1, 2)
        for _ in range(num_likes):
            itinerary_id = self.user.get_random_itinerary_id()
            if itinerary_id:
                # POST /api/likes - Server-side proxy
                self.client.post("/api/likes", json={
                    "userId": self.user.user_id,
                    "itineraryId": itinerary_id
                }, name="Journey: Like")
                time.sleep(random.uniform(0.2, 0.8))
    
    @task(3)
    def check_my_itineraries(self):
        """Check their own itineraries"""
        if not self.user.user_id:
            return

        # GET /api/itineraries?userId=X - Server-side proxy
        self.client.get(
            f"/api/itineraries?userId={self.user.user_id}",
            name="Journey: My Itineraries"
        )
    
    @task(2)
    def create_new_itinerary(self):
        """Add a new itinerary"""
        if not self.user.user_id:
            return

        destinations = [
            "Tokyo, Japan", "Paris, France", "Rome, Italy",
            "New York, USA", "London, UK", "Sydney, Australia"
        ]

        destination = random.choice(destinations)
        start_date, end_date = get_random_dates()

        # Active users create more detailed itineraries with multiple locations
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

        # POST /api/itineraries - Server-side proxy
        response = self.client.post("/api/itineraries", json={
            "title": f"Trip to {destination.split(',')[0]}",
            "destination": destination,
            "start_date": start_date,
            "short_desc": "Another amazing adventure!",
            "detail_desc": "Planning an incredible journey!",
            "userId": self.user.user_id,
            "locations": locations
        }, name="Journey: Create Itinerary")
        
        # Add new itinerary to available IDs
        if response.status_code == 201:
            try:
                data = response.json()
                if data and 'id' in data:
                    new_id = data['id']
                    if new_id not in self.user.available_itinerary_ids:
                        self.user.available_itinerary_ids.append(new_id)
                        shared_state.itinerary_ids.append(new_id)
            except:
                pass
    
    @task(3)
    def view_and_comment(self):
        """View itineraries and leave comments"""
        if not self.user.user_id:
            return

        itinerary_id = self.user.get_random_itinerary_id()
        if itinerary_id:
            # GET /api/itineraries/:id - Server-side proxy
            response = self.client.get(
                f"/api/itineraries/{itinerary_id}",
                name="Journey: View Detail"
            )
            time.sleep(random.uniform(1, 2))

            # GET /api/comments - Server-side proxy
            self.client.get(
                f"/api/comments?itineraryId={itinerary_id}",
                name="Journey: View Comments"
            )
            time.sleep(random.uniform(0.5, 1))

            # Add a comment (60% chance for active users)
            if random.random() < 0.6:
                comments = [
                    "Beautiful destination!",
                    "Love this place!",
                    "Great itinerary!",
                    "Thanks for sharing!",
                    "Amazing photos!"
                ]

                # POST /api/comments - Server-side proxy
                self.client.post("/api/comments", json={
                    "userId": self.user.user_id,
                    "itineraryId": itinerary_id,
                    "text": random.choice(comments)
                }, name="Journey: Add Comment")

# ============================================================================
# CASUAL BROWSER JOURNEY (50% of traffic)
# ============================================================================

class CasualBrowserJourney(TaskSet):
    """
    Represents a casual visitor who browses without necessarily engaging deeply.
    Typical flow: Quick Browse → Search → View Popular → Maybe Register
    """
    
    def on_start(self):
        """Casual browsers start without registration"""
        self.user.user_id = None
        self.is_registered = False
        self.user._fetch_available_itineraries()
    
    @task(5)
    def quick_browse(self):
        """Quick browse through itineraries"""
        page = random.randint(1, 3)

        # GET /api/itineraries - Server-side proxy
        response = self.client.get(
            f"/api/itineraries?page={page}&limit=10",
            name="Journey: Quick Browse"
        )

        # Update available IDs
        if response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list):
                    self.user.available_itinerary_ids = [item['id'] for item in data if 'id' in item]
            except:
                pass

        time.sleep(random.uniform(0.5, 1.5))
    
    @task(3)
    def search_destinations(self):
        """Search for destinations"""
        popular_destinations = [
            "Paris", "Tokyo", "New York", "London", "Bali",
            "Barcelona", "Rome", "Dubai", "Sydney"
        ]

        search_term = random.choice(popular_destinations)
        # GET /api/itineraries?search=X - Server-side proxy
        self.client.get(
            f"/api/itineraries?search={quote(search_term)}",
            name="Journey: Search"
        )
        time.sleep(random.uniform(0.5, 1.5))
    
    @task(2)
    def view_popular_itineraries(self):
        """View popular itineraries"""
        itinerary_id = self.user.get_random_itinerary_id()
        if itinerary_id:
            # GET /api/itineraries/:id - Server-side proxy
            self.client.get(
                f"/api/itineraries/{itinerary_id}",
                name="Journey: View Popular"
            )
            time.sleep(random.uniform(1, 3))
    
    @task(1)
    def maybe_register(self):
        """20% chance to convert to registered user"""
        if not self.is_registered and random.random() < 0.2:
            if self.user.register_user():
                self.is_registered = True

# ============================================================================
# USER WORKLOAD CLASSES (Traffic Distribution)
# ============================================================================

class NewUserWorkload(BaseAPIUser):
    """New users exploring the platform (20% of traffic)"""
    wait_time = between(1, 4)
    tasks = [NewUserJourney]
    weight = 2

class ActiveUserWorkload(BaseAPIUser):
    """Active users regularly using platform (30% of traffic)"""
    wait_time = between(1, 3)
    tasks = [ActiveUserJourney]
    weight = 3

class CasualBrowserWorkload(BaseAPIUser):
    """Casual browsers (50% of traffic)"""
    wait_time = between(0.5, 2)
    tasks = [CasualBrowserJourney]
    weight = 5

# ============================================================================
# DYNAMIC SHAPE SELECTION
# ============================================================================

# Select shape based on environment variable
SHAPE_ENV = os.getenv('LOCUST_SHAPE', '').lower()

if SHAPE_ENV == 'periodic_a':
    class TestShape(PeriodicShapeA):
        """Active shape for Periodic Scenario A"""
        pass
elif SHAPE_ENV == 'periodic_b':
    class TestShape(PeriodicShapeB):
        """Active shape for Periodic Scenario B"""
        pass
elif SHAPE_ENV == 'lifetime':
    class TestShape(OnceInALifetimeShape):
        """Active shape for Once-in-a-Lifetime test"""
        pass
# If no shape specified, Locust uses manual --users and --spawn-rate

# ============================================================================
# REPORTING HOOKS
# ============================================================================

# Track metrics over time for threshold analysis
metrics_history = []

@events.request.add_listener
def on_request(request_type, name, response_time, response_length, response, context, exception, **kwargs):
    """Track each request for threshold analysis"""
    metrics_history.append({
        'timestamp': time.time(),
        'response_time': response_time,
        'success': exception is None and (response is None or response.status_code < 400)
    })
    
    # Keep only last 5 minutes of data
    cutoff = time.time() - 300
    while metrics_history and metrics_history[0]['timestamp'] < cutoff:
        metrics_history.pop(0)

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Called when the load test starts"""
    shape_name = SHAPE_ENV if SHAPE_ENV else "Manual (--users/--spawn-rate)"
    
    print("\n" + "="*80)
    print("MICROSERVICES LOAD TEST STARTED")
    print("="*80)
    print(f"Target Host: {environment.host}")
    print(f"Test Shape: {shape_name}")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Architecture:")
    print(f"  - User Service: /api/v1/users")
    print(f"  - Itinerary Service: /api/v1/itineraries")
    print(f"  - Social Service: /api/v1/social/comments, /api/v1/social/likes")
    
    if SHAPE_ENV == 'periodic_a':
        print(f"\nPeriodic Scenario A: 100 peak / 10 low users")
        print(f"  - 2 full cycles, ~14 minutes total")
    elif SHAPE_ENV == 'periodic_b':
        print(f"\nPeriodic Scenario B: 1000 peak / 20 low users")
        print(f"  - 2 full cycles, ~30 minutes total")
    elif SHAPE_ENV == 'lifetime':
        growth_rate = os.getenv('GROWTH_RATE', '20')
        max_users = os.getenv('MAX_USERS', '3000')
        print(f"\nOnce-in-a-Lifetime: Continuous growth")
        print(f"  - Base: 10 users, Growth: {growth_rate} users/min")
        print(f"  - Max: {max_users} users, Duration: 30 min")
    
    print("="*80 + "\n")

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Called when the load test stops - generate summary report"""
    print("\n" + "="*80)
    print("MICROSERVICES LOAD TEST COMPLETED")
    print("="*80)
    
    stats = environment.stats
    
    print(f"\nSummary Statistics:")
    print(f"   Total Requests: {stats.total.num_requests}")
    print(f"   Total Failures: {stats.total.num_failures}")
    print(f"   Average Response Time: {stats.total.avg_response_time:.2f}ms")
    print(f"   Min Response Time: {stats.total.min_response_time:.2f}ms")
    print(f"   Max Response Time: {stats.total.max_response_time:.2f}ms")
    print(f"   Requests/sec: {stats.total.total_rps:.2f}")
    
    if stats.total.num_requests > 0:
        failure_rate = (stats.total.num_failures / stats.total.num_requests) * 100
        print(f"   Failure Rate: {failure_rate:.2f}%")
    
    print(f"\nResponse Time Percentiles:")
    print(f"   50th percentile: {stats.total.get_response_time_percentile(0.50):.2f}ms")
    print(f"   75th percentile: {stats.total.get_response_time_percentile(0.75):.2f}ms")
    print(f"   90th percentile: {stats.total.get_response_time_percentile(0.90):.2f}ms")
    print(f"   95th percentile: {stats.total.get_response_time_percentile(0.95):.2f}ms")
    print(f"   99th percentile: {stats.total.get_response_time_percentile(0.99):.2f}ms")
    
    # Threshold Analysis for Once-in-a-Lifetime
    if SHAPE_ENV == 'lifetime':
        p95 = stats.total.get_response_time_percentile(0.95)
        failure_rate = (stats.total.num_failures / max(stats.total.num_requests, 1)) * 100
        
        print(f"\n--- THRESHOLD ANALYSIS ---")
        if p95 < 500 and failure_rate < 1:
            print(f"   Status: WITHOUT DEGRADATION")
            print(f"   (p95 < 500ms, error rate < 1%)")
        elif p95 < 2000 and failure_rate < 5:
            print(f"   Status: WITH DEGRADATION")
            print(f"   (p95 < 2000ms, error rate < 5%)")
        else:
            print(f"   Status: FAILURE THRESHOLD REACHED")
            print(f"   (p95 >= 2000ms or error rate >= 5%)")
    
    print("\n" + "="*80 + "\n")
    
    # Save detailed report
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_dir = "locust/reports"
    os.makedirs(report_dir, exist_ok=True)
    
    shape_suffix = f"_{SHAPE_ENV}" if SHAPE_ENV else "_manual"
    report_file = f"{report_dir}/microservices_test{shape_suffix}_{timestamp}.txt"
    
    with open(report_file, "w") as f:
        f.write("="*80 + "\n")
        f.write("MICROSERVICES LOAD TEST REPORT\n")
        f.write("="*80 + "\n")
        f.write(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Target Host: {environment.host}\n")
        f.write(f"Test Shape: {SHAPE_ENV if SHAPE_ENV else 'Manual'}\n")
        f.write(f"Architecture: Microservices with API Gateway\n\n")
        
        f.write("SUMMARY STATISTICS\n")
        f.write("-"*80 + "\n")
        f.write(f"Total Requests: {stats.total.num_requests}\n")
        f.write(f"Total Failures: {stats.total.num_failures}\n")
        f.write(f"Average Response Time: {stats.total.avg_response_time:.2f}ms\n")
        f.write(f"Min Response Time: {stats.total.min_response_time:.2f}ms\n")
        f.write(f"Max Response Time: {stats.total.max_response_time:.2f}ms\n")
        f.write(f"Requests/sec: {stats.total.total_rps:.2f}\n")
        
        if stats.total.num_requests > 0:
            failure_rate = (stats.total.num_failures / stats.total.num_requests) * 100
            f.write(f"Failure Rate: {failure_rate:.2f}%\n")
        
        f.write("\nRESPONSE TIME PERCENTILES\n")
        f.write("-"*80 + "\n")
        f.write(f"50th percentile: {stats.total.get_response_time_percentile(0.50):.2f}ms\n")
        f.write(f"75th percentile: {stats.total.get_response_time_percentile(0.75):.2f}ms\n")
        f.write(f"90th percentile: {stats.total.get_response_time_percentile(0.90):.2f}ms\n")
        f.write(f"95th percentile: {stats.total.get_response_time_percentile(0.95):.2f}ms\n")
        f.write(f"99th percentile: {stats.total.get_response_time_percentile(0.99):.2f}ms\n")
        
        f.write("\nDETAILED ENDPOINT STATISTICS\n")
        f.write("-"*80 + "\n")
        for stat in stats.entries.values():
            if stat.num_requests > 0:
                f.write(f"\nEndpoint: {stat.name}\n")
                f.write(f"  Requests: {stat.num_requests}\n")
                f.write(f"  Failures: {stat.num_failures}\n")
                f.write(f"  Avg Response Time: {stat.avg_response_time:.2f}ms\n")
                f.write(f"  Min/Max: {stat.min_response_time:.2f}ms / {stat.max_response_time:.2f}ms\n")
        
        # Threshold analysis for report
        if SHAPE_ENV == 'lifetime':
            p95 = stats.total.get_response_time_percentile(0.95)
            failure_rate = (stats.total.num_failures / max(stats.total.num_requests, 1)) * 100
            
            f.write("\n\nONCE-IN-A-LIFETIME THRESHOLD ANALYSIS\n")
            f.write("="*80 + "\n")
            f.write(f"P95 Response Time: {p95:.2f}ms\n")
            f.write(f"Failure Rate: {failure_rate:.2f}%\n\n")
            
            f.write("Thresholds:\n")
            f.write("  - Without Degradation: p95 < 500ms, error rate < 1%\n")
            f.write("  - With Degradation: p95 < 2000ms, error rate < 5%\n")
            f.write("  - Failure: p95 >= 2000ms or error rate >= 5%\n\n")
            
            if p95 < 500 and failure_rate < 1:
                f.write("RESULT: System performed WITHOUT DEGRADATION\n")
            elif p95 < 2000 and failure_rate < 5:
                f.write("RESULT: System performed WITH DEGRADATION\n")
            else:
                f.write("RESULT: System reached FAILURE THRESHOLD\n")
    
    print(f"Detailed report saved to: {report_file}")
