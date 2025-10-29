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

class APIUser(HttpUser):
    wait_time = between(1, 3)
    user_id = None
    itinerary_id = None
    latest_registration = None
    test_email = None
    test_password = "testpass"
    
    def on_start(self):
        while self.user_id is None:
            self.test_email = random_email()
            print("Attempting registration with email:", self.test_email)
            response = self.client.post("/api/user?action=register", json={
                "name": random_name(),
                "email": self.test_email,
                "password": self.test_password
            })
            print("Registration response status code:", response.json())
            if response.status_code == 201:
                self.user_id = response.json().get("id")
                self.login()
            else:
                time.sleep(1)  
    
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

    @task
    def search_itineraries(self):
        # Perform a search for itineraries using the correct API format
        search_terms = ["Berlin", "Trip", "description", "Test", ""]
        term = random.choice(search_terms)
        url = None
        if self.user_id:
            url = f"/api/itineraries?currentUserId={self.user_id}"
            if term.strip():
                url += f"&search={quote(term.strip())}"
        # else:
        #     if term.strip():
        #         url = f"/api/itineraries?search={quote(term.strip())}"
        #     else:
        #         url = "/api/itineraries"
            self.client.get(url)

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
