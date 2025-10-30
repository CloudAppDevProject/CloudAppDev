# Locust Load Testing

This directory contains load testing scripts for the CloudAppDev application using [Locust](https://locust.io/).

## Prerequisites

- Python 3.7 or higher
- pip (Python package installer)

## Installation

1. Install Locust:
```bash
pip install locust
```

## Running Load Tests

1. Make sure your application is running (either locally or in production):
```bash
# For local development
npm run dev

# Or for docker-compose
docker-compose up
```

2. Run Locust from the project root directory:
```bash
# For local testing (default: http://localhost:3000)
locust -f locust/locustfile.py

# For testing a different host
locust -f locust/locustfile.py --host=https://your-domain.com
```

3. Open your browser and navigate to `http://localhost:8089`

4. Configure your load test:
   - Number of users (peak concurrency)
   - Spawn rate (users spawned per second)
   - Host (if not specified in command line)

5. Click "Start swarming" to begin the test

## Test Scenarios

The load test includes the following scenarios:

- **User Registration & Login**: Each simulated user registers with a random email and logs in
- **Search Itineraries**: Searches for itineraries using various search terms
- **Get Users**: Retrieves the list of all users
- **Create Itinerary**: Creates a new itinerary with random dates
- **Get Itineraries by User**: Retrieves itineraries for a specific user
- **Get Single Itinerary**: Retrieves details of a specific itinerary

## Test Data

- User emails are randomly generated (e.g., `abcdefgh@test.com`)
- Usernames are randomly generated lowercase strings
- Test password: `testpass`
- Itinerary dates are randomly generated within the next 180 days

## Metrics

Locust provides the following metrics:
- Request count
- Failure count
- Response times (min, max, average, median)
- Requests per second
- Number of users

## Command Line Options

```bash
# Run headless (no web UI) with 100 users and 10 users/sec spawn rate for 5 minutes
locust -f locust/locustfile.py --headless -u 100 -r 10 -t 5m --host=http://localhost:3000

# Run with web UI on a different port
locust -f locust/locustfile.py --web-port=8090

# Run with specific number of users
locust -f locust/locustfile.py -u 50 -r 5
```

## Notes

- The test automatically creates users before running tests
- Each user creates their own test data (itineraries)
- Wait time between requests is set to 1-3 seconds per user
- The test will continue until manually stopped (or until the specified time limit in headless mode)

## Troubleshooting

If you encounter issues:
1. Make sure the application is running and accessible
2. Check that the database services (PostgreSQL and MongoDB) are running
3. Verify the API endpoints match your application's routes
4. Check the console output for detailed error messages
