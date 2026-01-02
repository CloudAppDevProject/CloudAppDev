#!/bin/bash

################################################################################
# Interactive Helm Deployment Script for CloudAppDev
# Supports dev and prod environments with user confirmation
################################################################################

set -e  # Exit on error

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=""
NAMESPACE=""
RELEASE_NAME="cloudappdev"
DRY_RUN=false
UPGRADE=false
CHART_PATH="./k8s/helm/cloudappdev"
VALUES_FILE=""
SKIP_CONFIRMATION=false

################################################################################
# Functions
################################################################################

print_usage() {
    cat << EOF
${BOLD}Usage:${NC} $0 -e <environment> [OPTIONS]

${BOLD}Required:${NC}
  -e, --environment ENV     Environment to deploy (dev|prod)

${BOLD}Optional:${NC}
  -n, --namespace NS        Kubernetes namespace (default: cloudappdev-ENV)
  -r, --release NAME        Helm release name (default: cloudappdev)
  -c, --chart PATH          Path to Helm chart (default: ./k8s/helm/cloudappdev)
  -v, --values FILE         Additional values file to override
  -u, --upgrade             Upgrade existing release instead of install
  -d, --dry-run             Perform dry-run without actual deployment
  -y, --yes                 Skip confirmation prompts (use with caution)
  -h, --help                Show this help message

${BOLD}Examples:${NC}
  # Deploy to dev environment (interactive)
  $0 -e dev

  # Deploy to prod with auto-confirm
  $0 -e prod -y

  # Upgrade existing release in dev
  $0 -e dev -u

  # Dry-run deployment to prod
  $0 -e prod -d

EOF
}

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo -e "${CYAN}${BOLD}$1${NC}"
}

log_detail() {
    echo -e "${BLUE}  → $1${NC}"
}

print_separator() {
    echo -e "${CYAN}========================================${NC}"
}

confirm_action() {
    local prompt="$1"
    local default="${2:-n}"

    if [[ "$SKIP_CONFIRMATION" == true ]]; then
        return 0
    fi

    local yn
    while true; do
        if [[ "$default" == "y" ]]; then
            read -p "$(echo -e ${YELLOW}$prompt [Y/n]: ${NC})" yn
            yn=${yn:-Y}
        else
            read -p "$(echo -e ${YELLOW}$prompt [y/N]: ${NC})" yn
            yn=${yn:-N}
        fi

        case $yn in
            [Yy]* ) return 0;;
            [Nn]* ) return 1;;
            * ) echo "Please answer yes or no.";;
        esac
    done
}

validate_environment() {
    if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "prod" ]]; then
        log_error "Invalid environment: $ENVIRONMENT. Must be 'dev' or 'prod'"
        exit 1
    fi
}

check_prerequisites() {
    log_header "Checking Prerequisites..."

    local all_ok=true

    # Check if helm is installed
    if command -v helm &> /dev/null; then
        local helm_version=$(helm version --short 2>/dev/null | cut -d: -f2 | tr -d ' ')
        log_detail "Helm: ${GREEN}✓${NC} $helm_version"
    else
        log_detail "Helm: ${RED}✗ Not installed${NC}"
        all_ok=false
    fi

    # Check if kubectl is installed
    if command -v kubectl &> /dev/null; then
        local kubectl_version=$(kubectl version --client -o json 2>/dev/null | grep gitVersion | cut -d'"' -f4)
        log_detail "kubectl: ${GREEN}✓${NC} $kubectl_version"
    else
        log_detail "kubectl: ${RED}✗ Not installed${NC}"
        all_ok=false
    fi

    # Check kubectl connection
    if kubectl cluster-info &> /dev/null; then
        log_detail "Cluster connection: ${GREEN}✓ Connected${NC}"
    else
        log_detail "Cluster connection: ${RED}✗ Cannot connect${NC}"
        all_ok=false
    fi

    # Check if chart exists
    if [[ -d "$CHART_PATH" ]]; then
        log_detail "Helm chart: ${GREEN}✓${NC} Found at $CHART_PATH"
    else
        log_detail "Helm chart: ${RED}✗ Not found${NC} at $CHART_PATH"
        all_ok=false
    fi

    if [[ "$all_ok" == false ]]; then
        log_error "Prerequisites check failed"
        exit 1
    fi

    echo ""
}

