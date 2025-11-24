import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TrendingItineraryDocument = TrendingItinerary & Document;

/**
 * Location details within an itinerary
 */
export class LocationDetail {
  @Prop({ required: true, type: Number })
  id: number;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop()
  latitude?: number;

  @Prop()
  longitude?: number;
}

/**
 * Image metadata for itinerary
 */
export class ImageMetadata {
  @Prop({ required: true })
  url: string;

  @Prop()
  description?: string;

  @Prop()
  uploadedAt?: Date;
}

/**
 * Comment preview for newsletter display
 */
export class CommentPreview {
  @Prop({ required: true, type: Number })
  userId: number;

  @Prop()
  userName?: string;

  @Prop({ required: true })
  text: string;

  @Prop({ required: true, default: Date.now })
  createdAt: Date;
}

/**
 * Trending Itinerary with enriched details
 * Used to cache itinerary details for newsletter content
 */
@Schema({ timestamps: true })
export class TrendingItinerary {
  @Prop({ required: true, type: Number, unique: true, index: true })
  itineraryId: number;

  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ required: true, type: Number })
  userId: number;

  @Prop()
  userName?: string;

  @Prop({ required: true, type: Number, default: 0 })
  likeCount: number;

  @Prop({ required: true, type: Number, default: 0 })
  commentCount: number;

  @Prop({ required: true, type: Number })
  score: number;

  @Prop({ type: [LocationDetail], default: [] })
  locations: LocationDetail[];

  @Prop({ type: [ImageMetadata], default: [] })
  images: ImageMetadata[];

  @Prop({ type: [String], default: [] })
  keywords: string[];

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: [CommentPreview], default: [] })
  recentComments: CommentPreview[];

  @Prop({ required: true, default: Date.now })
  trendingComputedAt: Date;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const TrendingItinerarySchema =
  SchemaFactory.createForClass(TrendingItinerary);

// Index for efficient trending queries
TrendingItinerarySchema.index({ score: -1, trendingComputedAt: -1 });

// Index for keyword-based searches (for recommendations)
TrendingItinerarySchema.index({ keywords: 1 });
TrendingItinerarySchema.index({ tags: 1 });

// Index for user-based queries
TrendingItinerarySchema.index({ userId: 1 });
