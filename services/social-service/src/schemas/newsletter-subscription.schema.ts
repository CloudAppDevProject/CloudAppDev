import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NewsletterSubscriptionDocument = NewsletterSubscription & Document;

export enum NewsletterFrequency {
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
}

@Schema({ timestamps: true })
export class NewsletterSubscription {
  @Prop({ required: true, type: Number, unique: true, index: true })
  userId: number;

  @Prop({ default: true })
  isSubscribed: boolean;

  @Prop({
    type: String,
    enum: NewsletterFrequency,
    default: NewsletterFrequency.WEEKLY,
  })
  frequency: NewsletterFrequency;

  /**
   * Preference flags for newsletter content
   */
  @Prop({ default: true })
  includeTrending: boolean;

  @Prop({ default: true })
  includeRecommendations: boolean;

  @Prop({ default: true })
  includeActivitySummary: boolean;

  /**
   * Number of recommendations to include
   */
  @Prop({ required: true, default: 5 })
  recommendationCount: number;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const NewsletterSubscriptionSchema = SchemaFactory.createForClass(
  NewsletterSubscription,
);

// Indexes for efficient querying
NewsletterSubscriptionSchema.index({ isSubscribed: 1, frequency: 1 });
