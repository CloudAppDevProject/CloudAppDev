import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Check if user exists and is tenant admin (loginType) or has explicit isAdmin flag
    return (
      request.user?.loginType === 'tenant_admin' ||
      request.user?.isAdmin === true
    );
  }
} 
