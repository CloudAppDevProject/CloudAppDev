import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Query,
  HttpException,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ItinerariesService } from './itineraries.service';
import { CreateItineraryDto } from './dto/create-itinerary.dto';
import { UpdateItineraryDto } from './dto/update-itinerary.dto';
import { StorageService } from '../storage/storage.service';

@Controller()
export class ItinerariesController {
  constructor(
    private readonly itinerariesService: ItinerariesService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  async create(@Body() createItineraryDto: CreateItineraryDto) {
    try {
      return await this.itinerariesService.create(createItineraryDto);
    } catch (error) {
      if (error.message.includes('temporarily unavailable')) {
        throw new HttpException('Service temporarily unavailable', HttpStatus.SERVICE_UNAVAILABLE);
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get()
  async findAll(
    @Query('userId') userId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.itinerariesService.findAll({
      userId: userId ? parseInt(userId) : undefined,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
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
    const itinerary = await this.itinerariesService.findOne(+id);
    if (!itinerary) {
      throw new HttpException('Itinerary not found', HttpStatus.NOT_FOUND);
    }
    return itinerary;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateItineraryDto: UpdateItineraryDto) {
    try {
      return await this.itinerariesService.update(+id, updateItineraryDto);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new HttpException('Itinerary not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      await this.itinerariesService.remove(+id);
      return { success: true, message: 'Itinerary deleted successfully' };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new HttpException('Itinerary not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
