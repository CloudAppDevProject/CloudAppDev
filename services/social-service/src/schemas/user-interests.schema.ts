import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserInterestsDocument = UserInterests & Document;

/**
 * Keyword frequency tracking for a user
 */
export class KeywordFrequency {
  @Prop({ required: true })
  keyword: string;

  @Prop({ required: true, default: 1 })
  frequency: number;

  @Prop({ required: true, default: Date.now })
  lastSeen: Date;
}

/**
 * User Interests Schema
 * Tracks keywords and tags from itineraries the user has interacted with (liked)
 * Used for personalized recommendation generation
 */
@Schema({ timestamps: true })
export class UserInterests {
  @Prop({ required: true, type: Number, unique: true, index: true })
  userId: number;

  /**
   * Keywords from itineraries user has liked
   * Extracted from itinerary titles and descriptions
   */
  @Prop({ type: [KeywordFrequency], default: [] })
  likedKeywords: KeywordFrequency[];

  /**
   * Tags from itineraries user has liked
   * Extracted from itinerary tags/categories
   */
  @Prop({ type: [String], default: [] })
  likedTags: string[];

  /**
   * Destination preferences (countries/cities from liked itineraries)
   */
  @Prop({ type: [String], default: [] })
  preferredDestinations: string[];

  /**
   * Count of liked itineraries (for normalization)
   */
  @Prop({ required: true, default: 0 })
  totalLikedItineraries: number;

  /**
   * Last update when interests were computed
   */
  @Prop({ required: true, default: Date.now })
  lastComputedAt: Date;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const UserInterestsSchema = SchemaFactory.createForClass(UserInterests);

// Index for efficient user lookups
UserInterestsSchema.index({ userId: 1 });

// Index for trending keyword queries
UserInterestsSchema.index({ 'likedKeywords.keyword': 1 });
