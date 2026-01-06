import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TenantAuthGuard implements CanActivate {
  private readonly logger = new Logger(TenantAuthGuard.name);

  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    
    this.logger.debug(`Auth header: ${authHeader ? 'Present' : 'Missing'}`);
    
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      this.logger.warn('No token provided in Authorization header');
      return false;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'dev-jwt-secret',
      });

      this.logger.debug(`Token verified for user ${payload.userId}, tenant ${payload.tenantId}, role ${payload.role}`);

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
      this.logger.error(`JWT verification failed: ${error.message}`);
      return false;
    }
  }
}
