import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment, CommentDocument } from '../schemas/comment.schema';
import { CreateCommentDto } from '../dto/create-comment.dto';

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
  ) {}

  /**
   * Create a new comment
   */
  async create(createCommentDto: CreateCommentDto) {
    this.logger.log(`Creating comment for itinerary ${createCommentDto.itineraryId} by user ${createCommentDto.userId}`);
    try {
      const comment = await this.commentModel.create({
        userId: Number(createCommentDto.userId),
        itineraryId: Number(createCommentDto.itineraryId),
        text: createCommentDto.text,
      });
      this.logger.debug(`Comment created with ID: ${comment._id}`);
      return comment;
    } catch (error) {
      this.logger.error(`Error creating comment: ${(error as any).message}`, (error as any).stack);
      throw error;
    }
  }

  /**
   * Get all comments for an itinerary
   */
  async getCommentsForItinerary(itineraryId: string | number) {
    this.logger.log(`Getting comments for itinerary ${itineraryId}`);
    try {
      const comments = await this.commentModel
        .find({ itineraryId: Number(itineraryId) })
        .sort({ createdAt: -1 });

      this.logger.debug(`Found ${comments.length} comments for itinerary ${itineraryId}`);
      return {
        total: comments.length,
        comments: comments.map((comment) => ({
          id: comment._id,
          userId: comment.userId,
          text: comment.text,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
        })),
      };
    } catch (error) {
      this.logger.error(`Error getting comments for itinerary ${itineraryId}: ${(error as any).message}`, (error as any).stack);
      throw error;
    }
  }

  /**
   * Get all comments by a user
   */
  async getCommentsByUser(userId: string | number) {
    this.logger.log(`Getting comments by user ${userId}`);
    try {
      const comments = await this.commentModel
        .find({ userId: Number(userId) })
        .sort({ createdAt: -1 });

      this.logger.debug(`Found ${comments.length} comments by user ${userId}`);
      return comments.map((comment) => ({
        id: comment._id,
        itineraryId: comment.itineraryId,
        text: comment.text,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
      }));
    } catch (error) {
      this.logger.error(`Error getting comments by user ${userId}: ${(error as any).message}`, (error as any).stack);
      throw error;
    }
  }

  /**
   * Update a comment
   */
  async update(commentId: string, text: string) {
    this.logger.log(`Updating comment ${commentId}`);
    try {
      const comment = await this.commentModel.findById(commentId);

      if (!comment) {
        this.logger.warn(`Comment with ID ${commentId} not found`);
        throw new NotFoundException(`Comment with ID ${commentId} not found`);
      }

      comment.text = text;
      comment.updatedAt = new Date();
      await comment.save();

      this.logger.debug(`Comment ${commentId} updated successfully`);
      return comment;
    } catch (error) {
      this.logger.error(`Error updating comment ${commentId}: ${(error as any).message}`, (error as any).stack);
      throw error;
    }
  }

  /**
   * Delete a comment
   */
  async delete(commentId: string) {
    this.logger.log(`Deleting comment ${commentId}`);
    try {
      const result = await this.commentModel.deleteOne({ _id: commentId });

      if (result.deletedCount === 0) {
        this.logger.warn(`Comment with ID ${commentId} not found for deletion`);
        throw new NotFoundException(`Comment with ID ${commentId} not found`);
      }

      this.logger.debug(`Comment ${commentId} deleted successfully`);
      return { message: 'Comment deleted successfully' };
    } catch (error) {
      this.logger.error(`Error deleting comment ${commentId}: ${(error as any).message}`, (error as any).stack);
      throw error;
    }
  }

  /**
   * Delete all comments for an itinerary (for cleanup)
   */
  async deleteAllCommentsForItinerary(itineraryId: string | number) {
    this.logger.log(`Deleting all comments for itinerary ${itineraryId}`);
    try {
      const result = await this.commentModel.deleteMany({ itineraryId: Number(itineraryId) });
      this.logger.debug(`Deleted ${result.deletedCount} comments for itinerary ${itineraryId}`);
    } catch (error) {
      this.logger.error(`Error deleting comments for itinerary ${itineraryId}: ${(error as any).message}`, (error as any).stack);
      throw error;
    }
  }

  /**
   * Delete all comments by a user (for cleanup)
   */
  async deleteAllCommentsByUser(userId: string | number) {
    this.logger.log(`Deleting all comments by user ${userId}`);
    try {
      const result = await this.commentModel.deleteMany({ userId: Number(userId) });
      this.logger.debug(`Deleted ${result.deletedCount} comments by user ${userId}`);
    } catch (error) {
      this.logger.error(`Error deleting comments by user ${userId}: ${(error as any).message}`, (error as any).stack);
      throw error;
    }
  }

  /**
   * Get comment count for an itinerary
   */
  async getCommentCount(itineraryId: string | number): Promise<number> {
    this.logger.log(`Getting comment count for itinerary ${itineraryId}`);
    try {
      const count = await this.commentModel.countDocuments({
        itineraryId: Number(itineraryId),
      });
      this.logger.debug(`Found ${count} comments for itinerary ${itineraryId}`);
      return count;
    } catch (error) {
      this.logger.error(`Error getting comment count for itinerary ${itineraryId}: ${(error as any).message}`, (error as any).stack);
      throw error;
    }
  }
}
