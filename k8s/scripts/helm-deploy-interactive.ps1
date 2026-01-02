################################################################################
# CloudAppDev - Interactive Helm Deployment Script (PowerShell)
# Fully interactive by default - walks through all steps with user input
################################################################################

param(
    [Parameter(Mandatory=$false)]
    [switch]$Help
)

# Color functions
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Type = "Info"
    )

    switch ($Type) {
        "Info"    { Write-Host "[INFO] " -ForegroundColor Green -NoNewline; Write-Host $Message }
        "Warn"    { Write-Host "[WARN] " -ForegroundColor Yellow -NoNewline; Write-Host $Message }
        "Error"   { Write-Host "[ERROR] " -ForegroundColor Red -NoNewline; Write-Host $Message }
        "Header"  { Write-Host "`n━━━ $Message ━━━`n" -ForegroundColor Cyan }
        "Detail"  { Write-Host "  → " -ForegroundColor Blue -NoNewline; Write-Host $Message }
    }
}

function Write-Separator {
    Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
}

function Confirm-Action {
    param(
        [string]$Prompt,
        [bool]$DefaultYes = $false
    )

    $choices = @(
        [System.Management.Automation.Host.ChoiceDescription]::new("&Yes", "Proceed")
        [System.Management.Automation.Host.ChoiceDescription]::new("&No", "Cancel")
    )

    $defaultChoice = if ($DefaultYes) { 0 } else { 1 }
    $decision = $Host.UI.PromptForChoice("", $Prompt, $choices, $defaultChoice)

    return ($decision -eq 0)
}

# Variables
$script:Environment = ""
$script:Namespace = ""
$script:ReleaseName = ""
$script:ChartPath = ""
$script:ValuesFile = ""
$script:DryRun = $false
$script:Action = ""

################################################################################
# Step 1: Check Prerequisites
################################################################################

function Test-Prerequisites {
    Clear-Host
    Write-Separator
    Write-Host "   CloudAppDev - Helm Deployment Wizard" -ForegroundColor Cyan
    Write-Separator

    Write-ColorOutput "STEP 1: Checking Prerequisites" -Type "Header"

    $allOk = $true

    # Check Helm
    Write-Host "Checking Helm... " -NoNewline
    try {
        $helmVersion = (helm version --short 2>$null) -replace ".*:", "" | ForEach-Object { $_.Trim() }
        Write-Host "✓ $helmVersion" -ForegroundColor Green
    } catch {
        Write-Host "✗ Not installed" -ForegroundColor Red
        Write-ColorOutput "Please install Helm 3.x from https://helm.sh/docs/intro/install/" -Type "Error"
        $allOk = $false
    }

    # Check kubectl
    Write-Host "Checking kubectl... " -NoNewline
    try {
        $kubectlVersion = (kubectl version --client -o json 2>$null | ConvertFrom-Json).clientVersion.gitVersion
        Write-Host "✓ $kubectlVersion" -ForegroundColor Green
    } catch {
        Write-Host "✗ Not installed" -ForegroundColor Red
        Write-ColorOutput "Please install kubectl from https://kubernetes.io/docs/tasks/tools/" -Type "Error"
        $allOk = $false
    }

    # Check cluster connection
    Write-Host "Checking cluster connection... " -NoNewline
    try {
        kubectl cluster-info 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Connected" -ForegroundColor Green
        } else {
            Write-Host "✗ Cannot connect" -ForegroundColor Red
            Write-ColorOutput "Cannot connect to Kubernetes cluster. Check your kubeconfig" -Type "Error"
            $allOk = $false
        }
    } catch {
        Write-Host "✗ Cannot connect" -ForegroundColor Red
        $allOk = $false
    }

    if (-not $allOk) {
        Write-Host ""
        Write-ColorOutput "Prerequisites check failed. Please fix the issues above and try again." -Type "Error"
        exit 1
    }

    Write-Host ""
    Write-ColorOutput "All prerequisites met! ✓" -Type "Info"

    Write-Host ""
    Read-Host "Press Enter to continue"
}

################################################################################
# Step 2: Show Cluster Information
################################################################################

