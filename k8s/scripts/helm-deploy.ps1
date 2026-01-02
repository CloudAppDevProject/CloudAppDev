################################################################################
# Interactive Helm Deployment Script for CloudAppDev (PowerShell)
# Supports dev and prod environments with user confirmation
################################################################################

param(
    [Parameter(Mandatory=$true, HelpMessage="Environment to deploy (dev|prod)")]
    [ValidateSet("dev", "prod")]
    [string]$Environment,

    [Parameter(Mandatory=$false, HelpMessage="Kubernetes namespace")]
    [string]$Namespace = "",

    [Parameter(Mandatory=$false, HelpMessage="Helm release name")]
    [string]$ReleaseName = "cloudappdev",

    [Parameter(Mandatory=$false, HelpMessage="Path to Helm chart")]
    [string]$ChartPath = "./k8s/helm/cloudappdev",

    [Parameter(Mandatory=$false, HelpMessage="Additional values file")]
    [string]$ValuesFile = "",

    [Parameter(Mandatory=$false, HelpMessage="Upgrade existing release")]
    [switch]$Upgrade,

    [Parameter(Mandatory=$false, HelpMessage="Perform dry-run")]
    [switch]$DryRun,

    [Parameter(Mandatory=$false, HelpMessage="Skip confirmation prompts")]
    [switch]$SkipConfirmation,

    [Parameter(Mandatory=$false, HelpMessage="Show help")]
    [switch]$Help
)

################################################################################
# Functions
################################################################################

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Type = "Info"
    )

    switch ($Type) {
        "Info"    { Write-Host "[INFO] " -ForegroundColor Green -NoNewline; Write-Host $Message }
        "Warn"    { Write-Host "[WARN] " -ForegroundColor Yellow -NoNewline; Write-Host $Message }
        "Error"   { Write-Host "[ERROR] " -ForegroundColor Red -NoNewline; Write-Host $Message }
        "Header"  { Write-Host $Message -ForegroundColor Cyan -BackgroundColor Black }
        "Detail"  { Write-Host "  → " -ForegroundColor Blue -NoNewline; Write-Host $Message }
        "Success" { Write-Host "[✓] " -ForegroundColor Green -NoNewline; Write-Host $Message }
    }
}

function Write-Separator {
    Write-Host "========================================" -ForegroundColor Cyan
}

function Show-Help {
    @"

CloudAppDev - Helm Deployment Script (PowerShell)

USAGE:
    .\helm-deploy.ps1 -Environment <dev|prod> [OPTIONS]

REQUIRED PARAMETERS:
    -Environment <dev|prod>     Environment to deploy

OPTIONAL PARAMETERS:
    -Namespace <string>         Kubernetes namespace (default: cloudappdev-<env>)
    -ReleaseName <string>       Helm release name (default: cloudappdev)
    -ChartPath <string>         Path to Helm chart (default: ./k8s/helm/cloudappdev)
    -ValuesFile <string>        Additional values file to override
    -Upgrade                    Upgrade existing release instead of install
    -DryRun                     Perform dry-run without actual deployment
    -SkipConfirmation          Skip confirmation prompts (use with caution)
    -Help                       Show this help message

EXAMPLES:
    # Deploy to dev environment (interactive)
    .\helm-deploy.ps1 -Environment dev

    # Deploy to prod with auto-confirm
    .\helm-deploy.ps1 -Environment prod -SkipConfirmation

    # Upgrade existing release in dev
    .\helm-deploy.ps1 -Environment dev -Upgrade

    # Dry-run deployment to prod
    .\helm-deploy.ps1 -Environment prod -DryRun

"@
    exit 0
}

function Confirm-Action {
    param(
        [string]$Prompt,
        [bool]$DefaultYes = $false
    )

    if ($SkipConfirmation) {
        return $true
    }

    $choices = @(
        [System.Management.Automation.Host.ChoiceDescription]::new("&Yes", "Proceed with action")
        [System.Management.Automation.Host.ChoiceDescription]::new("&No", "Cancel action")
    )

    $defaultChoice = if ($DefaultYes) { 0 } else { 1 }
    $decision = $Host.UI.PromptForChoice("", $Prompt, $choices, $defaultChoice)

    return ($decision -eq 0)
}

