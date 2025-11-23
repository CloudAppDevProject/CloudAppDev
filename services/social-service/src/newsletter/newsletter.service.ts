import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import {
  NewsletterSubscription,
  NewsletterSubscriptionDocument,
  NewsletterFrequency,
} from '../schemas/newsletter-subscription.schema';
import {
  NewsletterDelivery,
  NewsletterDeliveryDocument,
  DeliveryStatus,
} from '../schemas/newsletter-delivery.schema';
import { LikeDocument } from '../schemas/like.schema';
import { CommentDocument } from '../schemas/comment.schema';
import { SendNewsletterResultDto } from './dto';
import { EmailService } from '../common/email.service';


/**
 * Handlebars template delegate type
 */
type HandlebarsTemplateDelegate = (context: any, options?: any) => string;

/**
 * Newsletter Service
 * Handles user subscriptions, newsletter generation, and delivery with retry logic
 */
@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);
  private trendingCache: { data: any; timestamp: number } | null = null;
  private readonly CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    private readonly emailService: EmailService,
    @InjectModel(NewsletterSubscription.name)
    private subscriptionModel: Model<NewsletterSubscriptionDocument>,
    @InjectModel(NewsletterDelivery.name)
    private deliveryModel: Model<NewsletterDeliveryDocument>,
    @InjectModel('Like')
    private likesModel: Model<LikeDocument>,
    @InjectModel('Comment')
    private commentsModel: Model<CommentDocument>,
  ) {
    this.logger.log(`Newsletter service initialized with mode: sendgrid`);
  }


  /**
   * Subscribe a user to the newsletter
   */
  async subscribeUser(
    userId: number,
    email: string,
    frequency: string = NewsletterFrequency.WEEKLY,
  ): Promise<NewsletterSubscriptionDocument | null> {
    try {
      const subscription = await this.subscriptionModel.findOneAndUpdate(
        { userId },
        {
          userId,
          email,
          isSubscribed: true,
          frequency: frequency as NewsletterFrequency,
        },
        { upsert: true, new: true },
      );

      this.logger.log(
        `User ${userId} subscribed to newsletter with frequency: ${frequency}`,
      );
      return subscription;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to subscribe user ${userId}:`, errorMsg);
      throw error;
    }
  }

  /**
   * Unsubscribe a user from the newsletter
   */
  async unsubscribeUser(
    userId: number,
  ): Promise<NewsletterSubscriptionDocument | null> {
    try {
      const subscription = await this.subscriptionModel.findOneAndUpdate(
        { userId },
        { isSubscribed: false },
        { upsert: true, new: true },
      );

      this.logger.log(`User ${userId} unsubscribed from newsletter`);
      return subscription;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to unsubscribe user ${userId}:`, errorMsg);
      throw error;
    }
  }

  /**
   * Get subscription details for a user
   */
  async getSubscription(
    userId: number,
  ): Promise<NewsletterSubscriptionDocument | null> {
    try {
      const subscription = await this.subscriptionModel.findOne({ userId });
      return subscription;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to get subscription for user ${userId}:`,
        errorMsg,
      );
      throw error;
    }
  }

  /**
   * Update subscription preferences
   */
  async updateSubscription(
    userId: number,
    updates: Partial<NewsletterSubscription>,
  ): Promise<NewsletterSubscriptionDocument | null> {
    try {
      const subscription = await this.subscriptionModel.findOneAndUpdate(
        { userId },
        updates,
        { new: true, upsert: true },
      );

      this.logger.log(`Subscription preferences updated for user ${userId}`);
      return subscription;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to update subscription for user ${userId}:`,
        errorMsg,
      );
      throw error;
    }
  }

  /**
   * Health check for dependent services
   * Validates User Service and Itinerary Service connectivity
   */
  async checkServiceHealth(): Promise<{
    userService: boolean;
    itineraryService: boolean;
  }> {
    const userServiceUrl = process.env.USER_SERVICE_URL || '';
    const itineraryServiceUrl = process.env.ITINERARY_SERVICE_URL || '';

    const checkService = async (
      url: string,
      name: string,
    ): Promise<boolean> => {
      if (!url) {
        this.logger.warn(`${name} URL not configured`);
        return false;
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(`${url}/health`, {
          method: 'GET',
          signal: controller.signal,
        });

        clearTimeout(timeout);
        return response.status === 200;
      } catch (error) {
        this.logger.warn(
          `Health check failed for ${name} (${url}):`,
          error instanceof Error ? error.message : String(error),
        );
        return false;
      }
    };

    return {
      userService: await checkService(userServiceUrl, 'User Service'),
      itineraryService: await checkService(
        itineraryServiceUrl,
        'Itinerary Service',
      ),
    };
  }

  /**
   * Get user activity in the last 7 days
   * Used for personalization in newsletter content
   */
  async getUserActivity(
    userId: number,
  ): Promise<{ likeCount: number; commentCount: number }> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const likeCount = await this.likesModel.countDocuments({
        userId,
        createdAt: { $gte: sevenDaysAgo },
      });

      const commentCount = await this.commentsModel.countDocuments({
        userId,
        createdAt: { $gte: sevenDaysAgo },
      });

      return { likeCount, commentCount };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get activity for user ${userId}:`, errorMsg);
      throw error;
    }
  }

  /**
   * Get trending itineraries from the past 7 days
   * Uses multi-factor scoring: (likes × 0.5) + (comments × 0.3) + (recency × 0.2)
   * Caches results for 24 hours for performance
   */
  async getTrendingItineraries(limit: number = 10): Promise<
    Array<{
      itineraryId: number;
      likeCount: number;
      commentCount: number;
      score: number;
    }>
  > {
    // Check cache first
    if (
      this.trendingCache &&
      Date.now() - this.trendingCache.timestamp < this.CACHE_DURATION_MS
    ) {
      this.logger.log('Returning cached trending itineraries');
      return this.trendingCache.data as Array<{
        itineraryId: number;
        likeCount: number;
        commentCount: number;
        score: number;
      }>;
    }

    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Aggregate likes and comments for scoring
      const trending = await this.likesModel.aggregate([
        {
          $match: {
            createdAt: { $gte: sevenDaysAgo },
          },
        },
        {
          $group: {
            _id: '$itineraryId',
            likeCount: { $sum: 1 },
          },
        },
        {
          $match: { likeCount: { $gte: 3 } }, // Quality filter: at least 3 likes
        },
        {
          $lookup: {
            from: 'comments',
            localField: '_id',
            foreignField: 'itineraryId',
            as: 'comments',
          },
        },
        {
          $addFields: {
            commentCount: { $size: '$comments' },
          },
        },
        {
          $addFields: {
            score: {
              $add: [
                { $multiply: ['$likeCount', 0.5] },
                { $multiply: ['$commentCount', 0.3] },
                0.2, // Recency bonus (simplified)
              ],
            },
          },
        },
        {
          $sort: { score: -1 },
        },
        {
          $limit: limit,
        },
        {
          $project: {
            itineraryId: '$_id',
            likeCount: 1,
            commentCount: 1,
            score: 1,
            _id: 0,
          },
        },
      ]);

      // Cache the result
      this.trendingCache = {
        data: trending,
        timestamp: Date.now(),
      };

      this.logger.log(
        `Computed trending itineraries (${trending.length} items)`,
      );
      return trending as Array<{
        itineraryId: number;
        likeCount: number;
        commentCount: number;
        score: number;
      }>;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to compute trending itineraries:', errorMsg);
      // Return empty array on error to prevent newsletter blocking
      return [] as Array<{
        itineraryId: number;
        likeCount: number;
        commentCount: number;
        score: number;
      }>;
    }
  }

  /**
   * Send email via configured provider (SendGrid or SMTP)
   */
  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      return await this.emailService.sendEmail({
        to,
        subject,
        html,
        replyTo: process.env.SENDGRID_FROM_EMAIL || 'noreply@cloudappdev.com',
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send email to ${to}:`, errorMsg);
      throw error;
    }
  }

  /**
   * Create a new send run for tracking batch operations
   */
  private async createSendRun(): Promise<NewsletterDeliveryDocument> {
    try {
      const doc = await this.deliveryModel.create({
        sendRun: new Types.ObjectId(),
        status: DeliveryStatus.PENDING,
      });
      return doc;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to create send run:', errorMsg);
      throw error;
    }
  }

  /**
   * Generate personalized newsletter content for a user
   * Includes activity summary and trending items
   */
  /**
   * Load and compile Handlebars template
   */
  private loadTemplate(templateName: string): HandlebarsTemplateDelegate | null {
    try {
      const templatePath = path.join(
        __dirname,
        'templates',
        `${templateName}.hbs`,
      );

      if (!fs.existsSync(templatePath)) {
        this.logger.warn(`Template not found: ${templatePath}, using fallback`);
        return null as any;
      }

      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      return Handlebars.compile(templateContent);
    } catch (error) {
      this.logger.error(`Failed to load template ${templateName}:`, error.message);
      return null as any;
    }
  }

  /**
   * Register Handlebars helpers for template rendering
   */
  private registerHandlebarsHelpers(): void {
    // Add helper for adding two numbers
    Handlebars.registerHelper('add', function(a: number, b: number) {
      return a + b;
    });

    // Add helper for equality check
    Handlebars.registerHelper('eq', function(a: any, b: any) {
      return a === b;
    });

    // Add helper for greater than check
    Handlebars.registerHelper('gt', function(a: number, b: number) {
      return a > b;
    });

    // Add helper for less than check
    Handlebars.registerHelper('lt', function(a: number, b: number) {
      return a < b;
    });

    // Add helper for conditional formatting
    Handlebars.registerHelper('ifEqual', function(a: any, b: any, options: any) {
      return a === b ? options.fn(this) : options.inverse(this);
    });
  }

  async generateNewsletterContent(
    user: { userId: number; userName?: string; email?: string; frequency?: string },
    trending: Array<{
      itineraryId: number;
      likeCount: number;
      commentCount: number;
      score: number;
    }>,
  ): Promise<string> {
    try {
      // Register Handlebars helpers
      this.registerHandlebarsHelpers();

      const activity = await this.getUserActivity(user.userId);

      const templateData = {
        userName: user.userName || `User ${user.userId}`,
        weekStart: new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        }),
        weekEnd: new Date().toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        }),
        likeCount: activity.likeCount,
        commentCount: activity.commentCount,
        trendingItineraries: trending.slice(0, 3).map(item => ({
          itineraryId: item.itineraryId,
          likeCount: item.likeCount,
          commentCount: item.commentCount,
          title: `Itinerary #${item.itineraryId}`,
        })),
        followedUserItineraries: [],
        preferencesUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/newsletter/preferences/${user.userId}`,
        unsubscribeUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/newsletter/unsubscribe/${user.userId}`,
        appUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        email: user.email,
        frequency: user.frequency || 'weekly',
        currentYear: new Date().getFullYear(),
      };

      // Try to load and use Handlebars template
      const template = this.loadTemplate('weekly-newsletter');
      let html = '';

      if (template) {
        html = template(templateData);
      } else {
        // Fallback to basic HTML if template not found
        html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .section { margin: 20px 0; }
        .trending { background-color: #f9f9f9; padding: 15px; border-left: 4px solid #007bff; }
        .footer { font-size: 12px; color: #666; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; }
        a { color: #007bff; text-decoration: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Your Weekly Travel Newsletter</h1>
            <p>Week of ${templateData.weekStart} - ${templateData.weekEnd}</p>
        </div>

        <div class="section">
            <h2>Hi ${templateData.userName}!</h2>
            <p>Here's what's been happening in your community this week.</p>
        </div>

        <div class="section">
            <h3>Your Activity</h3>
            <p>You've been busy! Here's your weekly summary:</p>
            <ul>
                <li><strong>${templateData.likeCount}</strong> likes on itineraries</li>
                <li><strong>${templateData.commentCount}</strong> comments made</li>
            </ul>
        </div>

        <div class="section">
            <h3>Trending This Week</h3>
            <p>Check out these popular itineraries getting attention:</p>
            ${templateData.trendingItineraries
              .map(
                (item, idx) =>
                  `<div class="trending">
                <p><strong>#${idx + 1}</strong> - Itinerary #${item.itineraryId}</p>
                <p>Likes: ${item.likeCount} | Comments: ${item.commentCount}</p>
            </div>`,
              )
              .join('')}
        </div>

        <div class="footer">
            <p>
                <a href="${templateData.preferencesUrl}">Manage preferences</a> |
                <a href="${templateData.unsubscribeUrl}">Unsubscribe</a>
            </p>
            <p>&copy; ${templateData.currentYear} CloudAppDev. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
        `;
      }

      return html;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to generate newsletter content:`, errorMsg);
      throw error;
    }
  }

  /**
   * Send newsletter to a single user with idempotency check and tracking
   * Prevents duplicate sends and tracks delivery status
   */
  async sendToUserWithTracking(
    user: NewsletterSubscriptionDocument,
    trending: Array<{
      itineraryId: number;
      likeCount: number;
      commentCount: number;
      score: number;
    }>,
    sendRunId: Types.ObjectId,
  ): Promise<void> {
    try {
      // Idempotency check: skip if already sent in this run
      const existing = await this.deliveryModel.findOne({
        sendRun: sendRunId,
        userId: user.userId,
        status: DeliveryStatus.SENT,
      });

      if (existing) {
        this.logger.log(
          `User ${user.userId} already received newsletter in this run, skipping`,
        );
        return;
      }

      // Generate personalized content
      const content = await this.generateNewsletterContent(user, trending);

      // Send email
      await this.sendEmail(
        user.email,
        `Your Weekly Travel Newsletter - ${new Date().toLocaleDateString()}`,
        content,
      );

      // Track success
      await this.deliveryModel.updateOne(
        { sendRun: sendRunId, userId: user.userId },
        {
          email: user.email,
          status: DeliveryStatus.SENT,
          sentAt: new Date(),
          retryCount: 0,
        },
        { upsert: true },
      );

      this.logger.log(`Newsletter sent successfully to user ${user.userId}`);
    } catch (error) {
      // Track failure
      const delivery = await this.deliveryModel.findOne({
        sendRun: sendRunId,
        userId: user.userId,
      });

      const retryCount = delivery?.retryCount || 0;

      const errorMsg = error instanceof Error ? error.message : String(error);
      await this.deliveryModel.updateOne(
        { sendRun: sendRunId, userId: user.userId },
        {
          email: user.email,
          status: DeliveryStatus.FAILED,
          error: errorMsg,
          retryCount: retryCount + 1,
        },
        { upsert: true },
      );

      this.logger.error(
        `Failed to send newsletter to user ${user.userId}: ${errorMsg}`,
      );
      throw error;
    }
  }

  /**
   * Mark a batch as processed for checkpoint tracking
   * Used to track progress during large bulk operations
   */
  private markBatchProcessed(
    sendRunId: Types.ObjectId,
    batch: Array<{ userId: number }>,
  ): void {
    this.logger.debug(
      `Batch checkpoint: ${batch.length} users processed for send run ${String(sendRunId)}`,
    );
    // Checkpoint is implicit in idempotency - next batch will skip already-sent users
  }

  /**
   * Send weekly newsletter to all subscribed users
   * Implements batch processing with checkpoints and health checks
   */
  async sendWeekly(): Promise<SendNewsletterResultDto> {
    const startedAt = new Date();
    let successCount = 0;
    let failureCount = 0;
    const errors: Array<{ userId: number; email?: string; error: string }> = [];

    try {
      // Health check: ensure dependent services are available
      const health = await this.checkServiceHealth();
      if (!health.userService) {
        this.logger.error('User Service unavailable - aborting newsletter');
        throw new Error('User Service health check failed');
      }

      this.logger.log('Health checks passed, starting weekly newsletter send');

      // Get all subscribed users
      const subscribers = await this.subscriptionModel.find({
        isSubscribed: true,
        frequency: NewsletterFrequency.WEEKLY,
      });

      // Get trending itineraries (cached)
      const trending = await this.getTrendingItineraries();

      this.logger.log(
        `Starting newsletter send to ${subscribers.length} weekly subscribers`,
      );

      // Create tracking document for this send run
      const sendRun = await this.createSendRun();

      // Process in batches (default 50, configurable)
      const batchSize = parseInt(process.env.NEWSLETTER_BATCH_SIZE || '50');
      const batches = this.chunk(subscribers, batchSize);

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        this.logger.log(
          `Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} users)`,
        );

        // Process batch in parallel with Promise.all
        const promises = batch.map((user) =>
          this.sendToUserWithTracking(
            user,
            trending,
            sendRun._id as Types.ObjectId,
          )
            .then(() => {
              successCount++;
            })
            .catch((error) => {
              const errorMsg =
                error instanceof Error ? error.message : String(error);
              this.logger.error(
                `Failed to send to user ${user.userId}: ${errorMsg}`,
              );
              failureCount++;
              errors.push({
                userId: user.userId,
                email: user.email,
                error: errorMsg,
              });
            }),
        );

        await Promise.all(promises);
        this.markBatchProcessed(sendRun._id as Types.ObjectId, batch);
      }

      const completedAt = new Date();
      this.logger.log(
        `Weekly newsletter send completed: ${successCount} sent, ${failureCount} failed out of ${subscribers.length}`,
      );

      return {
        successCount,
        failureCount,
        totalAttempted: subscribers.length,
        startedAt,
        completedAt,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Critical error during newsletter send: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Retry failed newsletter sends with exponential backoff
   * Respects retry limits and delays
   */
  async retryFailedSends(): Promise<number> {
    const retryLimit = parseInt(process.env.NEWSLETTER_RETRY_LIMIT || '3');
    const retryDelayMs = parseInt(
      process.env.NEWSLETTER_RETRY_DELAY_MS || '5000',
    );

    try {
      // Find deliveries that failed and haven't exceeded retry limit
      const failed = await this.deliveryModel.find({
        status: DeliveryStatus.FAILED,
        retryCount: { $lt: retryLimit },
      });

      this.logger.log(`Found ${failed.length} failed sends to retry`);

      let retryCount = 0;
      const trending = await this.getTrendingItineraries();

      for (const delivery of failed) {
        try {
          // Apply backoff delay between retries
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));

          // Get subscription details
          const user = await this.subscriptionModel.findOne({
            userId: delivery.userId,
          });

          if (!user) {
            this.logger.warn(
              `User ${delivery.userId} not found in subscriptions`,
            );
            // Mark as failed permanently
            await delivery.updateOne({
              status: DeliveryStatus.FAILED,
              error: 'User not found in subscriptions',
              retryCount: retryLimit, // Mark as exhausted
            });
            continue;
          }

          // Generate fresh content and send
          const content = await this.generateNewsletterContent(user, trending);
          await this.sendEmail(
            delivery.email || user.email,
            `Your Weekly Travel Newsletter - RETRY`,
            content,
          );

          // Mark as sent on success
          await delivery.updateOne({
            status: DeliveryStatus.SENT,
            sentAt: new Date(),
          });

          retryCount++;
          this.logger.log(`Retry successful for user ${delivery.userId}`);
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          this.logger.warn(
            `Retry failed for user ${delivery.userId}: ${errorMsg}`,
          );

          // Increment retry count and store error
          await delivery.updateOne({
            retryCount: delivery.retryCount + 1,
            error: errorMsg,
          });
        }
      }

      this.logger.log(`Retried ${retryCount} emails successfully`);
      return retryCount;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Critical error during retry operation: ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Utility: Split array into chunks
   */
  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Get total count of subscribed users
   * Used for dashboard statistics
   */
  async getTotalSubscribedCount(): Promise<number> {
    try {
      const count = await this.subscriptionModel.countDocuments({
        isSubscribed: true,
      });
      return count;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to get subscribed user count:', errorMsg);
      return 0;
    }
  }

  /**
   * Get statistics from the last newsletter send
   * Returns timing and success metrics
   */
  async getLastSendStats(): Promise<any> {
    try {
      const lastRun = await this.deliveryModel
        .findOne()
        .sort({ createdAt: -1 })
        .exec();

      if (!lastRun) {
        return {
          lastSendTime: null,
          message: 'No newsletter sends yet',
        };
      }

      const sendRunDocs = await this.deliveryModel.find({
        sendRun: lastRun.sendRun,
      });

      const sent = sendRunDocs.filter((d) => d.status === 'sent').length;
      const failed = sendRunDocs.filter((d) => d.status === 'failed').length;

      return {
        lastSendTime: lastRun.createdAt,
        totalAttempted: sendRunDocs.length,
        successCount: sent,
        failureCount: failed,
        successRate:
          sendRunDocs.length > 0
            ? ((sent / sendRunDocs.length) * 100).toFixed(2) + '%'
            : 'N/A',
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to get last send stats:', errorMsg);
      return { error: errorMsg };
    }
  }

  /**
   * Get count of pending deliveries
   * Used to identify stuck sends
   */
  async getPendingDeliveries(): Promise<number> {
    try {
      const count = await this.deliveryModel.countDocuments({
        status: 'pending',
      });
      return count;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to get pending deliveries count:', errorMsg);
      return 0;
    }
  }

  /**
   * Get count of failed deliveries
   * Used to identify sends that need retry
   */
  async getFailedDeliveries(): Promise<number> {
    try {
      const count = await this.deliveryModel.countDocuments({
        status: 'failed',
      });
      return count;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to get failed deliveries count:', errorMsg);
      return 0;
    }
  }

  /**
   * Get delivery logs for a specific user
   * Returns up to 20 most recent deliveries
   */
  async getDeliveryLogs(userId: number): Promise<any[]> {
    try {
      const logs = await this.deliveryModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(20)
        .exec();

      return logs.map((log) => ({
        id: log._id,
        userId: log.userId,
        email: log.email,
        status: log.status,
        sentAt: log.sentAt,
        error: log.error,
        retryCount: log.retryCount,
        createdAt: log.createdAt,
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to get delivery logs for user ${userId}:`,
        errorMsg,
      );
      return [];
    }
  }

  /**
   * Check if trending data is cached and valid
   * Cache is valid for 24 hours
   */
  isTrendingCached(): boolean {
    if (!this.trendingCache) {
      return false;
    }
    const age = Date.now() - this.trendingCache.timestamp;
    return age < this.CACHE_DURATION_MS;
  }

  /**
   * Get next trending cache refresh time
   * Returns when cache will be automatically refreshed
   */
  getNextTrendingRefresh(): Date {
    if (!this.trendingCache) {
      return new Date(); // Refresh immediately if no cache
    }
    const nextRefresh = new Date(
      this.trendingCache.timestamp + this.CACHE_DURATION_MS,
    );
    return nextRefresh;
  }

  /**
   * Get timestamp when trending was last cached
   * Returns null if not cached
   */
  getTrendingCacheTime(): Date | null {
    return this.trendingCache
      ? new Date(this.trendingCache.timestamp)
      : null;
  }
}
