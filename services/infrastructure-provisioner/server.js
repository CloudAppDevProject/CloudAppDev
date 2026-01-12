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
 * Ensures base terraform.tfvars file exists with required variables
 */
async function ensureBaseTfvars(environment) {
  const tfvarsPath = `/terraform/environments/${environment}-tenants/terraform.tfvars`;

  try {
    // Check if file exists
    await fs.access(tfvarsPath);
    console.log(`[Terraform] Base tfvars file exists at ${tfvarsPath}`);
  } catch (err) {
    // File doesn't exist, create it with environment variables
    console.log(`[Terraform] Creating base tfvars file at ${tfvarsPath}`);

    const projectId = process.env.GCP_PROJECT || 'cloudappdev-dev';
    const region = process.env.GCP_REGION || 'europe-west1';
    const cloudflareZoneId = process.env.CLOUDFLARE_ZONE_ID || 'ddbd47810ae075fc0bc55a4ef05a91ec';

    const content = `# Base Terraform Configuration
# Managed by infrastructure-provisioner service

project_id         = "${projectId}"
region             = "${region}"
environment        = "${environment}"
cloudflare_zone_id = "${cloudflareZoneId}"
`;

    await fs.writeFile(tfvarsPath, content, 'utf-8');
    console.log(`[Terraform] Successfully created base tfvars file`);
  }
}

/**
 * Adds a tenant to the tenants.tfvars file
 */
