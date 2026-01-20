"""
Locust Load Testing for CloudAppDev Microservices Architecture
================================================================

SIMPLIFIED VERSION: 5-Minute Scaling Test

This load test file is designed for quick smoke testing and load profile validation.
Ramps up from 10 to 500 users over 4 minutes, then maintains peak for 1 minute.
Total test duration: 5 minutes.

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

Quick Test Profile:
- Duration: 5 minutes
- Users: 10 → 500 (4-minute ramp)
- Peak: 500 users for 1 minute
- Spawn Rate: 100 users/second (aggressive scaling)

Usage:
------
# Standard load test with default simple 5-minute profile
locust -f locust/locustfile_microservices.py --host=http://localhost:3000

# Headless mode for automated testing
locust -f locust/locustfile_microservices.py --host=http://localhost:3000 --headless
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

class SimpleScalingShape(LoadTestShape):
    """
    Firebase-Optimized Load Test - 1000 Users with Rate Limiting
    
    Pattern: Starts with 10 users, ramps up to 1000 users over 5 minutes, then peak for 2 minutes
    Total duration: 7 minutes
    Spawn rate: 3 users per second (Firebase rate-limit friendly)
    
    Optimized for Firebase authentication bottlenecks (400 reg/min limit)
    """
    
    # Configuration
    base_users = 10
    peak_users = 1000
    ramp_duration = 300  # 5 minutes for Firebase-friendly ramp up
    peak_duration = 120  # 2 minutes at peak
    spawn_rate = 3       # 3 users per second (~180 users/min - below Firebase limits)
    
    def tick(self):
        run_time = self.get_run_time()
        total_duration = self.ramp_duration + self.peak_duration
        
        if run_time > total_duration:
            return None  # Stop test after 5 minutes
        
        if run_time < self.ramp_duration:
            # Ramp up phase (4 minutes)
            progress = run_time / self.ramp_duration
            users = int(self.base_users + (self.peak_users - self.base_users) * progress)
            return (users, self.spawn_rate)
        else:
            # Peak phase (1 minute)
            return (self.peak_users, self.spawn_rate)


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
    test_password = "LoadTest123"
    max_retries = 3
    available_itinerary_ids = []
    access_token = None
    
    # Increase timeouts for local Docker environment
    wait_time = between(2, 5)  # Longer wait times to reduce connection pressure
    
    # Connection pool settings for Firebase rate limits
    connection_timeout = 60  # 60 second timeout for connections
    network_timeout = 60.0
    
    def register_user(self):
        """Register a new user via proxy route with Firebase-friendly delays"""
        retry_count = 0
        while self.user_id is None and retry_count < self.max_retries:
            self.test_email = random_email()
            name = random_name()
            
            # Add Firebase-friendly staggered delay to prevent rate limiting
            time.sleep(random.uniform(1.5, 3.5))

            try:
                # POST /api/auth/register - Server-side proxy to User Service
                with self.client.post(
                    "/api/auth/register",
                    json={
                        "name": name,
                        "email": self.test_email,
                        "password": self.test_password
                    },
                    headers={"Content-Type": "application/json"},
                    timeout=60,
                    name="User Registration",
                    catch_response=True
                ) as response:
                    # Accept both 200 and 201 as success (backend may vary)
                    if response.status_code in [200, 201]:
                        try:
                            data = response.json()
                            # Extract JWT token from response
                            if "access_token" in data:
                                self.access_token = data["access_token"]
                            
                            # Handle nested response structure: {access_token: "...", user: {id: ...}}
                            user_id = None
                            if "user" in data and isinstance(data.get("user"), dict):
                                user_id = data["user"].get("id")
                            elif "id" in data:
                                user_id = data.get("id")

                            if user_id:
                                self.user_id = user_id
                                shared_state.user_ids.append(self.user_id)
                                response.success()
                                return True
                            else:
                                response.failure(f"No user ID in response: {data}")
                                retry_count += 1
                                time.sleep(2)
                        except ValueError as e:
                            response.failure(f"JSON parse error: {str(e)}")
                            retry_count += 1
                            time.sleep(2)
                    else:
                        response.failure(f"Registration failed with status {response.status_code}: {response.text}")
                        retry_count += 1
                        time.sleep(random.uniform(3, 6))  # Longer backoff for Firebase
            except Exception as e:
                print(f"Registration exception: {str(e)}")
                retry_count += 1
                time.sleep(random.uniform(3, 6))  # Longer backoff for Firebase
        
        return self.user_id is not None
    
    def get_auth_headers(self):
        """Get authorization headers with JWT token"""
        headers = {"Content-Type": "application/json"}
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        return headers
    
    def _fetch_available_itineraries(self):
        """Fetch list of available itinerary IDs with robust retry logic"""
        current_time = time.time()

        # Use cached IDs if recently fetched
        if shared_state.itinerary_ids and (current_time - shared_state.last_fetch) < shared_state.fetch_interval:
            self.available_itinerary_ids = shared_state.itinerary_ids.copy()
            return

        # Retry fetching with exponential backoff
        max_fetch_attempts = 5
        backoff_delay = 1
        
        for attempt in range(max_fetch_attempts):
            try:
                # GET /api/itineraries - Server-side proxy to Itinerary Service
                with self.client.get("/api/itineraries?page=1&limit=100",
                                    headers=self.get_auth_headers(),
                                    timeout=45,
                                    catch_response=True,
                                    name="Fetch Available Itineraries") as response:
                    if response.status_code == 200:
                        try:
                            data = response.json()
                            # Handle both list response and paginated response {data: [...], pagination: {...}}
                            itineraries = data
                            if isinstance(data, dict) and 'data' in data:
                                itineraries = data['data']

                            if isinstance(itineraries, list) and len(itineraries) > 0:
                                ids = [item['id'] for item in itineraries if 'id' in item]
                                if ids:
                                    self.available_itinerary_ids = ids
                                    shared_state.itinerary_ids = ids
                                    shared_state.last_fetch = current_time
                                    response.success()
                                    return
                            response.failure(f"No valid itineraries in response")
                        except ValueError as e:
                            response.failure(f"JSON parse error: {str(e)}")
                    else:
                        response.failure(f"Failed to fetch: {response.status_code}")
                        
                    # Exponential backoff before retry
                    if attempt < max_fetch_attempts - 1:
                        time.sleep(backoff_delay)
                        backoff_delay *= 2
                        
            except Exception as e:
                print(f"Fetch itineraries error (attempt {attempt+1}/{max_fetch_attempts}): {str(e)}")
                if attempt < max_fetch_attempts - 1:
                    time.sleep(backoff_delay)
                    backoff_delay *= 2
                continue
    
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
    Typical flow: Register -> Browse -> Search -> View Details -> Like -> Create First Itinerary
    """
    
    def on_start(self):
        """Initialize new user - with retry and better error handling"""
        max_init_attempts = 3
        for attempt in range(max_init_attempts):
            if self.user.register_user():
                # Wait a bit after successful registration before fetching
                time.sleep(random.uniform(0.5, 1.5))
                self.user._fetch_available_itineraries()
                return
            else:
                if attempt < max_init_attempts - 1:
                    print(f"[NewUserJourney] Registration failed, retry {attempt + 1}/{max_init_attempts}")
                    time.sleep(2)
        
        # If registration failed after all attempts, interrupt this user
        print(f"[NewUserJourney] Registration failed after {max_init_attempts} attempts, interrupting user")
        self.interrupt()
    
    
    def browse_popular_itineraries(self):
        """Browse popular itineraries (most common new user action)"""
        if not self.user.user_id:
            return

        page = random.randint(1, 3)
        limit = random.choice([10, 20])

        # GET /api/itineraries?page=X&limit=Y - Server-side proxy
        response = self.client.get(
            f"/api/itineraries?page={page}&limit={limit}",
            headers=self.user.get_auth_headers(),
            name="Journey: Browse Popular"
        )

        # Update available IDs from response
        if response.status_code == 200:
            try:
                data = response.json()
                # Handle both list and paginated {data: [...], pagination: {...}} responses
                itineraries = data
                if isinstance(data, dict) and 'data' in data:
                    itineraries = data['data']
                if isinstance(itineraries, list):
                    self.user.available_itinerary_ids = [item['id'] for item in itineraries if 'id' in item]
            except:
                pass
        
        time.sleep(random.uniform(1, 3))  # User reads content
    
    
    def search_destinations(self):
        """Search for specific destinations"""
        destinations = ["Paris", "Tokyo", "New York", "London", "Bali", "Barcelona", "Rome"]
        search_term = random.choice(destinations)

        # GET /api/itineraries?search=X - Server-side proxy
        self.client.get(
            f"/api/itineraries?search={quote(search_term)}",
            headers=self.user.get_auth_headers(),
            name="Journey: Search Destination"
        )
        time.sleep(random.uniform(0.5, 2))
    
    
    def view_itinerary_details(self):
        """View detailed itinerary information"""
        if not self.user.user_id:
            return

        itinerary_id = self.user.get_random_itinerary_id()
        if itinerary_id:
            # GET /api/itineraries/:id - Server-side proxy
            response = self.client.get(
                f"/api/itineraries?id={itinerary_id}",
                headers=self.user.get_auth_headers(),
                name="Journey: View Details"
            )
            time.sleep(random.uniform(1, 3))  # User reads itinerary

            # Like the itinerary (50% chance)
            if response.status_code == 200 and random.random() < 0.5:
                # POST /api/likes - Server-side proxy
                self.client.post(
                    "/api/likes",
                    json={
                        "userId": self.user.user_id,
                        "itineraryId": itinerary_id
                    },
                    headers={"Content-Type": "application/json"},
                    name="Journey: Like Itinerary"
                )
    
    
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
        }, headers=self.user.get_auth_headers(), name="Journey: Create First Itinerary")
        
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
    
    
    def view_and_comment(self):
        """View and comment on other itineraries"""
        if not self.user.user_id:
            return

        itinerary_id = self.user.get_random_itinerary_id()
        if itinerary_id:
            # GET /api/comments - Server-side proxy
            self.client.get(
                f"/api/comments?itineraryId={itinerary_id}",
                headers=self.user.get_auth_headers(),
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
                self.client.post(
                    "/api/comments",
                    json={
                        "userId": self.user.user_id,
                        "itineraryId": itinerary_id,
                        "text": random.choice(comments)
                    },
                    headers={"Content-Type": "application/json"},
                    name="Journey: Add Comment"
                )

# ============================================================================
# ACTIVE USER JOURNEY (30% of traffic)
# ============================================================================

class ActiveUserJourney(TaskSet):
    """
    Represents an active user who regularly uses the platform.
    Typical flow: Login -> Check Own Itineraries -> Browse -> Like -> Comment -> Create New
    """
    
    def on_start(self):
        """Initialize active user - with retry and better error handling"""
        max_init_attempts = 3
        for attempt in range(max_init_attempts):
            if self.user.register_user():
                # Wait a bit after successful registration before fetching
                time.sleep(random.uniform(0.5, 1.5))
                self.user._fetch_available_itineraries()
                return
            else:
                if attempt < max_init_attempts - 1:
                    print(f"[ActiveUserJourney] Registration failed, retry {attempt + 1}/{max_init_attempts}")
                    time.sleep(2)
        
        # If registration failed after all attempts, interrupt this user
        print(f"[ActiveUserJourney] Registration failed after {max_init_attempts} attempts, interrupting user")
        self.interrupt()
    
    
    def browse_and_engage(self):
        """Browse feed and engage with content"""
        if not self.user.user_id:
            return

        page = random.randint(1, 3)
        # GET /api/itineraries - Server-side proxy
        response = self.client.get(
            f"/api/itineraries?page={page}&limit=20",
            headers=self.user.get_auth_headers(),
            name="Journey: Browse Feed"
        )

        # Update available IDs
        if response.status_code == 200:
            try:
                data = response.json()
                # Handle both list and paginated {data: [...], pagination: {...}} responses
                itineraries = data
                if isinstance(data, dict) and 'data' in data:
                    itineraries = data['data']
                if isinstance(itineraries, list):
                    self.user.available_itinerary_ids = [item['id'] for item in itineraries if 'id' in item]
            except:
                pass

        time.sleep(random.uniform(0.5, 2))

        # Like 1-2 itineraries
        num_likes = random.randint(1, 2)
        for _ in range(num_likes):
            itinerary_id = self.user.get_random_itinerary_id()
            if itinerary_id:
                # POST /api/likes - Server-side proxy
                self.client.post(
                    "/api/likes",
                    json={
                        "userId": self.user.user_id,
                        "itineraryId": itinerary_id
                    },
                    headers={"Content-Type": "application/json"},
                    name="Journey: Like"
                )
                time.sleep(random.uniform(0.2, 0.8))
    
    
    def check_my_itineraries(self):
        """Check their own itineraries"""
        if not self.user.user_id:
            return

        # GET /api/itineraries?userId=X - Server-side proxy
        self.client.get(
            f"/api/itineraries?userId={self.user.user_id}",
            headers=self.user.get_auth_headers(),
            name="Journey: My Itineraries"
        )
    
    
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
        }, headers=self.user.get_auth_headers(), name="Journey: Create Itinerary")
        
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
    
    
    def view_and_comment(self):
        """View itineraries and leave comments"""
        if not self.user.user_id:
            return

        itinerary_id = self.user.get_random_itinerary_id()
        if itinerary_id:
            # GET /api/itineraries/:id - Server-side proxy
            response = self.client.get(
                f"/api/itineraries?id={itinerary_id}",
                headers=self.user.get_auth_headers(),
                name="Journey: View Detail"
            )
            time.sleep(random.uniform(1, 2))

            # GET /api/comments - Server-side proxy
            self.client.get(
                f"/api/comments?itineraryId={itinerary_id}",
                headers=self.user.get_auth_headers(),
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
                self.client.post(
                    "/api/comments",
                    json={
                        "userId": self.user.user_id,
                        "itineraryId": itinerary_id,
                        "text": random.choice(comments)
                    },
                    headers={"Content-Type": "application/json"},
                    name="Journey: Add Comment"
                )

# ============================================================================
# CASUAL BROWSER JOURNEY (50% of traffic)
# ============================================================================

class CasualBrowserJourney(TaskSet):
    """
    Represents a casual visitor who browses without necessarily engaging deeply.
    Typical flow: Quick Register -> Browse -> Search -> View Popular
    Note: Now registers immediately due to backend requiring authentication
    """
    
    def on_start(self):
        """Casual browsers now register to access protected routes"""
        max_init_attempts = 3
        for attempt in range(max_init_attempts):
            if self.user.register_user():
                # Wait a bit after successful registration before fetching
                time.sleep(random.uniform(0.3, 1.0))
                self.user._fetch_available_itineraries()
                self.is_registered = True
                return
            else:
                if attempt < max_init_attempts - 1:
                    print(f"[CasualBrowserJourney] Registration failed, retry {attempt + 1}/{max_init_attempts}")
                    time.sleep(2)
        
        # If registration failed after all attempts, interrupt this user
        print(f"[CasualBrowserJourney] Registration failed after {max_init_attempts} attempts, interrupting user")
        self.is_registered = False
        self.interrupt()
    
    
    def quick_browse(self):
        """Quick browse through itineraries"""
        if not self.user.user_id:
            return
            
        page = random.randint(1, 3)

        # GET /api/itineraries - Server-side proxy
        response = self.client.get(
            f"/api/itineraries?page={page}&limit=10",
            headers=self.user.get_auth_headers(),
            name="Journey: Quick Browse"
        )

        # Update available IDs
        if response.status_code == 200:
            try:
                data = response.json()
                # Handle both list and paginated {data: [...], pagination: {...}} responses
                itineraries = data
                if isinstance(data, dict) and 'data' in data:
                    itineraries = data['data']
                if isinstance(itineraries, list):
                    self.user.available_itinerary_ids = [item['id'] for item in itineraries if 'id' in item]
            except:
                pass

        time.sleep(random.uniform(0.5, 1.5))
    
    
    def search_destinations(self):
        """Search for destinations"""
        if not self.user.user_id:
            return
            
        popular_destinations = [
            "Paris", "Tokyo", "New York", "London", "Bali",
            "Barcelona", "Rome", "Dubai", "Sydney"
        ]

        search_term = random.choice(popular_destinations)
        # GET /api/itineraries?search=X - Server-side proxy
        self.client.get(
            f"/api/itineraries?search={quote(search_term)}",
            headers=self.user.get_auth_headers(),
            name="Journey: Search"
        )
        time.sleep(random.uniform(0.5, 1.5))
    
    
    def view_popular_itineraries(self):
        """View popular itineraries"""
        if not self.user.user_id:
            return
            
        itinerary_id = self.user.get_random_itinerary_id()
        if itinerary_id:
            # GET /api/itineraries/:id - Server-side proxy
            self.client.get(
                f"/api/itineraries?id={itinerary_id}",
                headers=self.user.get_auth_headers(),
                name="Journey: View Popular"
            )
            time.sleep(random.uniform(1, 3))
    
    
# Populate task dictionaries (explicit task weights required for Locust to collect all tasks)
NewUserJourney.tasks = {
    NewUserJourney.browse_popular_itineraries: 4,
    NewUserJourney.search_destinations: 2,
    NewUserJourney.view_itinerary_details: 3,
    NewUserJourney.create_first_itinerary: 2,  # New users create their first itinerary
    NewUserJourney.view_and_comment: 1,
}

ActiveUserJourney.tasks = {
    ActiveUserJourney.browse_and_engage: 5,
    ActiveUserJourney.check_my_itineraries: 3,
    ActiveUserJourney.create_new_itinerary: 2,  # Active users create new itineraries
    ActiveUserJourney.view_and_comment: 2,
}

CasualBrowserJourney.tasks = {
    CasualBrowserJourney.quick_browse: 5,
    CasualBrowserJourney.search_destinations: 3,
    CasualBrowserJourney.view_popular_itineraries: 2,
}

# ============================================================================
# USER WORKLOAD CLASSES (Traffic Distribution)
# ============================================================================

class NewUserWorkload(BaseAPIUser):
    """New users exploring the platform (20% of traffic)"""
    wait_time = between(2, 5)  # Longer wait between requests
    tasks = [NewUserJourney]
    weight = 2

class ActiveUserWorkload(BaseAPIUser):
    """Active users regularly using platform (30% of traffic)"""
    wait_time = between(2, 4)  # Longer wait between requests
    tasks = [ActiveUserJourney]
    weight = 3

class CasualBrowserWorkload(BaseAPIUser):
    """Casual browsers (50% of traffic)"""
    wait_time = between(1, 3)  # Longer wait between requests
    tasks = [CasualBrowserJourney]
    weight = 5

# ============================================================================
# DYNAMIC SHAPE SELECTION
# ============================================================================

# Select shape based on environment variable
SHAPE_ENV = os.getenv('LOCUST_SHAPE', 'simple').lower()

if SHAPE_ENV == 'simple':
    class TestShape(SimpleScalingShape):
        """Active shape for Simple 5-Minute Scaling Test"""
        pass
# If no shape specified, Locust uses simple 5-minute test by default

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
    shape_name = SHAPE_ENV if SHAPE_ENV else "Simple 5-Min Scaling"
    
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
    
    if SHAPE_ENV == 'simple':
        print(f"\nSimple 5-Minute Scaling Test (LOCAL DOCKER OPTIMIZED)")
        print(f"  - Duration: 5 minutes")
        print(f"  - Start: 5 users")
        print(f"  - Peak: 100 users")
        print(f"  - Ramp: 4 minutes (5 users/sec - conservative)")
        print(f"  - Peak Duration: 1 minute")
        print(f"  - Optimized for local Docker with resource constraints")
    
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
        f.write(f"Test Shape: {SHAPE_ENV if SHAPE_ENV else 'Simple'}\n")
        f.write(f"Architecture: Microservices with API Gateway\n\n")
        
        if SHAPE_ENV == 'simple':
            f.write("TEST CONFIGURATION: Simple 5-Minute Scaling\n")
            f.write("-"*80 + "\n")
            f.write("Duration: 5 minutes\n")
            f.write("Start Users: 10\n")
            f.write("Peak Users: 500\n")
            f.write("Ramp Duration: 4 minutes\n")
            f.write("Peak Duration: 1 minute\n")
            f.write("Spawn Rate: 100 users/sec\n\n")
        
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
        
    print(f"Detailed report saved to: {report_file}")
