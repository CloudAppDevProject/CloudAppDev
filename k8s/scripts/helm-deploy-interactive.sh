#!/bin/bash

################################################################################
# CloudAppDev - Interactive Helm Deployment Script
# Fully interactive by default - walks through all steps with user input
################################################################################

set -e  # Exit on error

# Color output
RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[1;33m'
BLUE=$'\033[0;34m'
CYAN=$'\033[0;36m'
BOLD=$'\033[1m'
NC=$'\033[0m' # No Color

# Variables
ENVIRONMENT=""
NAMESPACE=""
RELEASE_NAME=""
CHART_PATH=""
VALUES_FILE=""
DRY_RUN=false
ACTION=""
DRY_RUN_COMPLETED=false

################################################################################
# Logging Functions
################################################################################

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
    echo -e "\n${CYAN}${BOLD}━━━ $1 ━━━${NC}\n"
}

log_detail() {
    echo -e "${BLUE}  → $1${NC}"
}

print_separator() {
    echo -e "${CYAN}════════════════════════════════════════${NC}"
}

show_config_summary() {
    echo -e "\n${BOLD}Current Configuration:${NC}"
    [[ -n "$ACTION" ]] && echo -e "  Action:      ${CYAN}$ACTION${NC}"
    [[ -n "$ENVIRONMENT" ]] && echo -e "  Environment: ${CYAN}$ENVIRONMENT${NC}"
    [[ -n "$RELEASE_NAME" ]] && echo -e "  Release:     ${CYAN}$RELEASE_NAME${NC}"
    [[ -n "$NAMESPACE" ]] && echo -e "  Namespace:   ${CYAN}$NAMESPACE${NC}"
    [[ -n "$CHART_PATH" ]] && echo -e "  Chart:       ${CYAN}$CHART_PATH${NC}"
    [[ -n "$VALUES_FILE" ]] && echo -e "  Values:      ${CYAN}$VALUES_FILE${NC}"
    [[ "$DRY_RUN" == true ]] && echo -e "  Mode:        ${YELLOW}DRY-RUN${NC}"
    echo ""
}

confirm_action() {
    local prompt="$1"
    local default="${2:-n}"

    local yn
    while true; do
        if [[ "$default" == "y" ]]; then
            read -p "$(echo -e "${YELLOW}$prompt [Y/n]: ${NC}")" yn
            yn=${yn:-Y}
        else
            read -p "$(echo -e "${YELLOW}$prompt [y/N]: ${NC}")" yn
            yn=${yn:-N}
        fi

        case $yn in
            [Yy]* ) return 0;;
            [Nn]* ) return 1;;
            * ) echo "Please answer yes or no.";;
        esac
    done
}

################################################################################
# Step 1: Check Prerequisites
################################################################################

check_prerequisites() {
    clear
    print_separator
    echo -e "${CYAN}${BOLD}   CloudAppDev - Helm Deployment Wizard${NC}"
    print_separator

    log_header "STEP 1: Checking Prerequisites"

    local all_ok=true

    # Check Helm
    echo -n "Checking Helm... "
    if command -v helm &> /dev/null; then
        local helm_version=$(helm version --short 2>/dev/null | cut -d: -f2 | tr -d ' ')
        echo -e "${GREEN}✓${NC} $helm_version"
    else
        echo -e "${RED}✗ Not installed${NC}"
        log_error "Please install Helm 3.x from https://helm.sh/docs/intro/install/"
        all_ok=false
    fi

    # Check kubectl
    echo -n "Checking kubectl... "
    if command -v kubectl &> /dev/null; then
        local kubectl_version=$(kubectl version --client -o json 2>/dev/null | grep gitVersion | cut -d'"' -f4)
        echo -e "${GREEN}✓${NC} $kubectl_version"
    else
        echo -e "${RED}✗ Not installed${NC}"
        log_error "Please install kubectl from https://kubernetes.io/docs/tasks/tools/"
        all_ok=false
    fi

    # Check cluster connection
    echo -n "Checking cluster connection... "
    if kubectl cluster-info &> /dev/null; then
        echo -e "${GREEN}✓ Connected${NC}"
    else
        echo -e "${RED}✗ Cannot connect${NC}"
        log_error "Cannot connect to Kubernetes cluster. Check your kubeconfig"
        all_ok=false
    fi

    if [[ "$all_ok" == false ]]; then
        echo ""
        log_error "Prerequisites check failed. Please fix the issues above and try again."
        exit 1
    fi

    echo ""
    log_info "All prerequisites met! ✓"
}

