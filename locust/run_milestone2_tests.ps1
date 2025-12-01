# Milestone 2 Performance Testing Script
# ========================================
# This script runs all required performance tests for Milestone 2
#
# Requirements (from Exercise 5):
# 5.1 Periodic Workload:
#   - Scenario A: 100 concurrent users (peak) / 10 users (low demand)
#   - Scenario B: 1000 concurrent users (peak) / 20 users (low demand)
#
# 5.2 Once-in-a-lifetime Workload:
#   - Start with 10 users, constantly add new users
#   - Determine: no degradation, with degradation, failure thresholds

param(
    [Parameter(Mandatory=$false)]
    [string]$TargetHost = "http://localhost:3000",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("periodic-a", "periodic-b", "lifetime", "lifetime-slow", "lifetime-fast", "all")]
    [string]$TestType = "all",
    
    [Parameter(Mandatory=$false)]
    [int]$GrowthRate = 20,  # Users per minute for lifetime test
    
    [Parameter(Mandatory=$false)]
    [int]$MaxUsers = 3000,  # Max users for lifetime test
    
    [Parameter(Mandatory=$false)]
    [int]$MaxDuration = 1800  # 30 minutes default for lifetime test
)

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "  Milestone 2 Performance Testing - Microservices Architecture" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Target Host: $TargetHost" -ForegroundColor Yellow
Write-Host "Note: Tests use Next.js proxy routes (/api/*) at http://localhost:3000" -ForegroundColor Cyan
Write-Host "      (API Gateway routes are /api/v1/* at http://localhost:8000)" -ForegroundColor Cyan
Write-Host "Test Type: $TestType" -ForegroundColor Yellow
Write-Host ""

# Create reports directory
$reportsDir = "locust/reports"
if (!(Test-Path $reportsDir)) {
    New-Item -ItemType Directory -Path $reportsDir | Out-Null
}

# Function to run a test with dedicated locustfile
function Run-ScenarioTest {
    param(
        [string]$TestName,
        [string]$LocustFile,
        [string]$Description
    )

    Write-Host "---------------------------------------------------------------------" -ForegroundColor Green
    Write-Host "Running: $TestName" -ForegroundColor Green
    Write-Host "Description: $Description" -ForegroundColor White
    Write-Host "Locustfile: $LocustFile" -ForegroundColor White
    Write-Host "---------------------------------------------------------------------" -ForegroundColor Green
    Write-Host ""

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $reportName = "${TestName}_${timestamp}"

    # Run Locust with dedicated scenario file
    Write-Host "Running Locust with scenario-specific file: $LocustFile" -ForegroundColor Gray
    Write-Host ""

    & locust -f $LocustFile `
        --host=$TargetHost `
        --headless `
        --html="$reportsDir/${reportName}.html" `
        --csv="$reportsDir/${reportName}"

    Write-Host ""
    Write-Host "Test completed: $reportName" -ForegroundColor Green
    Write-Host "HTML Report: $reportsDir/${reportName}.html" -ForegroundColor Cyan
    Write-Host ""
}

# ============================================================================
# 5.1 PERIODIC WORKLOAD TESTS
# ============================================================================

if ($TestType -eq "periodic-a" -or $TestType -eq "all") {
    Write-Host ""
    Write-Host "======================================================================" -ForegroundColor Magenta
    Write-Host "  5.1.1 Periodic Workload - Scenario A (100 peak / 10 low)" -ForegroundColor Magenta
    Write-Host "======================================================================" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "Pattern: Low(10) -> Ramp up -> Peak(100) -> Ramp down -> Low(10)" -ForegroundColor White
    Write-Host "Duration: ~14 minutes (2 full cycles)" -ForegroundColor White
    Write-Host ""

    Run-ScenarioTest `
        -TestName "periodic_scenario_a" `
        -LocustFile "locust/locustfile_scenario_a.py" `
        -Description "Periodic workload: 100 users peak, 10 users low demand (2 cycles)"

    Write-Host "Cooldown period (30s)..." -ForegroundColor Gray
    Start-Sleep -Seconds 30
}

if ($TestType -eq "periodic-b" -or $TestType -eq "all") {
    Write-Host ""
    Write-Host "======================================================================" -ForegroundColor Magenta
    Write-Host "  5.1.2 Periodic Workload - Scenario B (1000 peak / 20 low)" -ForegroundColor Magenta
    Write-Host "======================================================================" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "Pattern: Low(20) -> Ramp up -> Peak(1000) -> Ramp down -> Low(20)" -ForegroundColor White
    Write-Host "Duration: ~30 minutes (2 full cycles)" -ForegroundColor White
    Write-Host ""

    Run-ScenarioTest `
        -TestName "periodic_scenario_b" `
        -LocustFile "locust/locustfile_scenario_b.py" `
        -Description "Periodic workload: 1000 users peak, 20 users low demand (2 cycles)"

    Write-Host "Cooldown period (60s)..." -ForegroundColor Gray
    Start-Sleep -Seconds 60
}

# ============================================================================
# 5.2 ONCE-IN-A-LIFETIME WORKLOAD TESTS
# ============================================================================