function Show-ClusterInfo {
    Clear-Host
    Write-Separator
    Write-ColorOutput "STEP 2: Current Kubernetes Cluster" -Type "Header"

    $currentContext = (kubectl config current-context 2>$null)
    Write-Host "Context: " -NoNewline
    Write-Host $currentContext -ForegroundColor White

    $clusterName = (kubectl config view -o jsonpath="{.contexts[?(@.name=='$currentContext')].context.cluster}" 2>$null)
    Write-Host "Cluster: " -NoNewline
    Write-Host $clusterName -ForegroundColor White

    $clusterServer = (kubectl config view -o jsonpath="{.clusters[?(@.name=='$clusterName')].cluster.server}" 2>$null)
    Write-Host "Server: " -NoNewline
    Write-Host $clusterServer -ForegroundColor White

    $currentUser = (kubectl config view -o jsonpath="{.contexts[?(@.name=='$currentContext')].context.user}" 2>$null)
    Write-Host "User: " -NoNewline
    Write-Host $currentUser -ForegroundColor White

    Write-Host ""
    Write-Host "Available Nodes:" -ForegroundColor White
    kubectl get nodes 2>$null | ForEach-Object { Write-Host "  $_" }

    Write-Host ""
    Write-ColorOutput "You are connected to cluster: $currentContext" -Type "Warn"

    Write-Host ""
    if (-not (Confirm-Action "Is this the correct cluster?")) {
        Switch-ClusterContext
    }

    Write-Host ""
    Read-Host "Press Enter to continue"
}

################################################################################
# Switch Cluster Context
################################################################################

function Switch-ClusterContext {
    Clear-Host
    Write-Separator
    Write-ColorOutput "Switch Kubernetes Cluster Context" -Type "Header"

    Write-Host "Available cluster contexts:"
    Write-Host ""

    # Get all contexts
    $contexts = kubectl config get-contexts -o name 2>$null
    $current = kubectl config current-context 2>$null

    if (-not $contexts) {
        Write-ColorOutput "No cluster contexts found" -Type "Error"
        exit 1
    }

    # Display contexts with numbers
    $contextArray = @{}
    $i = 1
    foreach ($ctx in $contexts) {
        $contextArray[$i] = $ctx
        if ($ctx -eq $current) {
            Write-Host "  $i) $ctx " -NoNewline
            Write-Host "(current)" -ForegroundColor Green
        } else {
            Write-Host "  $i) $ctx"
        }
        $i++
    }

    Write-Host ""
    Write-Host "  0) Exit script"
    Write-Host ""

    $maxChoice = $contextArray.Count

    while ($true) {
        $choice = Read-Host "Select cluster context [0-$maxChoice]"

        if ($choice -eq "0") {
            Write-ColorOutput "Exiting..." -Type "Info"
            exit 0
        } elseif ($choice -match '^\d+$' -and [int]$choice -ge 1 -and [int]$choice -le $maxChoice) {
            $selectedContext = $contextArray[[int]$choice]

            Write-Host ""
            Write-ColorOutput "Switching to context: $selectedContext" -Type "Info"

            kubectl config use-context $selectedContext 2>$null | Out-Null

            if ($LASTEXITCODE -eq 0) {
                Write-ColorOutput "✓ Successfully switched to: $selectedContext" -Type "Info"
                Write-Host ""

                # Verify connection
                kubectl cluster-info 2>$null | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    Write-ColorOutput "✓ Cluster connection verified" -Type "Info"

                    Write-Host ""
                    Write-ColorOutput "New cluster information:" -Type "Detail"
                    kubectl cluster-info 2>$null | ForEach-Object { Write-Host "    $_" }

                    Write-Host ""
                    Read-Host "Press Enter to continue with deployment"
                    return
                } else {
                    Write-ColorOutput "Cannot connect to cluster: $selectedContext" -Type "Error"
                    Write-ColorOutput "The context was switched but connection failed" -Type "Warn"

                    if (Confirm-Action "Try a different cluster?") {
                        Switch-ClusterContext
                        return
                    } else {
                        exit 1
                    }
                }
            } else {
                Write-ColorOutput "Failed to switch context" -Type "Error"

                if (Confirm-Action "Try again?") {
                    Switch-ClusterContext
                    return
                } else {
                    exit 1
                }
            }
        } else {
            Write-Host "Invalid choice. Please select 0-$maxChoice." -ForegroundColor Red
        }
    }
}

################################################################################
# Step 3: Select Action
################################################################################