################################################################################
# Step 2: Show Cluster Information
################################################################################

show_cluster_info() {
    clear
    print_separator
    log_header "STEP 2: Current Kubernetes Cluster"

    # Get current context
    local current_context=$(kubectl config current-context 2>/dev/null || echo "unknown")
    echo -e "${BOLD}Context:${NC} $current_context"

    # Get cluster name
    local cluster_name=$(kubectl config view -o jsonpath="{.contexts[?(@.name=='$current_context')].context.cluster}" 2>/dev/null || echo "unknown")
    echo -e "${BOLD}Cluster:${NC} $cluster_name"

    # Get cluster server
    local cluster_server=$(kubectl config view -o jsonpath="{.clusters[?(@.name=='$cluster_name')].cluster.server}" 2>/dev/null || echo "unknown")
    echo -e "${BOLD}Server:${NC} $cluster_server"

    # Get current user
    local current_user=$(kubectl config view -o jsonpath="{.contexts[?(@.name=='$current_context')].context.user}" 2>/dev/null || echo "unknown")
    echo -e "${BOLD}User:${NC} $current_user"

    # Get nodes
    echo ""
    echo -e "${BOLD}Available Nodes:${NC}"
    kubectl get nodes 2>/dev/null | sed 's/^/  /' || echo "  Unable to retrieve nodes"

    echo ""
    log_warn "You are connected to cluster: ${BOLD}$current_context${NC}"

    echo ""
    if ! confirm_action "Is this the correct cluster?"; then
        switch_cluster_context
    fi
}

################################################################################
# Switch Cluster Context
################################################################################

switch_cluster_context() {
    clear
    print_separator
    log_header "Switch Kubernetes Cluster Context"

    echo "Available cluster contexts:"
    echo ""

    # Get all contexts and display them
    local contexts=$(kubectl config get-contexts -o name 2>/dev/null)
    local current=$(kubectl config current-context 2>/dev/null)

    if [[ -z "$contexts" ]]; then
        log_error "No cluster contexts found"
        exit 1
    fi

    # Display contexts with numbers
    local i=1
    local -a context_array
    while IFS= read -r ctx; do
        context_array[$i]=$ctx
        if [[ "$ctx" == "$current" ]]; then
            echo -e "  ${BOLD}$i)${NC} $ctx ${GREEN}(current)${NC}"
        else
            echo -e "  ${BOLD}$i)${NC} $ctx"
        fi
        ((i++))
    done <<< "$contexts"

    echo ""
    echo -e "  ${BOLD}0)${NC} Exit script"
    echo ""

    # Prompt for selection
    local max_choice=$((i-1))
    while true; do
        read -p "$(echo -e "${YELLOW}Select cluster context [0-$max_choice]: ${NC}")" choice

        if [[ "$choice" == "0" ]]; then
            log_info "Exiting..."
            exit 0
        elif [[ "$choice" =~ ^[0-9]+$ ]] && [[ "$choice" -ge 1 ]] && [[ "$choice" -le "$max_choice" ]]; then
            local selected_context="${context_array[$choice]}"

            echo ""
            log_info "Switching to context: ${BOLD}$selected_context${NC}"

            if kubectl config use-context "$selected_context" &>/dev/null; then
                log_info "✓ Successfully switched to: $selected_context"
                echo ""

                # Verify connection
                if kubectl cluster-info &> /dev/null; then
                    log_info "✓ Cluster connection verified"

                    # Show new cluster info
                    echo ""
                    log_detail "New cluster information:"
                    kubectl cluster-info 2>/dev/null | sed 's/^/    /' || echo "    Unable to retrieve cluster info"

                    return 0
                else
                    log_error "Cannot connect to cluster: $selected_context"
                    log_warn "The context was switched but connection failed"

                    if confirm_action "Try a different cluster?"; then
                        switch_cluster_context
                        return
                    else
                        exit 1
                    fi
                fi
            else
                log_error "Failed to switch context"

                if confirm_action "Try again?"; then
                    switch_cluster_context
                    return
                else
                    exit 1
                fi
            fi
        else
            echo -e "${RED}Invalid choice. Please select 0-$max_choice.${NC}"
        fi
    done
}

