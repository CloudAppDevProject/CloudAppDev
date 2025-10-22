from locust import HttpUser, task, between
from datetime import datetime, timedelta
import random
import string

def random_email():
    return ''.join(random.choices(string.ascii_lowercase, k=8)) + "@test.com"

class APIUser(HttpUser):
    wait_time = between(1, 3)
    user_id = None
    itinerary_id = None
    latest_registration = None
    
    def get_random_dates(self):
        start_offset = random.randint(1, 180)
        stay_length = random.randint(3, 14)
        start_date = datetime.now() + timedelta(days=start_offset)
        end_date = start_date + timedelta(days=stay_length)
        return start_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d")

    @task
    def register(self):
        name = "TestUser"
        email = random_email()
        password = "testpass"
        with self.client.post("/api/user?action=register", json={
            "name": name,
            "email": email,
            "password": password
        }, catch_response=True) as response:
            if response.status_code == 201:
                self.latest_registration = email
                self.user_id = response.json().get("id")
            else:
                response.failure(f"Failed to register: {response.text}")

    @task
    def login(self):
        # Use a static test user or one from registration
        email = self.latest_registration if self.latest_registration else "alice@example.com"
        password = "testpass"
        self.client.post("/api/user?action=login", json={
            "email": email,
            "password": password
        })

    @task
    def get_users(self):
        self.client.get("/api/user")

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
            }, catch_response=True) as response:
                if response.status_code == 201:
                    self.itinerary_id = response.json().get("id")
                else:
                    response.failure(f"Failed to create itinerary: {response.text}")

    @task
    def get_itineraries_by_user(self):
        if self.user_id:
            self.client.get(f"/api/itineraries?userId={self.user_id}")

    @task
    def get_single_itinerary(self):
        if self.itinerary_id:
            self.client.get(f"/api/itineraries?id={self.itinerary_id}")
