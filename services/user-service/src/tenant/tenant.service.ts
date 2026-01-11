import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface CacheEntry {
  isAdmin: boolean;
  tenantUuid: string | null;
  expiresAt: number;
}

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheTtlMs = 5 * 60 * 1000; // 5 minutes cache TTL

  constructor(private readonly httpService: HttpService) {}

  /**
   * Check if an email belongs to a tenant admin by querying the tenant-service.
   * Uses in-memory cache to reduce cross-service calls.
   */
  async isEmailTenantAdmin(email: string): Promise<{ isAdmin: boolean; tenantUuid: string | null }> {
    if (!email) {
      return { isAdmin: false, tenantUuid: null };
    }

    // Check cache first
    const cached = this.cache.get(email);
    if (cached && cached.expiresAt > Date.now()) {
      this.logger.debug(`Cache hit for admin check: ${email} -> isAdmin=${cached.isAdmin}`);
      return { isAdmin: cached.isAdmin, tenantUuid: cached.tenantUuid };
    }

    // Fetch from tenant-service
    const tenantServiceUrl = process.env.TENANT_SERVICE_URL || 'http://tenant-service:8084';
    const url = `${tenantServiceUrl}/api/v1/tenants/check-admin-email/${encodeURIComponent(email)}`;

    this.logger.log(`Checking tenant admin status for email: ${email}`);

    try {
      const response = await firstValueFrom(
        this.httpService.get<{ isAdmin: boolean; tenantUuid: string | null }>(url, { timeout: 5000 }),
      );

      const result = {
        isAdmin: response.data?.isAdmin ?? false,
        tenantUuid: response.data?.tenantUuid ?? null,
      };

      // Cache the result
      this.cache.set(email, {
        ...result,
        expiresAt: Date.now() + this.cacheTtlMs,
      });

      this.logger.debug(`Email ${email} admin status: ${result.isAdmin}`);
      return result;
    } catch (error) {
      this.logger.warn(`Failed to check admin status for ${email}: ${error.message}`);
      // Return cached value if available (even if expired) as fallback
      if (cached) {
        this.logger.warn(`Using expired cache for ${email}`);
        return { isAdmin: cached.isAdmin, tenantUuid: cached.tenantUuid };
      }
      return { isAdmin: false, tenantUuid: null };
    }
  }

  /**
   * Invalidate cache for a specific email
   */
  invalidateCache(email: string): void {
    this.cache.delete(email);
    this.logger.debug(`Cache invalidated for email ${email}`);
  }

  /**
   * Clear entire cache
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.debug('Admin cache cleared');
  }
}