################################################################################
# Step 3: Select Action
################################################################################

select_action() {
    clear
    print_separator
    log_header "STEP 3: Select Deployment Action"

    echo -e "  ${BOLD}1)${NC} Install new release"
    echo -e "  ${BOLD}2)${NC} Upgrade existing release  "
    echo -e "  ${BOLD}3)${NC} Rollback release"
    echo -e "  ${BOLD}4)${NC} Uninstall release"
    echo -e "  ${BOLD}5)${NC} List releases"
    echo -e "  ${BOLD}6)${NC} Exit"
    echo ""

    while true; do
        read -p "$(echo -e "${YELLOW}Select action [1-6]: ${NC}")" choice
        case $choice in
            1)
                ACTION="install"
                log_info "Selected: Install new release"
                break
                ;;
            2)
                ACTION="upgrade"
                log_info "Selected: Upgrade existing release"
                break
                ;;
            3)
                perform_rollback
                exit 0
                ;;
            4)
                perform_uninstall
                exit 0
                ;;
            5)
                list_releases
                exit 0
                ;;
            6)
                log_info "Exiting..."
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid choice. Please select 1-6.${NC}"
                ;;
        esac
    done
}

################################################################################
# Step 4: Select Environment
################################################################################

select_environment() {
    clear
    print_separator
    log_header "STEP 4: Select Environment"

    show_config_summary

    echo -e "  ${BOLD}1) dev${NC} - Development"
    echo "     • 1 replica"
    echo "     • 512Mi memory limit"
    echo "     • No autoscaling"
    echo ""
    echo -e "  ${BOLD}2) prod${NC} - Production"
    echo "     • 3 replicas"
    echo "     • 2Gi memory limit"
    echo "     • Autoscaling enabled (3-10 pods)"
    echo ""

    while true; do
        read -p "$(echo -e "${YELLOW}Select environment [1-2]: ${NC}")" choice
        case $choice in
            1)
                ENVIRONMENT="dev"
                log_info "Selected: ${BOLD}dev${NC} (Development)"
                break
                ;;
            2)
                ENVIRONMENT="prod"
                log_warn "Selected: ${BOLD}prod${NC} (Production)"
                break
                ;;
            *)
                echo -e "${RED}Invalid choice. Please select 1 or 2.${NC}"
                ;;
        esac
    done
}

################################################################################
# Step 5: Configure Release Name
################################################################################

configure_release_name() {
    clear
    print_separator
    log_header "STEP 5: Configure Release Name"

    show_config_summary

    local default="cloudappdev"
    echo "The release name identifies your Helm deployment."
    echo "Default: ${BOLD}$default${NC}"
    echo ""

    read -p "$(echo -e "${YELLOW}Enter release name [press Enter for default]: ${NC}")" input
    RELEASE_NAME="${input:-$default}"

    log_info "Release name: ${BOLD}$RELEASE_NAME${NC}"
}

################################################################################
# Step 6: Configure Namespace
################################################################################

