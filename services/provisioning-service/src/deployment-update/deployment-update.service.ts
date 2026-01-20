import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ServiceConfig {
  name: string;
  imageName: string;
  chartPath: string;
}

export interface ServiceVersionInfo {
  service: string;
  imageName: string;
  latestTag: string;
  chartPath: string;
}

export interface DeploymentInfo {
  namespace: string;
  deployment: string;
  currentTag: string;
  latestTag: string;
  needsUpdate: boolean;
}

export interface UpdateResult {
  namespace: string;
  deployment: string;
  previousTag: string;
  newTag: string;
  success: boolean;
  error?: string;
}

export interface DeploymentUpdateSummary {
  serviceVersions: ServiceVersionInfo[];
  totalDeployments: number;
  outdatedDeployments: number;
  updatedDeployments: number;
  failedUpdates: number;
  results: UpdateResult[];
}

@Injectable()
export class DeploymentUpdateService {
  private readonly logger = new Logger(DeploymentUpdateService.name);

  private readonly imageRegistry =
    'europe-west1-docker.pkg.dev/cloudappdev-dev/docker-repo';

  // Services deployed to tenant namespaces
  private readonly services: ServiceConfig[] = [
    {
      name: 'user-service',
      imageName: 'cloudappdev-user-service',
      chartPath: '/k8s/services/user',
    },
    {
      name: 'itinerary-service',
      imageName: 'cloudappdev-itinerary-service',
      chartPath: '/k8s/services/itinerary',
    },
    {
      name: 'social-service',
      imageName: 'cloudappdev-social-service',
      chartPath: '/k8s/services/social',
    },
    {
      name: 'app',
      imageName: 'cloudappdev-frontend',
      chartPath: '/k8s/app',
    },
    {
      name: 'api-gateway',
      imageName: 'cloudappdev-api-gateway',
      chartPath: '/k8s/gateway',
    },
  ];

  // Namespaces to exclude from updates (system namespaces)
  private readonly excludedNamespaces = [
    'default',
    'kube-system',
    'kube-public',
    'kube-node-lease',
    'gke-gmp-system',
    'gke-managed-cim',
    'gke-managed-filestorecsi',
    'gke-managed-parallelstorecsi',
    'gke-managed-system',
    'gke-managed-volumepopulator',
    'gmp-public',
  ];

  /**
   * Main method: Check and update all outdated deployments
   */
  async synchronizeAllDeployments(): Promise<DeploymentUpdateSummary> {
    this.logger.log('Starting deployment version synchronization...');

    // Fetch latest tags for each service from registry
    const serviceVersions = await this.fetchLatestTagsFromRegistry();
    this.logger.log(
      `Fetched latest versions: ${JSON.stringify(serviceVersions.map((s) => ({ service: s.service, tag: s.latestTag })))}`,
    );

    // Find all outdated deployments
    const outdatedDeployments =
      await this.findOutdatedDeployments(serviceVersions);

    if (outdatedDeployments.length === 0) {
      this.logger.log('All deployments are up to date');
      return {
        serviceVersions,
        totalDeployments: 0,
        outdatedDeployments: 0,
        updatedDeployments: 0,
        failedUpdates: 0,
        results: [],
      };
    }

    this.logger.log(
      `Found ${outdatedDeployments.length} outdated deployments across namespaces`,
    );

    // Update each outdated deployment
    const results: UpdateResult[] = [];
    let updatedCount = 0;
    let failedCount = 0;

    for (const dep of outdatedDeployments) {
      const serviceConfig = this.services.find((s) => s.name === dep.deployment);

      if (serviceConfig) {
        const result = await this.updateWithHelm(
          dep.namespace,
          dep,
          serviceConfig,
          dep.latestTag,
        );
        results.push(result);

        if (result.success) {
          updatedCount++;
        } else {
          failedCount++;
        }
      } else {
        this.logger.warn(
          `Unknown service ${dep.deployment}, skipping update`,
        );
      }
    }

    const summary: DeploymentUpdateSummary = {
      serviceVersions,
      totalDeployments: outdatedDeployments.length,
      outdatedDeployments: outdatedDeployments.length,
      updatedDeployments: updatedCount,
      failedUpdates: failedCount,
      results,
    };

    this.logger.log(
      `Deployment sync complete: ${updatedCount} updated, ${failedCount} failed`,
    );

    return summary;
  }