function Test-Prerequisites {
    Write-ColorOutput "Checking Prerequisites..." -Type "Header"

    $allOk = $true

    # Check Helm
    try {
        $helmVersion = (helm version --short 2>$null) -replace ".*:", "" | ForEach-Object { $_.Trim() }
        Write-ColorOutput "Helm: ✓ $helmVersion" -Type "Detail"
    } catch {
        Write-ColorOutput "Helm: ✗ Not installed" -Type "Detail"
        $allOk = $false
    }

    # Check kubectl
    try {
        $kubectlVersion = (kubectl version --client -o json 2>$null | ConvertFrom-Json).clientVersion.gitVersion
        Write-ColorOutput "kubectl: ✓ $kubectlVersion" -Type "Detail"
    } catch {
        Write-ColorOutput "kubectl: ✗ Not installed" -Type "Detail"
        $allOk = $false
    }

    # Check cluster connection
    try {
        kubectl cluster-info 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "Cluster connection: ✓ Connected" -Type "Detail"
        } else {
            Write-ColorOutput "Cluster connection: ✗ Cannot connect" -Type "Detail"
            $allOk = $false
        }
    } catch {
        Write-ColorOutput "Cluster connection: ✗ Cannot connect" -Type "Detail"
        $allOk = $false
    }

    # Check chart path
    if (Test-Path $ChartPath) {
        Write-ColorOutput "Helm chart: ✓ Found at $ChartPath" -Type "Detail"
    } else {
        Write-ColorOutput "Helm chart: ✗ Not found at $ChartPath" -Type "Detail"
        $allOk = $false
    }

    Write-Host ""

    if (-not $allOk) {
        Write-ColorOutput "Prerequisites check failed" -Type "Error"
        exit 1
    }
}

function Show-ClusterInfo {
    Write-ColorOutput "Current Kubernetes Cluster Configuration" -Type "Header"

    # Get current context
    $currentContext = (kubectl config current-context 2>$null)
    Write-ColorOutput "Current Context: $currentContext" -Type "Detail"

    # Get cluster name
    $clusterName = (kubectl config view -o jsonpath="{.contexts[?(@.name=='$currentContext')].context.cluster}" 2>$null)
    Write-ColorOutput "Cluster: $clusterName" -Type "Detail"

    # Get cluster server
    $clusterServer = (kubectl config view -o jsonpath="{.clusters[?(@.name=='$clusterName')].cluster.server}" 2>$null)
    Write-ColorOutput "Server: $clusterServer" -Type "Detail"

    # Get current user
    $currentUser = (kubectl config view -o jsonpath="{.contexts[?(@.name=='$currentContext')].context.user}" 2>$null)
    Write-ColorOutput "User: $currentUser" -Type "Detail"

    # Get cluster info
    Write-ColorOutput "Cluster Info:" -Type "Detail"
    kubectl cluster-info 2>$null | ForEach-Object { Write-Host "    $_" }

    # Get nodes
    Write-ColorOutput "Available Nodes:" -Type "Detail"
    kubectl get nodes --no-headers 2>$null | ForEach-Object {
        $parts = $_ -split '\s+'
        Write-Host "    - $($parts[0]) ($($parts[1])) - $($parts[4])"
    }

    Write-Host ""
}

