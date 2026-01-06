import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TenantAuthGuard implements CanActivate {
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

      // Add user payload to request (userId, email, tenantId, role)
      request.user = {
        userId: payload.userId,
        email: payload.email,
        tenantId: payload.tenantId,
        role: payload.role,
      };

      // Add tenantId for easy access
      request.tenantId = payload.tenantId;

      return true;
    } catch (error) {
      return false;
    }
  }
}