  /**
   * Fetch the latest version tag for each service from the registry
   */
  private async fetchLatestTagsFromRegistry(): Promise<ServiceVersionInfo[]> {
    const versions: ServiceVersionInfo[] = [];

    for (const service of this.services) {
      try {
        const latestTag = await this.getLatestTagForImage(service.imageName);
        versions.push({
          service: service.name,
          imageName: service.imageName,
          latestTag,
          chartPath: service.chartPath,
        });
        this.logger.log(`${service.name}: latest tag = ${latestTag}`);
      } catch (err) {
        this.logger.error(
          `Failed to get latest tag for ${service.name}: ${err.message}`,
        );
        // Use 'latest' as fallback
        versions.push({
          service: service.name,
          imageName: service.imageName,
          latestTag: 'latest',
          chartPath: service.chartPath,
        });
      }
    }

    return versions;
  }

  /**
   * Get the latest semantic version tag for a specific image from the registry
   * Uses a two-step process:
   * 1. Get the digest for the 'latest' tag
   * 2. Find all tags pointing to that digest and return the semantic version
   */
  private async getLatestTagForImage(imageName: string): Promise<string> {
    try {
      // Step 1: Get the digest for the 'latest' tag
      const { stdout: digestOutput } = await execAsync(
        `gcloud artifacts docker tags list ${this.imageRegistry}/${imageName} ` +
          `--filter="tag:latest" --format="value(version)" --limit=1`,
        { timeout: 30000 },
      );

      const digest = digestOutput.trim();
      if (!digest) {
        this.logger.warn(`No 'latest' tag found for ${imageName}`);
        return 'latest';
      }

      // Step 2: Find all tags pointing to the same digest
      const { stdout: tagsOutput } = await execAsync(
        `gcloud artifacts docker tags list ${this.imageRegistry}/${imageName} ` +
          `--filter="version:${digest}" --format="value(tag)"`,
        { timeout: 30000 },
      );

      // Parse tags (one per line) and find semantic version
      const tags = tagsOutput.trim().split('\n').filter(Boolean);
      const versionTag = tags.find((t) => /^\d+\.\d+\.\d+$/.test(t));

      if (versionTag) {
        return versionTag;
      }

      // If no semantic version found, return 'latest'
      return 'latest';
    } catch (err) {
      this.logger.warn(
        `Could not query registry for ${imageName}: ${err.message}`,
      );
      return 'latest';
    }
  }

  /**
   * Find all deployments that are running an older version
   */
  private async findOutdatedDeployments(
    serviceVersions: ServiceVersionInfo[],
  ): Promise<DeploymentInfo[]> {
    const outdated: DeploymentInfo[] = [];

    // Create a map for quick lookup
    const versionMap = new Map<string, ServiceVersionInfo>();
    for (const sv of serviceVersions) {
      versionMap.set(sv.service, sv);
    }

    try {
      // Get all deployments with cloudappdev images
      const { stdout } = await execAsync(
        `kubectl get deployments --all-namespaces ` +
          `-o jsonpath='{range .items[*]}{.metadata.namespace}{" "}{.metadata.name}{" "}{.spec.template.spec.containers[0].image}{"\\n"}{end}'`,
        { timeout: 60000 },
      );

      const lines = stdout.trim().split('\n').filter(Boolean);

      for (const line of lines) {
        const [namespace, deploymentName, image] = line.split(' ');

        // Skip excluded namespaces
        if (this.excludedNamespaces.includes(namespace)) {
          continue;
        }

        // Skip non-cloudappdev images
        if (!image || !image.includes('cloudappdev')) {
          continue;
        }

        // Check if this is a service we manage
        const serviceVersion = versionMap.get(deploymentName);
        if (!serviceVersion) {
          continue;
        }

        // Extract current tag
        const tagMatch = image.match(/:([^:]+)$/);
        const currentTag = tagMatch ? tagMatch[1] : 'unknown';

        // Check if outdated (compare with service-specific latest)
        const latestTag = serviceVersion.latestTag;
        if (
          currentTag !== latestTag &&
          currentTag !== 'unknown' &&
          latestTag !== 'latest'
        ) {
          outdated.push({
            namespace,
            deployment: deploymentName,
            currentTag,
            latestTag,
            needsUpdate: true,
          });

          this.logger.log(
            `Found outdated: ${namespace}/${deploymentName} (${currentTag} -> ${latestTag})`,
          );
        }
      }
    } catch (err) {
      this.logger.error(`Failed to list deployments: ${err.message}`);
      throw err;
    }

    return outdated;
  }

