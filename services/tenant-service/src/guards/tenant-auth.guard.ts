import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TenantAuthGuard implements CanActivate {
  private readonly logger = new Logger(TenantAuthGuard.name);

  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return false;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'dev-jwt-secret',
      });

      // Add user payload to request (supports both user and tenant_admin login types)
      const allowFallback = process.env.ALLOW_TENANTID_FALLBACK === 'true';
      if (payload.tenantId && !payload.tenantUuid) {
        if (allowFallback) {
          this.logger.warn('Deprecated JWT field `tenantId` detected; using it as a fallback for `tenantUuid`. TODO: remove fallback by 2026-06-01.');
        } else {
          this.logger.warn('Deprecated JWT field `tenantId` detected but ALLOW_TENANTID_FALLBACK is disabled; ignoring `tenantId`. Please rotate tokens to include `tenantUuid`.');
        }
      }

      const effectiveTenantUuid = payload.tenantUuid ?? (allowFallback ? (payload.tenantId ?? null) : null);

      request.user = {
        userId: payload.userId,
        email: payload.email,
        tenantUuid: effectiveTenantUuid,
        loginType: payload.loginType, // 'user' or 'tenant_admin'
        namespace: payload.namespace,
        tier: payload.tier,
      };

      // Add tenantUuid for easy access
      request.tenantUuid = effectiveTenantUuid;

      return true;
    } catch (error) {
      return false;
    }
  }
}
