# Financial Plan: Travel Itinerary SaaS (Google Cloud Platform)

## 1. Infrastructure Cost Analysis (GCP)
Current monthly expenditures are centered on high-availability services. Kubernetes and Networking represent the primary cost drivers.

| Service | Monthly Cost | Category | Scaling Behavior |
| :--- | :--- | :--- | :--- |
| **Kubernetes Engine** | 62,55 € | Compute | Step-wise (Node pools) |
| **Networking** | 16,83 € | Traffic | Variable (User Activity) |
| **Cloud Monitoring** | 12,14 € | Operations | Semi-Fixed |
| **Cloud SQL** | 10,11 € | Database | Variable (Data Volume) |
| **Other Services** | 1,76 € | Support | Fixed |
| **Total (COGS)** | **103,39 €** | | |

> **Profitability Target:** To maintain a **75% Gross Margin**, the platform requires a minimum monthly revenue of **~415,00 €** based on current burn.

---

## 2. Tiered Pricing Models
The pricing is designed to grow with user value. Dynamic components are calculated using telemetry data from Google Cloud Monitoring.

### Free Tier
* **Target:** Casual users/Hobbyists.
* **Price:** 0,00 € / month.
* **Features:** Own domain, data separation, shared infrastructure.
* **Limits:** 3 Routes, 500MB Image Storage.

### Standard Tier
* **Target:** Power users and frequent travelers.
* **Price:** 9,99 € / month (Base Fee).
* **Dynamic Component:** * +0,05 € per GB over 2GB.
    * +0,10 € per 100 API requests.
* **Features:** Customization options, higher priority support.

### Enterprise Tier
* **Target:** B2B Clients / Agencies.
* **Price:** Custom Quote (Min. 249,00 € / month).
* **Features:** **Dedicated Deployment**, high customization, isolated GKE node pools.
* **Logic:** Pricing covers the overhead of dedicated resource allocation.