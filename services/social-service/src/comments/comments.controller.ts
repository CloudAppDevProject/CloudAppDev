import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Logger,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from '../dto/create-comment.dto';

@Controller('comments')
export class CommentsController {
  private readonly logger = new Logger(CommentsController.name);

  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  async createComment(@Body() createCommentDto: CreateCommentDto) {
    this.logger.log(`POST /comments - Creating comment for itinerary ${createCommentDto.itineraryId}`);
    return this.commentsService.create(createCommentDto);
  }

  @Get('itinerary/:itineraryId')
  async getCommentsForItinerary(@Param('itineraryId') itineraryId: string) {
    this.logger.log(`GET /comments/itinerary/${itineraryId}`);
    return this.commentsService.getCommentsForItinerary(itineraryId);
  }

  @Get('itinerary/:itineraryId/count')
  async getCommentCount(@Param('itineraryId') itineraryId: string) {
    this.logger.log(`GET /comments/itinerary/${itineraryId}/count`);
    const count = await this.commentsService.getCommentCount(itineraryId);
    return { itineraryId, count };
  }

  @Get('user/:userId')
  async getCommentsByUser(@Param('userId') userId: string) {
    this.logger.log(`GET /comments/user/${userId}`);
    return this.commentsService.getCommentsByUser(userId);
  }

  @Patch(':commentId')
  async updateComment(
    @Param('commentId') commentId: string,
    @Body('text') text: string,
  ) {
    this.logger.log(`PATCH /comments/${commentId}`);
    return this.commentsService.update(commentId, text);
  }

  @Delete(':commentId')
  async deleteComment(@Param('commentId') commentId: string) {
    this.logger.log(`DELETE /comments/${commentId}`);
    return this.commentsService.delete(commentId);
  }

  @Delete('itinerary/:itineraryId')
  async deleteAllCommentsForItinerary(
    @Param('itineraryId') itineraryId: string,
  ) {
    this.logger.log(`DELETE /comments/itinerary/${itineraryId}`);
    await this.commentsService.deleteAllCommentsForItinerary(itineraryId);
    return { message: 'All comments deleted for itinerary' };
  }

  @Delete('user/:userId')
  async deleteAllCommentsByUser(@Param('userId') userId: string) {
    this.logger.log(`DELETE /comments/user/${userId}`);
    await this.commentsService.deleteAllCommentsByUser(userId);
    return { message: 'All comments deleted for user' };
  }
}
