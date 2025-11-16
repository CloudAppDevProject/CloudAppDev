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
} from '@nestjs/common';
import { ItinerariesService } from './itineraries.service';
import { CreateItineraryDto } from './dto/create-itinerary.dto';
import { UpdateItineraryDto } from './dto/update-itinerary.dto';

@Controller('itineraries')
export class ItinerariesController {
  constructor(private readonly itinerariesService: ItinerariesService) {}

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
