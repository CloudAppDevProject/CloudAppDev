# ============================================================================
# CloudAppDev Load Testing - Automated Test Scenarios
# PowerShell Script for Windows
# ============================================================================

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("periodic", "once-in-a-lifetime")]
    [string]$Workload = "periodic",
    
    [Parameter(Mandatory=$false)]
    [string]$TargetHost = "http://localhost:3000",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipSeeding
)

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "CloudAppDev Load Testing - Automated Scenarios" -ForegroundColor Cyan
Write-Host "============================================================================`n" -ForegroundColor Cyan

# Ensure reports directory exists
$reportsDir = "locust\reports"
if (-not (Test-Path $reportsDir)) {
    New-Item -ItemType Directory -Path $reportsDir | Out-Null
    Write-Host "Created reports directory: $reportsDir`n" -ForegroundColor Green
}

# Check if application is running
Write-Host "Checking if application is accessible..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$TargetHost/api/user" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✓ Application is running and accessible`n" -ForegroundColor Green
} catch {
    Write-Host "✗ ERROR: Cannot reach application at $TargetHost" -ForegroundColor Red
    Write-Host "  Please ensure the application is running:" -ForegroundColor Red
    Write-Host "  npm run dev  OR  docker-compose up`n" -ForegroundColor Yellow
    exit 1
}

# Seed database if needed
if (-not $SkipSeeding) {
    Write-Host "Would you like to seed the database with test data? (recommended)" -ForegroundColor Yellow
    Write-Host "This will clear existing data and create realistic seed data." -ForegroundColor Yellow
    $seed = Read-Host "Seed database? (y/n)"
    
    if ($seed -eq "y" -or $seed -eq "Y") {
        Write-Host "`nSeeding database..." -ForegroundColor Yellow
        npm run db:seed
        Write-Host "✓ Database seeded successfully`n" -ForegroundColor Green
    }
}

# Function to run a load test scenario
function Run-LoadTest {
    param(
        [string]$Name,
        [int]$Users,
        [int]$SpawnRate,
        [string]$Duration,
        [string]$Description
    )
    
    Write-Host "============================================================================" -ForegroundColor Cyan
    Write-Host "Running: $Name" -ForegroundColor Cyan
    Write-Host "============================================================================" -ForegroundColor Cyan
    Write-Host "Description: $Description" -ForegroundColor White
    Write-Host "Parameters:" -ForegroundColor White
    Write-Host "  - Users: $Users" -ForegroundColor White
    Write-Host "  - Spawn Rate: $SpawnRate users/sec" -ForegroundColor White
    Write-Host "  - Duration: $Duration" -ForegroundColor White
    Write-Host "  - Host: $TargetHost`n" -ForegroundColor White
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $reportPrefix = "locust\reports\${Name}_${timestamp}"
    
    Write-Host "Starting load test..." -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop the test early`n" -ForegroundColor Gray
    
    # Run locust
    locust -f locust\locustfile.py `
        --headless `
        -u $Users `
        -r $SpawnRate `
        -t $Duration `
        --host=$TargetHost `
        --csv=$reportPrefix `
        --html="${reportPrefix}.html"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✓ Test completed successfully!" -ForegroundColor Green
        Write-Host "Reports saved to:" -ForegroundColor Green
        Write-Host "  - HTML: ${reportPrefix}.html" -ForegroundColor White
        Write-Host "  - CSV Stats: ${reportPrefix}_stats.csv" -ForegroundColor White
        Write-Host "  - CSV Failures: ${reportPrefix}_failures.csv`n" -ForegroundColor White
        
        # Generate enhanced report with graphs
        Write-Host "Generating enhanced report with graphs..." -ForegroundColor Yellow
        python locust\generate_enhanced_report.py $reportPrefix
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n✅ Enhanced report generated: ${reportPrefix}_enhanced.html" -ForegroundColor Green
            Write-Host "   Open this file in your browser for interactive charts!`n" -ForegroundColor Cyan
        }
    } else {
        Write-Host "`n✗ Test encountered errors. Check logs above.`n" -ForegroundColor Red
    }
}

# Execute workload based on selection
switch ($Workload) {
    "periodic" {
        Write-Host "`n📊 PERIODIC WORKLOAD - Normal Usage Patterns" -ForegroundColor Cyan
        Write-Host "Simulating regular daily usage with mixed user types" -ForegroundColor White
        Write-Host "User Mix: 50% Casual Browsers, 30% Active Users, 20% New Users`n" -ForegroundColor White
        
        Run-LoadTest `
            -Name "periodic_workload" `
            -Users 100 `
            -SpawnRate 10 `
            -Duration "10m" `
            -Description "Periodic workload - normal recurring usage patterns"
    }
    
    "once-in-a-lifetime" {
        Write-Host "`n🚀 ONCE-IN-A-LIFETIME WORKLOAD - Viral Spike Event" -ForegroundColor Magenta
        Write-Host "Simulating exceptional traffic spike (Social Media, Press Coverage)" -ForegroundColor White
        Write-Host "High concurrent users, fast spawning, intensive browsing`n" -ForegroundColor White
        
        Write-Host "⚠️  This test will spawn 1000 users EXTREMELY quickly!" -ForegroundColor Yellow
        Write-Host "This is a stress test - make sure your system can handle the load.`n" -ForegroundColor Yellow
        
        $continue = Read-Host "Continue with spike test? (y/n)"
        if ($continue -eq "y" -or $continue -eq "Y") {
            Run-LoadTest `
                -Name "once_in_a_lifetime_workload" `
                -Users 1000 `
                -SpawnRate 200 `
                -Duration "3m" `
                -Description "Once-in-a-lifetime workload - extreme viral traffic spike with 1000 users"
        } else {
            Write-Host "Once-in-a-lifetime test cancelled.`n" -ForegroundColor Yellow
        }
    }
}

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "Load Testing Complete" -ForegroundColor Cyan
Write-Host "============================================================================`n" -ForegroundColor Cyan

Write-Host "📊 Reports wurden in locust\reports\ gespeichert" -ForegroundColor Green
Write-Host "Öffnen Sie die HTML-Dateien im Browser für detaillierte Ergebnisse.`n" -ForegroundColor White

Write-Host "Nächste Schritte:" -ForegroundColor Yellow
Write-Host "  1. Überprüfen Sie die generierten Reports" -ForegroundColor White
Write-Host "  2. Identifizieren Sie Performance-Bottlenecks" -ForegroundColor White
Write-Host "  3. Optimieren Sie die Anwendung" -ForegroundColor White
Write-Host "  4. Wiederholen Sie die Tests nach Optimierungen`n" -ForegroundColor White
