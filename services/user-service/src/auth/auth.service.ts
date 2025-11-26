import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { FirebaseService } from './firebase.service';
import { LoginDto, RegisterDto, FirebaseAuthDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private firebaseService: FirebaseService,
  ) {}

  async login(loginDto: LoginDto) {
    this.logger.log(`Login attempt for email: ${loginDto.email}`);
    try {
      const user = await this.usersService.validatePassword(loginDto.email, loginDto.password);

      if (!user) {
        this.logger.warn(`Login failed: Invalid credentials for email ${loginDto.email}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      const payload = {
        sub: user.id,
        email: user.email,
        name: user.name,
      };

      this.logger.debug(`Login successful for user ID: ${user.id}`);
      return {
        access_token: this.jwtService.sign(payload),
        user,
      };
    } catch (error) {
      this.logger.error(`Login error for ${loginDto.email}: ${(error as any).message}`, (error as any).stack);
      throw error;
    }
  }

  async register(registerDto: RegisterDto) {
    this.logger.log(`Registration attempt for email: ${registerDto.email}`);
    try {
      const user = await this.usersService.create(registerDto);

      const payload = {
        sub: user.id,
        email: user.email,
        name: user.name,
      };

      this.logger.debug(`Registration successful for user ID: ${user.id}`);
      return {
        access_token: this.jwtService.sign(payload),
        user,
      };
    } catch (error) {
      this.logger.error(`Registration error for ${registerDto.email}: ${(error as any).message}`, (error as any).stack);
      throw error;
    }
  }

  async loginWithFirebase(firebaseAuthDto: FirebaseAuthDto) {
    this.logger.log(`Firebase login attempt`);
    try {
      if (!this.firebaseService.isInitialized()) {
        this.logger.error('Firebase service not initialized');
        throw new UnauthorizedException('Firebase authentication not available');
      }

      // Verify Firebase token
      const decoded = await this.firebaseService.verifyIdToken(firebaseAuthDto.firebaseToken);

      if (!decoded || !decoded.email) {
        this.logger.warn('Invalid Firebase token provided');
        throw new UnauthorizedException('Invalid Firebase token');
      }

      // Find or create user
      let user = await this.usersService.findByEmail(decoded.email);

      if (!user) {
        this.logger.log(`Creating new Firebase user with email: ${decoded.email}`);
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
        this.logger.error(`Failed to create/retrieve Firebase user with email: ${decoded.email}`);
        throw new UnauthorizedException('Failed to create/retrieve user');
      }

      const payload = {
        sub: user.id,
        email: user.email,
        name: user.name,
      };

      this.logger.debug(`Firebase login successful for user ID: ${user.id}`);
      return {
        access_token: this.jwtService.sign(payload),
        user,
      };
    } catch (error) {
      this.logger.error(`Firebase login error: ${(error as any).message}`, (error as any).stack);
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
      this.logger.error(`User validation error for ID ${userId}: ${(error as any).message}`, (error as any).stack);
      throw error;
    }
  }
}
