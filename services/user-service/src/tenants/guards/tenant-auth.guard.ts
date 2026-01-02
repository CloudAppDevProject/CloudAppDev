import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TenantAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.tenantId) {
      throw new ForbiddenException('User not associated with a tenant');
    }

    // Check if user is trying to access resources from a different tenant
    const requestedTenantId = request.params.tenantId || request.query.tenantId || request.body.tenantId;

    if (requestedTenantId && user.tenantId !== parseInt(requestedTenantId)) {
      throw new ForbiddenException('Access to different tenant denied');
    }

    // Attach tenant context to request
    request.tenantId = user.tenantId;

    return true;
  }
}
