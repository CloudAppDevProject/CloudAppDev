import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as crypto from 'crypto';

const execAsync = promisify(exec);

export interface DeploymentResult {
  service: string;
  success: boolean;
  output?: string;
  warnings?: string;
  error?: string;
  stderr?: string;
  stdout?: string;
}

export interface KubernetesDeploymentResult {
  namespace: string;
  infrastructure: any;
  deployments: DeploymentResult[];
}

@Injectable()
export class KubernetesService {
  private readonly logger = new Logger(KubernetesService.name);

  /**
   * Deploys Kubernetes resources for enterprise namespace
   */
  async deployEnterpriseNamespace(
    tenantName: string,
    environment: string,
    terraformOutputs: any,
  ): Promise<KubernetesDeploymentResult> {
    const namespace = tenantName;

    this.logger.log(`Deploying resources to namespace: ${namespace}`);

    if (!terraformOutputs) {
      throw new Error(
        `No Terraform outputs found for tenant ${tenantName}. Infrastructure may not be provisioned yet.`,
      );
    }

    this.logger.log(
      `Terraform outputs retrieved: ${JSON.stringify(terraformOutputs, null, 2)}`,
    );

    // Create namespace if not exists
    await this.ensureNamespaceExists(namespace);

    // Wait a moment for namespace to be fully ready
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Create Kubernetes secrets
    await this.createKubernetesSecrets(
      namespace,
      tenantName,
      terraformOutputs,
      environment,
    );

    // Deploy services using Helm
    const services = [
      {
        name: 'user-service',
        path: '/k8s/services/user',
        helmRelease: 'user-service',
      },
      {
        name: 'itinerary-service',
        path: '/k8s/services/itinerary',
        helmRelease: 'itinerary-service',
      },
      {
        name: 'social-service',
        path: '/k8s/services/social',
        helmRelease: 'social-service',
      },
      { name: 'app', path: '/k8s/app', helmRelease: 'app' },
      { name: 'gateway', path: '/k8s/gateway', helmRelease: 'gateway' },
    ];

    const deployResults: DeploymentResult[] = [];
    let hasFailures = false;

    for (const service of services) {
      try {
        const setFlags = this.generateHelmSetFlags(
          service.name,
          tenantName,
          terraformOutputs,
          environment,
        );

        this.logger.log(`Deploying ${service.name} with overrides`);

        const { stdout, stderr } = await execAsync(
          `helm upgrade --install ${service.helmRelease} ${service.path} ` +
            `-f ${service.path}/values-${environment}.yaml ` +
            `${setFlags} ` +
            `--namespace ${namespace} ` +
            `--wait --timeout 10m`,
          {
            timeout: 600000,
            maxBuffer: 10 * 1024 * 1024,
          },
        );

        deployResults.push({
          service: service.name,
          success: true,
          output: stdout.substring(0, 500),
          warnings: stderr ? stderr.substring(0, 500) : undefined,
        });

        this.logger.log(
          `Successfully deployed ${service.name} to ${namespace}`,
        );
      } catch (err) {
        hasFailures = true;

        deployResults.push({
          service: service.name,
          success: false,
          error: err.message,
          stderr: err.stderr ? err.stderr.substring(0, 1000) : null,
          stdout: err.stdout ? err.stdout.substring(0, 1000) : null,
        });

        this.logger.error(`Failed to deploy ${service.name}:`, err.message);
        if (err.stderr) {
          this.logger.error(`Helm stderr:`, err.stderr);
        }
      }
    }

    if (hasFailures) {
      const failedServices = deployResults
        .filter((r) => !r.success)
        .map((r) => r.service);
      throw new Error(
        `Helm deployment failed for the following services: ${failedServices.join(', ')}. ` +
          `Check the deployment results for details.`,
      );
    }

    return {
      namespace,
      infrastructure: terraformOutputs,
      deployments: deployResults,
    };
  }