configure_namespace() {
    clear
    print_separator
    log_header "STEP 6: Configure Namespace"

    show_config_summary

    local default="cloudappdev-${ENVIRONMENT}"
    echo "Kubernetes namespace for deployment."
    echo "Default: ${BOLD}$default${NC}"
    echo ""

    # Show existing namespaces
    echo "Existing namespaces:"
    kubectl get namespaces -o custom-columns=NAME:.metadata.name --no-headers 2>/dev/null | grep -E "(cloudappdev|default|kube-)" | sed 's/^/  • /' || echo "  (Unable to list namespaces)"
    echo ""

    read -p "$(echo -e "${YELLOW}Enter namespace [press Enter for default]: ${NC}")" input
    NAMESPACE="${input:-$default}"

    log_info "Namespace: ${BOLD}$NAMESPACE${NC}"

    # Check if namespace exists
    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_warn "Namespace already exists"
    else
        log_info "Namespace will be created"
    fi
}

################################################################################
# Step 7: Configure Chart Path
################################################################################

configure_chart_path() {
    clear
    print_separator
    log_header "STEP 7: Configure Helm Chart Path"

    show_config_summary

    local default="./k8s/helm/cloudappdev"
    echo "Path to the Helm chart directory."
    echo "Default: ${BOLD}$default${NC}"
    echo ""

    # Check if default exists
    if [[ -d "$default" ]]; then
        log_info "Default chart found: $default"
        echo ""
        if confirm_action "Use default chart path?" "y"; then
            CHART_PATH="$default"
            log_info "Using: ${BOLD}$CHART_PATH${NC}"
            return
        fi
    else
        log_warn "Default chart path not found: $default"
    fi

    while true; do
        echo ""
        read -p "$(echo -e "${YELLOW}Enter chart path: ${NC}")" input
        CHART_PATH="${input:-$default}"

        if [[ -d "$CHART_PATH" ]]; then
            log_info "Chart found: ${BOLD}$CHART_PATH${NC}"
            break
        else
            log_error "Chart not found at: $CHART_PATH"
            if ! confirm_action "Try a different path?"; then
                exit 1
            fi
        fi
    done
}

################################################################################
# Step 8: Configure Values File
################################################################################

configure_values_file() {
    clear
    print_separator
    log_header "STEP 8: Configure Values File"

    show_config_summary

    local default="${CHART_PATH}/values-${ENVIRONMENT}.yaml"

    echo "Helm values file for environment-specific configuration."
    echo "Default: ${BOLD}$default${NC}"
    echo ""

    if [[ -f "$default" ]]; then
        log_info "Default values file found"
        echo ""
        if confirm_action "Use default values file?" "y"; then
            VALUES_FILE="$default"
            log_info "Using: ${BOLD}$VALUES_FILE${NC}"
            return
        fi
    else
        log_warn "Default values file not found"
    fi

    echo ""
    read -p "$(echo -e "${YELLOW}Enter custom values file path [leave empty to skip]: ${NC}")" input

    if [[ -n "$input" ]]; then
        if [[ -f "$input" ]]; then
            VALUES_FILE="$input"
            log_info "Using: ${BOLD}$VALUES_FILE${NC}"
        else
            log_warn "File not found: $input"
            if confirm_action "Continue without custom values file?" "y"; then
                VALUES_FILE=""
                log_info "No custom values file"
            else
                configure_values_file
                return
            fi
        fi
    else
        VALUES_FILE=""
        log_info "No custom values file"
    fi
}

################################################################################
# Step 9: Dry-Run Option
################################################################################

configure_dry_run() {
    clear
    print_separator
    log_header "STEP 9: Dry-Run Option"

    show_config_summary

    echo "Dry-run mode shows what would happen without making actual changes."
    echo "Useful for testing and validation."
    echo ""

    if confirm_action "Enable dry-run mode?"; then
        DRY_RUN=true
        log_warn "Dry-run enabled - no actual deployment will occur"
    else
        DRY_RUN=false
        log_info "Normal deployment mode"
    fi
}

################################################################################
# Step 10: Review and Confirm
################################################################################

