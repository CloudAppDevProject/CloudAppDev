import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface CacheEntry {
  userIds: number[];
  expiresAt: number;
}

@Injectable()
export class TenantUsersService {
  private readonly logger = new Logger(TenantUsersService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheTtlMs = 60 * 1000; // 60 seconds cache TTL

  constructor(private readonly httpService: HttpService) {}

  /**
   * Get user IDs belonging to a tenant.
   * Uses in-memory cache to reduce cross-service calls.
   */
  async getUserIdsByTenant(tenantUuid: string): Promise<number[]> {
    if (!tenantUuid) {
      this.logger.warn('getUserIdsByTenant called without tenantUuid');
      return [];
    }

    // Check cache first
    const cached = this.cache.get(tenantUuid);
    if (cached && cached.expiresAt > Date.now()) {
      this.logger.debug(`Cache hit for tenant ${tenantUuid}: ${cached.userIds.length} users`);
      return cached.userIds;
    }

    // Fetch from user-service
    const userServiceUrl = process.env.USER_SERVICE_URL || 'http://user-service:8080';
    const url = `${userServiceUrl}/api/v1/users/internal/ids-by-tenant/${tenantUuid}`;

    this.logger.log(`Fetching user IDs from user-service for tenant ${tenantUuid}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get<{ userIds: number[] }>(url, { timeout: 5000 }),
      );

      const userIds = response.data?.userIds || [];

      // Cache the result
      this.cache.set(tenantUuid, {
        userIds,
        expiresAt: Date.now() + this.cacheTtlMs,
      });

      this.logger.debug(`Fetched and cached ${userIds.length} user IDs for tenant ${tenantUuid}`);
      return userIds;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to fetch user IDs for tenant ${tenantUuid}: ${message}`);
      // Return cached value if available (even if expired) as fallback
      if (cached) {
        this.logger.warn(`Using expired cache for tenant ${tenantUuid}`);
        return cached.userIds;
      }
      return [];
    }
  }

  /**
   * Invalidate cache for a specific tenant (call when user is added/removed)
   */
  invalidateCache(tenantUuid: string): void {
    this.cache.delete(tenantUuid);
    this.logger.debug(`Cache invalidated for tenant ${tenantUuid}`);
  }

  /**
   * Clear entire cache (for maintenance)
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.debug('Cache cleared');
  }
}
