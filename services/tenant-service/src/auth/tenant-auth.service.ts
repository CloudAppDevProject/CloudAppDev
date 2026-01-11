import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class TenantAuthService {
  private readonly logger = new Logger(TenantAuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateTenantAdmin(
    email: string,
    password: string,
  ): Promise<{ uuid: string; name: string; email: string; namespace: string; tier: string } | null> {
    this.logger.log(`Validating tenant admin: ${email}`);

    const tenant = await this.prisma.tenant.findUnique({
      where: { email },
    });

    if (!tenant) {
      this.logger.warn(`Tenant not found for email: ${email}`);
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, tenant.password);
    if (!isPasswordValid) {
      this.logger.warn(`Invalid password for tenant: ${email}`);
      return null;
    }

    this.logger.log(`Tenant admin validated successfully: ${email}`);
    return {
      uuid: tenant.uuid,
      name: tenant.name,
      email: tenant.email,
      namespace: tenant.namespace,
      tier: tenant.tier,
    };
  }

  async login(email: string, password: string) {
    const tenant = await this.validateTenantAdmin(email, password);

    if (!tenant) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: tenant.uuid,
      tenantUuid: tenant.uuid,
      email: tenant.email,
      namespace: tenant.namespace,
      tier: tenant.tier,
      loginType: 'tenant_admin',
    };

    this.logger.log(`Generating JWT for tenant admin: ${email}`);
    return {
      access_token: this.jwtService.sign(payload),
      tenant: {
        uuid: tenant.uuid,
        name: tenant.name,
        email: tenant.email,
        namespace: tenant.namespace,
        tier: tenant.tier,
      },
    };
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }
}
