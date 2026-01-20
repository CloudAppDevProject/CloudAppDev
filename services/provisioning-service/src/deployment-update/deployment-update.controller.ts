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
  private syncInProgress = false;
  private lastSyncResult: DeploymentUpdateSummary | null = null;
  private lastSyncTime: Date | null = null;

  constructor(
    private readonly deploymentUpdateService: DeploymentUpdateService,
  ) {}

  /**
   * POST /deployment-update/sync
   * Triggers synchronization of all outdated deployments to latest versions
   * Runs asynchronously in the background to avoid blocking health checks
   */
  @Post('sync')
  triggerSync(): {
    success: boolean;
    message: string;
    syncInProgress: boolean;
  } {
    this.logger.log('Received request to synchronize deployments');

    if (this.syncInProgress) {
      this.logger.warn('Sync already in progress, skipping request');
      return {
        success: true,
        message: 'Sync already in progress',
        syncInProgress: true,
      };
    }

    // Run sync in background (don't await)
    this.syncInProgress = true;
    this.runSyncInBackground();

    return {
      success: true,
      message: 'Deployment sync triggered, running in background',
      syncInProgress: true,
    };
  }

  private async runSyncInBackground(): Promise<void> {
    try {
      this.logger.log('Starting background deployment sync...');
      const summary =
        await this.deploymentUpdateService.synchronizeAllDeployments();
      this.lastSyncResult = summary;
      this.lastSyncTime = new Date();
      this.logger.log(
        `Background sync complete: ${summary.updatedDeployments} updated, ${summary.failedUpdates} failed`,
      );
    } catch (error) {
      this.logger.error(`Background sync failed: ${error.message}`);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * GET /deployment-update/sync-status
   * Returns the status of the last/current sync operation
   */
  @Get('sync-status')
  getSyncStatus(): {
    syncInProgress: boolean;
    lastSyncTime: Date | null;
    lastSyncResult: DeploymentUpdateSummary | null;
  } {
    return {
      syncInProgress: this.syncInProgress,
      lastSyncTime: this.lastSyncTime,
      lastSyncResult: this.lastSyncResult,
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