async function addTenantToTfvars(tenantName, tier, environment) {
  const tfvarsPath = `/terraform/environments/${environment}-tenants/tenants.tfvars`;

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
  const tfvarsPath = `/terraform/environments/${environment}-tenants/tenants.tfvars`;

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
  const workDir = `/terraform/environments/${environment}-tenants`;

  console.log(`[Terraform] Running terraform apply in ${workDir}`);
  
  try {
    // Ensure base configuration tfvars exists
    await ensureBaseTfvars(environment);

    // Initialize Terraform (idempotent)
    console.log(`[Terraform] Initializing...`);
    await execAsync('terraform init -input=false', {
      cwd: workDir,
      timeout: 300000, // 5 minutes
      maxBuffer: 10 * 1024 * 1024 // 10MB
    });

    console.log(`[Terraform] Init completed, starting apply...`);

    // Apply with auto-approve and var-files (base config + tenants)
    // Use -lock-timeout to prevent indefinite lock waiting
    const { stdout, stderr } = await execAsync(
      'terraform apply -auto-approve -input=false -lock-timeout=2m -var-file=terraform.tfvars -var-file=tenants.tfvars',
      {
        cwd: workDir,
        timeout: 1200000, // 20 minutes
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
 *
 * Uses Terraform outputs to inject tenant-specific infrastructure values into Helm charts
 */
async function deployEnterpriseNamespace(tenantName, environment) {
  const namespace = tenantName;

  console.log(`[K8s] Deploying resources to namespace: ${namespace}`);

  // Step 1: Extract Terraform outputs for this tenant
  console.log(`[K8s] Extracting Terraform outputs for tenant ${tenantName}`);
  const terraformOutputs = await getTerraformOutputsForTenant(tenantName, environment);

  if (!terraformOutputs) {
    throw new Error(`No Terraform outputs found for tenant ${tenantName}. Infrastructure may not be provisioned yet.`);
  }

  console.log(`[K8s] Terraform outputs retrieved:`, JSON.stringify(terraformOutputs, null, 2));

  // Step 2: Create namespace if not exists
  try {
    await execAsync(`kubectl create namespace ${namespace}`);
    console.log(`[K8s] Created namespace ${namespace}`);
  } catch (err) {
    // Namespace might already exist
    console.log(`[K8s] Namespace ${namespace} already exists`);
  }

  // Step 3: Create Kubernetes secrets from Terraform outputs
  await createKubernetesSecrets(namespace, tenantName, terraformOutputs, environment);

  // Step 4: Deploy services using Helm with Terraform output values
  // Service names must be: <service>-service for API Gateway routing
  const services = [
    { name: 'user-service', path: '/k8s/services/user', helmRelease: 'user-service' },
    { name: 'itinerary-service', path: '/k8s/services/itinerary', helmRelease: 'itinerary-service' },
    { name: 'social-service', path: '/k8s/services/social', helmRelease: 'social-service' },
    { name: 'app', path: '/k8s/app', helmRelease: 'app' },
    { name: 'gateway', path: '/k8s/gateway', helmRelease: 'gateway' }
  ];

  const deployResults = [];

  for (const service of services) {
    try {
      const helmValues = generateHelmValues(service.name, tenantName, terraformOutputs, environment);

      console.log(`[K8s] Deploying ${service.name} with values:`, JSON.stringify(helmValues, null, 2));

      // Create temporary values file
      const valuesFilePath = `/tmp/helm-values-${tenantName}-${service.name}.yaml`;
      await fs.writeFile(valuesFilePath, helmValues, 'utf-8');

      const { stdout } = await execAsync(
        `helm upgrade --install ${service.helmRelease} ${service.path} ` +
        `-f ${service.path}/values-${environment}.yaml ` +
        `-f ${valuesFilePath} ` +
        `--namespace ${namespace} ` +
        `--wait --timeout 10m`
      );

      // Clean up temp file
      await fs.unlink(valuesFilePath).catch(() => {});

      deployResults.push({
        service: service.name,
        success: true,
        output: stdout.substring(0, 500) // Truncate for response size
      });

      console.log(`[K8s] Successfully deployed ${service.name} to ${namespace}`);
    } catch (err) {
      deployResults.push({
        service: service.name,
        success: false,
        error: err.message
      });
      console.error(`[K8s] Failed to deploy ${service.name}:`, err.message);
    }
  }

  return {
    namespace,
    infrastructure: terraformOutputs,
    deployments: deployResults
  };
}

/**
 * Gets Terraform outputs for a specific tenant
 */
async function getTerraformOutputsForTenant(tenantName, environment) {
  const workDir = `/terraform/environments/${environment}-tenants`;

  try {
    const { stdout } = await execAsync('terraform output -json', { cwd: workDir });
    const outputs = JSON.parse(stdout);

    // Extract enterprise deployment details for this tenant
    const deployments = outputs.enterprise_deployments?.value || {};
    return deployments[tenantName] || null;
  } catch (err) {
    console.error(`[Terraform] Failed to get outputs for ${tenantName}:`, err.message);
    return null;
  }
}

/**
 * Creates Kubernetes secrets for tenant services
 * Secrets include database URLs, service account emails, bucket names
 * Each tenant gets their own isolated secrets (NOT shared from provisioner environment)
 */
async function createKubernetesSecrets(namespace, tenantName, terraformOutputs, environment) {
  console.log(`[K8s] Creating secrets in namespace ${namespace}`);

  // Retrieve tenant-specific secrets from Google Secret Manager
  const tenantSecrets = await getTenantSecretsFromSecretManager(tenantName, environment);

  // Generate tenant-specific database credentials
  const dbUser = `${tenantName}_user`;
  const dbPassword = await getSecretFromGSM(`${tenantName}-db-password`, environment);

  // Base secrets for this tenant (isolated from other tenants)
  const baseSecrets = {
    FIREBASE_SERVICE_ACCOUNT_JSON_BASE64: tenantSecrets.firebase_service_account || '',
    JWT_SECRET: tenantSecrets.jwt_secret || `${tenantName}-jwt-secret-${Date.now()}`,
    JWT_EXPIRATION: '7d',
    NODE_ENV: environment === 'prod' ? 'production' : 'development',
    GOOGLE_CLOUD_PROJECT_ID: process.env.GCP_PROJECT || 'cloudappdev-dev'
  };

  // User Service Secrets (tenant-specific)
  const userSecrets = {
    ...baseSecrets,
    DATABASE_URL: `postgresql://${dbUser}:${dbPassword}@localhost:5432/users`,
    GOOGLE_CLOUD_STORAGE_BUCKET: terraformOutputs.images_bucket_name,
    GOOGLE_CLOUD_CREDENTIALS_BASE64: '' // Workload Identity handles this
  };

  // Itinerary Service Secrets (tenant-specific)
  const itinerarySecrets = {
    ...baseSecrets,
    DATABASE_URL: `postgresql://${dbUser}:${dbPassword}@localhost:5432/itineraries`,
    GOOGLE_CLOUD_STORAGE_BUCKET: terraformOutputs.images_bucket_name,
    GOOGLE_CLOUD_CREDENTIALS_BASE64: ''
  };

  // Social Service Secrets (tenant-specific)
  const socialSecrets = {
    ...baseSecrets,
    FIRESTORE_DATABASE_ID: terraformOutputs.social_db_name,
    GOOGLE_CLOUD_PROJECT_ID: process.env.GCP_PROJECT || 'cloudappdev-dev'
  };

  // Create Kubernetes secrets in tenant namespace
  const secrets = [
    { name: 'user-service-secrets', data: userSecrets },
    { name: 'itinerary-service-secrets', data: itinerarySecrets },
    { name: 'social-service-secrets', data: socialSecrets }
  ];

  for (const secret of secrets) {
    try {
      // Check if secret exists
      const secretExists = await checkSecretExists(secret.name, namespace);

      if (secretExists) {
        console.log(`[K8s] Secret ${secret.name} already exists in namespace ${namespace}, skipping creation`);
        continue;
      }

      // Create secret from literal key-value pairs (only if it doesn't exist)
      const secretArgs = Object.entries(secret.data)
        .map(([key, value]) => `--from-literal=${key}="${value}"`)
        .join(' ');

      await execAsync(
        `kubectl create secret generic ${secret.name} -n ${namespace} ${secretArgs}`
      );

      console.log(`[K8s] Created secret ${secret.name} in namespace ${namespace} (isolated for tenant ${tenantName})`);
    } catch (err) {
      console.error(`[K8s] Failed to create secret ${secret.name}:`, err.message);
      throw err;
    }
  }
}

/**
 * Checks if a Kubernetes secret exists in a namespace
 */
async function checkSecretExists(secretName, namespace) {
  try {
    await execAsync(`kubectl get secret ${secretName} -n ${namespace}`);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Retrieves tenant-specific secrets from Google Secret Manager
 * Secrets are stored with naming convention: {tenant-name}-{secret-type}
 */
async function getTenantSecretsFromSecretManager(tenantName, environment) {
  console.log(`[GSM] Retrieving secrets for tenant ${tenantName}`);

  try {
    // Retrieve tenant-specific secrets (if they exist)
    const firebaseAccount = await getSecretFromGSM(`${tenantName}-firebase-service-account`, environment);
    const jwtSecret = await getSecretFromGSM(`${tenantName}-jwt-secret`, environment);

    return {
      firebase_service_account: firebaseAccount,
      jwt_secret: jwtSecret
    };
  } catch (err) {
    console.warn(`[GSM] Could not retrieve some secrets for ${tenantName}, using defaults:`, err.message);

    // Fallback: Generate tenant-specific secrets if not in Secret Manager
    return {
      firebase_service_account: process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 || '',
      jwt_secret: `${tenantName}-jwt-secret-${Date.now()}`
    };
  }
}

/**
 * Retrieves a single secret from Google Secret Manager
 * Returns the secret value or throws an error
 */
async function getSecretFromGSM(secretName, environment) {
  const projectId = process.env.GCP_PROJECT || 'cloudappdev-dev';
  const secretPath = `${secretName}-${environment}`;

  try {
    const { stdout } = await execAsync(
      `gcloud secrets versions access latest --secret="${secretPath}" --project="${projectId}"`,
      { timeout: 30000 }
    );
    return stdout.trim();
  } catch (err) {
    console.warn(`[GSM] Secret ${secretPath} not found, generating fallback`);

    // Generate fallback secret value
    if (secretName.includes('db-password')) {
      // Generate secure random password for database
      const crypto = await import('crypto');
      return crypto.randomBytes(32).toString('base64');
    } else if (secretName.includes('jwt-secret')) {
      // Generate secure JWT secret
      const crypto = await import('crypto');
      return crypto.randomBytes(64).toString('hex');
    }

    throw new Error(`Secret ${secretPath} not found and no fallback available`);
  }
}

/**
 * Generates Helm values YAML for a service with tenant-specific configuration
 */
function generateHelmValues(serviceName, tenantName, terraformOutputs, environment) {
  const projectId = process.env.GCP_PROJECT || 'cloudappdev-dev';

  // Base values common to all services
  const baseValues = {
    namespace: tenantName,
    image: {
      tag: 'latest' // Use latest for now, can be parameterized
    }
  };

  // Service-specific values
  let serviceValues = {};

  if (serviceName === 'user-service') {
    serviceValues = {
      initContainers: [
        {
          name: 'cloud-sql-proxy',
          image: 'gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.14.1',
          args: [
            '--port=5432',
            terraformOutputs.database_connection_name
          ],
          restartPolicy: 'Always',
          securityContext: {
            runAsNonRoot: true
          },
          resources: {
            requests: {
              cpu: '250m',
              memory: '512Mi'
            }
          }
        }
      ],
      serviceAccount: {
        create: true,
        annotations: {
          'iam.gke.io/gcp-service-account': terraformOutputs.user_service_account_email
        },
        name: 'user-service-sa'
      }
    };
  } else if (serviceName === 'itinerary-service') {
    serviceValues = {
      initContainers: [
        {
          name: 'cloud-sql-proxy',
          image: 'gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.14.1',
          args: [
            '--port=5432',
            terraformOutputs.database_connection_name
          ],
          restartPolicy: 'Always',
          securityContext: {
            runAsNonRoot: true
          },
          resources: {
            requests: {
              cpu: '250m',
              memory: '512Mi'
            }
          }
        }
      ],
      serviceAccount: {
        create: true,
        annotations: {
          'iam.gke.io/gcp-service-account': terraformOutputs.itinerary_service_account_email
        },
        name: 'itinerary-service-sa'
      }
    };
  } else if (serviceName === 'social-service') {
    serviceValues = {
      serviceAccount: {
        create: true,
        annotations: {
          'iam.gke.io/gcp-service-account': terraformOutputs.social_service_account_email
        },
        name: 'social-service-sa'
      }
    };
  } else if (serviceName === 'gateway') {
    serviceValues = {
      tenant: tenantName,
      upstreams: {
        userService: `user-service.${tenantName}.svc.cluster.local:8080`,
        itineraryService: `itinerary-service.${tenantName}.svc.cluster.local:8081`,
        socialService: `social-service.${tenantName}.svc.cluster.local:8082`,
        // Shared services remain in default namespace
        travelInfoService: 'travel-info-service.default.svc.cluster.local:8083',
        tenantService: 'tenant-service.default.svc.cluster.local:8084'
      }
    };
  } else if (serviceName === 'app') {
    serviceValues = {
      env: [
        {
          name: 'API_GATEWAY_URL',
          value: `http://gateway.${tenantName}.svc.cluster.local:80`
        },
        {
          name: 'NEXT_PUBLIC_TENANT_NAME',
          value: tenantName
        }
      ]
    };
  }

  // Merge base and service-specific values
  const allValues = { ...baseValues, ...serviceValues };

  // Convert to YAML format (simple string serialization)
  return convertToYaml(allValues);
}

/**
 * Simple YAML converter (handles basic types)
 * For production, use a proper YAML library like js-yaml
 */
function convertToYaml(obj, indent = 0) {
  const spaces = '  '.repeat(indent);
  let yaml = '';

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      yaml += `${spaces}${key}: null\n`;
    } else if (Array.isArray(value)) {
      yaml += `${spaces}${key}:\n`;
      value.forEach(item => {
        if (typeof item === 'object') {
          yaml += `${spaces}- \n`;
          yaml += convertToYaml(item, indent + 1).split('\n').map(line => `  ${line}`).join('\n') + '\n';
        } else {
          yaml += `${spaces}- ${item}\n`;
        }
      });
    } else if (typeof value === 'object') {
      yaml += `${spaces}${key}:\n`;
      yaml += convertToYaml(value, indent + 1);
    } else if (typeof value === 'string') {
      yaml += `${spaces}${key}: "${value}"\n`;
    } else {
      yaml += `${spaces}${key}: ${value}\n`;
    }
  }

  return yaml;
}

/**
 * Lists all provisioned tenants from Terraform state
 */
async function listProvisionedTenants(environment) {
  const workDir = `/terraform/environments/${environment}-tenants`;

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
// Graceful Shutdown Handler
// ========================================

let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n[Shutdown] Received ${signal}, cleaning up...`);

  // Give ongoing operations time to complete
  setTimeout(() => {
    console.log('[Shutdown] Forcefully exiting after timeout');
    process.exit(1);
  }, 30000); // 30 seconds max

  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ========================================
// Start Server
// ========================================

app.listen(PORT, () => {
  console.log(`[Infrastructure Provisioner] Running on port ${PORT}`);
  console.log(`[Environment] ${process.env.NODE_ENV || 'development'}`);
});