from locust import HttpUser, task, between, events, TaskSet
from datetime import datetime, timedelta
import random
import string
import time
from urllib.parse import quote
import json
import os

def random_email():
    return ''.join(random.choices(string.ascii_lowercase, k=8)) + "@test.com"

def random_name():
    return ''.join(random.choices(string.ascii_lowercase, k=8))

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

class SharedState:
    """Shared state across all users to cache available IDs"""
    itinerary_ids = []
    last_fetch = 0
    fetch_interval = 30  # Refresh every 30 seconds

shared_state = SharedState()

class APIUser(HttpUser):
    wait_time = between(1, 3)
    user_id = None
    itinerary_id = None
    latest_registration = None
    test_email = None
    test_password = "testpass"
    max_retries = 3
    available_itinerary_ids = []
    
    def on_start(self):
        retry_count = 0
        while self.user_id is None and retry_count < self.max_retries:
            self.test_email = random_email()
            print(f"Attempting registration (attempt {retry_count + 1}/{self.max_retries}) with email:", self.test_email)
            
            try:
                response = self.client.post("/api/user?action=register", json={
                    "name": random_name(),
                    "email": self.test_email,
                    "password": self.test_password
                }, timeout=10)
                
                if response.status_code == 201:
                    data = safe_json_parse(response, "Registration")
                    if data and data.get("id"):
                        self.user_id = data.get("id")
                        print(f"✓ Registration successful, user_id: {self.user_id}")
                        self.login()
                    else:
                        print(f"✗ No user ID in response")
                        retry_count += 1
                        time.sleep(2)
                else:
                    print(f"✗ Registration failed with status {response.status_code}: {response.text[:100]}")
                    retry_count += 1
                    time.sleep(2)
            except Exception as e:
                print(f"✗ Registration request failed: {e}")
                retry_count += 1
                time.sleep(2)
        
        if self.user_id is None:
            print(f"Failed to register after {self.max_retries} attempts, stopping user")
            self.environment.runner.quit()
        
        # Fetch available itinerary IDs
        self._fetch_available_itineraries()
    
    def _fetch_available_itineraries(self):
        """Fetch list of available itinerary IDs from the API (like frontend does)"""
        current_time = time.time()
        
        # Use cached IDs if recently fetched
        if shared_state.itinerary_ids and (current_time - shared_state.last_fetch) < shared_state.fetch_interval:
            self.available_itinerary_ids = shared_state.itinerary_ids.copy()
            return
        
        try:
            with self.client.get("/api/itineraries?page=1&limit=100", catch_response=True, name="Fetch Available IDs") as response:
                if response.status_code == 200:
                    data = safe_json_parse(response, "Fetch Itineraries")
                    if data and isinstance(data, list):
                        ids = [item['id'] for item in data if 'id' in item]
                        if ids:
                            self.available_itinerary_ids = ids
                            shared_state.itinerary_ids = ids
                            shared_state.last_fetch = current_time
                            print(f"✓ Fetched {len(ids)} itinerary IDs: {ids[:5]}...")
                    response.success()
                else:
                    response.failure(f"Failed to fetch itineraries: {response.status_code}")
        except Exception as e:
            print(f"Error fetching itineraries: {e}")
    
    def get_random_itinerary_id(self):
        """Get a random itinerary ID from available ones"""
        if not self.available_itinerary_ids:
            self._fetch_available_itineraries()
        
        if self.available_itinerary_ids:
            return random.choice(self.available_itinerary_ids)
        return None
    
    def get_random_dates(self):
        start_offset = random.randint(1, 180)
        stay_length = random.randint(3, 14)
        start_date = datetime.now() + timedelta(days=start_offset)
        end_date = start_date + timedelta(days=stay_length)
        return start_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d")

    def login(self):
        self.client.post("/api/user?action=login", json={
            "email": self.test_email,
            "password": self.test_password
        })

    @task(3)
    def search_itineraries(self):
        # Perform a search for itineraries using the correct API format with pagination
        search_terms = ["Berlin", "Trip", "description", "Test", ""]
        term = random.choice(search_terms)
        page = random.randint(1, 3)
        limit = random.choice([10, 20, 50])
        include_likes = random.choice([True, False])
        
        if self.user_id:
            url = f"/api/itineraries?page={page}&limit={limit}&currentUserId={self.user_id}"
            if include_likes:
                url += "&includeLikes=true"
            if term:
                url += f"&search={quote(term)}"
            
            response = self.client.get(url, name="Search Itineraries")
            
            # Update available IDs from search results
            if response.status_code == 200:
                try:
                    data = response.json()
                    if isinstance(data, list):
                        ids = [item['id'] for item in data if 'id' in item]
                        if ids:
                            self.available_itinerary_ids = ids
                except:
                    pass

    @task(2)
    def view_itinerary(self):
        if not self.user_id:
            return
        
        itinerary_id = self.get_random_itinerary_id()
        if itinerary_id:
            self.client.get(
                f"/api/itineraries?id={itinerary_id}&currentUserId={self.user_id}",
                name="View Itinerary"
            )

    @task(1)
    def like_itinerary(self):
        if not self.user_id:
            return
        
        itinerary_id = self.get_random_itinerary_id()
        if itinerary_id:
            self.client.post("/api/likes", json={
                "userId": self.user_id,
                "itineraryId": itinerary_id
            }, name="Like Itinerary")

    @task(1)
    def comment_on_itinerary(self):
        if not self.user_id:
            return
        
        itinerary_id = self.get_random_itinerary_id()
        if itinerary_id:
            comment_texts = [
                "This looks amazing!",
                "Great destination!",
                "I've been there, highly recommend!",
                "Adding this to my bucket list!",
                "Beautiful photos!"
            ]
            
            self.client.post("/api/comments", json={
                "userId": self.user_id,
                "itineraryId": itinerary_id,
                "content": random.choice(comment_texts)
            }, name="Add Comment")

    @task(1)
    def view_comments(self):
        if not self.user_id:
            return
        
        itinerary_id = self.get_random_itinerary_id()
        if itinerary_id:
            self.client.get(
                f"/api/comments?itineraryId={itinerary_id}",
                name="View Comments"
            )

    @task(2)
    def create_itinerary(self):
        if not self.user_id:
            return
        
        destinations = [
            "Paris, France", "Tokyo, Japan", "New York, USA", "London, UK",
            "Bali, Indonesia", "Barcelona, Spain", "Sydney, Australia",
            "Dubai, UAE", "Rome, Italy", "Amsterdam, Netherlands"
        ]
        
        start_date, end_date = self.get_random_dates()
        
        # Create itinerary with locations (new feature)
        destination = random.choice(destinations)
        location_start_date, location_end_date = self.get_random_dates()
        
        # Randomly decide whether to include locations (70% chance)
        include_locations = random.random() < 0.7
        
        itinerary_data = {
            "title": f"My Trip to {destination.split(',')[0]}",
            "destination": destination,
            "start_date": start_date,
            "short_desc": "An amazing adventure awaits!",
            "detail_desc": "This is going to be an unforgettable journey filled with exploration, culture, and fun!",
            "userId": self.user_id
        }
        
        # Add locations if randomly selected
        if include_locations:
            itinerary_data["locations"] = [
                {
                    "name": f"Location 1 - {destination.split(',')[0]}",
                    "start_date": location_start_date,
                    "end_date": location_end_date,
                    "short_desc": "First stop on the journey",
                    "images": [f"locations/test_location_1_{random.randint(1,100)}.jpg"]
                },
                {
                    "name": f"Location 2 - {destination.split(',')[0]}",
                    "start_date": location_end_date,
                    "end_date": end_date,
                    "short_desc": "Second amazing location",
                    "images": [f"locations/test_location_2_{random.randint(1,100)}.jpg", f"locations/test_location_2b_{random.randint(1,100)}.jpg"]
                }
            ]
        
        response = self.client.post("/api/itineraries", json=itinerary_data, name="Create Itinerary (with locations)")
        
        # If successful, add the new itinerary ID to available IDs
        if response.status_code == 201:
            try:
                data = response.json()
                if data and 'id' in data:
                    new_id = data['id']
                    if new_id not in self.available_itinerary_ids:
                        self.available_itinerary_ids.append(new_id)
                    if new_id not in shared_state.itinerary_ids:
                        shared_state.itinerary_ids.append(new_id)
            except:
                pass
    
    @task(1)
    def test_avatar_endpoint(self):
        """Test avatar fetching endpoint (new feature)"""
        if not self.user_id:
            return
        
        # Test with a sample avatar path
        avatar_paths = [
            "avatars/emma_avatar.jpg",
            "avatars/liam_avatar.jpg", 
            "avatars/sofia_avatar.jpg",
            "avatars/noah_avatar.jpg"
        ]
        
        avatar_path = random.choice(avatar_paths)
        self.client.get(
            f"/api/avatar?path={avatar_path}",
            name="Fetch Avatar URL"
        )
    
    @task(1)
    def test_image_endpoint(self):
        """Test image fetching endpoint (new feature)"""
        if not self.user_id:
            return
        
        # Test with sample location image paths
        image_paths = [
            "gs://pictures-clouddev/locations/rome_colosseum_1.jpg",
            "gs://pictures-clouddev/locations/tokyo_sensoji_1.jpg",
            "gs://pictures-clouddev/locations/paris_louvre_1.jpg"
        ]
        
        image_path = random.choice(image_paths)
        self.client.get(
            f"/api/image?path={image_path}",
            name="Fetch Image URL"
        )
    
    @task(1)
    def test_batch_likes_query(self):
        """Test batch likes query endpoint (new feature)"""
        if not self.user_id and not self.available_itinerary_ids:
            return
        
        # Get 3-5 random itinerary IDs for batch query
        num_ids = min(random.randint(3, 5), len(self.available_itinerary_ids))
        if num_ids > 0:
            batch_ids = random.sample(self.available_itinerary_ids, num_ids)
            ids_param = ",".join(map(str, batch_ids))
            
            self.client.get(
                f"/api/likes?itineraryIds={ids_param}&userId={self.user_id}",
                name="Batch Likes Query"
            )
    
    @task(1)
    def test_pagination(self):
        """Test pagination with different page sizes (new feature)"""
        if not self.user_id:
            return
        
        page = random.randint(1, 5)
        limit = random.choice([5, 10, 20, 50])
        
        self.client.get(
            f"/api/itineraries?page={page}&limit={limit}&currentUserId={self.user_id}&includeLikes=true",
            name="Paginated Browse"
        )


