## User

### Register User (✅)
As a *traveller* I can register to the site and create a profile
#### Acceptance Criteria

* No credential checking must be implemented (password, etc.)
* Traveller information should contain EMail address and name

### Upload Profile Image (✅)
As a registered traveller I can upload a profile image to my account.
#### Acceptance Criteria
* There is a profile page for the user where I can upload images
* When showing the profile page of an user, show the image of the user.


## Itinerary

### Create Itinerary (✅)
As a *traveller* I can create an itinary which shows transport and accomodation for a trip such that I can view it later.
#### Acceptance Criteria
* An itinary must have at least the following fields:
* Title, e.g. "Family Trip to Norway"
* Destination
* Start date of the trip
* Short description of the trip (max. 80 chars), e.g. "Explore the fjords of southern norway."
* Detail description of the trip (long text).

### View Itinerary (✅)
As a *traveller* I can viey my ititinary such that I have an overview over my travel arrangement.
#### Acceptance Criteria
* When signed in, a list of all my itinaries is shown (title, start date)
* I can select an itinary and the all details are shown

### Search Trips (✅)
As a guest or traveller I can search for itineraries of other travellers.
#### Acceptance Criteria
* I can input various search criteria
* The result is shown in a list

### Add Travel locations (✅)
As a traveller I can add locations to a itinerary
#### Acceptance Criteria
* The location has a date range (from, to), a name and a short description.
* I can add images to that location.

## Travel locations and Maps
As a traveller I can choose locations directly from a map when adding a location to my itinerary
#### Acceptance Criteria
* When adding a location, I can open a map view
* I can select a location on the map
* The name of the location is automatically filled in based on the map selection

### Maps Integration
As a traveller I can view the locations of my itinerary on a map
#### Acceptance Criteria
* On the itinerary page there is a map showing all locations of the itinerary
* The map shows markers for each location
* When clicking on a marker, the name and date range of the location is shown.


## Social Interaction

### Like and comment (✅)
As a traveller I can like and comment the trip of another traveller
#### Acceptance Criteria
* I can like (only once) the trip of another traveller
* I can optionally add a comment to the like
* On the travel plan page the number of likes are shown
* On the travel plan page I can optionally show the comments

### Personalized Newsletter
As a traveler with specific interests, I want to receive a personalized newsletter containing content shared by other travelers with similar profiles, so that I can get relevant inspiration for my upcoming or ongoing trips.
#### Acceptance Criteria
* The newsletter content is based on my interests, destinations, or past travel behavior.  
* Content is sourced from other travelers with overlapping interests or similar itineraries.  
* I can adjust the frequency of the newsletter or opt out entirely.

### Recommendation Engine
As a traveler, I want activity recommendations tailored to my interests and travel context, so that I can discover suitable activities without spending time searching.
#### Acceptance Criteria
* Recommendations consider location, travel dates, preferences, and trip duration.
* I can mark recommendations as relevant or irrelevant.  
* Future recommendations update based on my feedback.


## Travel Information

### Weather-Based Insights
As a traveler, I want weather information enhanced with practical advice related to my itinerary, so that I can plan my activities appropriately and avoid disruptions.
#### Acceptance Criteria
* The app displays weather forecasts for each destination and date on my itinerary.  
* Weather warnings or severe conditions are clearly highlighted.
* Practical advice is provided based on weather conditions (e.g., "Carry an umbrella," "Avoid outdoor activities due to high UV index").