import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { UsersService } from '../users/users.service';
import { FirebaseService } from './firebase.service';
import { LoginDto, RegisterDto, FirebaseAuthDto } from './dto/auth.dto';
import { firstValueFrom } from 'rxjs';

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
    const tenantServiceUrl =
      process.env.TENANT_SERVICE_URL || 'http://tenant-service:8084';

    // Step 1: Try User table first
    try {
      let user = await this.usersService.validatePassword(
        loginDto.email,
        loginDto.password,
      );

      if (user) {
        this.logger.log(`[AUTH] User found in Users table, proceeding with user login`);

        // Additional check: determine whether this email is a tenant admin
        try {
          const checkUrl = `${tenantServiceUrl}/api/v1/tenants/check-admin-email/${encodeURIComponent(
            loginDto.email,
          )}`;
          const checkResp = await firstValueFrom(this.httpService.get(checkUrl));
          const isAdmin = checkResp.data?.isAdmin;
          const tenantUuidFromCheck = checkResp.data?.tenantUuid || null;

          if (isAdmin) {
            this.logger.log(
              `[AUTH] Email ${loginDto.email} is a tenant admin for tenant ${tenantUuidFromCheck}`,
            );

            // If user has no tenantUuid, try to associate it
            if (!user.tenantUuid && tenantUuidFromCheck) {
              try {
                await this.usersService.update(user.id, { tenantUuid: tenantUuidFromCheck });
                user = await this.usersService.findByEmail(user.email);
                this.logger.debug(`Associated existing user ${user.id} with tenant ${tenantUuidFromCheck}`);
              } catch (err) {
                this.logger.warn(
                  `[AUTH] Failed to associate existing user ${user?.id ?? 'unknown'} with tenant ${tenantUuidFromCheck}: ${err.message}`,
                );
              }
            }

            const payload = {
              sub: user.id,
              userId: user.id,
              email: user.email,
              tenantUuid: user.tenantUuid || tenantUuidFromCheck,
              loginType: 'tenant_admin',
            };

            this.logger.debug(`Tenant-admin login successful for user ID: ${user.id}`);
            return {
              access_token: this.jwtService.sign(payload),
              user: { ...user, loginType: 'tenant_admin' },
            };
          }
        } catch (err) {
          this.logger.warn(`Error checking tenant admin status for ${loginDto.email}: ${err.message}`);
        }

        // Normal user login fallback
        const payload = {
          sub: user.id,
          userId: user.id,
          email: user.email,
          tenantUuid: user.tenantUuid,
          loginType: 'user',
        };

        this.logger.debug(`Login successful for user ID: ${user.id}`);
        return {
          access_token: this.jwtService.sign(payload),
          user: { ...user, loginType: 'user' },
        };
      }
    } catch (error) {
      // User login failed, continue to try tenant login
      this.logger.log(`[AUTH] User login failed, trying tenant login: ${error.message}`);
    }

    // Step 2: Try Tenant table (via Tenant Service)
    try {
      this.logger.log(`[AUTH] Attempting tenant admin login for: ${loginDto.email}`);
      const tenantLoginUrl = `${tenantServiceUrl}/api/v1/tenants/auth/login`;

      const tenantResponse = await firstValueFrom(
        this.httpService.post(tenantLoginUrl, {
          email: loginDto.email,
          password: loginDto.password,
        }),
      );

      if (tenantResponse.data?.access_token) {
        this.logger.log(`[AUTH] Tenant admin login successful for: ${loginDto.email}`);
        const { access_token, tenant } = tenantResponse.data;

        // Check if a corresponding user exists for this tenant email
        try {
          let user = await this.usersService.findByEmail(tenant.email);

          if (!user) {
            this.logger.log(`[AUTH] No user found for tenant email ${tenant.email}, creating user using tenant credentials`);
            try {
              const created = await this.usersService.create({
                name: tenant.name,
                email: tenant.email,
                password: loginDto.password,
                avatarUrl: tenant.avatarUrl,
                tenantUuid: tenant.uuid,
              });
              // Fetch created user with password removed where necessary
              user = await this.usersService.findByEmail(created.email);
              this.logger.debug(`Created user for tenant ${tenant.uuid} with ID: ${created.id}`);
            } catch (err) {
              // If creation fails due to a race (user exists) or other error, log and attempt to continue
              this.logger.warn(`[AUTH] Failed to create user for tenant email ${tenant.email}: ${err.message}`);
              user = await this.usersService.findByEmail(tenant.email);
            }
          } else {
            // If an existing user lacks tenant association, attach tenantUuid
            if (!user.tenantUuid) {
              try {
                // Update user record to set tenantUuid
                await this.usersService.update(user.id, { tenantUuid: tenant.uuid });
                const updatedUser = await this.usersService.findByEmail(tenant.email);
                if (updatedUser) {
                  user = updatedUser;
                  this.logger.debug(`Associated existing user ${user.id} with tenant ${tenant.uuid}`);
                } else {
                  this.logger.warn(`[AUTH] Updated user lookup returned null for email ${tenant.email}`);
                }
              } catch (err) {
                this.logger.warn(`[AUTH] Failed to associate user ${user?.id ?? 'unknown'} with tenant ${tenant.uuid}: ${err.message}`);
              }
            }
          }

          // If we have a user now, switch login to user JWT (so downstream calls see a user token)
          if (user) {
            const payload = {
              sub: user.id,
              userId: user.id,
              email: user.email,
              tenantUuid: user.tenantUuid || tenant.uuid,
              loginType: 'user',
            };

            this.logger.log(`[AUTH] Switching tenant login to user session for email ${loginDto.email}`);
            return {
              access_token: this.jwtService.sign(payload),
              user: { ...user, loginType: 'user' },
            };
          }
        } catch (err) {
          this.logger.warn(`[AUTH] Error while mapping tenant to user: ${err.message}`);
        }

        // Fallback: return tenant admin token if we couldn't create/switch to a user
        return {
          access_token,
          user: {
            id: tenant.uuid,
            name: tenant.name,
            email: tenant.email,
            tenantUuid: tenant.uuid,
            namespace: tenant.namespace,
            tier: tenant.tier,
            loginType: 'tenant_admin',
          },
        };
      }
    } catch (error) {
      this.logger.warn(`[AUTH] Tenant login also failed: ${error.message}`);
    }

    // Both login attempts failed
    this.logger.warn(`Login failed: Invalid credentials for email ${loginDto.email}`);
    throw new UnauthorizedException('Invalid credentials');
  }

  async register(registerDto: RegisterDto) {
    this.logger.log(`Registration attempt for email: ${registerDto.email}`);
    try {
      const tenantServiceUrl =
        process.env.TENANT_SERVICE_URL || 'http://tenant-service:8084';

      // Determine tenant namespace (order of precedence):
      //  1. Explicit tenantNamespace from request body (extracted by frontend from subdomain)
      //  2. DEFAULT_TENANT_NAMESPACE env var
      //  3. Fallback to 'free'
      const defaultTenantNamespace = process.env.DEFAULT_TENANT_NAMESPACE || 'free';
      const tenantNamespace = registerDto.tenantNamespace?.toLowerCase() || defaultTenantNamespace;

      this.logger.log(`Using tenant namespace: ${tenantNamespace} (from body: ${!!registerDto.tenantNamespace})`);

      // Try to lookup tenant by namespace
      let tenantUuid: string | null = null;
      try {
        this.logger.log(`Looking up tenant UUID for namespace: ${tenantNamespace}`);
        const tenantResponse = await firstValueFrom(
          this.httpService.get(`${tenantServiceUrl}/api/v1/tenants/namespace/${encodeURIComponent(tenantNamespace)}`),
        );
        tenantUuid = tenantResponse.data?.uuid || null;
        if (tenantUuid) {
          this.logger.log(`Resolved tenant namespace '${tenantNamespace}' to UUID: ${tenantUuid}`);
        } else {
          this.logger.warn(`Tenant namespace '${tenantNamespace}' not found in Tenant Service`);
        }
      } catch (error) {
        this.logger.warn(`Error looking up tenant by namespace '${tenantNamespace}': ${error.message}`);
      }

      // Create User in User Service with resolved tenantUuid (may be null)
      this.logger.log(
        `Creating user and assigning to tenant (namespace: ${tenantNamespace}, uuid: ${tenantUuid})`,
      );
      const user = await this.usersService.create({
        name: registerDto.name,
        email: registerDto.email,
        password: registerDto.password,
        avatarUrl: registerDto.avatarUrl,
        tenantUuid: tenantUuid ?? undefined,
      });
      this.logger.debug(`User created with ID: ${user.id}`);

      // Create JWT with tenantUuid
      const payload = {
        sub: user.id,
        userId: user.id,
        email: user.email,
        tenantUuid: tenantUuid ?? null,
        loginType: 'user',
      };

      this.logger.debug(`Registration successful for user ID: ${user.id}`);
      return {
        access_token: this.jwtService.sign(payload),
        user: { ...user, loginType: 'user' },
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

      const userTenantUuid = (user as any).tenantUuid || null;

      const payload = {
        sub: user.id,
        userId: user.id,
        email: user.email,
        tenantUuid: userTenantUuid,
        loginType: 'user',
      };

      this.logger.debug(`Firebase login successful for user ID: ${user.id}`);
      return {
        access_token: this.jwtService.sign(payload),
        user: {
          ...user,
          loginType: 'user',
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

      this.logger.debug(`User validation successful for ID: ${userId}`);
      return user;
    } catch (error) {
      this.logger.error(
        `User validation error for ID ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async generateToken(userId: number, tenantUuid: string | null, loginType?: string | null) {
    this.logger.log(`Generating new token for user ${userId}, tenant ${tenantUuid}, loginType ${loginType}`);
    try {
      const user = await this.usersService.findOne(userId);

      if (!user) {
        this.logger.error(`User not found with ID: ${userId}`);
        throw new UnauthorizedException('User not found');
      }

      // Determine loginType: prefer explicit loginType, otherwise default to 'user'
      const resolvedLoginType = loginType ?? 'user';

      const payload = {
        sub: user.id,
        userId: user.id,
        email: user.email,
        tenantUuid: tenantUuid,
        loginType: resolvedLoginType,
      };

      this.logger.debug(`Token generated successfully for user ${userId}`);
      return {
        access_token: this.jwtService.sign(payload),
        user: { ...user, tenantUuid, loginType: resolvedLoginType },
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
