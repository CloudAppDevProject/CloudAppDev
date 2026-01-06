import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
  HttpException,
  HttpStatus,
  UseInterceptors,
  UseGuards,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { StorageService } from '../storage/storage.service';
import { TenantAuthGuard } from '../guards/tenant-auth.guard';
import { AdminGuard } from '../guards/admin.guard';

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    this.logger.log(
      `POST / - Creating user with email: ${createUserDto.email}`,
    );
    try {
      const result = await this.usersService.create(createUserDto);
      this.logger.debug(`Create user endpoint successful`);
      return result;
    } catch (error) {
      this.logger.error(`Create user endpoint error: ${error.message}`);
      if (error.status === 409) {
        throw error;
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get()
  @UseGuards(TenantAuthGuard)
  async findAll(@Request() req) {
    this.logger.log(`GET / - Finding all users for tenant ${req.tenantId}`);
    try {
      const result = await this.usersService.findByTenant(req.tenantId);
      this.logger.debug(`Find all users endpoint successful`);
      return result;
    } catch (error) {
      this.logger.error(`Find all users endpoint error: ${error.message}`);
      throw error;
    }
  }

  @Get('signed-url')
  async getSignedUrl(@Query('path') path: string) {
    this.logger.log(`GET /signed-url - Path: ${path}`);
    try {
      if (!path) {
        this.logger.warn('Signed URL request without path parameter');
        throw new HttpException(
          'path parameter is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const signedUrl = await this.storageService.getSignedUrl(path);

      this.logger.debug(`Signed URL generated successfully`);
      return {
        url: signedUrl,
      };
    } catch (error) {
      this.logger.error(`Get signed URL endpoint error: ${error.message}`);
      throw new HttpException(
        error.message || 'Failed to generate signed URL',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    this.logger.log(`GET /:id - Finding user with ID: ${id}`);
    try {
      const result = await this.usersService.findOne(+id);
      this.logger.debug(`Find one user endpoint successful`);
      return result;
    } catch (error) {
      this.logger.error(`Find one user endpoint error: ${error.message}`);
      if (error.status === 404) {
        throw error;
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    this.logger.log(`PATCH /:id - Updating user with ID: ${id}`);
    try {
      const result = await this.usersService.update(+id, updateUserDto);
      this.logger.debug(`Update user endpoint successful`);
      return result;
    } catch (error) {
      this.logger.error(`Update user endpoint error: ${error.message}`);
      if (error.code === 'P2025') {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  @UseGuards(TenantAuthGuard, AdminGuard)
  async remove(@Param('id') id: string, @Request() req) {
    this.logger.log(`DELETE /:id - Deleting user with ID: ${id} for tenant: ${req.tenantId}`);
    try {
      const result = await this.usersService.remove(+id, req.tenantId);
      this.logger.debug(`Delete user endpoint successful`);
      return result;
    } catch (error) {
      this.logger.error(`Delete user endpoint error: ${error.message}`);
      if (error.code === 'P2025') {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 }), // 20MB
          new FileTypeValidator({
            fileType: /(image\/(jpeg|png|webp|gif)|application\/pdf)/,
          }),
        ],
      }),
    )
    file: any,
    @Body('userId') userId: string,
  ) {
    this.logger.log(
      `POST /upload - Uploading file: ${file.originalname} for userId: ${userId}, size: ${file.size} bytes`,
    );
    try {
      if (!userId) {
        this.logger.warn('File upload attempted without userId');
        throw new HttpException('userId is required', HttpStatus.BAD_REQUEST);
      }

      const gcsUri = await this.storageService.uploadFile(
        file.buffer,
        userId,
        file.originalname,
        file.mimetype,
      );

      this.logger.debug(`File uploaded successfully to GCS: ${gcsUri}`);
      return {
        success: true,
        gcsUri,
        fileName: file.originalname,
        message: 'File uploaded successfully',
      };
    } catch (error) {
      this.logger.error(`Upload file endpoint error: ${error.message}`);
      throw new HttpException(
        error.message || 'Upload failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
