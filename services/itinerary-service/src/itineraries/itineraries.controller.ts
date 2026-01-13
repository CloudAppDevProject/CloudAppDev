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
  ParseIntPipe,
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
import { ItinerariesService } from './itineraries.service';
import { CreateItineraryDto } from './dto/create-itinerary.dto';
import { UpdateItineraryDto } from './dto/update-itinerary.dto';
import { StorageService } from '../storage/storage.service';
import { TenantAuthGuard } from '../guards/tenant-auth.guard';
import { AdminGuard } from '../guards/admin.guard';

@Controller()
@UseGuards(TenantAuthGuard)
export class ItinerariesController {
  private readonly logger = new Logger(ItinerariesController.name);

  constructor(
    private readonly itinerariesService: ItinerariesService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  async create(@Request() req, @Body() createItineraryDto: CreateItineraryDto) {
    this.logger.log(`Creating itinerary for user: ${req.user.userId} in tenant ${req.tenantUuid}`);
    try {
      const result = await this.itinerariesService.create(
        req.user.userId,
        createItineraryDto,
      );
      this.logger.debug(`Itinerary created successfully with ID: ${(result as any).id}`);
      return result;
    } catch (error) {
      this.logger.error(`Error creating itinerary: ${(error as any).message}`, (error as any).stack);
      if ((error as any).message.includes('temporarily unavailable')) {
        throw new HttpException('Service temporarily unavailable', HttpStatus.SERVICE_UNAVAILABLE);
      }
      throw new HttpException((error as any).message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get()
  async findAll(
    @Request() req,
    @Query('userId') userId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    this.logger.log(`Fetching itineraries for tenant ${req.tenantUuid} - userId: ${userId}, search: ${search}, page: ${page}, limit: ${limit}`);
    try {
      const result = await this.itinerariesService.findAll(req.tenantUuid, {
        userId: userId ? parseInt(userId) : undefined,
        search,
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
      });
      this.logger.debug(`Found ${result.data.length} itineraries`);
      return result;
    } catch (error) {
      this.logger.error(`Error fetching itineraries: ${error.message}`, error.stack);
      throw error;
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
    this.logger.log(`Uploading file: ${file.originalname} for userId: ${userId}, size: ${file.size} bytes`);
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
      this.logger.error(`Error uploading file ${file.originalname}: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Upload failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('signed-url')
  async getSignedUrl(@Query('path') path: string) {
    this.logger.log(`Generating signed URL for path: ${path}`);
    try {
      if (!path) {
        this.logger.warn('Signed URL request without path parameter');
        throw new HttpException('path parameter is required', HttpStatus.BAD_REQUEST);
      }

      const signedUrl = await this.storageService.getSignedUrl(path);

      this.logger.debug(`Signed URL generated successfully`);
      return {
        url: signedUrl,
      };
    } catch (error) {
      this.logger.error(`Error generating signed URL for path ${path}: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to generate signed URL',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    this.logger.log(`Fetching itinerary with ID: ${id} for tenant ${req.tenantUuid}`);
    try {
      const itinerary = await this.itinerariesService.findOne(id, req.tenantUuid);
      this.logger.debug(`Itinerary fetched successfully with ID: ${id}`);
      return itinerary;
    } catch (error) {
      this.logger.error(`Error fetching itinerary with ID ${id}: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() updateItineraryDto: UpdateItineraryDto,
  ) {
    this.logger.log(`Updating itinerary with ID: ${id} for tenant ${req.tenantUuid}`);
    try {
      const result = await this.itinerariesService.update(id, req.tenantUuid, updateItineraryDto);
      this.logger.debug(`Itinerary updated successfully with ID: ${id}`);
      return result;
    } catch (error) {
      this.logger.error(`Error updating itinerary with ID ${id}: ${error.message}`, error.stack);
      if (error.code === 'P2025') {
        throw new HttpException('Itinerary not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    this.logger.log(`Deleting itinerary with ID: ${id} for tenant ${req.tenantUuid}`);
    try {
      await this.itinerariesService.remove(id, req.tenantUuid);
      this.logger.debug(`Itinerary deleted successfully with ID: ${id}`);
      return { success: true, message: 'Itinerary deleted successfully' };
    } catch (error) {
      this.logger.error(`Error deleting itinerary with ID ${id}: ${error.message}`, error.stack);
      if (error.code === 'P2025') {
        throw new HttpException('Itinerary not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
