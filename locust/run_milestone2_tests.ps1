<![CDATA[# Milestone 2 Performance Testing Script
# ========================================
# This script runs all required performance tests for Milestone 2

param(
    [Parameter(Mandatory=$false)]
    [string]$Host = "http://localhost:8000",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("periodic-low", "periodic-high", "lifetime", "all")]
    [string]$TestType = "all"
)

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "  Milestone 2 Performance Testing - Microservices Architecture" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Target Host: $Host" -ForegroundColor Yellow
Write-Host "Test Type: $TestType" -ForegroundColor Yellow
Write-Host ""

# Create reports directory
$reportsDir = "locust/reports"
if (!(Test-Path $reportsDir)) {
    New-Item -ItemType Directory -Path $reportsDir | Out-Null
}

# Function to run a test
function Run-LoadTest {
    param(
        [string]$TestName,
        [int]$Users,
        [int]$SpawnRate,
        [string]$RunTime,
        [string]$Description
    )
    
    Write-Host "---------------------------------------------------------------------" -ForegroundColor Green
    Write-Host "Running: $TestName" -ForegroundColor Green
    Write-Host "Description: $Description" -ForegroundColor White
    Write-Host "Users: $Users | Spawn Rate: $SpawnRate/s | Duration: $RunTime" -ForegroundColor White
    Write-Host "---------------------------------------------------------------------" -ForegroundColor Green
    Write-Host ""
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $reportName = "${TestName}_${timestamp}"
    
    # Run Locust in headless mode
    locust -f locust/locustfile_microservices.py `
        --host=$Host `
        --users $Users `
        --spawn-rate $SpawnRate `
        --run-time $RunTime `
        --headless `
        --html="$reportsDir/${reportName}.html" `
        --csv="$reportsDir/${reportName}"
    
    Write-Host ""
    Write-Host "✓ Test completed: $reportName" -ForegroundColor Green
    Write-Host ""
    Start-Sleep -Seconds 5
}

# 5.1 Periodic Workload Tests
# ============================

if ($TestType -eq "periodic-low" -or $TestType -eq "all") {
    Write-Host ""
    Write-Host "╔═══════════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
    Write-Host "║  5.1.1 Periodic Workload - Low Demand (100 peak / 10 low)        ║" -ForegroundColor Magenta
    Write-Host "╚═══════════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
    Write-Host ""
    
    # Ramp up to peak
    Run-LoadTest `
        -TestName "periodic_100users_peak" `
        -Users 100 `
        -SpawnRate 10 `
        -RunTime "5m" `
        -Description "Peak load: 100 concurrent users"
    
    # Low demand period
    Run-LoadTest `
        -TestName "periodic_10users_low" `
        -Users 10 `
        -SpawnRate 2 `
        -RunTime "3m" `
        -Description "Low demand: 10 concurrent users"
    
    # Ramp up to peak again
    Run-LoadTest `
        -TestName "periodic_100users_peak2" `
        -Users 100 `
        -SpawnRate 10 `
        -RunTime "5m" `
        -Description "Peak load again: 100 concurrent users"
}

if ($TestType -eq "periodic-high" -or $TestType -eq "all") {
    Write-Host ""
    Write-Host "╔═══════════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
    Write-Host "║  5.1.2 Periodic Workload - High Demand (1000 peak / 20 low)      ║" -ForegroundColor Magenta
    Write-Host "╚═══════════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
    Write-Host ""
    
    # Ramp up to high peak
    Run-LoadTest `
        -TestName "periodic_1000users_peak" `
        -Users 1000 `
        -SpawnRate 50 `
        -RunTime "10m" `
        -Description "High peak load: 1000 concurrent users"
    
    # Low demand period
    Run-LoadTest `
        -TestName "periodic_20users_low" `
        -Users 20 `
        -SpawnRate 2 `
        -RunTime "3m" `
        -Description "Low demand: 20 concurrent users"
    
    # Ramp up to high peak again
    Run-LoadTest `
        -TestName "periodic_1000users_peak2" `
        -Users 1000 `
        -SpawnRate 50 `
        -RunTime "10m" `
        -Description "High peak load again: 1000 concurrent users"
}

# 5.2 Once-in-a-lifetime Workload Tests
# ======================================

if ($TestType -eq "lifetime" -or $TestType -eq "all") {
    Write-Host ""
    Write-Host "╔═══════════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
    Write-Host "║  5.2 Once-in-a-lifetime Workload (Constant Growth)               ║" -ForegroundColor Magenta
    Write-Host "╚═══════════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
    Write-Host ""
    
    # Base load
    Write-Host "Starting with base load (10 users)..." -ForegroundColor Yellow
    Run-LoadTest `
        -TestName "lifetime_base_10users" `
        -Users 10 `
        -SpawnRate 2 `
        -RunTime "2m" `
        -Description "Base load: 10 concurrent users"
    
    # Gradual increase scenarios
    $increments = @(
        @{Users=50; SpawnRate=5; Time="5m"; Description="Gradual growth to 50 users"},
        @{Users=100; SpawnRate=5; Time="5m"; Description="Growth to 100 users"},
        @{Users=250; SpawnRate=10; Time="5m"; Description="Growth to 250 users"},
        @{Users=500; SpawnRate=10; Time="10m"; Description="Growth to 500 users"},
        @{Users=1000; SpawnRate=15; Time="10m"; Description="Growth to 1000 users"},
        @{Users=1500; SpawnRate=20; Time="10m"; Description="Growth to 1500 users"},
        @{Users=2000; SpawnRate=20; Time="10m"; Description="Growth to 2000 users (stress test)"}
    )
    
    foreach ($increment in $increments) {
        Write-Host ""
        Write-Host "Testing: $($increment.Description)" -ForegroundColor Yellow
        
        try {
            Run-LoadTest `
                -TestName "lifetime_$($increment.Users)users" `
                -Users $increment.Users `
                -SpawnRate $increment.SpawnRate `
                -RunTime $increment.Time `
                -Description $increment.Description
            
            Write-Host "✓ System survived $($increment.Users) users" -ForegroundColor Green
            
        } catch {
            Write-Host "✗ System failed at $($increment.Users) users" -ForegroundColor Red
            Write-Host "Breaking point found!" -ForegroundColor Red
            break
        }
        
        # Brief cooldown between tests
        Write-Host "Cooldown period (30s)..." -ForegroundColor Gray
        Start-Sleep -Seconds 30
    }
}

# Summary
Write-Host ""
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "  Performance Testing Completed!" -ForegroundColor Cyan
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Reports saved to: $reportsDir" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps for Milestone 2 analysis:" -ForegroundColor White
Write-Host "  1. Review HTML reports in $reportsDir" -ForegroundColor Gray
Write-Host "  2. Analyze response times and failure rates" -ForegroundColor Gray
Write-Host "  3. Document workload thresholds:" -ForegroundColor Gray
Write-Host "     - Without degradation" -ForegroundColor Gray
Write-Host "     - With degradation" -ForegroundColor Gray
Write-Host "     - Failure threshold" -ForegroundColor Gray
Write-Host "  4. Monitor resource utilization (kubectl top / Cloud Console)" -ForegroundColor Gray
Write-Host "  5. Compare with monolithic architecture results" -ForegroundColor Gray
Write-Host ""
Write-Host "For resource monitoring, run:" -ForegroundColor White
Write-Host "  kubectl top pods" -ForegroundColor Cyan
Write-Host "  kubectl top nodes" -ForegroundColor Cyan
Write-Host ""
]]>