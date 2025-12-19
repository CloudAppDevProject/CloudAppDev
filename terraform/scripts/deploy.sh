#!/bin/bash
# Terraform deployment script for multi-environment setup

set -e

ENVIRONMENT=$1
ACTION=${2:-plan}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

if [ -z "$ENVIRONMENT" ]; then
  echo -e "${RED}Error: Environment not specified${NC}"
  echo "Usage: ./deploy.sh <environment> [action]"
  echo "  environment: dev, prod"
  echo "  action: plan, apply, destroy (default: plan)"
  echo ""
  echo "Examples:"
  echo "  ./deploy.sh dev plan"
  echo "  ./deploy.sh prod apply"
  exit 1
fi

ENV_DIR="environments/$ENVIRONMENT"

if [ ! -d "$ENV_DIR" ]; then
  echo -e "${RED}Error: Environment '$ENVIRONMENT' not found${NC}"
  echo "Available environments: dev, prod"
  exit 1
fi

echo -e "${GREEN}🚀 Running Terraform for environment: ${ENVIRONMENT}${NC}"
echo -e "${YELLOW}Action: ${ACTION}${NC}"
echo ""

cd "$ENV_DIR"

# Initialize Terraform
echo -e "${YELLOW}Initializing Terraform...${NC}"
terraform init

# Validate configuration
echo -e "${YELLOW}Validating configuration...${NC}"
terraform validate

# Run the action
case $ACTION in
  plan)
    echo -e "${YELLOW}Creating execution plan...${NC}"
    terraform plan -out=tfplan
    echo ""
    echo -e "${GREEN}✅ Plan created successfully!${NC}"
    echo -e "${YELLOW}Review the plan above. To apply, run:${NC}"
    echo -e "  ./deploy.sh $ENVIRONMENT apply"
    ;;
  apply)
    if [ ! -f "tfplan" ]; then
      echo -e "${RED}Error: No plan file found. Run 'plan' first.${NC}"
      exit 1
    fi
    echo -e "${YELLOW}Applying changes...${NC}"
    terraform apply tfplan
    rm -f tfplan
    echo ""
    echo -e "${GREEN}✅ Changes applied successfully!${NC}"
    ;;
  destroy)
    echo -e "${RED}⚠️  WARNING: This will destroy all resources in ${ENVIRONMENT}!${NC}"
    read -p "Are you sure? Type 'yes' to confirm: " -r
    echo
    if [[ $REPLY == "yes" ]]; then
      terraform destroy
      echo -e "${GREEN}✅ Resources destroyed${NC}"
    else
      echo -e "${YELLOW}Destroy cancelled${NC}"
    fi
    ;;
  output)
    echo -e "${YELLOW}Showing outputs...${NC}"
    terraform output
    ;;
  *)
    echo -e "${RED}Unknown action: $ACTION${NC}"
    echo "Valid actions: plan, apply, destroy, output"
    exit 1
    ;;
esac
