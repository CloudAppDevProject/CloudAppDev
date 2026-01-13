import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const email = request.user?.email;

    if (!email) {
      this.logger.warn('Admin check failed: no email in request');
      return false;
    }

    // Check if email exists in Tenant table (tenant admin)
    const tenant = await this.prisma.tenant.findUnique({
      where: { email },
      select: { uuid: true },
    });

    const isAdmin = !!tenant;
    this.logger.debug(`Admin check for ${email}: isAdmin=${isAdmin}`);

    return isAdmin;
  }
}
