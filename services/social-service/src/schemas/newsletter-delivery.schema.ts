import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NewsletterDeliveryDocument = NewsletterDelivery & Document;

export enum DeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
}

@Schema({ timestamps: true })
export class NewsletterDelivery {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  sendRun: Types.ObjectId;

  @Prop({ required: true, type: Number, index: true })
  userId: number;

  @Prop({ required: true })
  email: string;

  @Prop({
    type: String,
    enum: DeliveryStatus,
    default: DeliveryStatus.PENDING,
    index: true,
  })
  status: DeliveryStatus;

  @Prop({ type: String, default: null })
  error: string;

  @Prop({ default: 0 })
  retryCount: number;

  @Prop({ type: Date, default: null })
  sentAt: Date;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const NewsletterDeliverySchema =
  SchemaFactory.createForClass(NewsletterDelivery);

// Composite index for efficient querying by sendRun and status
NewsletterDeliverySchema.index({ sendRun: 1, status: 1 });

// Index for finding failed sends that need retry
NewsletterDeliverySchema.index({
  status: 1,
  retryCount: 1,
  updatedAt: -1,
});

// Index for user delivery history
NewsletterDeliverySchema.index({ userId: 1, createdAt: -1 });
