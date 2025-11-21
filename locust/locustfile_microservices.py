"""
Locust Load Testing for CloudAppDev Microservices Architecture
================================================================

This load test file is designed for the microservices architecture with API Gateway.
All requests go through the API Gateway (http://localhost:8000 or deployed gateway).

Architecture:
- API Gateway (Nginx) on port 8000
- User Service: /api/v1/users
- Itinerary Service: /api/v1/itineraries  
- Social Service: /api/v1/social/comments and /api/v1/social/likes

Requirements for Milestone 2 Performance Testing:

5.1 Periodic Workload:
- 100 concurrent users (peak) / 10 users (low demand)
- 1000 concurrent users (peak) / 20 users (low demand)
- Report: response times, failure rates, resource utilization

5.2 Once-in-a-lifetime Workload:
- Start with 10 base users, constantly add new users
- Determine max workload application survives
- Identify: no degradation, with degradation, failure thresholds

Usage:
------
# Local testing (microservices)
locust -f locust/locustfile_microservices.py --host=http://localhost:8000

# Production testing (deployed gateway)
locust -f locust/locustfile_microservices.py --host=https://cloudappdev.site

# Headless mode (periodic workload - 100 users peak)
locust -f locust/locustfile_microservices.py --host=http://localhost:8000 \
    --users 100 --spawn-rate 10 --run-time 10m --headless

# Headless mode (once-in-a-lifetime - constant growth)
locust -f locust/locustfile_microservices.py --host=http://localhost:8000 \
    --users 1000 --spawn-rate 5 --run-time 30m --headless
"""

