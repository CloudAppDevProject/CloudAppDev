import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantLimitsGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.tenantId) {
      throw new ForbiddenException('User not associated with a tenant');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      include: {
        _count: {
          select: { users: true },
        },
      },
    });

    if (!tenant) {
      throw new ForbiddenException('Tenant not found');
    }

    if (tenant._count.users >= tenant.maxUsers) {
      throw new ForbiddenException(
        `User limit reached for ${tenant.tier} plan (${tenant.maxUsers} users maximum)`,
      );
    }

    return true;
  }
}
