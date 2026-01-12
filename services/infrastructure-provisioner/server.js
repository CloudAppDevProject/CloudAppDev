import express from 'express';
import bodyParser from 'body-parser';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 8080;

app.use(bodyParser.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'infrastructure-provisioner' });
});

/**
 * POST /provision-tenant
 *
 * Provisions infrastructure for a new tenant
 *
 * Request body:
 * {
 *   "tenantId": 123,
 *   "tenantName": "acme-corp",
 *   "tier": "enterprise",
 *   "environment": "dev"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "domain": "acme-corp.cloudappdev.site",
 *   "namespace": "enterprise-acme-corp",
 *   "message": "Infrastructure provisioned successfully"
 * }
 */
app.post('/provision-tenant', async (req, res) => {
  try {
    const { tenantId, tenantName, tier, environment = 'dev' } = req.body;

    // Validation
    if (!tenantId || !tenantName || !tier) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: tenantId, tenantName, tier'
      });
    }

    if (!['free', 'standard', 'enterprise'].includes(tier)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tier. Must be one of: free, standard, enterprise'
      });
    }

    // Sanitize tenant name (only alphanumeric and hyphens)
    const sanitizedName = tenantName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    console.log(`[Provision Request] Tenant: ${sanitizedName}, Tier: ${tier}, Env: ${environment}`);

    // Step 1: Update tenants.tfvars with new tenant
    await addTenantToTfvars(sanitizedName, tier, environment);

    // Step 2: Run Terraform apply
    const terraformResult = await runTerraformApply(environment);

    // Step 3: For enterprise, trigger Kubernetes deployment
    let deploymentResult = null;
    if (tier === 'enterprise') {
      deploymentResult = await deployEnterpriseNamespace(sanitizedName, environment);
    }

    // Success response
    const domain = getDomainForTenant(sanitizedName, tier);
    const namespace = tier === 'enterprise' ? sanitizedName : tier;

    res.json({
      success: true,
      tenantId,
      tenantName: sanitizedName,
      tier,
      domain,
      namespace,
      infrastructure: {
        terraform: terraformResult,
        deployment: deploymentResult
      },
      message: 'Infrastructure provisioned successfully'
    });

  } catch (error) {
    console.error('[Provision Error]', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stderr || error.stack
    });
  }
});

/**
 * POST /deprovision-tenant
 *
 * Removes infrastructure for a tenant
 */
