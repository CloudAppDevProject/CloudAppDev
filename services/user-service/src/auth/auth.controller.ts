import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, FirebaseAuthDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    this.logger.log(`POST /auth/login - Email: ${loginDto.email}`);
    try {
      const result = await this.authService.login(loginDto);
      this.logger.debug(`Login endpoint successful`);
      return result;
    } catch (error) {
      this.logger.error(`Login endpoint error: ${error.message}`);
      throw error;
    }
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    this.logger.log(`POST /auth/register - Email: ${registerDto.email}`);
    try {
      const result = await this.authService.register(registerDto);
      this.logger.debug(`Register endpoint successful`);
      return result;
    } catch (error) {
      this.logger.error(`Register endpoint error: ${error.message}`);
      throw error;
    }
  }

  @Post('firebase')
  @HttpCode(HttpStatus.OK)
  async loginWithFirebase(@Body() firebaseAuthDto: FirebaseAuthDto) {
    this.logger.log(`POST /auth/firebase - Firebase login`);
    try {
      const result = await this.authService.loginWithFirebase(firebaseAuthDto);
      this.logger.debug(`Firebase login endpoint successful`);
      return result;
    } catch (error) {
      this.logger.error(`Firebase login endpoint error: ${error.message}`);
      throw error;
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    this.logger.log(`GET /auth/me - User ID: ${req.user.userId}`);
    try {
      const result = await this.authService.validateUser(req.user.userId);
      this.logger.debug(`Get profile endpoint successful`);
      return result;
    } catch (error) {
      this.logger.error(`Get profile endpoint error: ${error.message}`);
      throw error;
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req) {
    this.logger.log(`POST /auth/logout - User ID: ${req.user.userId}`);
    // JWT tokens are stateless, so logout is handled client-side
    // by removing the token from storage
    return { message: 'Logged out successfully' };
  }

  @Post('refresh-token')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() body: { userId: number; tenantId: number; role: string }) {
    this.logger.log(`POST /auth/refresh-token - User ID: ${body.userId}, Tenant ID: ${body.tenantId}`);
    try {
      const result = await this.authService.generateToken(body.userId, body.tenantId, body.role);
      this.logger.debug(`Refresh token endpoint successful`);
      return result;
    } catch (error) {
      this.logger.error(`Refresh token endpoint error: ${error.message}`);
      throw error;
    }
  }
}
