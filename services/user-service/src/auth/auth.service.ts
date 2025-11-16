import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { FirebaseService } from './firebase.service';
import { LoginDto, RegisterDto, FirebaseAuthDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private firebaseService: FirebaseService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.usersService.validatePassword(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async register(registerDto: RegisterDto) {
    const user = await this.usersService.create(registerDto);

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async loginWithFirebase(firebaseAuthDto: FirebaseAuthDto) {
    if (!this.firebaseService.isInitialized()) {
      throw new UnauthorizedException('Firebase authentication not available');
    }

    // Verify Firebase token
    const decoded = await this.firebaseService.verifyIdToken(firebaseAuthDto.firebaseToken);

    if (!decoded || !decoded.email) {
      throw new UnauthorizedException('Invalid Firebase token');
    }

    // Find or create user
    let user = await this.usersService.findByEmail(decoded.email);

    if (!user) {
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
      throw new UnauthorizedException('Failed to create/retrieve user');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async validateUser(userId: number) {
    return this.usersService.findOne(userId);
  }
}