function Select-Action {
    Clear-Host
    Write-Separator
    Write-ColorOutput "STEP 3: Select Deployment Action" -Type "Header"

    Write-Host "  1) Install new release"
    Write-Host "  2) Upgrade existing release"
    Write-Host "  3) Rollback release"
    Write-Host "  4) Uninstall release"
    Write-Host "  5) List releases"
    Write-Host "  6) Exit"
    Write-Host ""

    while ($true) {
        $choice = Read-Host "Select action [1-6]"
        switch ($choice) {
            "1" {
                $script:Action = "install"
                Write-ColorOutput "Selected: Install new release" -Type "Info"
                break
            }
            "2" {
                $script:Action = "upgrade"
                Write-ColorOutput "Selected: Upgrade existing release" -Type "Info"
                break
            }
            "3" {
                Invoke-Rollback
                exit 0
            }
            "4" {
                Invoke-Uninstall
                exit 0
            }
            "5" {
                Show-Releases
                exit 0
            }
            "6" {
                Write-ColorOutput "Exiting..." -Type "Info"
                exit 0
            }
            default {
                Write-Host "Invalid choice. Please select 1-6." -ForegroundColor Red
            }
        }
        if ($script:Action) { break }
    }

    Write-Host ""
    Read-Host "Press Enter to continue"
}

################################################################################
# Step 4: Select Environment
################################################################################

function Select-Environment {
    Clear-Host
    Write-Separator
    Write-ColorOutput "STEP 4: Select Environment" -Type "Header"

    Write-Host "  1) dev - Development"
    Write-Host "     • 1 replica"
    Write-Host "     • 512Mi memory limit"
    Write-Host "     • No autoscaling"
    Write-Host ""
    Write-Host "  2) prod - Production"
    Write-Host "     • 3 replicas"
    Write-Host "     • 2Gi memory limit"
    Write-Host "     • Autoscaling enabled (3-10 pods)"
    Write-Host ""

    while ($true) {
        $choice = Read-Host "Select environment [1-2]"
        switch ($choice) {
            "1" {
                $script:Environment = "dev"
                Write-ColorOutput "Selected: dev (Development)" -Type "Info"
                break
            }
            "2" {
                $script:Environment = "prod"
                Write-ColorOutput "Selected: prod (Production)" -Type "Warn"
                break
            }
            default {
                Write-Host "Invalid choice. Please select 1 or 2." -ForegroundColor Red
            }
        }
        if ($script:Environment) { break }
    }

    Write-Host ""
    Read-Host "Press Enter to continue"
}

################################################################################
# Step 5-9: Configuration Steps
################################################################################

function Set-ReleaseName {
    Clear-Host
    Write-Separator
    Write-ColorOutput "STEP 5: Configure Release Name" -Type "Header"

    $default = "cloudappdev"
    Write-Host "The release name identifies your Helm deployment."
    Write-Host "Default: $default"
    Write-Host ""

    $input = Read-Host "Enter release name [press Enter for default]"
    $script:ReleaseName = if ($input) { $input } else { $default }

    Write-ColorOutput "Release name: $($script:ReleaseName)" -Type "Info"

    Write-Host ""
    Read-Host "Press Enter to continue"
}

function Set-Namespace {
    Clear-Host
    Write-Separator
    Write-ColorOutput "STEP 6: Configure Namespace" -Type "Header"

    $default = "cloudappdev-$($script:Environment)"
    Write-Host "Kubernetes namespace for deployment."
    Write-Host "Default: $default"
    Write-Host ""

    Write-Host "Existing namespaces:"
    kubectl get namespaces -o custom-columns=NAME:.metadata.name --no-headers 2>$null |
        Where-Object { $_ -match "(cloudappdev|default|kube-)" } |
        ForEach-Object { Write-Host "  • $_" }
    Write-Host ""

    $input = Read-Host "Enter namespace [press Enter for default]"
    $script:Namespace = if ($input) { $input } else { $default }

    Write-ColorOutput "Namespace: $($script:Namespace)" -Type "Info"

    if (kubectl get namespace $script:Namespace 2>$null) {
        Write-ColorOutput "Namespace already exists" -Type "Warn"
    } else {
        Write-ColorOutput "Namespace will be created" -Type "Info"
    }

    Write-Host ""
    Read-Host "Press Enter to continue"
}

