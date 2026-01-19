import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import {
  RegisterTenantDto,
  RESERVED_NAMESPACES,
} from './dto/register-tenant.dto';
import { TenantAuthService } from '../auth/tenant-auth.service';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
    private tenantAuthService: TenantAuthService,
  ) {}

  async findByUuid(uuid: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { uuid },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with UUID ${uuid} not found`);
    }

    return tenant;
  }

  async findByNamespace(namespace: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { namespace },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with namespace ${namespace} not found`);
    }

    return {
      uuid: tenant.uuid,
      name: tenant.name,
      namespace: tenant.namespace,
      tier: tenant.tier,
    };
  }

  async findAll() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTenantUsers(tenantUuid: string) {
    // Verify tenant exists
    await this.findByUuid(tenantUuid);

    // Call User Service to get users by tenantUuid
    const userServiceUrl =
      process.env.USER_SERVICE_URL || 'http://user-service:8080';

    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${userServiceUrl}/api/v1/users?tenantUuid=${tenantUuid}`,
        ),
      );
      return response.data;
    } catch (error) {
      throw new NotFoundException(
        `Failed to fetch users for tenant ${tenantUuid}`,
      );
    }
  }

  async checkNamespaceAvailability(
    namespace: string,
  ): Promise<{ available: boolean; reason?: string }> {
    // Check if it's a reserved namespace
    if (RESERVED_NAMESPACES.includes(namespace.toLowerCase())) {
      return { available: false, reason: 'This namespace is reserved' };
    }

    // Check if namespace already exists
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { namespace: namespace.toLowerCase() },
    });

    if (existingTenant) {
      return { available: false, reason: 'This namespace is already taken' };
    }

    return { available: true };
  }

  async register(dto: RegisterTenantDto) {
    this.logger.log(`Registering new tenant: ${dto.name} (${dto.namespace})`);

    // Validate namespace
    const namespaceCheck = await this.checkNamespaceAvailability(dto.namespace);
    if (!namespaceCheck.available) {
      throw new BadRequestException(namespaceCheck.reason);
    }

    // Check if email is already used
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { email: dto.email },
    });

    if (existingTenant) {
      throw new ConflictException('Email is already registered');
    }

    // Hash password
    const hashedPassword = await this.tenantAuthService.hashPassword(
      dto.password,
    );

    // Create tenant with pending provisioning status
    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        namespace: dto.namespace.toLowerCase(),
        tier: dto.tier,
        provisioningStatus: 'pending',
      },
    });

    this.logger.log(`Tenant registered successfully: ${tenant.uuid}`);

    // Trigger infrastructure provisioning asynchronously
    this.triggerProvisioning(tenant.uuid, tenant.namespace, tenant.tier).catch(
      (error) => {
        this.logger.error(
          `Background provisioning failed for tenant ${tenant.uuid}: ${error.message}`,
        );
      },
    );

    return {
      uuid: tenant.uuid,
      name: tenant.name,
      email: tenant.email,
      namespace: tenant.namespace,
      tier: tenant.tier,
      provisioningStatus: tenant.provisioningStatus,
    };
  }

  /**
   * Triggers infrastructure provisioning for a tenant
   * This is called asynchronously after tenant registration
   */
  private async triggerProvisioning(
    tenantUuid: string,
    tenantName: string,
    tier: string,
  ): Promise<void> {
    const provisioningServiceUrl =
      process.env.PROVISIONING_SERVICE_URL || 'http://provisioning-service:8090';
    const environment = process.env.ENVIRONMENT || 'dev';

    this.logger.log(`Provisioning service URL: ${provisioningServiceUrl}`);
    this.logger.log(
      `Triggering provisioning for tenant ${tenantUuid} (${tenantName}, ${tier})`,
    );

    // Update status to provisioning
    await this.prisma.tenant.update({
      where: { uuid: tenantUuid },
      data: { provisioningStatus: 'provisioning' },
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${provisioningServiceUrl}/provision-tenant`,
          {
            tenantId: tenantUuid,
            tenantName: tenantName,
            tier: tier,
            environment: environment,
          },
          {
            timeout: 1800000, // 30 minutes timeout for provisioning
          },
        ),
      );

      const provisioningResult = response.data;

      if (provisioningResult.success) {
        // Update tenant with provisioned domain and status
        await this.prisma.tenant.update({
          where: { uuid: tenantUuid },
          data: {
            provisioningStatus: 'provisioned',
            domain: provisioningResult.domain,
            provisioningError: null,
          },
        });

        this.logger.log(
          `Provisioning completed for tenant ${tenantUuid}: ${provisioningResult.domain}`,
        );
      } else {
        throw new Error(
          provisioningResult.message || 'Provisioning returned unsuccessful',
        );
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Unknown provisioning error';

      this.logger.error(
        `Provisioning failed for tenant ${tenantUuid}: ${errorMessage}`,
      );

      // Update tenant with failed status
      await this.prisma.tenant.update({
        where: { uuid: tenantUuid },
        data: {
          provisioningStatus: 'failed',
          provisioningError: errorMessage,
        },
      });

      throw error;
    }
  }

  async create(dto: CreateTenantDto) {
    return this.prisma.tenant.create({
      data: {
        name: dto.name,
        email: `admin@${dto.name.toLowerCase().replace(/\s+/g, '-')}.local`,
        password: await this.tenantAuthService.hashPassword('changeme'),
        namespace: dto.name.toLowerCase().replace(/\s+/g, '-'),
        tier: dto.tier || 'free',
      },
    });
  }

  async update(uuid: string, dto: UpdateTenantDto) {
    // Check if tenant exists
    await this.findByUuid(uuid);

    return this.prisma.tenant.update({
      where: { uuid },
      data: dto,
    });
  }

  async delete(uuid: string) {
    // Hard delete - remove tenant
    await this.findByUuid(uuid);

    return this.prisma.tenant.delete({
      where: { uuid },
    });
  }

  /**
   * Check if an email belongs to a tenant admin
   * Used by other services to verify admin status
   */
  async checkAdminEmail(email: string): Promise<{ isAdmin: boolean; tenantUuid: string | null }> {
    this.logger.debug(`Checking admin status for email: ${email}`);

    const tenant = await this.prisma.tenant.findUnique({
      where: { email },
      select: { uuid: true },
    });

    if (tenant) {
      this.logger.debug(`Email ${email} is a tenant admin for tenant ${tenant.uuid}`);
      return { isAdmin: true, tenantUuid: tenant.uuid };
    }

    this.logger.debug(`Email ${email} is not a tenant admin`);
    return { isAdmin: false, tenantUuid: null };
  }
}
