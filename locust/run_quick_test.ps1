#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Extreme Load Test - 1000 Users Stress Test for CloudAppDev Microservices
    
.DESCRIPTION
    Runs an extreme stress load test that:
    - Ramps up from 20 to 1000 users over 90 seconds
    - Maintains 1000 users for 2 minutes
    - Total duration: 3.5 minutes
    
    Maximum intensity testing for system bottleneck identification
    
.EXAMPLE
    .\run_quick_test.ps1
    
.EXAMPLE
    # Run in headless mode (no web UI)
    .\run_quick_test.ps1 -Headless
#>

param(
    [switch]$Headless,
    [string]$TargetHost = "http://localhost:3000",
    [string]$LogDir = "locust/reports"
)

# Ensure reports directory exists
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$reportFile = "$LogDir/quick_test_$timestamp.html"

Write-Host "`n$('='*80)"
Write-Host "CLOUDAPPDEV FIREBASE-OPTIMIZED LOAD TEST"
Write-Host "$('='*80)"
Write-Host "Target: $TargetHost"
Write-Host "Test Profile: 1000 Users - Firebase Rate-Limit Friendly"
Write-Host "  - Start: 10 users"
Write-Host "  - Peak: 1000 users"
Write-Host "  - Ramp: 5 minutes (3 users/sec = ~180/min)"
Write-Host "  - Peak Duration: 2 minutes"
Write-Host "  - Total: 7 minutes"
Write-Host "  - Registration: 1.5-3.5s delays + 60s timeout"
Write-Host "  - Fetch Retries: 5 attempts with exponential backoff"
Write-Host "$('='*80)"
Write-Host "Firebase Rate Limit: ~400 registrations/min (below limit)"
Write-Host "$('='*80)`n"

# Build locust command
$locustCmd = @(
    "locust",
    "-f locust/locustfile_microservices.py",
    "--host=$TargetHost",
    "--html=$reportFile"
)

if ($Headless) {
    $locustCmd += "--headless"
    Write-Host "Running in headless mode..."
}
else {
    Write-Host "Web UI will be available at: http://localhost:8089"
    Write-Host "Press Ctrl+C to stop the test`n"
}

# Set environment variable for simple shape
$env:LOCUST_SHAPE = "simple"

# Run the load test
& locust -f locust/locustfile_microservices.py --host=$TargetHost --html=$reportFile @($Headless ? @("--headless") : @())

Write-Host "`n$('='*80)"
Write-Host "TEST COMPLETED"
Write-Host "Report saved to: $reportFile"
Write-Host "$('='*80)`n"