show_cluster_info() {
    log_header "Current Kubernetes Cluster Configuration"

    # Get current context
    local current_context=$(kubectl config current-context 2>/dev/null || echo "unknown")
    log_detail "Current Context: ${BOLD}$current_context${NC}"

    # Get cluster name
    local cluster_name=$(kubectl config view -o jsonpath="{.contexts[?(@.name=='$current_context')].context.cluster}" 2>/dev/null || echo "unknown")
    log_detail "Cluster: ${BOLD}$cluster_name${NC}"

    # Get cluster server
    local cluster_server=$(kubectl config view -o jsonpath="{.clusters[?(@.name=='$cluster_name')].cluster.server}" 2>/dev/null || echo "unknown")
    log_detail "Server: $cluster_server"

    # Get current user
    local current_user=$(kubectl config view -o jsonpath="{.contexts[?(@.name=='$current_context')].context.user}" 2>/dev/null || echo "unknown")
    log_detail "User: $current_user"

    # Get cluster info
    log_detail "Cluster Info:"
    kubectl cluster-info 2>/dev/null | sed 's/^/    /' || echo "    Unable to retrieve cluster info"

    # Get nodes
    log_detail "Available Nodes:"
    kubectl get nodes --no-headers 2>/dev/null | awk '{printf "    - %s (%s) - %s\n", $1, $2, $5}' || echo "    Unable to retrieve nodes"

    echo ""
}

show_deployment_config() {
    log_header "Deployment Configuration"

    log_detail "Environment: ${BOLD}${ENVIRONMENT}${NC}"
    log_detail "Namespace: ${BOLD}$NAMESPACE${NC}"
    log_detail "Release Name: ${BOLD}$RELEASE_NAME${NC}"
    log_detail "Chart Path: $CHART_PATH"
    [[ -n "$VALUES_FILE" ]] && log_detail "Values File: $VALUES_FILE"
    log_detail "Action: ${BOLD}$([ "$UPGRADE" == true ] && echo "UPGRADE" || echo "INSTALL")${NC}"

    # Environment-specific settings
    case "$ENVIRONMENT" in
        dev)
            log_detail "Replicas: 1"
            log_detail "Memory Limit: 512Mi"
            log_detail "Autoscaling: Disabled"
            ;;
        prod)
            log_detail "Replicas: 3"
            log_detail "Memory Limit: 2Gi"
            log_detail "Autoscaling: Enabled (min: 3, max: 10)"
            ;;
    esac

    if [[ "$DRY_RUN" == true ]]; then
        log_warn "DRY-RUN MODE: No actual deployment will occur"
    fi

    echo ""
}

check_existing_release() {
    log_header "Checking Existing Releases..."

    if helm list -n "$NAMESPACE" 2>/dev/null | grep -q "$RELEASE_NAME"; then
        log_warn "Release '$RELEASE_NAME' already exists in namespace '$NAMESPACE'"

        # Show current release info
        log_detail "Current release information:"
        helm list -n "$NAMESPACE" | grep "$RELEASE_NAME" | sed 's/^/    /' || true

        echo ""

        if [[ "$UPGRADE" != true ]]; then
            log_warn "Use -u/--upgrade flag to upgrade the existing release"
            if ! confirm_action "Do you want to continue with upgrade instead?"; then
                log_info "Deployment cancelled by user"
                exit 0
            fi
            UPGRADE=true
        fi
    else
        log_info "No existing release found. Will perform fresh installation."
    fi

    echo ""
}

set_defaults() {
    # Set default namespace if not provided
    if [[ -z "$NAMESPACE" ]]; then
        NAMESPACE="cloudappdev-${ENVIRONMENT}"
    fi

    # Set default values file based on environment
    if [[ -z "$VALUES_FILE" ]]; then
        local default_values="${CHART_PATH}/values-${ENVIRONMENT}.yaml"
        if [[ -f "$default_values" ]]; then
            VALUES_FILE="$default_values"
        fi
    fi
}

confirm_deployment() {
    print_separator
    log_header "Ready to Deploy"
    print_separator

    echo ""
    echo -e "${BOLD}You are about to deploy to:${NC}"
    echo -e "  Cluster: ${CYAN}$(kubectl config current-context)${NC}"
    echo -e "  Environment: ${CYAN}${ENVIRONMENT}${NC}"
    echo -e "  Namespace: ${CYAN}$NAMESPACE${NC}"
    echo ""

    if [[ "$ENVIRONMENT" == "prod" ]]; then
        log_warn "WARNING: You are deploying to PRODUCTION environment!"
        echo ""
        if ! confirm_action "Are you absolutely sure you want to proceed?"; then
            log_info "Deployment cancelled by user"
            exit 0
        fi
    else
        if ! confirm_action "Do you want to proceed with deployment?" "y"; then
            log_info "Deployment cancelled by user"
            exit 0
        fi
    fi

    echo ""
}

create_namespace() {
    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_info "Namespace '$NAMESPACE' already exists"
    else
        log_info "Creating namespace: $NAMESPACE"
        if [[ "$DRY_RUN" == false ]]; then
            kubectl create namespace "$NAMESPACE"
            kubectl label namespace "$NAMESPACE" environment="$ENVIRONMENT" --overwrite
        fi
    fi
}

