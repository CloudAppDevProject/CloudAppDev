import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Logger,
} from '@nestjs/common';
import { LikesService } from './likes.service';
import { ToggleLikeDto } from '../dto/toggle-like.dto';
import { BatchLikesDto } from '../dto/batch-likes.dto';

@Controller('likes')
export class LikesController {
  private readonly logger = new Logger(LikesController.name);

  constructor(private readonly likesService: LikesService) {}

  @Post('toggle')
  async toggleLike(@Body() toggleLikeDto: ToggleLikeDto) {
    this.logger.log(`POST /likes/toggle - itinerary ${toggleLikeDto.itineraryId}, user ${toggleLikeDto.userId}`);
    return this.likesService.toggleLike(toggleLikeDto);
  }

  /**
   * Batch endpoint: Get like counts and user status for multiple itineraries in one call
   * Body: { itineraryIds: string[], userId?: string }
   * Response: { counts: { [itineraryId]: count }, userLiked?: { [itineraryId]: boolean } }
   */
  @Post('batch')
  async getBatchLikesData(@Body() batchLikesDto: BatchLikesDto) {
    this.logger.log(`POST /likes/batch - ${batchLikesDto.itineraryIds.length} itineraries`);
    return this.likesService.getBatchLikesData(batchLikesDto);
  }

  @Get('itinerary/:itineraryId')
  async getLikesForItinerary(@Param('itineraryId') itineraryId: string) {
    this.logger.log(`GET /likes/itinerary/${itineraryId}`);
    return this.likesService.getLikesForItinerary(itineraryId);
  }

  @Get('itinerary/:itineraryId/count')
  async getLikeCount(@Param('itineraryId') itineraryId: string) {
    this.logger.log(`GET /likes/itinerary/${itineraryId}/count`);
    const count = await this.likesService.getLikeCount(itineraryId);
    return { itineraryId, count };
  }

  @Get('check')
  async checkLike(
    @Query('userId') userId: string,
    @Query('itineraryId') itineraryId: string,
  ) {
    this.logger.log(`GET /likes/check - user ${userId}, itinerary ${itineraryId}`);
    const liked = await this.likesService.hasUserLiked(userId, itineraryId);
    return { userId, itineraryId, liked };
  }

  @Get('user/:userId')
  async getLikedItinerariesByUser(@Param('userId') userId: string) {
    this.logger.log(`GET /likes/user/${userId}`);
    const itineraryIds =
      await this.likesService.getLikedItinerariesByUser(userId);
    return { userId, itineraryIds };
  }

  @Delete('itinerary/:itineraryId')
  async deleteAllLikesForItinerary(@Param('itineraryId') itineraryId: string) {
    this.logger.log(`DELETE /likes/itinerary/${itineraryId}`);
    await this.likesService.deleteAllLikesForItinerary(itineraryId);
    return { message: 'All likes deleted for itinerary' };
  }

  @Delete('user/:userId')
  async deleteAllLikesByUser(@Param('userId') userId: string) {
    this.logger.log(`DELETE /likes/user/${userId}`);
    await this.likesService.deleteAllLikesByUser(userId);
    return { message: 'All likes deleted for user' };
  }
}
