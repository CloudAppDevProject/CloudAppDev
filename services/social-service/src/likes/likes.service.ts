import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Like, LikeDocument } from '../schemas/like.schema';
import { ToggleLikeDto } from '../dto/toggle-like.dto';
import { BatchLikesDto, BatchLikesResponse } from '../dto/batch-likes.dto';

@Injectable()
export class LikesService {
  private readonly logger = new Logger(LikesService.name);

  constructor(@InjectModel(Like.name) private likeModel: Model<LikeDocument>) {}

  /**
   * Toggle like for an itinerary
   * If like exists, remove it (unlike)
   * If like doesn't exist, create it (like)
   */
  async toggleLike(toggleLikeDto: ToggleLikeDto) {
    this.logger.log(`Toggling like for itinerary ${toggleLikeDto.itineraryId} by user ${toggleLikeDto.userId}`);
    try {
      const userId = Number(toggleLikeDto.userId);
      const itineraryId = Number(toggleLikeDto.itineraryId);

      const existingLike = await this.likeModel.findOne({
        userId,
        itineraryId,
      });

      if (existingLike) {
        // Unlike
        await this.likeModel.deleteOne({ _id: existingLike._id });
        const likeCount = await this.getLikeCount(itineraryId);
        this.logger.debug(`Like removed for itinerary ${itineraryId}, new count: ${likeCount}`);
        return {
          liked: false,
          message: 'Like removed',
          likeCount,
        };
      } else {
        // Like
        await this.likeModel.create({ userId, itineraryId });
        const likeCount = await this.getLikeCount(itineraryId);
        this.logger.debug(`Like added for itinerary ${itineraryId}, new count: ${likeCount}`);
        return {
          liked: true,
          message: 'Like added',
          likeCount,
        };
      }
    } catch (error) {
      this.logger.error(`Error toggling like: ${(error as any).message}`, (error as any).stack);
      throw error;
    }
  }

  /**
   * Get like count for an itinerary
   */
  async getLikeCount(itineraryId: string | number): Promise<number> {
    this.logger.log(`Getting like count for itinerary ${itineraryId}`);
    try {
      const count = await this.likeModel.countDocuments({ itineraryId: Number(itineraryId) });
      this.logger.debug(`Found ${count} likes for itinerary ${itineraryId}`);
      return count;
    } catch (error) {
      this.logger.error(`Error getting like count for itinerary ${itineraryId}: ${(error as any).message}`, (error as any).stack);
      throw error;
    }
  }

  /**
   * Check if user has liked an itinerary
   */
  async hasUserLiked(
    userId: string | number,
    itineraryId: string | number,
  ): Promise<boolean> {
    this.logger.log(`Checking if user ${userId} has liked itinerary ${itineraryId}`);
    try {
      const like = await this.likeModel.findOne({
        userId: Number(userId),
        itineraryId: Number(itineraryId),
      });
      const hasLiked = !!like;
      this.logger.debug(`User ${userId} has ${hasLiked ? '' : 'not '}liked itinerary ${itineraryId}`);
      return hasLiked;
    } catch (error) {
      this.logger.error(`Error checking user like status: ${(error as any).message}`, (error as any).stack);
      throw error;
    }
  }

  /**
   * Get all likes for an itinerary with user info
   */
  async getLikesForItinerary(itineraryId: string | number) {
    this.logger.log(`Getting all likes for itinerary ${itineraryId}`);
    try {
      const likes = await this.likeModel
        .find({ itineraryId: Number(itineraryId) })
        .sort({ createdAt: -1 });
      this.logger.debug(`Found ${likes.length} likes for itinerary ${itineraryId}`);
      return {
        total: likes.length,
        likes: likes.map((like) => ({
          userId: like.userId,
          createdAt: like.createdAt,
        })),
      };
    } catch (error) {
      this.logger.error(`Error getting likes for itinerary ${itineraryId}: ${(error as any).message}`, (error as any).stack);
      throw error;
    }
  }