function Set-ChartPath {
    Clear-Host
    Write-Separator
    Write-ColorOutput "STEP 7: Configure Helm Chart Path" -Type "Header"

    $default = "./k8s/helm/cloudappdev"
    Write-Host "Path to the Helm chart directory."
    Write-Host "Default: $default"
    Write-Host ""

    if (Test-Path $default) {
        Write-ColorOutput "Default chart found: $default" -Type "Info"
        Write-Host ""
        if (Confirm-Action "Use default chart path?" -DefaultYes $true) {
            $script:ChartPath = $default
            Write-ColorOutput "Using: $($script:ChartPath)" -Type "Info"
            Write-Host ""
            Read-Host "Press Enter to continue"
            return
        }
    } else {
        Write-ColorOutput "Default chart path not found: $default" -Type "Warn"
    }

    while ($true) {
        Write-Host ""
        $input = Read-Host "Enter chart path"
        $script:ChartPath = if ($input) { $input } else { $default }

        if (Test-Path $script:ChartPath) {
            Write-ColorOutput "Chart found: $($script:ChartPath)" -Type "Info"
            break
        } else {
            Write-ColorOutput "Chart not found at: $($script:ChartPath)" -Type "Error"
            if (-not (Confirm-Action "Try a different path?")) {
                exit 1
            }
        }
    }

    Write-Host ""
    Read-Host "Press Enter to continue"
}

function Set-ValuesFile {
    Clear-Host
    Write-Separator
    Write-ColorOutput "STEP 8: Configure Values File" -Type "Header"

    $default = "$($script:ChartPath)/values-$($script:Environment).yaml"

    Write-Host "Helm values file for environment-specific configuration."
    Write-Host "Default: $default"
    Write-Host ""

    if (Test-Path $default) {
        Write-ColorOutput "Default values file found" -Type "Info"
        Write-Host ""
        if (Confirm-Action "Use default values file?" -DefaultYes $true) {
            $script:ValuesFile = $default
            Write-ColorOutput "Using: $($script:ValuesFile)" -Type "Info"
            Write-Host ""
            Read-Host "Press Enter to continue"
            return
        }
    } else {
        Write-ColorOutput "Default values file not found" -Type "Warn"
    }

    Write-Host ""
    $input = Read-Host "Enter custom values file path [leave empty to skip]"

    if ($input) {
        if (Test-Path $input) {
            $script:ValuesFile = $input
            Write-ColorOutput "Using: $($script:ValuesFile)" -Type "Info"
        } else {
            Write-ColorOutput "File not found: $input" -Type "Warn"
            if (Confirm-Action "Continue without custom values file?" -DefaultYes $true) {
                $script:ValuesFile = ""
                Write-ColorOutput "No custom values file" -Type "Info"
            } else {
                Set-ValuesFile
                return
            }
        }
    } else {
        $script:ValuesFile = ""
        Write-ColorOutput "No custom values file" -Type "Info"
    }

    Write-Host ""
    Read-Host "Press Enter to continue"
}

function Set-DryRun {
    Clear-Host
    Write-Separator
    Write-ColorOutput "STEP 9: Dry-Run Option" -Type "Header"

    Write-Host "Dry-run mode shows what would happen without making actual changes."
    Write-Host "Useful for testing and validation."
    Write-Host ""

    if (Confirm-Action "Enable dry-run mode?") {
        $script:DryRun = $true
        Write-ColorOutput "Dry-run enabled - no actual deployment will occur" -Type "Warn"
    } else {
        $script:DryRun = $false
        Write-ColorOutput "Normal deployment mode" -Type "Info"
    }

    Write-Host ""
    Read-Host "Press Enter to continue"
}

################################################################################
# Step 10: Review and Deploy
################################################################################

