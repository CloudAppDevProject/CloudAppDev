#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Quick 5-Minute Load Test for CloudAppDev Microservices
    
.DESCRIPTION
    Runs a simplified load test that:
    - Ramps up from 10 to 500 users over 4 minutes
    - Maintains 500 users for 1 minute
    - Total duration: 5 minutes
    
    Perfect for quick smoke testing and load profile validation
    
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
Write-Host "CLOUDAPPDEV QUICK LOAD TEST"
Write-Host "$('='*80)"
Write-Host "Target: $TargetHost"
Write-Host "Test Profile: Simple 5-Minute Scaling"
Write-Host "  - Start: 5 users"
Write-Host "  - Peak: 100 users"
Write-Host "  - Ramp: 4 minutes (5 users/sec)"
Write-Host "  - Peak Duration: 1 minute"
Write-Host "  - Total: 5 minutes"
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