# ============================================================================
# ENHANCED USER JOURNEYS for Realistic Workload Patterns
# ============================================================================

class NewUserJourney(TaskSet):
    """Represents a new user exploring the platform for the first time"""
    
    def on_start(self):
        """Register a new user when starting this journey"""
        timestamp = int(datetime.now().timestamp())
        self.username = f"newuser_{timestamp}_{random.randint(1000, 9999)}"
        self.email = f"{self.username}@example.com"
        self.password = "Test123!"
        self.user_id = None
        self.available_itinerary_ids = []
        
        # Register the user
        response = self.client.post("/api/user?action=register", json={
            "name": self.username,
            "email": self.email,
            "password": self.password
        }, name="Journey: Registration")
        
        if response.status_code == 201:
            data = safe_json_parse(response, "New User Registration")
            if data:
                self.user_id = data.get("id")
                print(f"[NEW USER JOURNEY] Registered user_id: {self.user_id}")
        
        # Step 2: Login
        if self.user_id:
            self.client.post("/api/user?action=login", json={
                "email": self.email,
                "password": self.password
            }, name="Journey: Login")
        
        # Fetch available itinerary IDs
        self._fetch_available_itineraries()
    
    def _fetch_available_itineraries(self):
        """Fetch list of available itinerary IDs from the API"""
        try:
            with self.client.get("/api/itineraries?page=1&limit=100", catch_response=True, name="Journey: Fetch IDs") as response:
                if response.status_code == 200:
                    data = safe_json_parse(response, "Fetch Itineraries")
                    if data and isinstance(data, list):
                        self.available_itinerary_ids = [item['id'] for item in data if 'id' in item]
                        print(f"[NEW USER] Fetched {len(self.available_itinerary_ids)} itinerary IDs")
                    response.success()
        except Exception as e:
            print(f"Error fetching itineraries: {e}")
    
    def get_random_itinerary_id(self):
        """Get a random itinerary ID from available ones"""
        if not self.available_itinerary_ids:
            self._fetch_available_itineraries()
        
        if self.available_itinerary_ids:
            return random.choice(self.available_itinerary_ids)
        return None
    
    @task(1)
    def browse_and_explore(self):
        """Step 3-5: Browse popular itineraries, search, view details"""
        if not self.user_id:
            return
        
        # Browse popular itineraries
        response = self.client.get(
            f"/api/itineraries?page=1&limit=20&currentUserId={self.user_id}&includeLikes=true",
            name="Journey: Browse Popular"
        )
        
        # Update available IDs from browse results
        if response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list):
                    self.available_itinerary_ids = [item['id'] for item in data if 'id' in item]
            except:
                pass
        
        time.sleep(random.uniform(2, 5))  # User reads content
        
        # Search for specific destination
        destinations = ["Paris", "Tokyo", "New York", "London", "Bali"]
        search_term = random.choice(destinations)
        self.client.get(
            f"/api/itineraries?search={quote(search_term)}&currentUserId={self.user_id}",
            name="Journey: Search Destination"
        )
        time.sleep(random.uniform(1, 3))
        
        # View a random itinerary in detail
        itinerary_id = self.get_random_itinerary_id()
        if itinerary_id:
            response = self.client.get(
                f"/api/itineraries?id={itinerary_id}&currentUserId={self.user_id}",
                name="Journey: View Detail"
            )
            time.sleep(random.uniform(3, 7))  # User reads the itinerary
            
            # Like the itinerary
            if response.status_code == 200:
                self.client.post("/api/likes", json={
                    "userId": self.user_id,
                    "itineraryId": itinerary_id
                }, name="Journey: Like")
    
    @task(1)
    def create_first_itinerary(self):
        """Step 6: Create their first itinerary with locations"""
        if not self.user_id:
            return
        
        destinations = [
            "Paris, France", "Tokyo, Japan", "Barcelona, Spain", "Santorini, Greece",
            "Bali, Indonesia", "Iceland", "New Zealand", "Swiss Alps"
        ]
        destination = random.choice(destinations)
        
        # Calculate dates
        start_offset = random.randint(30, 180)
        stay_length = random.randint(5, 14)
        start_date = (datetime.now() + timedelta(days=start_offset)).strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=start_offset + stay_length)).strftime("%Y-%m-%d")
        
        # Calculate location dates
        mid_offset = start_offset + (stay_length // 2)
        mid_date = (datetime.now() + timedelta(days=mid_offset)).strftime("%Y-%m-%d")
        
        # Create itinerary with locations (new users are likely to use new features)
        response = self.client.post("/api/itineraries", json={
            "title": f"My First Trip to {destination.split(',')[0]}",
            "destination": destination,
            "start_date": start_date,
            "short_desc": f"Excited to visit {destination}!",
            "detail_desc": f"Planning my first adventure to {destination}. Can't wait to explore!",
            "userId": self.user_id,
            "locations": [
                {
                    "name": f"First Stop in {destination.split(',')[0]}",
                    "start_date": start_date,
                    "end_date": mid_date,
                    "short_desc": "Starting the journey here!",
                    "images": [f"locations/user_{self.user_id}_location1.jpg"]
                },
                {
                    "name": f"Final Destination in {destination.split(',')[0]}",
                    "start_date": mid_date,
                    "end_date": end_date,
                    "short_desc": "Ending on a high note!",
                    "images": [f"locations/user_{self.user_id}_location2.jpg"]
                }
            ]
        }, name="Journey: Create First Itinerary")
        
        # Add new itinerary ID to available IDs
        if response.status_code == 201:
            try:
                data = response.json()
                if data and 'id' in data:
                    new_id = data['id']
                    if new_id not in self.available_itinerary_ids:
                        self.available_itinerary_ids.append(new_id)
            except:
                pass
        
        time.sleep(random.uniform(2, 4))  # Admire their creation
    
    @task(1)
    def interact_with_community(self):
        """Step 7-8: View and comment on other itineraries"""
        if not self.user_id:
            return
        
        itinerary_id = self.get_random_itinerary_id()
        if itinerary_id:
            # View comments on an itinerary
            self.client.get(
                f"/api/comments?itineraryId={itinerary_id}",
                name="Journey: View Comments"
            )
            time.sleep(random.uniform(1, 3))
            
            # Add a comment
            comments = [
                "This looks incredible! 😍",
                "Adding this to my bucket list!",
                "Great photos! How was your experience?",
                "I've always wanted to visit there!",
                "Thanks for sharing! Very inspiring! ✨"
            ]
            
            self.client.post("/api/comments", json={
                "userId": self.user_id,
                "itineraryId": itinerary_id,
                "content": random.choice(comments)
            }, name="Journey: Add Comment")


class ActiveUserJourney(TaskSet):
    """Represents an active user who regularly interacts with the platform"""
    
    def on_start(self):
        """Use an existing user (simulated with new registration)"""
        timestamp = int(datetime.now().timestamp())
        self.username = f"activeuser_{timestamp}_{random.randint(1000, 9999)}"
        self.email = f"{self.username}@example.com"
        self.password = "Active123!"
        self.user_id = None
        self.available_itinerary_ids = []
        
        # Register
        response = self.client.post("/api/user?action=register", json={
            "name": self.username,
            "email": self.email,
            "password": self.password
        }, name="Journey: Register")
        
        if response.status_code == 201:
            data = safe_json_parse(response, "Active User Registration")
            if data:
                self.user_id = data.get("id")
        
        # Login
        if self.user_id:
            self.client.post("/api/user?action=login", json={
                "email": self.email,
                "password": self.password
            }, name="Journey: Login")
        
        # Fetch available itinerary IDs
        self._fetch_available_itineraries()
    
    def _fetch_available_itineraries(self):
        """Fetch list of available itinerary IDs from the API"""
        try:
            with self.client.get("/api/itineraries?page=1&limit=100", catch_response=True, name="Journey: Fetch IDs") as response:
                if response.status_code == 200:
                    data = safe_json_parse(response, "Fetch Itineraries")
                    if data and isinstance(data, list):
                        self.available_itinerary_ids = [item['id'] for item in data if 'id' in item]
                        print(f"[ACTIVE USER] Fetched {len(self.available_itinerary_ids)} itinerary IDs")
                    response.success()
        except Exception as e:
            print(f"Error fetching itineraries: {e}")
    
    def get_random_itinerary_id(self):
        """Get a random itinerary ID from available ones"""
        if not self.available_itinerary_ids:
            self._fetch_available_itineraries()
        
        if self.available_itinerary_ids:
            return random.choice(self.available_itinerary_ids)
        return None
    
    @task(3)
    def check_my_itineraries(self):
        """Check their own itineraries"""
        if not self.user_id:
            return
        
        self.client.get(
            f"/api/itineraries?userId={self.user_id}&currentUserId={self.user_id}",
            name="Journey: My Itineraries"
        )
    
    @task(4)
    def browse_and_like(self):
        """Browse itineraries and like interesting ones"""
        if not self.user_id:
            return
        
        # Browse with different filters
        page = random.randint(1, 3)
        response = self.client.get(
            f"/api/itineraries?page={page}&limit=20&currentUserId={self.user_id}&includeLikes=true",
            name="Journey: Browse Feed"
        )
        
        # Update available IDs
        if response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list):
                    self.available_itinerary_ids = [item['id'] for item in data if 'id' in item]
            except:
                pass
        
        time.sleep(random.uniform(1, 3))
        
        # Like 1-3 itineraries
        num_likes = random.randint(1, 3)
        for _ in range(num_likes):
            itinerary_id = self.get_random_itinerary_id()
            if itinerary_id:
                self.client.post("/api/likes", json={
                    "userId": self.user_id,
                    "itineraryId": itinerary_id
                }, name="Journey: Like")
                time.sleep(random.uniform(0.5, 1.5))
    
    @task(2)
    def add_new_itinerary(self):
        """Add a new itinerary with locations to their collection"""
        if not self.user_id:
            return
        
        destinations = [
            "Tokyo, Japan", "Paris, France", "Barcelona, Spain", "Rome, Italy",
            "Bali, Indonesia", "New York, USA", "London, UK", "Sydney, Australia"
        ]
        
        destination = random.choice(destinations)
        start_offset = random.randint(10, 90)
        stay_length = random.randint(3, 14)
        start_date = (datetime.now() + timedelta(days=start_offset)).strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=start_offset + stay_length)).strftime("%Y-%m-%d")
        
        # Active users often add multiple locations
        num_locations = random.randint(2, 4)
        locations = []
        
        for i in range(num_locations):
            loc_start_offset = start_offset + (stay_length // num_locations) * i
            loc_end_offset = start_offset + (stay_length // num_locations) * (i + 1)
            loc_start = (datetime.now() + timedelta(days=loc_start_offset)).strftime("%Y-%m-%d")
            loc_end = (datetime.now() + timedelta(days=loc_end_offset)).strftime("%Y-%m-%d")
            
            locations.append({
                "name": f"Stop {i+1} - {destination.split(',')[0]}",
                "start_date": loc_start,
                "end_date": loc_end,
                "short_desc": f"Exploring location {i+1}",
                "images": [f"locations/active_user_{self.user_id}_loc{i}.jpg"]
            })
        
        response = self.client.post("/api/itineraries", json={
            "title": f"Another Amazing Trip to {destination.split(',')[0]}",
            "destination": destination,
            "start_date": start_date,
            "short_desc": "Can't wait for this adventure!",
            "detail_desc": "Planning another incredible journey. Here's my itinerary!",
            "userId": self.user_id,
            "locations": locations
        }, name="Journey: Create Itinerary")
        
        # Add new itinerary ID to available IDs
        if response.status_code == 201:
            try:
                data = response.json()
                if data and 'id' in data:
                    new_id = data['id']
                    if new_id not in self.available_itinerary_ids:
                        self.available_itinerary_ids.append(new_id)
            except:
                pass
    
    @task(3)
    def view_and_comment(self):
        """View itineraries with locations and leave comments"""
        if not self.user_id:
            return
        
        itinerary_id = self.get_random_itinerary_id()
        if itinerary_id:
            # View the itinerary (now includes locations data)
            response = self.client.get(
                f"/api/itineraries?id={itinerary_id}&currentUserId={self.user_id}",
                name="Journey: View Detail"
            )
            
            # Check if itinerary has locations and fetch images if present
            if response.status_code == 200:
                try:
                    data = response.json()
                    if data and 'locations' in data and data['locations']:
                        # Simulate viewing location images
                        for location in data['locations'][:2]:  # View first 2 locations
                            if location.get('images'):
                                for image_path in location['images'][:1]:  # View first image
                                    self.client.get(
                                        f"/api/image?path=gs://pictures-clouddev/{image_path}",
                                        name="Journey: View Location Image"
                                    )
                except:
                    pass
            
            time.sleep(random.uniform(2, 4))
            
            # View existing comments
            self.client.get(
                f"/api/comments?itineraryId={itinerary_id}",
                name="Journey: View Comments"
            )
            time.sleep(random.uniform(1, 2))
            
            # Add a comment (50% chance)
            if random.random() < 0.5:
                comments = [
                    "Beautiful destination!",
                    "I love this place!",
                    "Great itinerary, very helpful!",
                    "Thanks for sharing your experience!",
                    "Looks amazing! 🌟",
                    "Love the location photos! 📸",
                    "The places you visited look incredible!"
                ]
                
                self.client.post("/api/comments", json={
                    "userId": self.user_id,
                    "itineraryId": itinerary_id,
                    "content": random.choice(comments)
                }, name="Journey: Add Comment")


class CasualBrowserJourney(TaskSet):
    """Represents a casual visitor who browses without necessarily registering"""
    
    def on_start(self):
        """Casual browsers may or may not be logged in"""
        self.user_id = None
        self.is_registered = False
        self.available_itinerary_ids = []
        
        # Fetch available itinerary IDs
        self._fetch_available_itineraries()
    
    def _fetch_available_itineraries(self):
        """Fetch list of available itinerary IDs from the API"""
        try:
            with self.client.get("/api/itineraries?page=1&limit=100", catch_response=True, name="Journey: Fetch IDs") as response:
                if response.status_code == 200:
                    data = safe_json_parse(response, "Fetch Itineraries")
                    if data and isinstance(data, list):
                        self.available_itinerary_ids = [item['id'] for item in data if 'id' in item]
                        print(f"[CASUAL BROWSER] Fetched {len(self.available_itinerary_ids)} itinerary IDs")
                    response.success()
        except Exception as e:
            print(f"Error fetching itineraries: {e}")
    
    def get_random_itinerary_id(self):
        """Get a random itinerary ID from available ones"""
        if not self.available_itinerary_ids:
            self._fetch_available_itineraries()
        
        if self.available_itinerary_ids:
            return random.choice(self.available_itinerary_ids)
        return None
    
    @task(5)
    def quick_browse(self):
        """Quick browse through itineraries"""
        page = random.randint(1, 3)
        response = self.client.get(
            f"/api/itineraries?page={page}&limit=10",
            name="Journey: Quick Browse"
        )
        
        # Update available IDs
        if response.status_code == 200:
            try:
                data = response.json()
                if isinstance(data, list):
                    self.available_itinerary_ids = [item['id'] for item in data if 'id' in item]
            except:
                pass
        
        time.sleep(random.uniform(1, 2))
    
    @task(3)
    def search_destinations(self):
        """Search for specific destinations"""
        popular_destinations = [
            "Paris", "Tokyo", "New York", "London", "Bali", "Barcelona",
            "Rome", "Dubai", "Sydney", "Iceland"
        ]
        
        search_term = random.choice(popular_destinations)
        self.client.get(
            f"/api/itineraries?search={quote(search_term)}",
            name="Journey: Search"
        )
        time.sleep(random.uniform(1, 3))
        
    @task(2)
    def view_popular_itineraries(self):
        """View popular itineraries in detail"""
        itinerary_id = self.get_random_itinerary_id()
        if itinerary_id:
            self.client.get(
                f"/api/itineraries?id={itinerary_id}",
                name="Journey: View Popular"
            )
            time.sleep(random.uniform(2, 5))
    
    @task(1)
    def maybe_register(self):
        """30% chance to convert to registered user"""
        if not self.is_registered and random.random() < 0.3:
            timestamp = int(datetime.now().timestamp())
            username = f"casual_{timestamp}_{random.randint(1000, 9999)}"
            email = f"{username}@example.com"
            password = "Casual123!"
            
            response = self.client.post("/api/user?action=register", json={
                "name": username,
                "email": email,
                "password": password
            }, name="Journey: Convert to User")
            
            if response.status_code == 201:
                data = safe_json_parse(response, "Casual User Registration")
                if data:
                    self.user_id = data.get("id")
                    self.is_registered = True
                    print(f"[CASUAL BROWSER] Converted to registered user: {self.user_id}")


# ============================================================================
# USER WORKLOAD CLASSES
# ============================================================================

class NewUserWorkload(HttpUser):
    """New users exploring the platform (Lower weight - occasional)"""
    wait_time = between(3, 8)
    tasks = [NewUserJourney]
    weight = 2  # 20% of users are new


class ActiveUserWorkload(HttpUser):
    """Active users regularly using the platform (Medium weight)"""
    wait_time = between(2, 5)
    tasks = [ActiveUserJourney]
    weight = 3  # 30% of users are active


class CasualBrowserWorkload(HttpUser):
    """Casual browsers checking out itineraries (Higher weight - most common)"""
    wait_time = between(1, 4)
    tasks = [CasualBrowserJourney]
    weight = 5  # 50% of users are casual browsers


# ============================================================================
# REPORTING HOOKS
# ============================================================================

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Called when the load test starts"""
    print("\n" + "="*80)
    print("🚀 LOAD TEST STARTED - Using Dynamic IDs from API")
    print("="*80)
    print(f"Target Host: {environment.host}")
    print(f"Test Type: Realistic User Journey Simulation")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80 + "\n")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Called when the load test stops - generate summary report"""
    print("\n" + "="*80)
    print("🏁 LOAD TEST COMPLETED")
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
    
    report_file = f"{report_dir}/test_report_{timestamp}.txt"
    with open(report_file, "w") as f:
        f.write("="*80 + "\n")
        f.write("LOAD TEST REPORT - Dynamic IDs\n")
        f.write("="*80 + "\n")
        f.write(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"Target Host: {environment.host}\n\n")
        
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
    
    print(f"📄 Detailed report saved to: {report_file}")