function Invoke-Deployment {
    Clear-Host
    Write-Separator
    Write-ColorOutput "STEP 10: Review Configuration" -Type "Header"

    $currentContext = kubectl config current-context

    Write-Host "Cluster Information:" -ForegroundColor White
    Write-Host "  Context:      $currentContext"
    Write-Host "  Environment:  $($script:Environment)" -ForegroundColor Cyan
    Write-Host ""

    Write-Host "Deployment Configuration:" -ForegroundColor White
    $actionText = if ($script:Action -eq "upgrade") { "UPGRADE" } else { "INSTALL" }
    Write-Host "  Action:       $actionText"
    Write-Host "  Release:      $($script:ReleaseName)" -ForegroundColor Cyan
    Write-Host "  Namespace:    $($script:Namespace)" -ForegroundColor Cyan
    Write-Host "  Chart:        $($script:ChartPath)"
    if ($script:ValuesFile) {
        Write-Host "  Values File:  $($script:ValuesFile)"
    }
    Write-Host ""

    Write-Host "Resource Configuration:" -ForegroundColor White
    switch ($script:Environment) {
        "dev" {
            Write-Host "  • Replicas: 1"
            Write-Host "  • Memory: 512Mi"
            Write-Host "  • Autoscaling: Disabled"
        }
        "prod" {
            Write-Host "  • Replicas: 3"
            Write-Host "  • Memory: 2Gi"
            Write-Host "  • Autoscaling: Enabled (3-10 pods)"
        }
    }
    Write-Host ""

    if ($script:DryRun) {
        Write-ColorOutput "DRY-RUN MODE ENABLED" -Type "Warn"
        Write-Host ""
    }

    # Check existing release
    $existingRelease = helm list -n $script:Namespace 2>$null | Select-String $script:ReleaseName
    if ($existingRelease) {
        Write-ColorOutput "Release '$($script:ReleaseName)' already exists in namespace '$($script:Namespace)'" -Type "Warn"
        if ($script:Action -ne "upgrade") {
            Write-ColorOutput "Will perform upgrade instead of install" -Type "Info"
            $script:Action = "upgrade"
        }
        Write-Host ""
    }

    Write-Separator

    if ($script:Environment -eq "prod") {
        Write-Host ""
        Write-ColorOutput "⚠️  WARNING: You are deploying to PRODUCTION!" -Type "Warn"
        Write-Host ""
        if (-not (Confirm-Action "Are you absolutely sure you want to proceed?")) {
            Write-ColorOutput "Deployment cancelled" -Type "Info"
            exit 0
        }
    } else {
        if (-not (Confirm-Action "Proceed with deployment?" -DefaultYes $true)) {
            Write-ColorOutput "Deployment cancelled" -Type "Info"
            exit 0
        }
    }

    # Execute deployment
    Clear-Host
    Write-Separator
    Write-ColorOutput "Executing Deployment" -Type "Header"

    # Create namespace if needed
    $namespaceExists = kubectl get namespace $script:Namespace 2>$null
    if (-not $namespaceExists) {
        Write-ColorOutput "Creating namespace: $($script:Namespace)" -Type "Info"
        if (-not $script:DryRun) {
            kubectl create namespace $script:Namespace
            kubectl label namespace $script:Namespace environment=$script:Environment
        }
    }

    # Build Helm command
    $helmArgs = @()

    if ($script:Action -eq "upgrade") {
        $helmArgs += "upgrade", "--install"
    } else {
        $helmArgs += "install"
    }

    $helmArgs += $script:ReleaseName, $script:ChartPath
    $helmArgs += "--namespace", $script:Namespace, "--create-namespace"

    if ($script:ValuesFile) {
        $helmArgs += "--values", $script:ValuesFile
    }

    $helmArgs += "--set", "global.environment=$($script:Environment)"

    switch ($script:Environment) {
        "dev" {
            $helmArgs += "--set", "replicaCount=1"
            $helmArgs += "--set", "resources.limits.memory=512Mi"
            $helmArgs += "--set", "autoscaling.enabled=false"
        }
        "prod" {
            $helmArgs += "--set", "replicaCount=3"
            $helmArgs += "--set", "resources.limits.memory=2Gi"
            $helmArgs += "--set", "autoscaling.enabled=true"
            $helmArgs += "--set", "autoscaling.minReplicas=3"
            $helmArgs += "--set", "autoscaling.maxReplicas=10"
        }
    }

    if ($script:DryRun) {
        $helmArgs += "--dry-run", "--debug"
    }

    Write-Host "Executing:" -ForegroundColor White
    Write-Host "helm $($helmArgs -join ' ')" -ForegroundColor Cyan
    Write-Host ""

    & helm $helmArgs

    Write-Host ""
    if (-not $script:DryRun) {
        Write-ColorOutput "✓ Deployment initiated successfully!" -Type "Info"

        Write-Host ""
        Write-ColorOutput "Waiting for deployment..." -Type "Info"
        kubectl wait --for=condition=available --timeout=300s `
            -n $script:Namespace deployment -l "app.kubernetes.io/instance=$($script:ReleaseName)" 2>$null

        Write-Host ""
        Write-ColorOutput "Deployment Status" -Type "Header"
        kubectl get pods -n $script:Namespace -l "app.kubernetes.io/instance=$($script:ReleaseName)"

        Write-Host ""
        Write-Separator
        Write-ColorOutput "Next Steps" -Type "Header"

        Write-Host "  • Check status:"
        Write-Host "    kubectl get pods -n $($script:Namespace)"
        Write-Host ""
        Write-Host "  • View logs:"
        Write-Host "    kubectl logs -f deployment/<name> -n $($script:Namespace)"
        Write-Host ""
        Write-Host "  • Rollback if needed:"
        Write-Host "    helm rollback $($script:ReleaseName) -n $($script:Namespace)"
        Write-Host ""

        Write-Separator
        Write-ColorOutput "✓ Deployment completed successfully!" -Type "Info"
        Write-Separator
    } else {
        Write-ColorOutput "✓ Dry-run completed!" -Type "Info"
    }
}

################################################################################
# Additional Operations
################################################################################

function Show-Releases {
    Clear-Host
    Write-Separator
    Write-ColorOutput "List Helm Releases" -Type "Header"

    $ns = Read-Host "Enter namespace [leave empty for all]"
    Write-Host ""

    if ($ns) {
        Write-ColorOutput "Releases in namespace '$ns':" -Type "Info"
        helm list -n $ns
    } else {
        Write-ColorOutput "Releases in all namespaces:" -Type "Info"
        helm list --all-namespaces
    }

    Write-Host ""
    Read-Host "Press Enter to exit"
}

function Invoke-Rollback {
    Clear-Host
    Write-Separator
    Write-ColorOutput "Rollback Release" -Type "Header"

    $ns = Read-Host "Enter namespace"
    if (-not $ns) { $ns = "cloudappdev-dev" }

    Write-Host ""
    Write-ColorOutput "Releases in '$ns':" -Type "Info"
    helm list -n $ns 2>$null

    Write-Host ""
    $release = Read-Host "Enter release name"
    if (-not $release) {
        Write-ColorOutput "Release name required" -Type "Error"
        exit 1
    }

    Write-Host ""
    helm history $release -n $ns

    Write-Host ""
    $revision = Read-Host "Enter revision [leave empty for previous]"

    if (Confirm-Action "Rollback '$release'?") {
        if ($revision) {
            helm rollback $release $revision -n $ns
        } else {
            helm rollback $release -n $ns
        }
        Write-ColorOutput "Rollback completed!" -Type "Info"
    }

    Write-Host ""
    Read-Host "Press Enter to exit"
}

function Invoke-Uninstall {
    Clear-Host
    Write-Separator
    Write-ColorOutput "Uninstall Release" -Type "Header"

    $ns = Read-Host "Enter namespace"
    if (-not $ns) { $ns = "cloudappdev-dev" }

    Write-Host ""
    Write-ColorOutput "Releases in '$ns':" -Type "Info"
    helm list -n $ns 2>$null

    Write-Host ""
    $release = Read-Host "Enter release name"
    if (-not $release) {
        Write-ColorOutput "Release name required" -Type "Error"
        exit 1
    }

    Write-Host ""
    Write-ColorOutput "⚠️  This will DELETE the release and all resources!" -Type "Warn"

    if (Confirm-Action "Uninstall '$release'?") {
        helm uninstall $release -n $ns
        Write-ColorOutput "Uninstall completed!" -Type "Info"

        if (Confirm-Action "Delete namespace '$ns'?") {
            kubectl delete namespace $ns
            Write-ColorOutput "Namespace deleted!" -Type "Info"
        }
    }

    Write-Host ""
    Read-Host "Press Enter to exit"
}

################################################################################
# Main Workflow
################################################################################

if ($Help) {
    Write-Host @"
CloudAppDev - Interactive Helm Deployment Script

This script provides a fully interactive wizard for deploying applications
to Kubernetes using Helm.

USAGE:
    .\helm-deploy-interactive.ps1

The script will guide you through 10 steps:
  1. Prerequisites check
  2. Cluster information and context selection
  3. Deployment action (install/upgrade/rollback/uninstall)
  4. Environment selection (dev/prod)
  5. Release name configuration
  6. Namespace configuration
  7. Chart path configuration
  8. Values file configuration
  9. Dry-run option
  10. Review and deployment

"@
    exit 0
}

# Run main workflow
Test-Prerequisites
Show-ClusterInfo
Select-Action
Select-Environment
Set-ReleaseName
Set-Namespace
Set-ChartPath
Set-ValuesFile
Set-DryRun
Invoke-Deployment
