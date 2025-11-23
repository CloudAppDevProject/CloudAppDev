import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NewsletterService } from './newsletter.service';
import { NewsletterController } from './newsletter.controller';
import {
  NewsletterSubscription,
  NewsletterSubscriptionSchema,
} from '../schemas/newsletter-subscription.schema';
import {
  NewsletterDelivery,
  NewsletterDeliverySchema,
} from '../schemas/newsletter-delivery.schema';
import { LikeSchema } from '../schemas/like.schema';
import { CommentSchema } from '../schemas/comment.schema';
import { EmailService } from '../common/email.service';

/**
 * Newsletter Module
 * Handles user subscriptions, newsletter generation, and delivery
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: NewsletterSubscription.name,
        schema: NewsletterSubscriptionSchema,
      },
      {
        name: NewsletterDelivery.name,
        schema: NewsletterDeliverySchema,
      },
      {
        name: 'Like',
        schema: LikeSchema,
      },
      {
        name: 'Comment',
        schema: CommentSchema,
      },
    ]),
  ],
  providers: [NewsletterService, EmailService],
  controllers: [NewsletterController],
  exports: [NewsletterService],
})
export class NewsletterModule {}