from locust import HttpUser, task, between, events, TaskSet
from datetime import datetime, timedelta
import random
import string
import time
from urllib.parse import quote
import json
import os

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
            print(f"{context} Server error {response.status_code}: {response.text[:200]}")
            return None
        if not response.text:
            print(f"{context} Empty response")
            return None
        return response.json()
    except Exception as e:
        print(f"{context} JSON parse error: {e}, Status: {response.status_code}, Text: {response.text[:200]}")
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
        """Register a new user via User Service"""
        retry_count = 0
        while self.user_id is None and retry_count < self.max_retries:
            self.test_email = random_email()
            name = random_name()
            
            try:
                # POST /api/v1/users - User Service registration
                response = self.client.post("/api/v1/users", json={
                    "name": name,
                    "email": self.test_email,
                    "password": self.test_password
                }, timeout=10, name="User Registration")
                
                if response.status_code == 201:
                    data = safe_json_parse(response, "Registration")
                    if data and data.get("id"):
                        self.user_id = data.get("id")
                        shared_state.user_ids.append(self.user_id)
                        print(f"✓ Registered user_id: {self.user_id}")
                        return True
                    else:
                        print(f"✗ No user ID in response")
                        retry_count += 1
                        time.sleep(2)
                else:
                    print(f"✗ Registration failed: {response.status_code}")
                    retry_count += 1
                    time.sleep(2)
            except Exception as e:
                print(f"✗ Registration request failed: {e}")
                retry_count += 1
                time.sleep(2)
        
        if self.user_id is None:
            print(f"Failed to register after {self.max_retries} attempts")
            return False
        return True
    
    def _fetch_available_itineraries(self):
        """Fetch list of available itinerary IDs from Itinerary Service"""
        current_time = time.time()
        
        # Use cached IDs if recently fetched
        if shared_state.itinerary_ids and (current_time - shared_state.last_fetch) < shared_state.fetch_interval:
            self.available_itinerary_ids = shared_state.itinerary_ids.copy()
            return
        
        try:
            # GET /api/v1/itineraries - Itinerary Service
            with self.client.get("/api/v1/itineraries?page=1&limit=100", 
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
                            print(f"✓ Fetched {len(ids)} itinerary IDs")
                    response.success()
                else:
                    response.failure(f"Failed to fetch: {response.status_code}")
        except Exception as e:
            print(f"Error fetching itineraries: {e}")
    
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
        
        # GET /api/v1/itineraries?page=X&limit=Y
        response = self.client.get(
            f"/api/v1/itineraries?page={page}&limit={limit}",
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
        
        time.sleep(random.uniform(2, 5))  # User reads content
    
    @task(2)
    def search_destinations(self):
        """Search for specific destinations"""
        destinations = ["Paris", "Tokyo", "New York", "London", "Bali", "Barcelona", "Rome"]
        search_term = random.choice(destinations)
        
        # GET /api/v1/itineraries?search=X
        self.client.get(
            f"/api/v1/itineraries?search={quote(search_term)}",
            name="Journey: Search Destination"
        )
        time.sleep(random.uniform(1, 3))
    
    @task(2)
    def view_itinerary_details(self):
        """View detailed itinerary information"""
        if not self.user.user_id:
            return
        
        itinerary_id = self.user.get_random_itinerary_id()
        if itinerary_id:
            # GET /api/v1/itineraries/:id
            response = self.client.get(
                f"/api/v1/itineraries/{itinerary_id}",
                name="Journey: View Details"
            )
            time.sleep(random.uniform(3, 7))  # User reads itinerary
            
            # Like the itinerary (50% chance)
            if response.status_code == 200 and random.random() < 0.5:
                # POST /api/v1/social/likes/toggle
                self.client.post("/api/v1/social/likes/toggle", json={
                    "userId": str(self.user.user_id),
                    "itineraryId": str(itinerary_id)
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
        
        # POST /api/v1/itineraries - Create with locations
        response = self.client.post("/api/v1/itineraries", json={
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
        
        time.sleep(random.uniform(2, 4))
    
    @task(1)
    def view_and_comment(self):
        """View and comment on other itineraries"""
        if not self.user.user_id:
            return
        
        itinerary_id = self.user.get_random_itinerary_id()
        if itinerary_id:
            # GET /api/v1/social/comments/itinerary/:id
            self.client.get(
                f"/api/v1/social/comments/itinerary/{itinerary_id}",
                name="Journey: View Comments"
            )
            time.sleep(random.uniform(1, 3))
            
            # Add a comment (50% chance)
            if random.random() < 0.5:
                comments = [
                    "This looks incredible! 😍",
                    "Adding this to my bucket list!",
                    "Great photos!",
                    "Thanks for sharing!",
                    "Very inspiring! ✨"
                ]
                
                # POST /api/v1/social/comments
                self.client.post("/api/v1/social/comments", json={
                    "userId": str(self.user.user_id),
                    "itineraryId": str(itinerary_id),
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
        # GET /api/v1/itineraries
        response = self.client.get(
            f"/api/v1/itineraries?page={page}&limit=20",
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
        
        time.sleep(random.uniform(1, 3))
        
        # Like 1-2 itineraries
        num_likes = random.randint(1, 2)
        for _ in range(num_likes):
            itinerary_id = self.user.get_random_itinerary_id()
            if itinerary_id:
                # POST /api/v1/social/likes/toggle
                self.client.post("/api/v1/social/likes/toggle", json={
                    "userId": str(self.user.user_id),
                    "itineraryId": str(itinerary_id)
                }, name="Journey: Like")
                time.sleep(random.uniform(0.5, 1.5))
    
    @task(3)
    def check_my_itineraries(self):
        """Check their own itineraries"""
        if not self.user.user_id:
            return
        
        # GET /api/v1/itineraries?userId=X
        self.client.get(
            f"/api/v1/itineraries?userId={self.user.user_id}",
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
        
        # POST /api/v1/itineraries
        response = self.client.post("/api/v1/itineraries", json={
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
            # GET /api/v1/itineraries/:id
            response = self.client.get(
                f"/api/v1/itineraries/{itinerary_id}",
                name="Journey: View Detail"
            )
            time.sleep(random.uniform(2, 4))
            
            # GET /api/v1/social/comments/itinerary/:id
            self.client.get(
                f"/api/v1/social/comments/itinerary/{itinerary_id}",
                name="Journey: View Comments"
            )
            time.sleep(random.uniform(1, 2))
            
            # Add a comment (60% chance for active users)
            if random.random() < 0.6:
                comments = [
                    "Beautiful destination!",
                    "Love this place!",
                    "Great itinerary!",
                    "Thanks for sharing! 🌟",
                    "Amazing photos! 📸"
                ]
                
                # POST /api/v1/social/comments
                self.client.post("/api/v1/social/comments", json={
                    "userId": str(self.user.user_id),
                    "itineraryId": str(itinerary_id),
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
        
        # GET /api/v1/itineraries
        response = self.client.get(
            f"/api/v1/itineraries?page={page}&limit=10",
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
        
        time.sleep(random.uniform(1, 2))
    
    @task(3)
    def search_destinations(self):
        """Search for destinations"""
        popular_destinations = [
            "Paris", "Tokyo", "New York", "London", "Bali", 
            "Barcelona", "Rome", "Dubai", "Sydney"
        ]
        
        search_term = random.choice(popular_destinations)
        # GET /api/v1/itineraries?search=X
        self.client.get(
            f"/api/v1/itineraries?search={quote(search_term)}",
            name="Journey: Search"
        )
        time.sleep(random.uniform(1, 3))
    
    @task(2)
    def view_popular_itineraries(self):
        """View popular itineraries"""
        itinerary_id = self.user.get_random_itinerary_id()
        if itinerary_id:
            # GET /api/v1/itineraries/:id
            self.client.get(
                f"/api/v1/itineraries/{itinerary_id}",
                name="Journey: View Popular"
            )
            time.sleep(random.uniform(2, 5))
    
    @task(1)
    def maybe_register(self):
        """20% chance to convert to registered user"""
        if not self.is_registered and random.random() < 0.2:
            if self.user.register_user():
                self.is_registered = True
                print(f"[CASUAL BROWSER] Converted to registered user: {self.user.user_id}")

# ============================================================================
# USER WORKLOAD CLASSES (Traffic Distribution)
# ============================================================================

class NewUserWorkload(BaseAPIUser):
    """New users exploring the platform (20% of traffic)"""
    wait_time = between(3, 8)
    tasks = [NewUserJourney]
    weight = 2

class ActiveUserWorkload(BaseAPIUser):
    """Active users regularly using platform (30% of traffic)"""
    wait_time = between(2, 5)
    tasks = [ActiveUserJourney]
    weight = 3

class CasualBrowserWorkload(BaseAPIUser):
    """Casual browsers (50% of traffic)"""
    wait_time = between(1, 4)
    tasks = [CasualBrowserJourney]
    weight = 5

# ============================================================================
# REPORTING HOOKS
# ============================================================================

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Called when the load test starts"""
    print("\n" + "="*80)
    print("🚀 MICROSERVICES LOAD TEST STARTED")
    print("="*80)
    print(f"Target Host: {environment.host}")
    print(f"Test Type: Microservices Architecture with API Gateway")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Architecture:")
    print(f"  - User Service: /api/v1/users")
    print(f"  - Itinerary Service: /api/v1/itineraries")
    print(f"  - Social Service: /api/v1/social/comments, /api/v1/social/likes")
    print("="*80 + "\n")

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Called when the load test stops - generate summary report"""
    print("\n" + "="*80)
    print("🏁 MICROSERVICES LOAD TEST COMPLETED")
    print("="*80)
    
    stats = environment.stats
    
    print(f"\n📊 Summary Statistics:")
    print(f"   Total Requests: {stats.total.num_requests}")
    print(f"   Total Failures: {stats.total.num_failures}")
    print(f"   Average Response Time: {stats.total.avg_response_time:.2f}ms")
    print(f"   Min Response Time: {stats.total.min_response_time:.2f}ms")
    print(f"   Max Response Time: {stats.total.max_response_time:.2f}ms")
    print(f"   Requests/sec: {stats.total.total_rps:.2f}")
    
    if stats.total.num_requests > 0:
        failure_rate = (stats.total.num_failures / stats.total.num_requests) * 100
        print(f"   Failure Rate: {failure_rate:.2f}%")
    
    print(f"\n⏱️  Response Time Percentiles:")
    print(f"   50th percentile: {stats.total.get_response_time_percentile(0.50):.2f}ms")
    print(f"   75th percentile: {stats.total.get_response_time_percentile(0.75):.2f}ms")
    print(f"   90th percentile: {stats.total.get_response_time_percentile(0.90):.2f}ms")
    print(f"   95th percentile: {stats.total.get_response_time_percentile(0.95):.2f}ms")
    print(f"   99th percentile: {stats.total.get_response_time_percentile(0.99):.2f}ms")
    
    print("\n" + "="*80 + "\n")
    
    # Save detailed report
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_dir = "locust/reports"
    os.makedirs(report_dir, exist_ok=True)
    
    report_file = f"{report_dir}/microservices_test_{timestamp}.txt"
    with open(report_file, "w") as f:
        f.write("="*80 + "\n")
        f.write("MICROSERVICES LOAD TEST REPORT\n")
        f.write("="*80 + "\n")
        f.write(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Target Host: {environment.host}\n")
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
        
        # Add Milestone 2 specific analysis sections
        f.write("\n\nMILESTONE 2 PERFORMANCE ANALYSIS\n")
        f.write("="*80 + "\n")
        f.write("Data to collect for report:\n")
        f.write("1. Initial Data: Seeded with realistic dataset (see seed-data/)\n")
        f.write("2. Transaction Mix: 50% Browse, 30% Active, 20% New Users\n")
        f.write("3. Ramp-up/Ramp-down: Configure via Locust UI or --spawn-rate parameter\n")
        f.write("4. Response Times: See percentiles above\n")
        f.write("5. Failure Rates: See summary statistics above\n")
        f.write("6. Resource Utilization: Monitor via kubectl top or Cloud Console\n")
    
    print(f"📄 Detailed report saved to: {report_file}")
