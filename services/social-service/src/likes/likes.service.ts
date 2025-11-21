import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Like, LikeDocument } from '../schemas/like.schema';
import { ToggleLikeDto } from '../dto/toggle-like.dto';

@Injectable()
export class LikesService {
  constructor(
    @InjectModel(Like.name) private likeModel: Model<LikeDocument>,
  ) {}

  /**
   * Toggle like for an itinerary
   * If like exists, remove it (unlike)
   * If like doesn't exist, create it (like)
   */
  async toggleLike(toggleLikeDto: ToggleLikeDto) {
    const userId = Number(toggleLikeDto.userId);
    const itineraryId = Number(toggleLikeDto.itineraryId);

    const existingLike = await this.likeModel.findOne({
      userId,
      itineraryId,
    });

    if (existingLike) {
      // Unlike
      await this.likeModel.deleteOne({ _id: existingLike._id });
      return {
        liked: false,
        message: 'Like removed',
        likeCount: await this.getLikeCount(itineraryId),
      };
    } else {
      // Like
      await this.likeModel.create({ userId, itineraryId });
      return {
        liked: true,
        message: 'Like added',
        likeCount: await this.getLikeCount(itineraryId),
      };
    }
  }

  /**
   * Get like count for an itinerary
   */
  async getLikeCount(itineraryId: string | number): Promise<number> {
    return this.likeModel.countDocuments({ itineraryId: Number(itineraryId) });
  }

  /**
   * Check if user has liked an itinerary
   */
  async hasUserLiked(userId: string | number, itineraryId: string | number): Promise<boolean> {
    const like = await this.likeModel.findOne({ userId: Number(userId), itineraryId: Number(itineraryId) });
    return !!like;
  }

  /**
   * Get all likes for an itinerary with user info
   */
  async getLikesForItinerary(itineraryId: string | number) {
    const likes = await this.likeModel.find({ itineraryId: Number(itineraryId) }).sort({ createdAt: -1 });
    return {
      total: likes.length,
      likes: likes.map(like => ({
        userId: like.userId,
        createdAt: like.createdAt,
      })),
    };
  }

  /**
   * Get all itineraries liked by a user
   */
  async getLikedItinerariesByUser(userId: string | number) {
    const likes = await this.likeModel.find({ userId: Number(userId) }).sort({ createdAt: -1 });
    return likes.map(like => like.itineraryId);
  }

  /**
   * Delete all likes for an itinerary (for cleanup)
   */
  async deleteAllLikesForItinerary(itineraryId: string | number) {
    await this.likeModel.deleteMany({ itineraryId: Number(itineraryId) });
  }

  /**
   * Delete all likes by a user (for cleanup)
   */
  async deleteAllLikesByUser(userId: string | number) {
    await this.likeModel.deleteMany({ userId: Number(userId) });
  }


}
