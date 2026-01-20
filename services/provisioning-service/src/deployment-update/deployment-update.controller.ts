import { Controller, Post, Get, Logger } from '@nestjs/common';
import {
  DeploymentUpdateService,
  DeploymentUpdateSummary,
  ServiceVersionInfo,
  DeploymentInfo,
} from './deployment-update.service';

@Controller('deployment-update')
export class DeploymentUpdateController {
  private readonly logger = new Logger(DeploymentUpdateController.name);

  constructor(
    private readonly deploymentUpdateService: DeploymentUpdateService,
  ) {}

  /**
   * POST /deployment-update/sync
   * Triggers synchronization of all outdated deployments to latest versions
   */
  @Post('sync')
  async synchronizeDeployments(): Promise<{
    success: boolean;
    message: string;
    summary: DeploymentUpdateSummary;
  }> {
    this.logger.log('Received request to synchronize deployments');

    const summary =
      await this.deploymentUpdateService.synchronizeAllDeployments();

    return {
      success: true,
      message: `Deployment sync complete: ${summary.updatedDeployments} updated, ${summary.failedUpdates} failed`,
      summary,
    };
  }

  /**
   * GET /deployment-update/status
   * Returns current deployment versions across all namespaces
   */
  @Get('status')
  async getDeploymentStatus(): Promise<{
    latestVersions: ServiceVersionInfo[];
    totalDeployments: number;
    outdatedDeployments: number;
    upToDateDeployments: number;
    deployments: DeploymentInfo[];
  }> {
    this.logger.log('Received request for deployment status');

    const status = await this.deploymentUpdateService.getDeploymentStatus();

    const outdatedCount = status.deployments.filter((d) => d.needsUpdate).length;

    return {
      latestVersions: status.serviceVersions,
      totalDeployments: status.deployments.length,
      outdatedDeployments: outdatedCount,
      upToDateDeployments: status.deployments.length - outdatedCount,
      deployments: status.deployments,
    };
  }
}