app.post('/deprovision-tenant', async (req, res) => {
  try {
    const { tenantName, tier, environment = 'dev' } = req.body;

    if (!tenantName || !tier) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: tenantName, tier'
      });
    }

    const sanitizedName = tenantName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    console.log(`[Deprovision Request] Tenant: ${sanitizedName}, Tier: ${tier}`);

    // Step 1: Remove tenant from tfvars
    await removeTenantFromTfvars(sanitizedName, environment);

    // Step 2: Run Terraform apply (will destroy removed resources)
    const terraformResult = await runTerraformApply(environment);

    res.json({
      success: true,
      tenantName: sanitizedName,
      message: 'Infrastructure deprovisioned successfully',
      terraform: terraformResult
    });

  } catch (error) {
    console.error('[Deprovision Error]', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /tenants/:environment
 *
 * Lists all provisioned tenants
 */
app.get('/tenants/:environment', async (req, res) => {
  try {
    const { environment } = req.params;
    const tenants = await listProvisionedTenants(environment);

    res.json({
      success: true,
      environment,
      tenants
    });
  } catch (error) {
    console.error('[List Error]', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================================
// Helper Functions
// ========================================

/**
 * Adds a tenant to the tenants.tfvars file
 */
async function addTenantToTfvars(tenantName, tier, environment) {
  const tfvarsPath = `/terraform/environments/${environment}/tenants.tfvars`;

  let content = '';
  try {
    content = await fs.readFile(tfvarsPath, 'utf-8');
  } catch (err) {
    // File doesn't exist, create it with initial empty array
    console.log(`[Terraform] Creating ${tfvarsPath} with empty tenant list`);
    content = `# Tenant Infrastructure Configuration
# Managed by infrastructure-provisioner service

tenants = []
`;
    // Write the initial file immediately
    try {
      await fs.writeFile(tfvarsPath, content, 'utf-8');
      console.log(`[Terraform] Successfully created ${tfvarsPath}`);
    } catch (writeErr) {
      console.error(`[Terraform] Failed to create ${tfvarsPath}:`, writeErr.message);
      throw writeErr;
    }
  }

  // Parse existing tenants
  const tenantRegex = /tenants\s*=\s*\[([\s\S]*?)\]/;
  const match = content.match(tenantRegex);

  let tenantsArray = [];
  if (match && match[1].trim()) {
    // Parse existing tenant objects (simplified parsing)
    const tenantBlocks = match[1].split('},').filter(b => b.trim());
    tenantsArray = tenantBlocks.map(block => {
      const nameMatch = block.match(/name\s*=\s*"([^"]+)"/);
      return nameMatch ? nameMatch[1] : null;
    }).filter(Boolean);
  }

  // Check if tenant already exists
  if (tenantsArray.includes(tenantName)) {
    console.log(`[Terraform] Tenant ${tenantName} already exists in tfvars`);
    return;
  }

  // Add new tenant
  const newTenantBlock = `  {
    name = "${tenantName}"
    tier = "${tier}"
  }`;

  if (tenantsArray.length === 0) {
    content = `tenants = [\n${newTenantBlock}\n]\n`;
  } else {
    // Insert before closing bracket
    content = content.replace(/\](\s*)$/, `,\n${newTenantBlock}\n]$1`);
  }

  await fs.writeFile(tfvarsPath, content, 'utf-8');
  console.log(`[Terraform] Added tenant ${tenantName} to ${tfvarsPath}`);
}

/**
 * Removes a tenant from tenants.tfvars
 */
async function removeTenantFromTfvars(tenantName, environment) {
  const tfvarsPath = `/terraform/environments/${environment}/tenants.tfvars`;

  let content = await fs.readFile(tfvarsPath, 'utf-8');

  // Remove tenant block (including comma and whitespace)
  const tenantBlockRegex = new RegExp(
    `,?\\s*\\{[^}]*name\\s*=\\s*"${tenantName}"[^}]*\\}\\s*,?`,
    'g'
  );

  content = content.replace(tenantBlockRegex, '');

  // Clean up double commas or trailing commas
  content = content.replace(/,\s*,/g, ',').replace(/,(\s*)\]/g, '$1]');

  await fs.writeFile(tfvarsPath, content, 'utf-8');
  console.log(`[Terraform] Removed tenant ${tenantName} from ${tfvarsPath}`);
}

/**
 * Runs terraform apply for the specified environment
 */
async function runTerraformApply(environment) {
  const workDir = `/terraform/environments/${environment}`;

  console.log(`[Terraform] Running terraform apply in ${workDir}`);

  try {
    // Initialize Terraform (idempotent)
    console.log(`[Terraform] Initializing...`);
    await execAsync('terraform init -input=false', {
      cwd: workDir,
      timeout: 300000, // 5 minutes
      maxBuffer: 10 * 1024 * 1024 // 10MB
    });

    console.log(`[Terraform] Init completed, starting apply...`);

    // Apply with auto-approve and var-file
    const { stdout, stderr } = await execAsync(
      'terraform apply -auto-approve -input=false -var-file=tenants.tfvars',
      {
        cwd: workDir,
        timeout: 600000, // 10 minutes
        maxBuffer: 10 * 1024 * 1024 // 10MB
      }
    );

    console.log(`[Terraform] Apply completed successfully`);

    return {
      success: true,
      output: stdout,
      errors: stderr
    };
  } catch (error) {
    console.error(`[Terraform] Error during apply:`, error.message);
    throw error;
  }
}

/**
 * Deploys Kubernetes resources for enterprise namespace
 * Includes: gateway, frontend (app), user-service, itinerary-service, social-service
 * Note: tenant-service and travel-info-service remain in default namespace (shared)
 */
async function deployEnterpriseNamespace(tenantName, environment) {
  const namespace = tenantName;

  console.log(`[K8s] Deploying resources to namespace: ${namespace}`);

  // Create namespace if not exists
  try {
    await execAsync(`kubectl create namespace ${namespace}`);
  } catch (err) {
    // Namespace might already exist
    console.log(`[K8s] Namespace ${namespace} already exists or creation failed`);
  }

  // Deploy services for enterprise tenant (Helm charts)
  // Service names must be: <service>-service for API Gateway routing
  // Paths: /k8s/gateway, /k8s/app, /k8s/services/{user,itinerary,social}
  const services = [
    { name: 'gateway', path: '/k8s/gateway', helmRelease: 'gateway' },
    { name: 'app', path: '/k8s/app', helmRelease: 'app' },
    { name: 'user-service', path: '/k8s/services/user', helmRelease: 'user-service' },
    { name: 'itinerary-service', path: '/k8s/services/itinerary', helmRelease: 'itinerary-service' },
    { name: 'social-service', path: '/k8s/services/social', helmRelease: 'social-service' }
  ];

  const deployResults = [];

  for (const service of services) {
    try {
      const valuesFile = `${service.path}/values-${environment}.yaml`;

      const { stdout } = await execAsync(
        `helm upgrade --install ${service.helmRelease}-${tenantName} ${service.path} ` +
        `-f ${valuesFile} ` +
        `--namespace ${namespace} ` +
        `--set namespace=${namespace} ` +
        `--set tenant=${tenantName} ` +
        `--set fullnameOverride=${service.name}`
      );

      deployResults.push({
        service: service.name,
        success: true,
        output: stdout
      });

      console.log(`[K8s] Deployed ${service.name} to ${namespace}`);
    } catch (err) {
      deployResults.push({
        service: service.name,
        success: false,
        error: err.message
      });
      console.error(`[K8s] Failed to deploy ${service.name}: ${err.message}`);
    }
  }

  return {
    namespace,
    deployments: deployResults
  };
}

/**
 * Lists all provisioned tenants from Terraform state
 */
async function listProvisionedTenants(environment) {
  const workDir = `/terraform/environments/${environment}`;

  try {
    const { stdout } = await execAsync('terraform output -json', { cwd: workDir });
    const outputs = JSON.parse(stdout);

    return {
      enterprise: outputs.enterprise_tenants?.value || {},
      domains: outputs.tenant_domains?.value || {}
    };
  } catch (err) {
    console.error('[Terraform] Failed to read outputs:', err.message);
    return { enterprise: {}, domains: {} };
  }
}

/**
 * Gets the domain URL for a tenant based on tier
 * All tenants get: {tenant-name}.cloudappdev.site
 */
function getDomainForTenant(tenantName, tier) {
  const hostname = 'cloudappdev.site';

  
    return `https://${tenantName}.${hostname}`;
  
}

// ========================================
// Start Server
// ========================================

app.listen(PORT, () => {
  console.log(`[Infrastructure Provisioner] Running on port ${PORT}`);
  console.log(`[Environment] ${process.env.NODE_ENV || 'development'}`);
});