  /**
   * Update deployment using Helm upgrade
   */
  private async updateWithHelm(
    namespace: string,
    deployment: DeploymentInfo,
    service: ServiceConfig,
    newTag: string,
  ): Promise<UpdateResult> {
    const environment = process.env.ENVIRONMENT || 'dev';
    const releaseName = service.name;

    try {
      this.logger.log(
        `Upgrading ${releaseName} in ${namespace} from ${deployment.currentTag} to ${newTag} via Helm...`,
      );

      const helmCmd =
        `helm upgrade --install ${releaseName} ${service.chartPath} ` +
        `-f ${service.chartPath}/values-${environment}.yaml ` +
        `--set image.tag=${newTag} ` +
        `--set namespace=${namespace} ` +
        `--namespace ${namespace} `;

      await execAsync(helmCmd, {
        timeout: 600000,
        maxBuffer: 10 * 1024 * 1024,
      });

      this.logger.log(
        `Successfully updated ${releaseName} in ${namespace} to ${newTag}`,
      );

      return {
        namespace,
        deployment: deployment.deployment,
        previousTag: deployment.currentTag,
        newTag,
        success: true,
      };
    } catch (err) {
      this.logger.error(
        `Failed to update ${releaseName} in ${namespace}: ${err.message}`,
      );

      return {
        namespace,
        deployment: deployment.deployment,
        previousTag: deployment.currentTag,
        newTag,
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Get a summary of current deployment versions across all namespaces
   */
  async getDeploymentStatus(): Promise<{
    serviceVersions: ServiceVersionInfo[];
    deployments: DeploymentInfo[];
  }> {
    const serviceVersions = await this.fetchLatestTagsFromRegistry();
    const deployments: DeploymentInfo[] = [];

    const versionMap = new Map<string, ServiceVersionInfo>();
    for (const sv of serviceVersions) {
      versionMap.set(sv.service, sv);
    }

    try {
      const { stdout } = await execAsync(
        `kubectl get deployments --all-namespaces ` +
          `-o jsonpath='{range .items[*]}{.metadata.namespace}{" "}{.metadata.name}{" "}{.spec.template.spec.containers[0].image}{"\\n"}{end}'`,
        { timeout: 60000 },
      );

      const lines = stdout.trim().split('\n').filter(Boolean);

      for (const line of lines) {
        const [namespace, deploymentName, image] = line.split(' ');

        if (this.excludedNamespaces.includes(namespace)) continue;
        if (!image || !image.includes('cloudappdev')) continue;

        const serviceVersion = versionMap.get(deploymentName);
        if (!serviceVersion) continue;

        const tagMatch = image.match(/:([^:]+)$/);
        const currentTag = tagMatch ? tagMatch[1] : 'unknown';
        const latestTag = serviceVersion.latestTag;

        deployments.push({
          namespace,
          deployment: deploymentName,
          currentTag,
          latestTag,
          needsUpdate:
            currentTag !== latestTag &&
            currentTag !== 'unknown' &&
            latestTag !== 'latest',
        });
      }
    } catch (err) {
      this.logger.error(`Failed to get deployment status: ${err.message}`);
    }

    return { serviceVersions, deployments };
  }
}