function Show-DeploymentConfig {
    Write-ColorOutput "Deployment Configuration" -Type "Header"

    Write-ColorOutput "Environment: $Environment" -Type "Detail"
    Write-ColorOutput "Namespace: $Namespace" -Type "Detail"
    Write-ColorOutput "Release Name: $ReleaseName" -Type "Detail"
    Write-ColorOutput "Chart Path: $ChartPath" -Type "Detail"

    if ($ValuesFile) {
        Write-ColorOutput "Values File: $ValuesFile" -Type "Detail"
    }

    $action = if ($Upgrade) { "UPGRADE" } else { "INSTALL" }
    Write-ColorOutput "Action: $action" -Type "Detail"

    # Environment-specific settings
    switch ($Environment) {
        "dev" {
            Write-ColorOutput "Replicas: 1" -Type "Detail"
            Write-ColorOutput "Memory Limit: 512Mi" -Type "Detail"
            Write-ColorOutput "Autoscaling: Disabled" -Type "Detail"
        }
        "prod" {
            Write-ColorOutput "Replicas: 3" -Type "Detail"
            Write-ColorOutput "Memory Limit: 2Gi" -Type "Detail"
            Write-ColorOutput "Autoscaling: Enabled (min: 3, max: 10)" -Type "Detail"
        }
    }

    if ($DryRun) {
        Write-ColorOutput "DRY-RUN MODE: No actual deployment will occur" -Type "Warn"
    }

    Write-Host ""
}

function Test-ExistingRelease {
    Write-ColorOutput "Checking Existing Releases..." -Type "Header"

    $existingRelease = helm list -n $Namespace 2>$null | Select-String $ReleaseName

    if ($existingRelease) {
        Write-ColorOutput "Release '$ReleaseName' already exists in namespace '$Namespace'" -Type "Warn"

        # Show current release info
        Write-ColorOutput "Current release information:" -Type "Detail"
        helm list -n $Namespace 2>$null | Select-String $ReleaseName | ForEach-Object { Write-Host "    $_" }

        Write-Host ""

        if (-not $Upgrade) {
            Write-ColorOutput "Use -Upgrade flag to upgrade the existing release" -Type "Warn"
            if (Confirm-Action "Do you want to continue with upgrade instead?") {
                $script:Upgrade = $true
            } else {
                Write-ColorOutput "Deployment cancelled by user" -Type "Info"
                exit 0
            }
        }
    } else {
        Write-ColorOutput "No existing release found. Will perform fresh installation." -Type "Info"
    }

    Write-Host ""
}

function Initialize-Defaults {
    # Set default namespace if not provided
    if (-not $Namespace) {
        $script:Namespace = "cloudappdev-$Environment"
    }

    # Set default values file based on environment
    if (-not $ValuesFile) {
        $defaultValues = Join-Path $ChartPath "values-$Environment.yaml"
        if (Test-Path $defaultValues) {
            $script:ValuesFile = $defaultValues
        }
    }
}

function Confirm-Deployment {
    Write-Separator
    Write-ColorOutput "Ready to Deploy" -Type "Header"
    Write-Separator

    Write-Host ""
    Write-Host "You are about to deploy to:" -ForegroundColor White
    Write-Host "  Cluster: " -NoNewline; Write-Host (kubectl config current-context) -ForegroundColor Cyan
    Write-Host "  Environment: " -NoNewline; Write-Host $Environment -ForegroundColor Cyan
    Write-Host "  Namespace: " -NoNewline; Write-Host $Namespace -ForegroundColor Cyan
    Write-Host ""

    if ($Environment -eq "prod") {
        Write-ColorOutput "WARNING: You are deploying to PRODUCTION environment!" -Type "Warn"
        Write-Host ""
        if (-not (Confirm-Action "Are you absolutely sure you want to proceed?")) {
            Write-ColorOutput "Deployment cancelled by user" -Type "Info"
            exit 0
        }
    } else {
        if (-not (Confirm-Action "Do you want to proceed with deployment?" -DefaultYes $true)) {
            Write-ColorOutput "Deployment cancelled by user" -Type "Info"
            exit 0
        }
    }

    Write-Host ""
}

function New-NamespaceIfNotExists {
    $namespaceExists = kubectl get namespace $Namespace 2>$null

    if ($namespaceExists) {
        Write-ColorOutput "Namespace '$Namespace' already exists" -Type "Info"
    } else {
        Write-ColorOutput "Creating namespace: $Namespace" -Type "Info"
        if (-not $DryRun) {
            kubectl create namespace $Namespace
            kubectl label namespace $Namespace environment=$Environment --overwrite
        }
    }
}

