import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TenantAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  private readonly logger = new Logger(TenantAuthGuard.name);

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

      // Add user payload to request (userId, email, tenantUuid, loginType)
      const resolvedLoginType = payload.loginType ?? null;

      // Controlled fallback for legacy `tenantId` token field:
      // - Enable temporary fallback by setting ALLOW_TENANTID_FALLBACK=true in env
      // - Plan to remove fallback by 2026-06-01
      const allowFallback = process.env.ALLOW_TENANTID_FALLBACK === 'true';
      if (payload.tenantId && !payload.tenantUuid) {
        if (allowFallback) {
          this.logger.warn('Deprecated JWT field `tenantId` detected; using it as a fallback for `tenantUuid` (set ALLOW_TENANTID_FALLBACK=false to disable). TODO: remove fallback by 2026-06-01.');
        } else {
          this.logger.warn('Deprecated JWT field `tenantId` detected but ALLOW_TENANTID_FALLBACK is disabled; ignoring `tenantId`. Please rotate tokens to include `tenantUuid`.');
        }
      }

      const effectiveTenantUuid = payload.tenantUuid ?? (allowFallback ? (payload.tenantId ?? null) : null);

      request.user = {
        userId: payload.userId,
        email: payload.email,
        tenantUuid: effectiveTenantUuid,
        loginType: resolvedLoginType,
      };

      // Add tenantUuid for easy access (may be null if not present)
      request.tenantUuid = effectiveTenantUuid;

      return true;
    } catch (error) {
      this.logger.warn(`JWT verification failed: ${error?.message ?? 'unknown error'}`);
      return false;
    }
  }
}
