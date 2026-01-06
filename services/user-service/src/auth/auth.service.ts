import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { UsersService } from '../users/users.service';
import { FirebaseService } from './firebase.service';
import { LoginDto, RegisterDto, FirebaseAuthDto } from './dto/auth.dto';
import { firstValueFrom } from 'rxjs';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private firebaseService: FirebaseService,
    private httpService: HttpService,
  ) {}

  async login(loginDto: LoginDto) {
    this.logger.log(`Login attempt for email: ${loginDto.email}`);
    try {
      const user = await this.usersService.validatePassword(
        loginDto.email,
        loginDto.password,
      );

      if (!user) {
        this.logger.warn(
          `Login failed: Invalid credentials for email ${loginDto.email}`,
        );
        throw new UnauthorizedException('Invalid credentials');
      }

      // Fetch role from Tenant Service
      const tenantServiceUrl =
        process.env.TENANT_SERVICE_URL || 'http://tenant-service:8084';
      let role = 'user'; // Default role

      this.logger.log(`[AUTH] Fetching role for user ${user.id} from Tenant Service: ${tenantServiceUrl}`);

      try {
        const roleUrl = `${tenantServiceUrl}/api/v1/user-roles/user/${user.id}`;
        this.logger.log(`[AUTH] Calling: ${roleUrl}`);

        const roleResponse = await firstValueFrom(
          this.httpService.get(roleUrl),
        );

        this.logger.log(`[AUTH] Tenant Service response status: ${roleResponse.status}`);
        this.logger.log(`[AUTH] Tenant Service response data:`, JSON.stringify(roleResponse.data));

        const userRoles = roleResponse.data;

        // Get first role (simplified - users typically have one role)
        if (userRoles && userRoles.length > 0) {
          role = userRoles[0].role?.name || 'user';
          this.logger.log(`[AUTH] Found role for user ${user.id}: ${role}`);
        } else {
          this.logger.warn(`[AUTH] No roles found for user ${user.id}, using default 'user'`);
        }
      } catch (error) {
        this.logger.error(
          `[AUTH] Failed to fetch role for user ${user.id}: ${error.message}`,
          error.stack,
        );
        this.logger.error(`[AUTH] Error details:`, error);
        this.logger.warn(`[AUTH] Using default role 'user' due to error`);
      }

      const payload = {
        sub: user.id,
        userId: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: role,
      };

      this.logger.debug(
        `Login successful for user ID: ${user.id}, role: ${role}`,
      );
      return {
        access_token: this.jwtService.sign(payload),
        user: { ...user, role },
      };
    } catch (error) {
      this.logger.error(
        `Login error for ${loginDto.email}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async register(registerDto: RegisterDto) {
    this.logger.log(`Registration attempt for email: ${registerDto.email}`);
    try {
      const tenantServiceUrl =
        process.env.TENANT_SERVICE_URL || 'http://tenant-service:8084';

      // Default tenant ID (Free Community)
      const DEFAULT_TENANT_ID = 1;

      // 1. Create User in User Service with default tenantId
      this.logger.log(
        `Creating user and assigning to default tenant (ID: ${DEFAULT_TENANT_ID})`,
      );
      const user = await this.usersService.create({
        name: registerDto.name,
        email: registerDto.email,
        password: registerDto.password,
        avatarUrl: registerDto.avatarUrl,
        tenantId: DEFAULT_TENANT_ID,
      });
      this.logger.debug(`User created with ID: ${user.id}`);

      // 2. Check if this is the first user for this tenant
      const existingUsers = await this.usersService.findByTenant(DEFAULT_TENANT_ID);
      const isFirstUser = existingUsers.length <= 1; // Only the newly created user exists
      
      this.logger.debug(`Is first user for tenant ${DEFAULT_TENANT_ID}: ${isFirstUser}`);

      // 3. Get appropriate role from Tenant Service
      const rolesResponse = await firstValueFrom(
        this.httpService.get(`${tenantServiceUrl}/api/v1/roles`),
      );
      const targetRoleName = isFirstUser ? 'admin' : 'user';
      const targetRole = rolesResponse.data.find((r: any) => r.name === targetRoleName);

      if (!targetRole) {
        this.logger.error(`${targetRoleName} role not found in Tenant Service`);
        throw new Error(`${targetRoleName} role not found`);
      }

      // 4. Assign role to user in Tenant Service
      await firstValueFrom(
        this.httpService.post(`${tenantServiceUrl}/api/v1/user-roles`, {
          userId: user.id,
          roleId: targetRole.id,
          tenantId: DEFAULT_TENANT_ID,
        }),
      );
      this.logger.debug(`${targetRoleName} role assigned to user ${user.id}`);

      // 5. Create JWT with tenantId and role
      const payload = {
        sub: user.id,
        userId: user.id,
        email: user.email,
        tenantId: DEFAULT_TENANT_ID,
        role: targetRoleName,
      };

      this.logger.debug(`Registration successful for user ID: ${user.id} with role: ${targetRoleName}`);
      return {
        access_token: this.jwtService.sign(payload),
        user: { ...user, role: targetRoleName },
      };
    } catch (error) {
      this.logger.error(
        `Registration error for ${registerDto.email}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async loginWithFirebase(firebaseAuthDto: FirebaseAuthDto) {
    this.logger.log(`Firebase login attempt`);
    try {
      if (!this.firebaseService.isInitialized()) {
        this.logger.error('Firebase service not initialized');
        throw new UnauthorizedException(
          'Firebase authentication not available',
        );
      }

      // Verify Firebase token
      const decoded = await this.firebaseService.verifyIdToken(
        firebaseAuthDto.firebaseToken,
      );

      if (!decoded || !decoded.email) {
        this.logger.warn('Invalid Firebase token provided');
        throw new UnauthorizedException('Invalid Firebase token');
      }

      // Find or create user
      let user = await this.usersService.findByEmail(decoded.email);

      if (!user) {
        this.logger.log(
          `Creating new Firebase user with email: ${decoded.email}`,
        );
        // Create new user with Firebase data (no password for OAuth users)
        await this.usersService.create({
          email: decoded.email,
          name: firebaseAuthDto.displayName || decoded.name || 'Unnamed User',
          password: undefined, // No password for OAuth users
          googleUid: decoded.uid,
          avatarUrl: firebaseAuthDto.avatarUrl || decoded.picture || undefined,
        });

        // Fetch the created user
        user = await this.usersService.findByEmail(decoded.email);
      }

      if (!user) {
        this.logger.error(
          `Failed to create/retrieve Firebase user with email: ${decoded.email}`,
        );
        throw new UnauthorizedException('Failed to create/retrieve user');
      }

      // Fetch user's role from Tenant Service
      let role = 'user'; // Default role
      if (user.tenantId) {
        try {
          const roleResponse = await firstValueFrom(
            this.httpService.get(
              `${process.env.TENANT_SERVICE_URL || 'http://tenant-service:8084'}/api/v1/user-roles/user/${user.id}`,
            ),
          );
          role = roleResponse.data[0]?.role?.name || 'user';
        } catch (error) {
          this.logger.warn(
            `Could not fetch role from Tenant Service for user ${user.id}, defaulting to 'user'`,
          );
        }
      }

      const payload = {
        sub: user.id,
        userId: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: role,
      };

      this.logger.debug(`Firebase login successful for user ID: ${user.id}`);
      return {
        access_token: this.jwtService.sign(payload),
        user: {
          ...user,
          role,
        },
      };
    } catch (error) {
      this.logger.error(`Firebase login error: ${error.message}`, error.stack);
      throw error;
    }
  }

  async validateUser(userId: number) {
    this.logger.log(`Validating user with ID: ${userId}`);
    try {
      const user = await this.usersService.findOne(userId);
      
      // Fetch role from Tenant Service (same as login flow)
      const tenantServiceUrl =
        process.env.TENANT_SERVICE_URL || 'http://tenant-service:8084';
      let role = 'user'; // Default role

      this.logger.log(`[VALIDATE] Fetching role for user ${user.id} from Tenant Service`);

      try {
        const roleUrl = `${tenantServiceUrl}/api/v1/user-roles/user/${user.id}`;
        this.logger.log(`[VALIDATE] Calling: ${roleUrl}`);

        const roleResponse = await firstValueFrom(
          this.httpService.get(roleUrl),
        );

        this.logger.log(`[VALIDATE] Tenant Service response status: ${roleResponse.status}`);
        
        const userRoles = roleResponse.data;

        // Get first role (simplified - users typically have one role)
        if (userRoles && userRoles.length > 0) {
          role = userRoles[0].role?.name || 'user';
          this.logger.log(`[VALIDATE] Found role for user ${user.id}: ${role}`);
        } else {
          this.logger.warn(`[VALIDATE] No roles found for user ${user.id}, using default 'user'`);
        }
      } catch (error) {
        this.logger.error(
          `[VALIDATE] Failed to fetch role for user ${user.id}: ${error.message}`,
          error.stack,
        );
        this.logger.warn(`[VALIDATE] Using default role 'user' due to error`);
      }

      this.logger.debug(`User validation successful for ID: ${userId}, role: ${role}`);
      return { ...user, role };
    } catch (error) {
      this.logger.error(
        `User validation error for ID ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async generateToken(userId: number, tenantId: number, role: string) {
    this.logger.log(`Generating new token for user ${userId}, tenant ${tenantId}, role ${role}`);
    try {
      const user = await this.usersService.findOne(userId);
      
      if (!user) {
        this.logger.error(`User not found with ID: ${userId}`);
        throw new UnauthorizedException('User not found');
      }

      const payload = {
        sub: user.id,
        userId: user.id,
        email: user.email,
        tenantId: tenantId,
        role: role,
      };

      this.logger.debug(`Token generated successfully for user ${userId}`);
      return {
        access_token: this.jwtService.sign(payload),
        user: { ...user, role, tenantId },
      };
    } catch (error) {
      this.logger.error(
        `Token generation error for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