review_and_confirm() {
    clear
    print_separator
    log_header "STEP 10: Review Configuration"

    local currentContext=$(kubectl config current-context)

    echo -e "${BOLD}Cluster Information:${NC}"
    echo -e "  Context:      $currentContext"
    echo -e "  Environment:  ${CYAN}$ENVIRONMENT${NC}"
    echo ""

    echo -e "${BOLD}Deployment Configuration:${NC}"
    echo -e "  Action:       $([[ "$ACTION" == "upgrade" ]] && echo "UPGRADE" || echo "INSTALL")"
    echo -e "  Release:      ${CYAN}$RELEASE_NAME${NC}"
    echo -e "  Namespace:    ${CYAN}$NAMESPACE${NC}"
    echo -e "  Chart:        $CHART_PATH"
    [[ -n "$VALUES_FILE" ]] && echo -e "  Values File:  $VALUES_FILE"
    echo ""

    echo -e "${BOLD}Resource Configuration:${NC}"
    case "$ENVIRONMENT" in
        dev)
            echo "  • Replicas: 1"
            echo "  • Memory: 512Mi"
            echo "  • Autoscaling: Disabled"
            ;;
        prod)
            echo "  • Replicas: 3"
            echo "  • Memory: 2Gi"
            echo "  • Autoscaling: Enabled (3-10 pods)"
            ;;
    esac
    echo ""

    if [[ "$DRY_RUN" == true ]]; then
        log_warn "DRY-RUN MODE ENABLED"
        echo ""
    fi

    # Check existing release
    if helm list -n "$NAMESPACE" 2>/dev/null | grep -q "$RELEASE_NAME"; then
        log_warn "Release '$RELEASE_NAME' already exists in namespace '$NAMESPACE'"
        if [[ "$ACTION" != "upgrade" ]]; then
            log_info "Will perform upgrade instead of install"
            ACTION="upgrade"
        fi
        echo ""
    fi

    print_separator

    if [[ "$ENVIRONMENT" == "prod" ]]; then
        echo ""
        log_warn "⚠️  WARNING: You are deploying to PRODUCTION!"
        echo ""
        if ! confirm_action "Are you absolutely sure you want to proceed?"; then
            log_info "Deployment cancelled"
            exit 0
        fi
    else
        if ! confirm_action "Proceed with deployment?" "y"; then
            log_info "Deployment cancelled"
            exit 0
        fi
    fi
}

################################################################################
# Deployment Execution
################################################################################

execute_deployment() {
    clear
    print_separator
    log_header "Executing Deployment"

    # Create namespace if needed
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_info "Creating namespace: $NAMESPACE"
        if [[ "$DRY_RUN" == false ]]; then
            kubectl create namespace "$NAMESPACE"
            kubectl label namespace "$NAMESPACE" environment="$ENVIRONMENT"
        fi
    fi

    # Build Helm command
    local helm_cmd="helm"

    if [[ "$ACTION" == "upgrade" ]]; then
        helm_cmd="$helm_cmd upgrade --install"
    else
        helm_cmd="$helm_cmd install"
    fi

    helm_cmd="$helm_cmd $RELEASE_NAME $CHART_PATH"
    helm_cmd="$helm_cmd --namespace $NAMESPACE --create-namespace"

    [[ -n "$VALUES_FILE" ]] && helm_cmd="$helm_cmd --values $VALUES_FILE"
    helm_cmd="$helm_cmd --set global.environment=$ENVIRONMENT"

    # Environment-specific settings
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

    [[ "$DRY_RUN" == true ]] && helm_cmd="$helm_cmd --dry-run --debug"

    echo -e "${BOLD}Executing:${NC}"
    echo -e "${CYAN}$helm_cmd${NC}"
    echo ""

    # Execute
    eval "$helm_cmd"

    echo ""
    if [[ "$DRY_RUN" == false ]]; then
        log_info "✓ Deployment initiated successfully!"

        echo ""
        log_info "Waiting for deployment..."
        kubectl wait --for=condition=available --timeout=300s \
            -n "$NAMESPACE" deployment -l "app.kubernetes.io/instance=$RELEASE_NAME" 2>/dev/null || true

        echo ""
        log_header "Deployment Status"
        kubectl get pods -n "$NAMESPACE" -l "app.kubernetes.io/instance=$RELEASE_NAME"
    else
        DRY_RUN_COMPLETED=true
        log_info "✓ Dry-run completed!"

        echo ""
        if confirm_action "Do you want to execute the actual deployment now?"; then
            DRY_RUN=false
            log_info "Switching to actual deployment mode..."
            echo ""
            execute_deployment
        fi
    fi
}

