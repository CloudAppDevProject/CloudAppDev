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
import {
  TrendingItinerary,
  TrendingItinerarySchema,
} from '../schemas/trending-itinerary.schema';
import {
  UserInterests,
  UserInterestsSchema,
} from '../schemas/user-interests.schema';
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
        name: TrendingItinerary.name,
        schema: TrendingItinerarySchema,
      },
      {
        name: UserInterests.name,
        schema: UserInterestsSchema,
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
