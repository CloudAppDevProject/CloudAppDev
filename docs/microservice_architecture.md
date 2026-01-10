# Microservices
This documents how the pods and namespaces communicate with each other and 

## Glossary

### Client 
A business client that registers and rents the software.\

### User
An individual wanting to plan their trip or vacation.\

### Full Stack Deployment
A complete and functioning stack of services and pods to provide the 
desired functionality of the application. This includes:
- Website
- Api Gateway
- Itinerary Service & Databases
- User Service & Databases
- Social Service & Databases
- Email Cron job

--- 

## Namespaces
There are three permanent namespaces and multiple flexible namespaces for enterprise clients.
Each enterprise client gets their own namespace.\ 
Cloudappdev, Free and Standard are permanent

### Default
Contains all pods and services shared across all namespaces.
This includes: 
- Tenant Service
- Travel Info Service
- Namespace Service

### Cloudappdev
Contains the Hub frontend. 

### Free
Contains a full stack deployment of the application.

### Standard
Contains a full stack deployment of the application.

### Enterprise
Contains a full stack deployment of the application.

--- 

## Tiers
The possible subscription tiers the client has to choose from.\
Each tier has certain benefits and drawbacks.

### Free
Offers no benefits whatsoever. The client can register and get the full functionality\
without any scaling capabilities. The data is software separated by tenant.\
Performance is impacted by other clients. 

### Standard
Offers low scaling capabilities. The Client can register and get the full functionality.\
The client can expect his website to perform decently for a moderate amount of users.\
There are no customization options in this tier.
Performance is impacted by other clients. 

### Enterprise
Offers full data separation in its own environment and full scaling capabilities.\
The client has always a well working environment and can expect the website to always be\
available and well working.

--- 

## Services & Jobs

### Tenant Service
Responsible for managing the registered client as tenants. 

### User Service
Manages registered users. 

### Itinerary service
Manages itineraries.

### Social Service
Manages the social interactions between users. 
Likes etc.

### Newsletter Job
Once every so often sends out an email newsletter containing recommendations for the users,\
that are subscribed to the email mailing list.

### Namespace service
Create a new enterprise namespaces with full stack deployments.\
Add new subdomains to cloudflare.
 