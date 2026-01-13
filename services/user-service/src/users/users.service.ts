import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { TenantService } from '../tenant/tenant.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private prisma: PrismaService, private tenantService: TenantService) {}

  async create(createUserDto: CreateUserDto) {
    this.logger.log(`Creating user with email: ${createUserDto.email}`);
    try {
      // Check if user already exists (explicit select to avoid selecting migrated columns like tenantId)
      const existing = await this.prisma.user.findUnique({
        where: { email: createUserDto.email },
        select: { id: true, email: true },
      });

      if (existing) {
        this.logger.warn(
          `User creation failed: Email ${createUserDto.email} already exists`,
        );
        throw new ConflictException('User with this email already exists');
      }

      // Hash password if provided
      let hashedPassword: string | null = null;
      if (createUserDto.password) {
        hashedPassword = await bcrypt.hash(createUserDto.password, 10);
      }

      // Build data object and cast to any to remain compatible with Prisma client types
      // during the tenantId->tenantUuid migration. Remove cast after running migrations and
      // `prisma generate` so generated client contains tenantUuid in types.
      const createData: any = {
        name: createUserDto.name,
        email: createUserDto.email,
        password: hashedPassword,
        googleUid: createUserDto.googleUid,
        avatarUrl: createUserDto.avatarUrl,
      };
      if (createUserDto.tenantUuid) {
        createData.tenantUuid = createUserDto.tenantUuid;
      }

      const user = await this.prisma.user.create({ data: createData as any });

      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      this.logger.debug(`User created successfully with ID: ${user.id}`);
      return userWithoutPassword;
    } catch (error) {
      this.logger.error(
        `Error creating user with email ${createUserDto.email}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findAll() {
    this.logger.log(`Finding all users`);
    try {
      const users = await this.prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      this.logger.debug(`Found ${users.length} users`);
      return users;
    } catch (error) {
      this.logger.error(
        `Error finding all users: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByTenant(tenantUuid: string) {
    this.logger.log(`Finding users for tenant: ${tenantUuid}`);
    try {
      // Guard: tenantUuid must be provided
      if (!tenantUuid) {
        this.logger.warn('findByTenant called without tenantUuid');
        return [];
      }

      const users = await this.prisma.user.findMany({
        where: { tenantUuid } as any,
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          createdAt: true,
        },
      });

      this.logger.debug(`Found ${users.length} users for tenant ${tenantUuid}`);
      return users;
    } catch (error) {
      this.logger.error(
        `Error finding users for tenant ${tenantUuid}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findUserIdsByTenant(tenantUuid: string): Promise<number[]> {
    this.logger.log(`Finding user IDs for tenant: ${tenantUuid}`);
    try {
      if (!tenantUuid) {
        this.logger.warn('findUserIdsByTenant called without tenantUuid');
        return [];
      }

      const users = await this.prisma.user.findMany({
        where: { tenantUuid } as any,
        select: { id: true },
      });

      const userIds = users.map((u) => u.id);
      this.logger.debug(`Found ${userIds.length} user IDs for tenant ${tenantUuid}`);
      return userIds;
    } catch (error) {
      this.logger.error(
        `Error finding user IDs for tenant ${tenantUuid}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findOne(id: number) {
    this.logger.log(`Finding user with ID: ${id}`);
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          tenantUuid: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        this.logger.warn(`User not found with ID: ${id}`);
        throw new NotFoundException('User not found');
      }

      // Enrich user with loginType and tenantUuid based on tenant-service admin check
      try {
        const { isAdmin, tenantUuid } = await this.tenantService.isEmailTenantAdmin(user.email);
        const loginType = isAdmin ? 'tenant_admin' : 'user';
        this.logger.debug(`Enriched user ${id} with loginType=${loginType}, tenantUuid=${tenantUuid}`);

        return { ...user, loginType, tenantUuid };
      } catch (err) {
        // If tenant service fails, return user without enrichment but log warning
        this.logger.warn(`Failed to enrich user ${id} with tenant info: ${err.message}`);
        return { ...user, loginType: 'user', tenantUuid: user.tenantUuid ?? null };
      }
    } catch (error) {
      this.logger.error(
        `Error finding user with ID ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByEmail(email: string) {
    this.logger.log(`Finding user by email: ${email}`);
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
        // include password and tenantUuid for authentication and tenant mapping; explicit select avoids accidentally selecting removed columns
        select: { id: true, name: true, email: true, password: true, avatarUrl: true, tenantUuid: true, createdAt: true, updatedAt: true },
      });
      if (user) {
        this.logger.debug(`User found by email: ${email}`);
      } else {
        this.logger.debug(`User not found by email: ${email}`);
      }
      return user;
    } catch (error) {
      this.logger.error(
        `Error finding user by email ${email}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findByGoogleUid(googleUid: string) {
    this.logger.log(`Finding user by Google UID: ${googleUid}`);
    try {
      const user = await this.prisma.user.findUnique({
        where: { googleUid },
        select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true, updatedAt: true },
      });
      if (user) {
        this.logger.debug(`User found by Google UID: ${googleUid}`);
      } else {
        this.logger.debug(`User not found by Google UID: ${googleUid}`);
      }
      return user;
    } catch (error) {
      this.logger.error(
        `Error finding user by Google UID ${googleUid}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    this.logger.log(`Updating user with ID: ${id}`);
    try {
      // Hash password if it's being updated
      if (updateUserDto.password) {
        updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
      }

      const user = await this.prisma.user.update({
        where: { id },
        data: updateUserDto,
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          updatedAt: true,
        },
      });

      this.logger.debug(`User updated successfully with ID: ${id}`);
      return user;
    } catch (error) {
      this.logger.error(
        `Error updating user with ID ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async remove(id: number, tenantUuid: string) {
    this.logger.log(`Deleting user with ID: ${id} for tenant: ${tenantUuid}`);
    try {
      // Verify user belongs to tenant before deletion
      // Use cast to remain compatible with schema that may still use tenantId during migration
      const user = await this.prisma.user.findFirst({
        where: { id, tenantUuid } as any,
      });

      if (!user) {
        throw new NotFoundException('User not found or does not belong to your organization');
      }

      await this.prisma.user.delete({
        where: { id },
      });
      this.logger.debug(`User deleted successfully with ID: ${id}`);
      return { success: true, message: 'User deleted successfully' };
    } catch (error) {
      this.logger.error(
        `Error deleting user with ID ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async validatePassword(email: string, password: string): Promise<any> {
    this.logger.log(`Validating password for email: ${email}`);
    try {
      const user = await this.findByEmail(email);
      if (!user || !user.password) {
        this.logger.warn(
          `Password validation failed: User not found or no password for email ${email}`,
        );
        return null;
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        this.logger.warn(
          `Password validation failed: Invalid password for email ${email}`,
        );
        return null;
      }

      const { password: _, ...userWithoutPassword } = user;
      this.logger.debug(`Password validated successfully for email: ${email}`);
      return userWithoutPassword;
    } catch (error) {
      this.logger.error(
        `Error validating password for email ${email}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