function Invoke-HelmDeploy {
    Write-ColorOutput "Deploying Helm Chart..." -Type "Header"

    # Build helm command
    $helmArgs = @()

    if ($Upgrade) {
        $helmArgs += "upgrade", "--install"
    } else {
        $helmArgs += "install"
    }

    $helmArgs += $ReleaseName, $ChartPath
    $helmArgs += "--namespace", $Namespace
    $helmArgs += "--create-namespace"

    # Add values file if exists
    if ($ValuesFile) {
        $helmArgs += "--values", $ValuesFile
    }

    # Add environment-specific settings
    $helmArgs += "--set", "global.environment=$Environment"

    # Environment-specific configurations
    switch ($Environment) {
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

    # Add dry-run flag if enabled
    if ($DryRun) {
        $helmArgs += "--dry-run", "--debug"
    }

    # Show command
    Write-ColorOutput "Executing command:" -Type "Detail"
    Write-Host "    helm $($helmArgs -join ' ')" -ForegroundColor Cyan
    Write-Host ""

    # Execute deployment
    & helm $helmArgs

    Write-Host ""
    if ($DryRun) {
        Write-ColorOutput "Dry-run completed successfully!" -Type "Info"
    } else {
        Write-ColorOutput "Deployment initiated successfully!" -Type "Info"
    }
}

function Wait-ForDeployment {
    if ($DryRun) {
        return
    }

    Write-ColorOutput "Waiting for Deployment..." -Type "Header"

    $timeout = 300  # 5 minutes

    kubectl wait --for=condition=available --timeout="${timeout}s" `
        -n $Namespace deployment -l "app.kubernetes.io/instance=$ReleaseName" 2>$null

    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "All deployments are ready!" -Type "Info"
    } else {
        Write-ColorOutput "Some deployments may not be ready yet" -Type "Warn"
    }

    Write-Host ""
}

function Show-Status {
    if ($DryRun) {
        return
    }

    Write-ColorOutput "Deployment Status" -Type "Header"

    # Show Helm release status
    helm status $ReleaseName -n $Namespace --show-desc

    Write-Host ""
    Write-ColorOutput "Pods:" -Type "Detail"
    kubectl get pods -n $Namespace -l "app.kubernetes.io/instance=$ReleaseName"

    Write-Host ""
    Write-ColorOutput "Services:" -Type "Detail"
    kubectl get services -n $Namespace -l "app.kubernetes.io/instance=$ReleaseName"
}

function Show-NextSteps {
    if ($DryRun) {
        return
    }

    Write-Host ""
    Write-Separator
    Write-ColorOutput "Next Steps" -Type "Header"
    Write-Separator

    Write-Host ""
    Write-Host "  1. Check deployment status:"
    Write-Host "     kubectl get pods -n $Namespace" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  2. View logs:"
    Write-Host "     kubectl logs -f deployment/<deployment-name> -n $Namespace" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  3. Access services:"
    Write-Host "     kubectl get services -n $Namespace" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  4. Upgrade deployment:"
    Write-Host "     .\helm-deploy.ps1 -Environment $Environment -Upgrade" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  5. Rollback if needed:"
    Write-Host "     helm rollback $ReleaseName -n $Namespace" -ForegroundColor Cyan
    Write-Host ""
}

################################################################################
# Main Script
################################################################################

if ($Help) {
    Show-Help
}

# Main execution
Clear-Host
Write-Separator
Write-ColorOutput "CloudAppDev - Helm Deployment Script" -Type "Header"
Write-Separator
Write-Host ""

Test-Prerequisites
Show-ClusterInfo
Initialize-Defaults
Show-DeploymentConfig
Test-ExistingRelease
Confirm-Deployment
New-NamespaceIfNotExists
Invoke-HelmDeploy
Wait-ForDeployment
Show-Status
Show-NextSteps

Write-Separator
Write-ColorOutput "Deployment completed successfully!" -Type "Info"
Write-Separator