  /**
   * Creates Kubernetes secrets for tenant services
   */
  private async createKubernetesSecrets(
    namespace: string,
    tenantName: string,
    terraformOutputs: any,
    environment: string,
  ): Promise<void> {
    this.logger.log(`Creating secrets in namespace ${namespace}`);

    const tenantSecrets = await this.getTenantSecretsFromSecretManager(
      tenantName,
      environment,
    );

    const projectId = process.env.GCP_PROJECT || 'cloudappdev-dev';
    const region = process.env.GCP_REGION || 'europe-west1';

    const baseSecrets = {
      FIREBASE_SERVICE_ACCOUNT_JSON_BASE64:
        tenantSecrets.firebase_service_account || '',
      JWT_SECRET: `${tenantName}-jwt-secret`,
      JWT_EXPIRATION: '7d',
      NODE_ENV: environment === 'prod' ? 'production' : 'development',
      GCP_PROJECT_ID: projectId,
    };

    const firestoreDatabaseId = terraformOutputs.social_db_name
      .split('/')
      .pop();

    const userSecrets = {
      ...baseSecrets,
      DATABASE_URL: `postgresql://users:${tenantSecrets.database_users_password}@127.0.0.1:5432/users`,
      GOOGLE_CLOUD_STORAGE_BUCKET: `cloudappdev-${tenantName}-images`,
      GOOGLE_CLOUD_CREDENTIALS_BASE64: tenantSecrets.user_service_account,
    };

    const itinerarySecrets = {
      ...baseSecrets,
      DATABASE_URL: `postgresql://itinerary:${tenantSecrets.database_itinerary_password}@127.0.0.1:5432/itinerary`,
      GOOGLE_CLOUD_STORAGE_BUCKET: `cloudappdev-${tenantName}-images`,
      GOOGLE_CLOUD_CREDENTIALS_BASE64: tenantSecrets.itinerary_service_account,
    };

    const mongodbUri = `mongodb://${firestoreDatabaseId}.${region}.firestore.goog:443/${firestoreDatabaseId}?loadBalanced=true&tls=true&retryWrites=false&authMechanism=MONGODB-OIDC&authMechanismProperties=ENVIRONMENT:gcp,TOKEN_RESOURCE:FIRESTORE`;

    const socialSecrets = {
      ...baseSecrets,
      MONGODB_URI: mongodbUri,
      USER_SERVICE_URL: `http://user-service.${namespace}.svc.cluster.local:8080`,
      ITINERARY_SERVICE_URL: `http://itinerary-service.${namespace}.svc.cluster.local:8081`,
      SENDGRID_API_KEY:
        process.env.SENDGRID_API_KEY ||
        '',
      SENDGRID_FROM_EMAIL: `team@${tenantName}.dev.cloudappdev.site`,
      SENDGRID_FROM_NAME: `${tenantName} Team`,
      NEWSLETTER_MODE: 'sendgrid',
      FRONTEND_URL: `https://${tenantName}.dev.cloudappdev.site`,
    };

    const appSecrets = {
      ...baseSecrets,
      API_GATEWAY_URL: `http://gateway.${namespace}.svc.cluster.local:80`,
      APP_MODE: "ENTERPRISE",
      GCP_MONITORING_CREDENTIALS_BASE64: process.env.GCP_MONITORING_CREDENTIALS_BASE64 || '',
    };

    const secrets = [
      { name: 'user-service-secrets', data: userSecrets },
      { name: 'itinerary-service-secrets', data: itinerarySecrets },
      { name: 'social-service-secrets', data: socialSecrets },
      { name: 'cloudappdev-secrets', data: appSecrets },
    ];

    for (const secret of secrets) {
      try {
        const secretExists = await this.checkSecretExists(
          secret.name,
          namespace,
        );

        if (secretExists) {
          this.logger.log(
            `Secret ${secret.name} already exists in namespace ${namespace}, skipping creation`,
          );
          continue;
        }

        const secretArgs = Object.entries(secret.data)
          .filter(
            ([_, value]) =>
              value !== '' && value !== undefined && value !== null,
          )
          .map(([key, value]) => {
            // Encode special characters for URI resolution and shell safety
            const stringValue = String(value);
            const encodedValue = encodeURI(stringValue).replace(/'/g, "'\\''");
            return `--from-literal='${key}=${encodedValue}'`;
          })
          .join(' ');

        await execAsync(
          `kubectl create secret generic ${secret.name} -n ${namespace} ${secretArgs}`,
          {
            timeout: 30000,
            maxBuffer: 5 * 1024 * 1024,
          },
        );

        this.logger.log(
          `Created secret ${secret.name} in namespace ${namespace}`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to create secret ${secret.name}:`,
          err.message,
        );
        throw err;
      }
    }
  }

  /**
   * Checks if a Kubernetes secret exists
   */
  private async checkSecretExists(
    secretName: string,
    namespace: string,
  ): Promise<boolean> {
    try {
      await execAsync(`kubectl get secret ${secretName} -n ${namespace}`);
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Ensures namespace exists and is ready
   */
  private async ensureNamespaceExists(namespace: string): Promise<void> {
    try {
      // Check if namespace exists
      await execAsync(`kubectl get namespace ${namespace}`);
      this.logger.log(`Namespace ${namespace} already exists`);
      return;
    } catch (err) {
      // Namespace doesn't exist, create it
      this.logger.log(`Creating namespace ${namespace}...`);
      try {
        await execAsync(`kubectl create namespace ${namespace}`);
        this.logger.log(`Successfully created namespace ${namespace}`);

        // Wait for namespace to be fully ready
        let retries = 10;
        while (retries > 0) {
          try {
            const { stdout } = await execAsync(
              `kubectl get namespace ${namespace} -o jsonpath='{.status.phase}'`,
            );
            if (stdout.includes('Active')) {
              this.logger.log(`Namespace ${namespace} is active and ready`);
              return;
            }
          } catch (checkErr) {
            // Continue waiting
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
          retries--;
        }

        // Final verification
        await execAsync(`kubectl get namespace ${namespace}`);
      } catch (createErr) {
        this.logger.error(
          `Failed to create namespace ${namespace}: ${createErr.message}`,
        );
        throw new Error(
          `Cannot create namespace ${namespace}: ${createErr.message}`,
        );
      }
    }
  }

  /**
   * Retrieves tenant-specific secrets from Google Secret Manager
   */
  private async getTenantSecretsFromSecretManager(
    tenantName: string,
    environment: string,
  ): Promise<any> {
    this.logger.log(`Retrieving secrets for tenant ${tenantName}`);

    try {
      const firebaseAccount = await this.getSecretFromGSM(
        `firebase_service_account`,
        environment,
      );

      const usersDbPassword = await this.getSecretFromGSM(
        `${tenantName}-users-password`,
        environment,
      );

      const userServiceAccount = await this.getServiceAccountKeyFromTerraform(
        tenantName,
        'user',
        environment,
      );

      const itineraryDbPassword = await this.getSecretFromGSM(
        `${tenantName}-itinerary-password`,
        environment,
      );

      const itineraryServiceAccount =
        await this.getServiceAccountKeyFromTerraform(
          tenantName,
          'itinerary',
          environment,
        );

      return {
        database_users_password: usersDbPassword,
        user_service_account: userServiceAccount,
        database_itinerary_password: itineraryDbPassword,
        itinerary_service_account: itineraryServiceAccount,
        firebase_service_account: firebaseAccount,
      };
    } catch (err) {
      this.logger.warn(
        `Could not retrieve some secrets for ${tenantName}, using defaults:`,
        err.message,
      );

      return {
        firebase_service_account:
          process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 || '',
      };
    }
  }

  /**
   * Retrieves a single secret from Google Secret Manager
   */
  private async getSecretFromGSM(
    secretName: string,
    environment: string,
  ): Promise<string> {
    const projectId = process.env.GCP_PROJECT || 'cloudappdev-dev';
    const secretPath = `${secretName}-${environment}`;

    try {
      const { stdout } = await execAsync(
        `gcloud secrets versions access latest --secret="${secretPath}" --project="${projectId}"`,
        { timeout: 30000 },
      );
      return stdout.trim();
    } catch (err) {
      this.logger.warn(`Secret ${secretPath} not found, generating fallback`);

      if (secretName.includes('db-password')) {
        return crypto.randomBytes(32).toString('base64');
      } else if (secretName.includes('jwt-secret')) {
        return crypto.randomBytes(64).toString('hex');
      }

      throw new Error(
        `Secret ${secretPath} not found and no fallback available`,
      );
    }
  }

  /**
   * Retrieves the GCP service account key (base64) for a tenant's service
   * from Terraform state outputs
   */
  private async getServiceAccountKeyFromTerraform(
    tenantName: string,
    serviceName: 'user' | 'itinerary' | 'social',
    environment: string,
  ): Promise<string> {
    this.logger.log(
      `Retrieving ${serviceName} service account key for tenant ${tenantName}`,
    );

    try {
      const terraformDir = `/terraform/environments/${environment}-tenants`;
      const outputName = `${serviceName}_service_account_key`;

      const { stdout } = await execAsync(
        `cd ${terraformDir} && terraform output -json | jq -r '.enterprise_deployments.value["${tenantName}"]["${outputName}"]'`,
        { timeout: 30000 },
      );

      const key = stdout.trim();
      if (!key || key === 'null') {
        throw new Error(`Service account key not found in Terraform outputs`);
      }

      return key;
    } catch (err) {
      this.logger.error(
        `Failed to retrieve ${serviceName} service account key for ${tenantName}: ${err.message}`,
      );
      throw new Error(
        `Cannot retrieve service account key for ${serviceName}-service: ${err.message}`,
      );
    }
  }

  /**
   * Generates Helm --set flags for service-specific overrides
   * Only sets the necessary tenant-specific values
   */
  private generateHelmSetFlags(
    serviceName: string,
    tenantName: string,
    terraformOutputs: any,
    environment: string,
  ): string {
    const setFlags: string[] = [];

    // Common overrides for all services
    setFlags.push(`--set namespace=${tenantName}`);
    const imageTag = process.env.IMAGE_TAG || 'latest';
    setFlags.push(`--set image.tag=${imageTag}`);

    if (serviceName === 'user-service') {
      // Cloud SQL Proxy configuration
      setFlags.push(
        `--set initContainers[0].name=cloud-sql-proxy`,
        `--set initContainers[0].image=gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.14.1`,
        `--set-string initContainers[0].args[0]=--port=5432`,
        `--set-string initContainers[0].args[1]=${terraformOutputs.database_connection_name}`,
      );

      // Service Account with Workload Identity
      setFlags.push(
        `--set serviceAccount.create=true`,
        `--set serviceAccount.name=user-service-sa`,
        `--set serviceAccount.annotations.iam\\.gke\\.io/gcp-service-account=${terraformOutputs.user_service_account_email}`,
      );

      // Environment variables
      setFlags.push(
        `--set env[0].name=TENANT_NAME`,
        `--set env[0].value=${tenantName}`,
        `--set env[1].name=TENANT_NAMESPACE`,
        `--set env[1].value=${tenantName}`,
      );
    } else if (serviceName === 'itinerary-service') {
      // Cloud SQL Proxy configuration
      setFlags.push(
        `--set initContainers[0].name=cloud-sql-proxy`,
        `--set initContainers[0].image=gcr.io/cloud-sql-connectors/cloud-sql-proxy:2.14.1`,
        `--set-string initContainers[0].args[0]=--port=5432`,
        `--set-string initContainers[0].args[1]=${terraformOutputs.database_connection_name}`,
      );

      // Service Account with Workload Identity
      setFlags.push(
        `--set serviceAccount.create=true`,
        `--set serviceAccount.name=itinerary-service-sa`,
        `--set serviceAccount.annotations.iam\\.gke\\.io/gcp-service-account=${terraformOutputs.itinerary_service_account_email}`,
      );

      // Environment variables
      setFlags.push(
        `--set-json extraEnv='[{"name":"TENANT_NAME","value":"${tenantName}"},{"name":"TENANT_NAMESPACE","value":"${tenantName}"}]'`,
      );
    } else if (serviceName === 'social-service') {
      // Service Account with Workload Identity
      setFlags.push(
        `--set serviceAccount.create=true`,
        `--set serviceAccount.name=social-service-sa`,
        `--set serviceAccount.annotations.iam\\.gke\\.io/gcp-service-account=${terraformOutputs.social_service_account_email}`,
      );

      // Environment variables
      setFlags.push(
        `--set-json extraEnv='[{"name":"TENANT_NAME","value":"${tenantName}"},{"name":"TENANT_NAMESPACE","value":"${tenantName}"},{"name":"FIRESTORE_DATABASE_ID","value":"${terraformOutputs.social_db_name}"}]'`,
      );
    } else if (serviceName === 'gateway') {
      // Gateway tenant routing
      setFlags.push(
        `--set tenant=${tenantName}`,
        `--set serviceNamespaces.user=${tenantName}`,
        `--set serviceNamespaces.itinerary=${tenantName}`,
        `--set serviceNamespaces.social=${tenantName}`,
        `--set serviceNamespaces.travelInfo=default`,
        `--set serviceNamespaces.tenant=default`,
      );

      // Environment variables
      setFlags.push(
        `--set-json extraEnv='[{"name":"TENANT_NAME","value":"${tenantName}"},{"name":"TENANT_NAMESPACE","value":"${tenantName}"}]'`,
      );
    } else if (serviceName === 'app') {
      // Frontend environment variables
      setFlags.push(
        `--set-json extraEnv='[{"name":"API_GATEWAY_URL","value":"http://gateway.${tenantName}.svc.cluster.local:80"},{"name":"NEXT_PUBLIC_TENANT_NAME","value":"${tenantName}"},{"name":"TENANT_NAME","value":"${tenantName}"},{"name":"TENANT_NAMESPACE","value":"${tenantName}"}]'`,
      );
    }

    return setFlags.join(' ');
  }

  /**
   * Deploy HTTPRoute for free/standard tier tenants
   * These tenants share namespace infrastructure
   * Uses the minimal tenant-httproute Helm chart
   */
  async deploySharedTierHTTPRoute(
    tenantName: string,
    tier: string,
    environment: string,
  ): Promise<void> {
    const namespace = tier; // 'free' or 'standard'
    const domain = `${tenantName}.dev.cloudappdev.site`;
    const releaseName = `${tenantName}-httproute`;

    this.logger.log(
      `Deploying HTTPRoute for ${tier} tier tenant: ${tenantName} -> ${domain}`,
    );

    try {
      // Deploy HTTPRoute using the minimal tenant-httproute Helm chart
      const { stdout, stderr } = await execAsync(
        `helm upgrade --install ${releaseName} /k8s/tenant-httproute ` +
          `--set tenant.name=${tenantName} ` +
          `--set tenant.domain=${domain} ` +
          `--set tenant.tier=${tier} ` +
          `--set namespace=${namespace} ` +
          `--set gateway.name=main-gateway ` +
          `--set gateway.namespace=default ` +
          `--set backend.serviceName=app ` +
          `--set backend.servicePort=80 ` +
          `--namespace ${namespace} ` +
          `--wait --timeout 2m`,
        {
          timeout: 120000,
          maxBuffer: 5 * 1024 * 1024,
        },
      );

      this.logger.log(`HTTPRoute deployed successfully for ${tenantName}`);
      this.logger.debug(`Helm output: ${stdout.substring(0, 500)}`);

      if (stderr && stderr.trim()) {
        this.logger.warn(`Helm warnings: ${stderr.substring(0, 500)}`);
      }
    } catch (err) {
      this.logger.error(
        `Failed to deploy HTTPRoute for ${tenantName}:`,
        err.message,
      );
      if (err.stderr) {
        this.logger.error(`Helm stderr: ${err.stderr.substring(0, 1000)}`);
      }
      if (err.stdout) {
        this.logger.error(`Helm stdout: ${err.stdout.substring(0, 1000)}`);
      }
      throw err;
    }
  }
}