if ($TestType -eq "lifetime" -or $TestType -eq "all") {
    Write-Host ""
    Write-Host "======================================================================" -ForegroundColor Magenta
    Write-Host "  5.2 Once-in-a-Lifetime Workload (Continuous Growth)" -ForegroundColor Magenta
    Write-Host "======================================================================" -ForegroundColor Magenta
    Write-Host ""
    Write-Host "Pattern: Start with 10 users, constantly add $GrowthRate users/minute" -ForegroundColor White
    Write-Host "Max Users: $MaxUsers | Max Duration: $($MaxDuration/60) minutes" -ForegroundColor White
    Write-Host ""
    Write-Host "Goal: Find thresholds for:" -ForegroundColor Yellow
    Write-Host "  - Without degradation (p95 < 500ms, error < 1%)" -ForegroundColor White
    Write-Host "  - With degradation (p95 < 2000ms, error < 5%)" -ForegroundColor White
    Write-Host "  - Failure (p95 >= 2000ms or error >= 5%)" -ForegroundColor White
    Write-Host ""

    Run-ScenarioTest `
        -TestName "lifetime_growth_${GrowthRate}users_per_min" `
        -LocustFile "locust/locustfile_scenario_lifetime.py" `
        -Description "Once-in-a-lifetime: Continuous growth from 10 users at $GrowthRate users/min"
}

# Additional lifetime test variations
if ($TestType -eq "lifetime-slow") {
    Write-Host ""
    Write-Host "======================================================================" -ForegroundColor Magenta
    Write-Host "  5.2 Once-in-a-Lifetime - Slow Growth (10 users/min)" -ForegroundColor Magenta
    Write-Host "======================================================================" -ForegroundColor Magenta
    Write-Host ""

    Run-ScenarioTest `
        -TestName "lifetime_slow_growth" `
        -LocustFile "locust/locustfile_scenario_lifetime.py" `
        -Description "Once-in-a-lifetime: Slow growth (10 users/min)"
}

if ($TestType -eq "lifetime-fast") {
    Write-Host ""
    Write-Host "======================================================================" -ForegroundColor Magenta
    Write-Host "  5.2 Once-in-a-Lifetime - Fast Growth (50 users/min)" -ForegroundColor Magenta
    Write-Host "======================================================================" -ForegroundColor Magenta
    Write-Host ""

    Run-ScenarioTest `
        -TestName "lifetime_fast_growth" `
        -LocustFile "locust/locustfile_scenario_lifetime.py" `
        -Description "Once-in-a-lifetime: Fast growth (50 users/min)"
}

# ============================================================================
# SUMMARY
# ============================================================================

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "  Performance Testing Completed!" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Reports saved to: $reportsDir" -ForegroundColor Yellow
Write-Host ""
Write-Host "Test Scenarios Executed:" -ForegroundColor White

if ($TestType -eq "periodic-a" -or $TestType -eq "all") {
    Write-Host "  [x] Periodic Scenario A (100/10 users)" -ForegroundColor Green
}
if ($TestType -eq "periodic-b" -or $TestType -eq "all") {
    Write-Host "  [x] Periodic Scenario B (1000/20 users)" -ForegroundColor Green
}
if ($TestType -eq "lifetime" -or $TestType -eq "all") {
    Write-Host "  [x] Once-in-a-Lifetime (continuous growth)" -ForegroundColor Green
}
if ($TestType -eq "lifetime-slow") {
    Write-Host "  [x] Once-in-a-Lifetime Slow Growth (10 users/min)" -ForegroundColor Green
}
if ($TestType -eq "lifetime-fast") {
    Write-Host "  [x] Once-in-a-Lifetime Fast Growth (50 users/min)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Milestone 2 Analysis Checklist:" -ForegroundColor White
Write-Host "  1. Review HTML reports for response time graphs" -ForegroundColor Gray
Write-Host "  2. Check CSV files for detailed metrics" -ForegroundColor Gray
Write-Host "  3. Document thresholds found:" -ForegroundColor Gray
Write-Host "     - Workload without degradation (user count + metrics)" -ForegroundColor Gray
Write-Host "     - Workload with degradation (user count + metrics)" -ForegroundColor Gray
Write-Host "     - Failure threshold (user count when system failed)" -ForegroundColor Gray
Write-Host "  4. Compare with Milestone 1 monolithic results" -ForegroundColor Gray
Write-Host "  5. Monitor resource utilization during tests:" -ForegroundColor Gray
Write-Host "     kubectl top pods" -ForegroundColor Cyan
Write-Host "     kubectl top nodes" -ForegroundColor Cyan
Write-Host ""

# Quick guide for individual tests
Write-Host "Quick Commands for Individual Tests:" -ForegroundColor White
Write-Host "  # Periodic Scenario A only:" -ForegroundColor Gray
Write-Host "  .\locust\run_milestone2_tests.ps1 -TestType periodic-a" -ForegroundColor Cyan
Write-Host ""
Write-Host "  # Periodic Scenario B only:" -ForegroundColor Gray
Write-Host "  .\locust\run_milestone2_tests.ps1 -TestType periodic-b" -ForegroundColor Cyan
Write-Host ""
Write-Host "  # Once-in-a-Lifetime with custom growth rate:" -ForegroundColor Gray
Write-Host "  .\locust\run_milestone2_tests.ps1 -TestType lifetime -GrowthRate 30" -ForegroundColor Cyan
Write-Host ""
Write-Host "  # Test against production:" -ForegroundColor Gray
Write-Host "  .\locust\run_milestone2_tests.ps1 -TargetHost https://cloudappdev.site -TestType all" -ForegroundColor Cyan
Write-Host ""
# End of Script