deploy_helm_chart() {
    log_header "Deploying Helm Chart..."

    # Build helm command
    local helm_cmd="helm"

    if [[ "$UPGRADE" == true ]]; then
        helm_cmd="$helm_cmd upgrade --install"
    else
        helm_cmd="$helm_cmd install"
    fi

    helm_cmd="$helm_cmd $RELEASE_NAME $CHART_PATH"
    helm_cmd="$helm_cmd --namespace $NAMESPACE"
    helm_cmd="$helm_cmd --create-namespace"

    # Add values file if exists
    if [[ -n "$VALUES_FILE" ]]; then
        helm_cmd="$helm_cmd --values $VALUES_FILE"
    fi

    # Add environment-specific settings
    helm_cmd="$helm_cmd --set global.environment=$ENVIRONMENT"

    # Environment-specific configurations
    case "$ENVIRONMENT" in
        dev)
            helm_cmd="$helm_cmd --set replicaCount=1"
            helm_cmd="$helm_cmd --set resources.limits.memory=512Mi"
            helm_cmd="$helm_cmd --set autoscaling.enabled=false"
            ;;
        prod)
            helm_cmd="$helm_cmd --set replicaCount=3"
            helm_cmd="$helm_cmd --set resources.limits.memory=2Gi"
            helm_cmd="$helm_cmd --set autoscaling.enabled=true"
            helm_cmd="$helm_cmd --set autoscaling.minReplicas=3"
            helm_cmd="$helm_cmd --set autoscaling.maxReplicas=10"
            ;;
    esac

    # Add dry-run flag if enabled
    if [[ "$DRY_RUN" == true ]]; then
        helm_cmd="$helm_cmd --dry-run --debug"
    fi

    # Show command
    log_detail "Executing command:"
    echo -e "    ${CYAN}$helm_cmd${NC}"
    echo ""

    # Execute deployment
    eval "$helm_cmd"

    echo ""
    if [[ "$DRY_RUN" == false ]]; then
        log_info "Deployment initiated successfully!"
    else
        log_info "Dry-run completed successfully!"
    fi
}

wait_for_deployment() {
    if [[ "$DRY_RUN" == true ]]; then
        return
    fi

    log_header "Waiting for Deployment..."

    local timeout=300  # 5 minutes

    if kubectl wait --for=condition=available --timeout=${timeout}s \
        -n "$NAMESPACE" deployment -l "app.kubernetes.io/instance=$RELEASE_NAME" 2>/dev/null; then
        log_info "All deployments are ready!"
    else
        log_warn "Some deployments may not be ready yet"
    fi

    echo ""
}

show_status() {
    if [[ "$DRY_RUN" == true ]]; then
        return
    fi

    log_header "Deployment Status"

    # Show Helm release status
    helm status "$RELEASE_NAME" -n "$NAMESPACE" --show-desc

    echo ""
    log_detail "Pods:"
    kubectl get pods -n "$NAMESPACE" -l "app.kubernetes.io/instance=$RELEASE_NAME"

    echo ""
    log_detail "Services:"
    kubectl get services -n "$NAMESPACE" -l "app.kubernetes.io/instance=$RELEASE_NAME"
}

show_next_steps() {
    if [[ "$DRY_RUN" == true ]]; then
        return
    fi

    echo ""
    print_separator
    log_header "Next Steps"
    print_separator

    echo ""
    echo "  1. Check deployment status:"
    echo -e "     ${CYAN}kubectl get pods -n $NAMESPACE${NC}"
    echo ""
    echo "  2. View logs:"
    echo -e "     ${CYAN}kubectl logs -f deployment/<deployment-name> -n $NAMESPACE${NC}"
    echo ""
    echo "  3. Access services:"
    echo -e "     ${CYAN}kubectl get services -n $NAMESPACE${NC}"
    echo ""
    echo "  4. Upgrade deployment:"
    echo -e "     ${CYAN}$0 -e $ENVIRONMENT -u${NC}"
    echo ""
    echo "  5. Rollback if needed:"
    echo -e "     ${CYAN}helm rollback $RELEASE_NAME -n $NAMESPACE${NC}"
    echo ""
}

################################################################################
# Main Script
################################################################################

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -r|--release)
            RELEASE_NAME="$2"
            shift 2
            ;;
        -c|--chart)
            CHART_PATH="$2"
            shift 2
            ;;
        -v|--values)
            VALUES_FILE="$2"
            shift 2
            ;;
        -u|--upgrade)
            UPGRADE=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -y|--yes)
            SKIP_CONFIRMATION=true
            shift
            ;;
        -h|--help)
            print_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            print_usage
            exit 1
            ;;
    esac
done

# Validate required arguments
if [[ -z "$ENVIRONMENT" ]]; then
    log_error "Environment is required"
    print_usage
    exit 1
fi

# Main execution
clear
print_separator
log_header "CloudAppDev - Helm Deployment Script"
print_separator
echo ""

validate_environment
check_prerequisites
show_cluster_info
set_defaults
show_deployment_config
check_existing_release
confirm_deployment
create_namespace
deploy_helm_chart
wait_for_deployment
show_status
show_next_steps

print_separator
log_info "Deployment completed successfully!"
print_separator
