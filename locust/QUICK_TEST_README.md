# CloudAppDev Load Testing - Quick 5-Minute Test

## Overview

Das Load-Test-Skript wurde vereinfacht und reduziert auf **eine Single Version**: einen einfachen **5-Minuten-Test mit stark skalierenden Usern**.

## Test Profile

### Simple 5-Minute Scaling Test (Default)

- **Dauer**: 5 Minuten
- **Startbenutzer**: 5
- **Peak-Benutzer**: 100
- **Ramp-Phase**: 4 Minuten (5 Benutzer/Sekunde - conservativ für lokale Docker)
- **Peak-Phase**: 1 Minute bei 100 Benutzern
- **Optimiert für**: Lokale Docker-Umgebungen mit begrenzten Ressourcen

### Test Flow

```
Benutzer
  500 ┌─────────────┐
      │    PEAK     │
      │   1 min     │
      │            │
      │          ╱╱
      │        ╱╱
      │      ╱╱
      │    ╱╱
   10 └╱╱
      └─────────────────┘
      0    4min    5min
```

## How to Run

### Option 1: Mit PowerShell Script (Empfohlen)

```powershell
# Mit Web UI
.\locust\run_quick_test.ps1

# Headless Mode (für CI/CD)
.\locust\run_quick_test.ps1 -Headless
```

### Option 2: Direkter Locust Befehl

```bash
# Mit Web UI (http://localhost:8089)
locust -f locust/locustfile_microservices.py --host=http://localhost:3000

# Headless Mode
locust -f locust/locustfile_microservices.py --host=http://localhost:3000 --headless
```

### Option 3: Mit HTML Report

```bash
locust -f locust/locustfile_microservices.py \
    --host=http://localhost:3000 \
    --headless \
    --html=locust/reports/test_report.html
```

## Erwartete Ausgabe

Der Test produziert:
- **Live Statistiken** im Web UI oder Terminal
- **HTML Report** in `locust/reports/`
- **Textausgabe** mit Zusammenfassung:
  - Total Requests
  - Total Failures
  - Average Response Time
  - Response Time Percentiles (50th, 75th, 90th, 95th, 99th)

## Metriken während des Tests

Die wichtigsten Metriken im Dashboard:

| Metrik | Bedeutung |
|--------|-----------|
| **RPS** (Requests/sec) | Anzahl Anfragen pro Sekunde |
| **Response Time** | Durchschnittliche Antwortzeit |
| **Failures** | Anzahl fehlgeschlagener Anfragen |
| **User Count** | Aktuelle Benutzeranzahl |

## Umgebungsvariablen

```bash
# Standard: Simple 5-Minute Test (Default)
$env:LOCUST_SHAPE = "simple"
locust -f locust/locustfile_microservices.py --host=http://localhost:3000
```

## User Journeys

Das Skript simuliert 3 Benutzertypen:

### 1. New User Journey (20% Traffic)
- Registrierung
- Durchsuchen populärer Itineraries
- Suche nach Destinationen
- Ansicht von Itinerary-Details
- Liken und Kommentieren
- Erste Itinerary erstellen

### 2. Active User Journey (30% Traffic)
- Durchsuchen und Engagement
- Eigene Itineraries prüfen
- Neue Itineraries erstellen
- Details ansehen und kommentieren

### 3. Casual Browser Journey (50% Traffic)
- Schnelles Durchsuchen
- Destination-Suche
- Populäre Itineraries anschauen
- Gelegenheitliche Registrierung (20%)

## Performance Thresholds

Basierend auf den Test-Ergebnissen können folgende Thresholds überprüft werden:

- **Healthy**: P95 Response Time < 500ms, Error Rate < 1%
- **Degraded**: P95 Response Time < 2000ms, Error Rate < 5%
- **Failed**: P95 Response Time > 2000ms oder Error Rate > 5%

## Test Report Speichert

HTML Reports werden automatisch gespeichert in:
```
locust/reports/quick_test_YYYYMMDD_HHMMSS.html
```

## Tipps

1. **Stellen Sie sicher, dass die Microservices laufen**:
   ```bash
   docker-compose -f docker-compose.microservices.yml up -d
   ```

2. **Überwachen Sie die Logs während des Tests**:
   ```bash
   # In separatem Terminal
   docker-compose logs -f
   ```

3. **Verwenden Sie Headless Mode für automatisierte Tests**:
   ```bash
   .\locust\run_quick_test.ps1 -Headless
   ```

4. **Reports analysieren**:
   - Öffnen Sie die HTML-Datei im Browser
   - Suchen Sie nach Bottlenecks
   - Vergleichen Sie verschiedene Test-Läufe

## Fehlerbehebung

### Fehler: "Connection refused"
- Stellen Sie sicher, dass der Next.js Frontend auf Port 3000 läuft
- Überprüfen Sie: `docker-compose logs api`

### Fehler: "ModuleNotFoundError: locust"
- Installieren Sie Requirements: `pip install -r locust/requirements.txt`

### Zu viele Fehler während des Tests
- Reduzieren Sie die Peak-User in [SimpleScalingShape](locustfile_microservices.py#L69)
- Überprüfen Sie Microservice Health: `http://localhost:3000/health`

## Original Test Varianten (veraltet)

Die Original-Versionen sind noch im Code vorhanden aber deaktiviert:
- `PeriodicShapeA`: 100 Peak / 10 Low (veraltet)
- `PeriodicShapeB`: 1000 Peak / 20 Low (veraltet)
- `OnceInALifetimeShape`: Continuous Growth (veraltet)

Diese können reaktiviert werden, falls benötigt.
