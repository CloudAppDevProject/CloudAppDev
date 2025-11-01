from locust import HttpUser, task, between
from datetime import datetime, timedelta
import random
import string
import time
from urllib.parse import quote

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

class APIUser(HttpUser):
    wait_time = between(1, 3)
    user_id = None
    itinerary_id = None
    latest_registration = None
    test_email = None
    test_password = "testpass"
    max_retries = 3
    
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
            if term.strip():
                url += f"&search={quote(term.strip())}"
            self.client.get(url, timeout=10)

    @task
    def get_users(self):
        self.client.get("/api/user", timeout=10)

    @task
    def create_itinerary(self):
        if self.user_id:
            start_date, end_date = self.get_random_dates()
            with self.client.post("/api/itineraries", json={
                "userId": self.user_id,
                "title": "Test Trip",
                "destination": "Berlin",
                "start_date": start_date,
                "end_date": end_date,
                "short_desc": "Short description",
                "detail_desc": "Detailed description"
            }, catch_response=True, timeout=10) as response:
                if response.status_code == 201:
                    data = safe_json_parse(response, "Create itinerary")
                    if data and data.get("id"):
                        self.itinerary_id = data.get("id")
                        response.success()
                    else:
                        response.failure(f"No itinerary ID in response")
                elif response.status_code >= 500:
                    response.failure(f"Server error: {response.status_code}")
                else:
                    response.failure(f"Failed to create itinerary: {response.text[:200]}")

    @task(2)
    def get_itineraries_by_user(self):
        if self.user_id:
            page = random.randint(1, 2)
            self.client.get(f"/api/itineraries?userId={self.user_id}&page={page}&limit=20", timeout=10)

    @task(2)
    def get_single_itinerary(self):
        if self.itinerary_id:
            self.client.get(f"/api/itineraries?id={self.itinerary_id}&currentUserId={self.user_id}", timeout=10)
    
    @task(2)
    def get_likes_batch(self):
        # Test the batch likes endpoint
        if self.itinerary_id:
            # Simulate getting likes for multiple itineraries
            ids = [self.itinerary_id]
            # Add some random IDs around it
            for _ in range(random.randint(2, 5)):
                ids.append(random.randint(max(1, self.itinerary_id - 10), self.itinerary_id + 10))
            ids_str = ",".join(map(str, ids))
            self.client.get(f"/api/likes?itineraryIds={ids_str}&userId={self.user_id}", timeout=10)
