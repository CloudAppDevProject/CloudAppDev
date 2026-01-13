import { Injectable, CanActivate, ExecutionContext, Logger, Inject } from '@nestjs/common';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  constructor(private readonly tenantService: TenantService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const email = request.user?.email;

    if (!email) {
      this.logger.warn('Admin check failed: no email in request');
      return false;
    }

    // Check if email is a tenant admin by querying tenant-service
    const { isAdmin } = await this.tenantService.isEmailTenantAdmin(email);
    this.logger.debug(`Admin check for ${email}: isAdmin=${isAdmin}`);

    return isAdmin;
  }
}
