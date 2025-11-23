import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment, CommentDocument } from '../schemas/comment.schema';
import { CreateCommentDto } from '../dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
  ) {}

  /**
   * Create a new comment
   */
  async create(createCommentDto: CreateCommentDto) {
    const comment = await this.commentModel.create({
      userId: Number(createCommentDto.userId),
      itineraryId: Number(createCommentDto.itineraryId),
      text: createCommentDto.text,
    });
    return comment;
  }

  /**
   * Get all comments for an itinerary
   */
  async getCommentsForItinerary(itineraryId: string | number) {
    const comments = await this.commentModel
      .find({ itineraryId: Number(itineraryId) })
      .sort({ createdAt: -1 });

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
  }

  /**
   * Get all comments by a user
   */
  async getCommentsByUser(userId: string | number) {
    const comments = await this.commentModel
      .find({ userId: Number(userId) })
      .sort({ createdAt: -1 });

    return comments.map((comment) => ({
      id: comment._id,
      itineraryId: comment.itineraryId,
      text: comment.text,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    }));
  }

  /**
   * Update a comment
   */
  async update(commentId: string, text: string) {
    const comment = await this.commentModel.findById(commentId);

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    comment.text = text;
    comment.updatedAt = new Date();
    await comment.save();

    return comment;
  }

  /**
   * Delete a comment
   */
  async delete(commentId: string) {
    const result = await this.commentModel.deleteOne({ _id: commentId });

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    return { message: 'Comment deleted successfully' };
  }

  /**
   * Delete all comments for an itinerary (for cleanup)
   */
  async deleteAllCommentsForItinerary(itineraryId: string | number) {
    await this.commentModel.deleteMany({ itineraryId: Number(itineraryId) });
  }

  /**
   * Delete all comments by a user (for cleanup)
   */
  async deleteAllCommentsByUser(userId: string | number) {
    await this.commentModel.deleteMany({ userId: Number(userId) });
  }

  /**
   * Get comment count for an itinerary
   */
  async getCommentCount(itineraryId: string | number): Promise<number> {
    return this.commentModel.countDocuments({
      itineraryId: Number(itineraryId),
    });
  }
}
