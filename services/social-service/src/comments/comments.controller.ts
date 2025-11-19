import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from '../dto/create-comment.dto';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  async createComment(@Body() createCommentDto: CreateCommentDto) {
    return this.commentsService.create(createCommentDto);
  }

  @Get('itinerary/:itineraryId')
  async getCommentsForItinerary(@Param('itineraryId') itineraryId: string) {
    return this.commentsService.getCommentsForItinerary(itineraryId);
  }

  @Get('itinerary/:itineraryId/count')
  async getCommentCount(@Param('itineraryId') itineraryId: string) {
    const count = await this.commentsService.getCommentCount(itineraryId);
    return { itineraryId, count };
  }

  @Get('user/:userId')
  async getCommentsByUser(@Param('userId') userId: string) {
    return this.commentsService.getCommentsByUser(userId);
  }

  @Patch(':commentId')
  async updateComment(
    @Param('commentId') commentId: string,
    @Body('text') text: string,
  ) {
    return this.commentsService.update(commentId, text);
  }

  @Delete(':commentId')
  async deleteComment(@Param('commentId') commentId: string) {
    return this.commentsService.delete(commentId);
  }

  @Delete('itinerary/:itineraryId')
  async deleteAllCommentsForItinerary(@Param('itineraryId') itineraryId: string) {
    await this.commentsService.deleteAllCommentsForItinerary(itineraryId);
    return { message: 'All comments deleted for itinerary' };
  }

  @Delete('user/:userId')
  async deleteAllCommentsByUser(@Param('userId') userId: string) {
    await this.commentsService.deleteAllCommentsByUser(userId);
    return { message: 'All comments deleted for user' };
  }
}