  /**
   * Get all itineraries liked by a user
   */
  async getLikedItinerariesByUser(userId: string | number) {
    this.logger.log(`Getting itineraries liked by user ${userId}`);
    try {
      const likes = await this.likeModel
        .find({ userId: Number(userId) })
        .sort({ createdAt: -1 });
      const itineraryIds = likes.map((like) => like.itineraryId);
      this.logger.debug(`User ${userId} has liked ${itineraryIds.length} itineraries`);
      return itineraryIds;
    } catch (error) {
      this.logger.error(`Error getting liked itineraries for user ${userId}: ${(error as any).message}`, (error as any).stack);
      throw error;
    }
  }

  /**
   * Delete all likes for an itinerary (for cleanup)
   */
  async deleteAllLikesForItinerary(itineraryId: string | number) {
    this.logger.log(`Deleting all likes for itinerary ${itineraryId}`);
    try {
      const result = await this.likeModel.deleteMany({ itineraryId: Number(itineraryId) });
      this.logger.debug(`Deleted ${result.deletedCount} likes for itinerary ${itineraryId}`);
    } catch (error) {
      this.logger.error(`Error deleting likes for itinerary ${itineraryId}: ${(error as any).message}`, (error as any).stack);
      throw error;
    }
  }

  /**
   * Delete all likes by a user (for cleanup)
   */
  async deleteAllLikesByUser(userId: string | number) {
    this.logger.log(`Deleting all likes by user ${userId}`);
    try {
      const result = await this.likeModel.deleteMany({ userId: Number(userId) });
      this.logger.debug(`Deleted ${result.deletedCount} likes by user ${userId}`);
    } catch (error) {
      this.logger.error(`Error deleting likes by user ${userId}: ${(error as any).message}`, (error as any).stack);
      throw error;
    }
  }

  /**
   * Batch operation: Get like counts and optionally user's like status for multiple itineraries
   * This reduces N+1 API calls to a single batch call
   */
  async getBatchLikesData(
    batchDto: BatchLikesDto,
  ): Promise<BatchLikesResponse> {
    this.logger.log(`Getting batch likes data for ${batchDto.itineraryIds.length} itineraries`);
    try {
      const itineraryIds = batchDto.itineraryIds.map((id) => Number(id));

      // Get counts for all itineraries in one aggregation query
      const countResults = await this.likeModel.aggregate([
        { $match: { itineraryId: { $in: itineraryIds } } },
        { $group: { _id: '$itineraryId', count: { $sum: 1 } } },
      ]);

      // Build counts map, including 0 for itineraries with no likes
      const counts: Record<string, number> = {};
      itineraryIds.forEach((id) => {
        counts[String(id)] = 0;
      });
      countResults.forEach((result) => {
        counts[String(result._id)] = result.count;
      });

      const response: BatchLikesResponse = { counts };

      // If userId is provided, also check which itineraries the user has liked
      if (batchDto.userId) {
        const userId = Number(batchDto.userId);
        const userLikes = await this.likeModel
          .find({
            userId,
            itineraryId: { $in: itineraryIds },
          })
          .select('itineraryId');

        const userLikedSet = new Set(userLikes.map((like) => like.itineraryId));

        const userLiked: Record<string, boolean> = {};
        itineraryIds.forEach((id) => {
          userLiked[String(id)] = userLikedSet.has(id);
        });

        response.userLiked = userLiked;
        this.logger.debug(`Batch processed: ${itineraryIds.length} counts, user ${batchDto.userId} likes included`);
      } else {
        this.logger.debug(`Batch processed: ${itineraryIds.length} counts`);
      }

      return response;
    } catch (error) {
      this.logger.error(`Error getting batch likes data: ${(error as any).message}`, (error as any).stack);
      throw error;
    }
  }

  /**
   * Batch operation: Get like counts for multiple itineraries
   */
  async getBatchLikeCounts(
    itineraryIds: (string | number)[],
  ): Promise<Record<string, number>> {
    this.logger.log(`Getting batch like counts for ${itineraryIds.length} itineraries`);
    const result = await this.getBatchLikesData({ itineraryIds });
    return result.counts;
  }

  /**
   * Batch operation: Check if user has liked multiple itineraries
   */
  async getBatchUserLikeStatus(
    userId: string | number,
    itineraryIds: (string | number)[],
  ): Promise<Record<string, boolean>> {
    this.logger.log(`Getting batch user like status for user ${userId}, ${itineraryIds.length} itineraries`);
    const result = await this.getBatchLikesData({ itineraryIds, userId });
    return result.userLiked || {};
  }
}