################################################################################
# Additional Operations
################################################################################

list_releases() {
    clear
    print_separator
    log_header "List Helm Releases"

    read -p "$(echo -e "${YELLOW}Enter namespace [leave empty for all]: ${NC}")" ns
    echo ""

    if [[ -n "$ns" ]]; then
        log_info "Releases in namespace '$ns':"
        helm list -n "$ns"
    else
        log_info "Releases in all namespaces:"
        helm list --all-namespaces
    fi

    echo ""
    read -p "Press Enter to exit..."
}

perform_rollback() {
    clear
    print_separator
    log_header "Rollback Release"

    read -p "$(echo -e "${YELLOW}Enter namespace: ${NC}")" ns
    [[ -z "$ns" ]] && ns="cloudappdev-dev"

    echo ""
    log_info "Releases in '$ns':"
    helm list -n "$ns" 2>/dev/null || log_warn "Namespace not found or no releases"

    echo ""
    read -p "$(echo -e "${YELLOW}Enter release name: ${NC}")" release
    [[ -z "$release" ]] && { log_error "Release name required"; exit 1; }

    echo ""
    helm history "$release" -n "$ns"

    echo ""
    read -p "$(echo -e "${YELLOW}Enter revision [leave empty for previous]: ${NC}")" revision

    if confirm_action "Rollback '$release'?"; then
        [[ -n "$revision" ]] && helm rollback "$release" "$revision" -n "$ns" || helm rollback "$release" -n "$ns"
        log_info "Rollback completed!"
    fi

    echo ""
    read -p "Press Enter to exit..."
}

perform_uninstall() {
    clear
    print_separator
    log_header "Uninstall Release"

    read -p "$(echo -e "${YELLOW}Enter namespace: ${NC}")" ns
    [[ -z "$ns" ]] && ns="cloudappdev-dev"

    echo ""
    log_info "Releases in '$ns':"
    helm list -n "$ns" 2>/dev/null

    echo ""
    read -p "$(echo -e "${YELLOW}Enter release name: ${NC}")" release
    [[ -z "$release" ]] && { log_error "Release name required"; exit 1; }

    echo ""
    log_warn "⚠️  This will DELETE the release and all resources!"

    if confirm_action "Uninstall '$release'?"; then
        helm uninstall "$release" -n "$ns"
        log_info "Uninstall completed!"

        if confirm_action "Delete namespace '$ns'?"; then
            kubectl delete namespace "$ns"
            log_info "Namespace deleted!"
        fi
    fi

    echo ""
    read -p "Press Enter to exit..."
}

################################################################################
# Show Next Steps
################################################################################

show_next_steps() {
    if [[ "$DRY_RUN" == true ]] || [[ "$DRY_RUN_COMPLETED" == true ]]; then
        return
    fi

    echo ""
    print_separator
    log_header "Next Steps"

    echo -e "  ${BOLD}• Check status:${NC}"
    echo "    kubectl get pods -n $NAMESPACE"
    echo ""
    echo -e "  ${BOLD}• View logs:${NC}"
    echo "    kubectl logs -f deployment/<name> -n $NAMESPACE"
    echo ""
    echo -e "  ${BOLD}• Get services:${NC}"
    echo "    kubectl get svc -n $NAMESPACE"
    echo ""
    echo -e "  ${BOLD}• Rollback if needed:${NC}"
    echo "    helm rollback $RELEASE_NAME -n $NAMESPACE"
    echo ""

    print_separator
    log_info "✓ Deployment completed successfully!"
    print_separator
}

################################################################################
# Main Workflow
################################################################################

main() {
    check_prerequisites
    show_cluster_info
    select_action
    select_environment
    configure_release_name
    configure_namespace
    configure_chart_path
    configure_values_file
    configure_dry_run
    review_and_confirm
    execute_deployment
    show_next_steps
}

# Run main workflow
main
