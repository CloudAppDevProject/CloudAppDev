import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LikeDocument = Like & Document;

@Schema({ timestamps: true })
export class Like {
  @Prop({ required: true, type: Number })
  userId: number;

  @Prop({ required: true, type: Number })
  itineraryId: number;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const LikeSchema = SchemaFactory.createForClass(Like);

// Create compound index to ensure one like per user per itinerary
LikeSchema.index({ userId: 1, itineraryId: 1 }, { unique: true });
