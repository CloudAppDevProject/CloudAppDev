import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { NewsletterService } from './newsletter.service';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
} from './dto';

/**
 * Newsletter Controller
 * Handles HTTP requests for newsletter subscriptions and management
 *
 * User Endpoints:
 * - POST /subscribe - Subscribe user to newsletter
 * - DELETE /subscribe/:userId - Unsubscribe from newsletter
 * - GET /preferences/:userId - Get user's subscription preferences
 * - PATCH /preferences/:userId - Update subscription preferences
 *
 * Admin/Operational Endpoints:
 * - POST /send-manual/:userId - Manually send newsletter to specific user
 * - GET /status - Get newsletter service status and statistics
 * - GET /logs/:userId - Get user's delivery history
 * - GET /trending - Get current trending itineraries (cached)
 * - GET /health - Health check endpoint
 */
@Controller('newsletter')
export class NewsletterController {
  private readonly logger = new Logger(NewsletterController.name);

  constructor(private readonly newsletterService: NewsletterService) {}

  /**
   * Health check endpoint
   * Returns 200 if service is running
   */
  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  // ==================== USER ENDPOINTS ====================

  /**
   * POST /newsletter/subscribe
   * Subscribe a user to the newsletter
   *
   * Request body:
   * {
   *   "userId": 123,
   *   "email": "user@example.com",
   *   "frequency": "weekly"  // optional: weekly, biweekly, monthly
   * }
   *
   * Response: 201 Created
   */
  @Post('subscribe')
  @HttpCode(201)
  async subscribe(@Body() createSubscriptionDto: CreateSubscriptionDto) {
    this.logger.log(
      `Subscribing user ${createSubscriptionDto.userId} to newsletter`,
    );

    try {
      const result = await this.newsletterService.subscribeUser(
        createSubscriptionDto.userId,
        createSubscriptionDto.email,
        createSubscriptionDto.frequency || 'weekly',
      );

      return {
        success: true,
        message: `User ${createSubscriptionDto.userId} subscribed to ${createSubscriptionDto.frequency || 'weekly'} newsletter`,
        data: {
          userId: createSubscriptionDto.userId,
          email: createSubscriptionDto.email,
          frequency: createSubscriptionDto.frequency || 'weekly',
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to subscribe user ${createSubscriptionDto.userId}:`,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * DELETE /newsletter/subscribe/:userId
   * Unsubscribe a user from the newsletter
   *
   * Response: 200 OK
   */
  @Delete('subscribe/:userId')
  @HttpCode(200)
  async unsubscribe(@Param('userId') userId: string) {
    const userId_num = parseInt(userId, 10);

    this.logger.log(`Unsubscribing user ${userId_num} from newsletter`);

    try {
      await this.newsletterService.unsubscribeUser(userId_num);

      return {
        success: true,
        message: `User ${userId_num} unsubscribed from newsletter`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to unsubscribe user ${userId_num}:`,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * GET /newsletter/preferences/:userId
   * Get user's newsletter preferences
   *
   * Response: 200 OK
   */
  @Get('preferences/:userId')
  async getPreferences(@Param('userId') userId: string) {
    const userId_num = parseInt(userId, 10);

    try {
      const subscription = await this.newsletterService.getSubscription(userId_num);

      if (!subscription) {
        return {
          success: true,
          message: `No preferences found for user ${userId_num}`,
          data: {
            userId: userId_num,
            isSubscribed: false,
          },
        };
      }

      return {
        success: true,
        data: {
          userId: subscription.userId,
          email: subscription.email,
          isSubscribed: subscription.isSubscribed,
          frequency: subscription.frequency,
          subscribedAt: subscription.createdAt,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get preferences for user ${userId_num}:`,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * PATCH /newsletter/preferences/:userId
   * Update user's newsletter preferences
   *
   * Request body:
   * {
   *   "frequency": "biweekly",  // optional
   *   "isSubscribed": true       // optional
   * }
   *
   * Response: 200 OK
   */
  @Patch('preferences/:userId')
  async updatePreferences(
    @Param('userId') userId: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ) {
    const userId_num = parseInt(userId, 10);

    this.logger.log(
      `Updating preferences for user ${userId_num}:`,
      updateSubscriptionDto,
    );

    try {
      const updated = await this.newsletterService.updateSubscription(
        userId_num,
        updateSubscriptionDto,
      );

      if (!updated) {
        return {
          success: false,
          message: `Failed to update preferences for user ${userId_num}`,
        };
      }

      return {
        success: true,
        message: `Preferences updated for user ${userId_num}`,
        data: {
          userId: updated.userId,
          email: updated.email,
          isSubscribed: updated.isSubscribed,
          frequency: updated.frequency,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to update preferences for user ${userId_num}:`,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  // ==================== ADMIN/OPERATIONAL ENDPOINTS ====================

  /**
   * POST /newsletter/send-manual/:userId
   * Manually trigger newsletter send to a specific user (admin only)
   *
   * Response: 202 Accepted (async operation)
   */
  @Post('send-manual/:userId')
  @HttpCode(202)
  async sendManualNewsletter(@Param('userId') userId: string) {
    const userId_num = parseInt(userId, 10);

    this.logger.log(`Manual newsletter trigger for user ${userId_num}`);

    try {
      // Verify user is subscribed
      const subscription = await this.newsletterService.getSubscription(userId_num);
      if (!subscription || !subscription.isSubscribed) {
        return {
          success: false,
          message: `User ${userId_num} is not subscribed to newsletter`,
        };
      }

      // Get trending and send
      const trending = await this.newsletterService.getTrendingItineraries();
      const content = await this.newsletterService.generateNewsletterContent(
        { userId: userId_num, email: subscription.email },
        trending,
      );

      await this.newsletterService.sendEmail(
        subscription.email,
        `Your Manual Newsletter - ${new Date().toLocaleDateString()}`,
        content,
      );

      return {
        success: true,
        message: `Newsletter sent to user ${userId_num}`,
        data: {
          userId: userId_num,
          email: subscription.email,
          sentAt: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to send manual newsletter to user ${userId_num}:`,
        error instanceof Error ? error.message : String(error),
      );

      return {
        success: false,
        message: `Failed to send newsletter to user ${userId_num}`,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * GET /newsletter/status
   * Get newsletter service status and statistics
   *
   * Response: 200 OK with detailed status information
   */
  @Get('status')
  async getStatus() {
    this.logger.log('Fetching newsletter service status');

    try {
      const totalSubscribed = await this.newsletterService.getTotalSubscribedCount();
      const lastSendStats = await this.newsletterService.getLastSendStats();
      const pendingCount = await this.newsletterService.getPendingDeliveries();
      const failedCount = await this.newsletterService.getFailedDeliveries();

      return {
        success: true,
        data: {
          service: 'Newsletter',
          status: 'operational',
          timestamp: new Date(),
          statistics: {
            totalSubscribed,
            lastSend: lastSendStats,
            pending: pendingCount,
            failed: failedCount,
          },
          trending: {
            cached: this.newsletterService.isTrendingCached(),
            nextRefresh: this.newsletterService.getNextTrendingRefresh(),
          },
        },
      };
    } catch (error) {
      this.logger.error(
        'Failed to get newsletter status:',
        error instanceof Error ? error.message : String(error),
      );

      return {
        success: false,
        data: {
          service: 'Newsletter',
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * GET /newsletter/logs/:userId
   * Get newsletter delivery history for a specific user
   *
   * Response: 200 OK with delivery logs
   */
  @Get('logs/:userId')
  async getDeliveryLogs(@Param('userId') userId: string) {
    const userId_num = parseInt(userId, 10);

    this.logger.log(`Fetching delivery logs for user ${userId_num}`);

    try {
      const logs = await this.newsletterService.getDeliveryLogs(userId_num);

      return {
        success: true,
        data: {
          userId: userId_num,
          deliveries: logs,
          total: logs.length,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get delivery logs for user ${userId_num}:`,
        error instanceof Error ? error.message : String(error),
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * GET /newsletter/trending
   * Get current trending itineraries (cached, refreshed every 24 hours)
   *
   * Response: 200 OK with trending itineraries and cache metadata
   */
  @Get('trending')
  async getTrendingItineraries() {
    this.logger.log('Fetching trending itineraries');

    try {
      const trending = await this.newsletterService.getTrendingItineraries();

      return {
        success: true,
        data: {
          trending,
          count: trending.length,
          cachedAt: this.newsletterService.getTrendingCacheTime(),
        },
      };
    } catch (error) {
      this.logger.error(
        'Failed to get trending itineraries:',
        error instanceof Error ? error.message : String(error),
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
