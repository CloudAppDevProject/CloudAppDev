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

  @Prop({ required: true })
  email: string;

  @Prop({ default: true })
  isSubscribed: boolean;

  @Prop({
    type: String,
    enum: NewsletterFrequency,
    default: NewsletterFrequency.WEEKLY,
  })
  frequency: NewsletterFrequency;

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
NewsletterSubscriptionSchema.index({ email: 1 }); // For email lookups
