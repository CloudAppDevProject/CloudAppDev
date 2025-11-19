import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { LikesService } from './likes.service';
import { ToggleLikeDto } from '../dto/toggle-like.dto';

@Controller('likes')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post('toggle')
  async toggleLike(@Body() toggleLikeDto: ToggleLikeDto) {
    return this.likesService.toggleLike(toggleLikeDto);
  }

  @Get('itinerary/:itineraryId')
  async getLikesForItinerary(@Param('itineraryId') itineraryId: string) {
    return this.likesService.getLikesForItinerary(itineraryId);
  }

  @Get('itinerary/:itineraryId/count')
  async getLikeCount(@Param('itineraryId') itineraryId: string) {
    const count = await this.likesService.getLikeCount(itineraryId);
    return { itineraryId, count };
  }

  @Get('check')
  async checkLike(
    @Query('userId') userId: string,
    @Query('itineraryId') itineraryId: string,
  ) {
    const liked = await this.likesService.hasUserLiked(userId, itineraryId);
    return { userId, itineraryId, liked };
  }

  @Get('user/:userId')
  async getLikedItinerariesByUser(@Param('userId') userId: string) {
    const itineraryIds = await this.likesService.getLikedItinerariesByUser(userId);
    return { userId, itineraryIds };
  }

  @Delete('itinerary/:itineraryId')
  async deleteAllLikesForItinerary(@Param('itineraryId') itineraryId: string) {
    await this.likesService.deleteAllLikesForItinerary(itineraryId);
    return { message: 'All likes deleted for itinerary' };
  }

  @Delete('user/:userId')
  async deleteAllLikesByUser(@Param('userId') userId: string) {
    await this.likesService.deleteAllLikesByUser(userId);
    return { message: 'All likes deleted for user' };
  }
}
