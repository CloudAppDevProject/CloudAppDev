import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpException, HttpStatus, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { StorageService } from '../storage/storage.service';

@Controller()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    try {
      return await this.usersService.create(createUserDto);
    } catch (error) {
      if (error.status === 409) {
        throw error;
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get('signed-url')
  async getSignedUrl(@Query('path') path: string) {
    try {
      if (!path) {
        throw new HttpException('path parameter is required', HttpStatus.BAD_REQUEST);
      }

      const signedUrl = await this.storageService.getSignedUrl(path);

      return {
        url: signedUrl,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to generate signed URL',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return await this.usersService.findOne(+id);
    } catch (error) {
      if (error.status === 404) {
        throw error;
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    try {
      return await this.usersService.update(+id, updateUserDto);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return await this.usersService.remove(+id);
    } catch (error) {
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
            fileType: /(image\/(jpeg|png|webp|gif)|application\/pdf)/ 
          }),
        ],
      }),
    )
    file: any,
    @Body('userId') userId: string,
  ) {
    try {
      if (!userId) {
        throw new HttpException('userId is required', HttpStatus.BAD_REQUEST);
      }

      const gcsUri = await this.storageService.uploadFile(
        file.buffer,
        userId,
        file.originalname,
        file.mimetype,
      );

      return {
        success: true,
        gcsUri,
        fileName: file.originalname,
        message: 'File uploaded successfully',
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Upload failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
