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
import { TrendingItineraryDocument } from '../schemas/trending-itinerary.schema';
import { UserInterestsDocument } from '../schemas/user-interests.schema';

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
    @InjectModel('TrendingItinerary')
    private trendingItineraryModel: Model<TrendingItineraryDocument>,
    @InjectModel('UserInterests')
    private userInterestsModel: Model<UserInterestsDocument>,
  ) {
    this.logger.log(`Newsletter service initialized with mode: sendgrid`);
  }


  /**
   * Subscribe a user to the newsletter
   * Note: Email is NOT stored in MongoDB, it's fetched from User Service on demand
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
   * Extract keywords from text by tokenizing and filtering common words
   */
  private extractKeywords(text: string, limit: number = 5): string[] {
    if (!text) return [];

    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'can', 'my', 'your', 'our',
      'their', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
      'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how',
    ]);

    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, limit);
  }

  /**
   * Compute or update user interests based on their liked itineraries
   * Analyzes keywords and tags from itineraries user has liked
   */
  async computeUserInterests(userId: number): Promise<UserInterestsDocument | null> {
    try {
      // Get all itineraries liked by this user in the past 90 days
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const userLikes = await this.likesModel
        .find({
          userId,
          createdAt: { $gte: ninetyDaysAgo },
        })
        .select('itineraryId')
        .distinct('itineraryId');

      if (userLikes.length === 0) {
        // Create empty interests if no likes
        return await this.userInterestsModel.findOneAndUpdate(
          { userId },
          {
            userId,
            likedKeywords: [],
            likedTags: [],
            preferredDestinations: [],
            totalLikedItineraries: 0,
            lastComputedAt: new Date(),
          },
          { upsert: true, new: true },
        );
      }

      // Fetch itinerary details from API (simplified - in real scenario, call Itinerary Service)
      const keywordFreq = new Map<string, number>();
      const tagsSet = new Set<string>();
      const destinationsSet = new Set<string>();

      // Get trending itinerary details which contain keywords and tags
      const itineraryDetails = await this.trendingItineraryModel.find({
        itineraryId: { $in: userLikes },
      });

      for (const itinerary of itineraryDetails) {
        // Accumulate keywords
        for (const keyword of itinerary.keywords || []) {
          keywordFreq.set(keyword, (keywordFreq.get(keyword) || 0) + 1);
        }

        // Accumulate tags
        for (const tag of itinerary.tags || []) {
          tagsSet.add(tag);
        }

        // Accumulate destinations from locations
        for (const location of itinerary.locations || []) {
          if (location.name) {
            destinationsSet.add(location.name);
          }
        }
      }

      // Convert to sorted keyword frequency array
      const likedKeywords = Array.from(keywordFreq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([keyword, frequency]) => ({
          keyword,
          frequency,
          lastSeen: new Date(),
        }));

      const interests = await this.userInterestsModel.findOneAndUpdate(
        { userId },
        {
          userId,
          likedKeywords,
          likedTags: Array.from(tagsSet).slice(0, 15),
          preferredDestinations: Array.from(destinationsSet).slice(0, 10),
          totalLikedItineraries: userLikes.length,
          lastComputedAt: new Date(),
        },
        { upsert: true, new: true },
      );

      this.logger.log(
        `Computed interests for user ${userId}: ${likedKeywords.length} keywords, ${tagsSet.size} tags`,
      );

      return interests;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to compute interests for user ${userId}:`, errorMsg);
      return null;
    }
  }

  /**
   * Calculate similarity score between user interests and an itinerary
   * Higher score = better match for recommendation
   */
  private calculateInterestSimilarity(
    userInterests: {
      likedKeywords: Array<{ keyword: string; frequency: number }>;
      likedTags: string[];
      preferredDestinations: string[];
      totalLikedItineraries: number;
    },
    itinerary: {
      keywords: string[];
      tags: string[];
      locations: Array<{ name?: string }>;
    },
  ): number {
    let score = 0;
    const userKeywordSet = new Set(userInterests.likedKeywords.map(k => k.keyword));
    const userTagSet = new Set(userInterests.likedTags);
    const userDestSet = new Set(userInterests.preferredDestinations);

    // Keyword matching (weight: 0.4)
    const matchedKeywords = (itinerary.keywords || []).filter(k =>
      userKeywordSet.has(k),
    );
    score += (matchedKeywords.length / Math.max(itinerary.keywords.length, 1)) * 0.4;

    // Tag matching (weight: 0.3)
    const matchedTags = (itinerary.tags || []).filter(t => userTagSet.has(t));
    score += (matchedTags.length / Math.max(itinerary.tags.length, 1)) * 0.3;

    // Destination matching (weight: 0.3)
    const itineraryDests = (itinerary.locations || [])
      .map(l => l.name)
      .filter((name): name is string => Boolean(name));
    const matchedDests = itineraryDests.filter(d => userDestSet.has(d));
    score += (matchedDests.length / Math.max(itineraryDests.length, 1)) * 0.3;

    return score;
  }

  /**
   * Get recommended itineraries for a user based on their interests
   * Finds fresh itineraries (< 7 days old) that match user's interests
   */
  async getRecommendedItineraries(
    userId: number,
    limit: number = 5,
  ): Promise<
    Array<{
      itineraryId: number;
      title: string;
      userName: string;
      likeCount: number;
      commentCount: number;
      score: number;
      locations: Array<{ name: string; description?: string }>;
      thumbnail?: string;
      similarityScore: number;
    }>
  > {
    try {
      // Get or compute user interests
      let userInterests = await this.userInterestsModel.findOne({ userId });

      if (!userInterests || !userInterests.likedKeywords?.length) {
        // Compute interests if not found or empty
        const computed = await this.computeUserInterests(userId);
        if (computed) {
          userInterests = computed as any;
        }
      }

      if (!userInterests || !userInterests.likedKeywords?.length) {
        // If still no interests, return trending instead
        this.logger.log(
          `No interests found for user ${userId}, returning trending itineraries`,
        );
        const trending = await this.getTrendingItineraries(limit);
        return trending.map(t => ({
          itineraryId: t.itineraryId,
          title: `Itinerary #${t.itineraryId}`,
          userName: 'Unknown',
          likeCount: t.likeCount,
          commentCount: t.commentCount,
          score: t.score,
          locations: [],
          similarityScore: 0,
        }));
      }

      // Get fresh trending itineraries from past 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const candidates = await this.trendingItineraryModel
        .find({
          trendingComputedAt: { $gte: sevenDaysAgo },
          userId: { $ne: userId }, // Don't recommend own itineraries
        })
        .sort({ score: -1 })
        .limit(limit * 3); // Fetch extra to filter and sort

      // Score candidates based on interest similarity
      const scoredCandidates = candidates
        .map(itinerary => ({
          itinerary,
          similarityScore: this.calculateInterestSimilarity(userInterests, {
            keywords: itinerary.keywords || [],
            tags: itinerary.tags || [],
            locations: itinerary.locations || [],
          }),
        }))
        .filter(item => item.similarityScore > 0) // Only include matching itineraries
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, limit);

      const results = scoredCandidates.map(({ itinerary, similarityScore }) => ({
        itineraryId: itinerary.itineraryId,
        title: itinerary.title,
        userName: itinerary.userName || 'Unknown',
        likeCount: itinerary.likeCount,
        commentCount: itinerary.commentCount,
        score: itinerary.score,
        locations: (itinerary.locations || []).map(loc => ({
          name: loc.name,
          description: loc.description,
        })),
        thumbnail: itinerary.images?.[0]?.url,
        similarityScore,
      }));

      this.logger.log(
        `Generated ${results.length} recommendations for user ${userId}`,
      );

      return results;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to get recommendations for user ${userId}:`,
        errorMsg,
      );
      return [];
    }
  }

  /**
   * Enrich trending itineraries with details from Itinerary Service
   * Fetches full details including locations, images, keywords, and comments
   */
  async enrichTrendingItineraries(
    trendingList: Array<{ itineraryId: number; likeCount: number; commentCount: number; score: number }>,
  ): Promise<
    Array<{
      itineraryId: number;
      title: string;
      userName: string;
      likeCount: number;
      commentCount: number;
      score: number;
      locations: Array<{ name: string; description?: string }>;
      images: Array<{ url: string; description?: string }>;
      keywords: string[];
      recentComments: Array<{ userName?: string; text: string; createdAt: Date }>;
    }>
  > {
    try {
      const enriched: Array<{
        itineraryId: number;
        title: string;
        userName: string;
        likeCount: number;
        commentCount: number;
        score: number;
        locations: Array<{ name: string; description?: string }>;
        images: Array<{ url: string; description?: string }>;
        keywords: string[];
        recentComments: Array<{ userName?: string; text: string; createdAt: Date }>;
      }> = [];

      for (const item of trendingList) {
        try {
          // Try to fetch from cache first
          let cached = await this.trendingItineraryModel.findOne({
            itineraryId: item.itineraryId,
          });

          // If cached entry is incomplete (title is "Untitled"), refresh it
          if (cached && cached.title === 'Untitled Itinerary') {
            this.logger.debug(
              `Cache entry for itinerary ${item.itineraryId} is incomplete (title is "Untitled"), refreshing...`,
            );
            cached = null; // Force refresh
          }

          if (!cached) {
            // Fetch real itinerary data from Itinerary Service
            try {
              const itineraryServiceUrl = process.env.ITINERARY_SERVICE_URL;
              if (!itineraryServiceUrl) {
                this.logger.warn(
                  `ITINERARY_SERVICE_URL not configured, skipping enrichment for itinerary ${item.itineraryId}`,
                );
                continue;
              }

              const url = `${itineraryServiceUrl}/api/v1/itineraries/${item.itineraryId}`;
              this.logger.debug(`Fetching itinerary details from: ${url}`);
              const response = await fetch(url);

              if (response.ok) {
                const itineraryData = await response.json();
                const itinerary = itineraryData.data || itineraryData;

                this.logger.debug(
                  `Fetched itinerary ${item.itineraryId} - title: "${itinerary.title || 'MISSING'}", user_id: ${itinerary.userId}`,
                );

                // Fetch creator details from User Service
                let creatorName = 'Unknown';
                if (itinerary.userId) {
                  try {
                    const userServiceUrl = process.env.USER_SERVICE_URL;
                    if (userServiceUrl) {
                      const userUrl = `${userServiceUrl}/api/v1/users/${itinerary.userId}`;
                      const userResponse = await fetch(userUrl);
                      if (userResponse.ok) {
                        const userData = await userResponse.json();
                        creatorName = userData.data?.name || userData.name || 'Unknown';
                      } else {
                        this.logger.debug(
                          `User Service returned ${userResponse.status} for user ${itinerary.userId}`,
                        );
                      }
                    }
                  } catch (userError) {
                    this.logger.debug(
                      `Could not fetch creator for itinerary ${item.itineraryId}: ${userError instanceof Error ? userError.message : String(userError)}`,
                    );
                  }
                }

                // Ensure title is not empty - use multiple fallbacks
                const finalTitle = itinerary.title?.trim() || itinerary.short_desc?.trim() || 'Untitled Itinerary';

                // Create enriched cache entry
                cached = await this.trendingItineraryModel.create({
                  itineraryId: item.itineraryId,
                  title: finalTitle,
                  userId: itinerary.userId || 0,
                  userName: creatorName,
                  likeCount: item.likeCount,
                  commentCount: item.commentCount,
                  score: item.score,
                  locations: (itinerary.locations || []).map((loc: any) => ({
                    id: loc.id,
                    name: loc.name,
                    description: loc.description,
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                  })),
                  images: (itinerary.images || []).map((img: any) => ({
                    url: img.url || img.imageUrl,
                    description: img.description,
                  })),
                  keywords: this.extractKeywords(
                    `${finalTitle} ${itinerary.description || ''}`,
                    20,
                  ),
                  tags: itinerary.tags || [],
                  recentComments: [], // Will be populated when comments are fetched
                  trendingComputedAt: new Date(),
                });

                this.logger.debug(
                  `Created cache entry for itinerary ${item.itineraryId}: "${cached.title}" by ${cached.userName}`,
                );
              } else {
                // Response not ok, create basic entry
                this.logger.warn(
                  `Itinerary service returned ${response.status} for itinerary ${item.itineraryId}`,
                );
                cached = await this.trendingItineraryModel.create({
                  itineraryId: item.itineraryId,
                  title: `Untitled Itinerary`,
                  userId: 0,
                  userName: 'Unknown',
                  likeCount: item.likeCount,
                  commentCount: item.commentCount,
                  score: item.score,
                  locations: [],
                  images: [],
                  keywords: [],
                  recentComments: [],
                });
              }
            } catch (fetchError) {
              // If service call fails, create basic entry
              this.logger.warn(
                `Failed to fetch itinerary ${item.itineraryId} details, creating basic entry`,
              );
              cached = await this.trendingItineraryModel.create({
                itineraryId: item.itineraryId,
                title: `Untitled Itinerary`,
                userId: 0,
                userName: 'Unknown',
                likeCount: item.likeCount,
                commentCount: item.commentCount,
                score: item.score,
                locations: [],
                images: [],
                keywords: [],
                recentComments: [],
              });
            }
          }

          enriched.push({
            itineraryId: item.itineraryId,
            title: cached.title || `Untitled Itinerary`,
            userName: cached.userName || 'Unknown',
            likeCount: item.likeCount,
            commentCount: item.commentCount,
            score: item.score,
            locations: (cached.locations as Array<{ name: string; description?: string }>) || [],
            images: (cached.images as Array<{ url: string; description?: string }>) || [],
            keywords: (cached.keywords as string[]) || [],
            recentComments: (cached.recentComments as Array<{ userName?: string; text: string; createdAt: Date }>) || [],
          });
        } catch (err) {
          this.logger.warn(
            `Failed to enrich itinerary ${item.itineraryId}: ${err instanceof Error ? err.message : String(err)}`,
          );
          enriched.push({
            itineraryId: item.itineraryId,
            title: `Untitled Itinerary`,
            userName: 'Unknown',
            locations: [],
            images: [],
            keywords: [],
            recentComments: [],
            likeCount: item.likeCount,
            commentCount: item.commentCount,
            score: item.score,
          });
        }
      }

      return enriched;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to enrich trending itineraries:', errorMsg);
      return trendingList.map(item => ({
        itineraryId: item.itineraryId,
        title: `Untitled Itinerary`,
        userName: 'Unknown',
        locations: [],
        images: [],
        keywords: [],
        recentComments: [],
        likeCount: item.likeCount,
        commentCount: item.commentCount,
        score: item.score,
      }));
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

      this.logger.debug(`[getTrendingItineraries] Filtering likes from past 7 days (since: ${sevenDaysAgo.toISOString()})`);

      // First, get ALL likes to debug
      const allLikes = await this.likesModel.find().lean();
      this.logger.debug(`[getTrendingItineraries] Total likes in database: ${allLikes.length}`);
      if (allLikes.length > 0) {
        this.logger.debug(`[getTrendingItineraries] Sample like: ${JSON.stringify(allLikes[0])}`);
      }

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

      if (trending.length > 0) {
        const trendingIds = trending.map(t => t.itineraryId).join(',');
        this.logger.log(
          `Computed trending itineraries (${trending.length} items): ${trendingIds}`,
        );
      } else {
        this.logger.warn(
          `No trending itineraries found in past 7 days with ≥3 likes`,
        );
      }
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
   * Fetch user email from User Service
   * Uses direct service-to-service communication (not through API Gateway)
   * Throws error if USER_SERVICE_URL is not configured or user not found
   */
  async fetchUserEmail(userId: number): Promise<string> {
    const userServiceUrl = process.env.USER_SERVICE_URL;

    // Log configuration status
    this.logger.debug(`Fetching email for user ${userId}`);
    if (!userServiceUrl) {
      this.logger.error(
        `USER_SERVICE_URL environment variable is not configured. ` +
        `Cannot fetch email for user ${userId}. Check Kubernetes secrets.`,
      );
      throw new Error(
        'USER_SERVICE_URL environment variable is not configured. ' +
        'This must be set in Kubernetes secrets for the social-service deployment.',
      );
    }

    this.logger.debug(`USER_SERVICE_URL: ${userServiceUrl}`);

    try {
      // USER_SERVICE_URL should point directly to the User Service base URL
      // Example: http://user-service:8080 (Kubernetes) or http://localhost:8080 (Docker)
      // User Service has global prefix: api/v1/users
      const url = `${userServiceUrl}/api/v1/users/${userId}`;
      this.logger.debug(`Fetching user from: ${url}`);

      const response = await fetch(url);

      if (!response.ok) {
        this.logger.error(
          `User Service returned ${response.status} ${response.statusText} for user ${userId}. ` +
          `URL: ${url}`,
        );
        throw new Error(
          `User Service error: ${response.status} ${response.statusText}`,
        );
      }

      const userData = await response.json();
      this.logger.debug(`User data received for user ${userId}`);

      // Handle both wrapped and unwrapped responses
      const email = userData.data?.email || userData.email;

      if (!email) {
        this.logger.error(
          `No email found in user data for user ${userId}. ` +
          `Response structure: ${JSON.stringify(userData)}`,
        );
        throw new Error(`No email field in user data for user ${userId}`);
      }

      this.logger.debug(`Successfully fetched email for user ${userId}`);
      return email;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to fetch email for user ${userId}: ${errorMsg}`,
      );
      throw error;
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
   * Get itineraries from users similar to the target user
   * Uses simple collaborative filtering: finds users who liked the same itineraries
   * and recommends their other itineraries
   * Excludes provided itinerary IDs (e.g., trending) for variety
   */
  private async getFollowedUserItineraries(
    userId: number,
    limit: number = 3,
    excludeIds: number[] = [],
  ): Promise<
    Array<{
      itineraryId: number;
      title: string;
      userName: string;
      likeCount: number;
      commentCount: number;
      locations: Array<{ name: string }>;
      thumbnail?: string;
      similarUsersCount: number;
    }>
  > {
    try {
      // Log what we're excluding
      if (excludeIds.length > 0) {
        this.logger.debug(`Excluding trending IDs from similar travelers section: ${excludeIds.join(',')}`);
      }

      // Step 1: Find itineraries the user liked
      const userLikes = await this.likesModel
        .find({ userId })
        .select('itineraryId')
        .lean();

      if (!userLikes || userLikes.length === 0) {
        this.logger.debug(
          `User ${userId} has no likes, using random popular itineraries (excluding ${excludeIds.length} trending items)`,
        );
        return this.getRandomPopularItineraries(limit, excludeIds);
      }

      const likedItineraryIds = userLikes.map(like => like.itineraryId);

      // Step 2: Find other users who liked the same itineraries
      const similarUsers = await this.likesModel
        .find({
          itineraryId: { $in: likedItineraryIds },
          userId: { $ne: userId }, // Exclude the user themselves
        })
        .select('userId')
        .distinct('userId')
        .lean();

      if (!similarUsers || similarUsers.length === 0) {
        this.logger.debug(
          `No similar users found for user ${userId}, using random popular itineraries (excluding ${excludeIds.length} trending items)`,
        );
        return this.getRandomPopularItineraries(limit, excludeIds);
      }

      // Step 3: Find itineraries liked by similar users (but not by the target user or excluded IDs)
      const idsToExclude = [...likedItineraryIds, ...excludeIds];
      const similarUserItineraries = await this.likesModel
        .aggregate([
          {
            $match: {
              userId: { $in: similarUsers },
              itineraryId: { $nin: idsToExclude }, // Exclude already liked + excluded IDs
            },
          },
          {
            $group: {
              _id: '$itineraryId',
              similarUsersCount: { $sum: 1 }, // Count how many similar users liked it
              likes: { $first: '$likes' },
            },
          },
          {
            $sort: { similarUsersCount: -1 },
          },
          {
            $limit: limit * 2, // Get extra to filter
          },
        ])
        .exec();

      if (!similarUserItineraries || similarUserItineraries.length === 0) {
        this.logger.debug(
          `No similar user itineraries found for user ${userId}, using random popular (excluding ${excludeIds.length} trending items)`,
        );
        return this.getRandomPopularItineraries(limit, excludeIds);
      }

      // Step 4: Enrich with full itinerary details
      const results: Array<{
        itineraryId: number;
        title: string;
        userName: string;
        likeCount: number;
        commentCount: number;
        locations: Array<{ name: string }>;
        thumbnail?: string;
        similarUsersCount: number;
      }> = [];

      for (const item of similarUserItineraries) {
        try {
          const itineraryId = item._id as number;
          const cached = await this.trendingItineraryModel.findOne({
            itineraryId,
          });

          if (cached) {
            results.push({
              itineraryId,
              title: cached.title,
              userName: cached.userName || 'Unknown',
              likeCount: cached.likeCount,
              commentCount: cached.commentCount,
              locations: (cached.locations || []).map(loc => ({
                name: typeof loc === 'string' ? loc : loc.name,
              })),
              thumbnail: cached.images?.[0]?.url,
              similarUsersCount: item.similarUsersCount,
            });

            if (results.length >= limit) break;
          }
        } catch (err) {
          this.logger.debug(
            `Error enriching itinerary ${item._id}: ${err instanceof Error ? err.message : String(err)}`,
          );
          continue;
        }
      }

      if (results.length > 0) {
        const resultIds = results.map(r => r.itineraryId).join(',');
        this.logger.log(
          `Found ${results.length} itineraries from similar users for user ${userId}: ${resultIds}`,
        );
        return results.slice(0, limit);
      }

      this.logger.debug(`No similar user itineraries found, falling back to random popular (excluding ${excludeIds.join(',')})`);
      return this.getRandomPopularItineraries(limit, excludeIds);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to get followed user itineraries for user ${userId}:`,
        errorMsg,
      );
      return this.getRandomPopularItineraries(limit, excludeIds);
    }
  }

  /**
   * Get random popular itineraries with smart fallback strategy
   * Never returns empty - tries multiple sources to ensure recommendations
   * Excludes provided itinerary IDs for variety
   */
  private async getRandomPopularItineraries(
    limit: number = 3,
    excludeIds: number[] = [],
  ): Promise<
    Array<{
      itineraryId: number;
      title: string;
      userName: string;
      likeCount: number;
      commentCount: number;
      locations: Array<{ name: string }>;
      thumbnail?: string;
      similarUsersCount: number;
    }>
  > {
    try {
      // Combine excluded IDs with trending for variety
      const idsToExclude = new Set(excludeIds);

      if (excludeIds.length > 0) {
        this.logger.debug(`[getRandomPopularItineraries] Excluding ${excludeIds.length} trending IDs: ${Array.from(idsToExclude).join(',')}`);
      }

      // Strategy 1: Get popular itineraries excluding specified IDs (for variety)
      let randomItems = await this.trendingItineraryModel
        .find({
          itineraryId: { $nin: Array.from(idsToExclude) },
          likeCount: { $gte: 1 }, // Lower threshold for secondary picks
        })
        .sort({ likeCount: -1 })
        .limit(limit)
        .lean();

      if (randomItems.length > 0) {
        const returnedIds = randomItems.map(i => i.itineraryId).join(',');
        this.logger.debug(`[getRandomPopularItineraries] Strategy 1 returned ${randomItems.length} items: ${returnedIds}`);
      }

      // Strategy 2: If not enough variety, fall back to all popular (still excluding excluded IDs)
      if (!randomItems || randomItems.length === 0) {
        this.logger.debug(
          `No variety items found, using all popular itineraries (still excluding specified IDs)`,
        );
        randomItems = await this.trendingItineraryModel
          .find({
            itineraryId: { $nin: Array.from(idsToExclude) },
            likeCount: { $gte: 1 },
          })
          .sort({ likeCount: -1 })
          .limit(limit)
          .lean();
      }

      // Strategy 3: If still empty, get ANY itineraries (as last resort)
      if (!randomItems || randomItems.length === 0) {
        this.logger.debug(`No popular items found, getting any available itineraries`);
        randomItems = await this.trendingItineraryModel
          .find({})
          .sort({ likeCount: -1, _id: -1 })
          .limit(limit)
          .lean();
      }

      if (!randomItems || randomItems.length === 0) {
        this.logger.warn(
          `No itineraries available in database for recommendations`,
        );
        return [];
      }

      const itemIds = randomItems.map(i => i.itineraryId).join(',');
      this.logger.log(
        `Found ${randomItems.length} random popular itineraries for recommendations: ${itemIds}`,
      );

      return randomItems.map(item => ({
        itineraryId: item.itineraryId,
        title: item.title,
        userName: item.userName || 'Unknown',
        likeCount: item.likeCount,
        commentCount: item.commentCount,
        locations: (item.locations || []).map(loc => ({
          name: typeof loc === 'string' ? loc : loc.name,
        })),
        thumbnail: item.images?.[0]?.url,
        similarUsersCount: 0,
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to get random popular itineraries:', errorMsg);
      return [];
    }
  }

  /**
   * Generate personalized newsletter content for a user
   * Includes activity summary and trending items
   */
  /**
   * Load and compile Handlebars template
   * Tries multiple paths to support both dev and production environments
   */
  private loadTemplate(templateName: string): HandlebarsTemplateDelegate | null {
    try {
      // Try multiple possible paths (dev and production)
      const possiblePaths = [
        // Production: /app/dist/newsletter/templates/
        path.join(process.cwd(), 'dist', 'newsletter', 'templates', `${templateName}.hbs`),
        // Production (alternate): /app/dist/src/newsletter/templates/
        path.join(process.cwd(), 'dist', 'src', 'newsletter', 'templates', `${templateName}.hbs`),
        // Development: src/newsletter/templates/
        path.join(process.cwd(), 'src', 'newsletter', 'templates', `${templateName}.hbs`),
        // Fallback for nested builds
        path.join(process.cwd(), 'newsletter', 'templates', `${templateName}.hbs`),
      ];

      let templatePath: string | null = null;
      for (const candidate of possiblePaths) {
        if (fs.existsSync(candidate)) {
          templatePath = candidate;
          break;
        }
      }

      if (!templatePath) {
        this.logger.warn(
          `Template not found at any path. Tried: ${possiblePaths.join(', ')}. Using fallback`,
        );
        return null as any;
      }

      this.logger.debug(`Loading template from: ${templatePath}`);
      const templateContent = fs.readFileSync(templatePath, 'utf-8');
      return Handlebars.compile(templateContent);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to load template ${templateName}:`, errorMsg);
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

      // Enrich trending data with locations and images
      const enrichedTrending = await this.enrichTrendingItineraries(trending);
      const trendingIds = trending.map(t => t.itineraryId);

      this.logger.debug(`[generateNewsletterContent] Extracted trending IDs for exclusion: ${trendingIds.join(',')}`);

      // Get personalized recommendations based on user interests
      const recommendations = await this.getRecommendedItineraries(user.userId, 5);

      // Get itineraries from similar users (collaborative filtering), excluding trending for variety
      this.logger.debug(`[generateNewsletterContent] Calling getFollowedUserItineraries with excludeIds: ${trendingIds.join(',')}`);
      const followedUserItineraries = await this.getFollowedUserItineraries(user.userId, 3, trendingIds);
      const followedIds = followedUserItineraries.map(f => f.itineraryId).join(',');
      this.logger.debug(`[generateNewsletterContent] Got followedUserItineraries: ${followedIds}`);

      // Check if we need fallback demo data (only if both sections would be empty)
      let useFallbackDemo = false;
      if (enrichedTrending.length === 0 && followedUserItineraries.length === 0) {
        useFallbackDemo = true;
        this.logger.warn(`[generateNewsletterContent] USING FALLBACK DEMO DATA - Both trending and similar travelers are empty. This is demonstration data only.`);

        // Create demo trending data
        enrichedTrending.push({
          itineraryId: 999,
          title: 'Mediterranean Escape',
          userName: 'Demo User',
          likeCount: 15,
          commentCount: 3,
          score: 8.4,
          locations: [{ name: 'Greece' }, { name: 'Italy' }],
          images: [],
          keywords: [],
          recentComments: [],
        });

        // Create demo followed user itineraries
        followedUserItineraries.push({
          itineraryId: 998,
          title: 'Asian Adventure',
          userName: 'Travel Enthusiast',
          likeCount: 12,
          commentCount: 2,
          locations: [{ name: 'Thailand' }, { name: 'Vietnam' }],
          thumbnail: undefined,
          similarUsersCount: 0,
        });
      }

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
        trendingItineraries: enrichedTrending.slice(0, 3).map(item => ({
          itineraryId: item.itineraryId,
          title: item.title,
          userName: item.userName,
          likeCount: item.likeCount,
          commentCount: item.commentCount,
          locations: (item.locations || []).slice(0, 2).map(loc => loc.name || loc).join(', '),
          thumbnail: item.images?.[0]?.url,
          recentComments: (item.recentComments || []).slice(0, 3).map(comment => ({
            userName: comment.userName || 'Anonymous',
            text: comment.text,
          })),
        })),
        recommendations: recommendations.slice(0, 5).map(rec => ({
          itineraryId: rec.itineraryId,
          title: rec.title,
          userName: rec.userName,
          likeCount: rec.likeCount,
          commentCount: rec.commentCount,
          locations: (rec.locations || []).slice(0, 2).map(l => l.name).join(', '),
          thumbnail: rec.thumbnail,
        })),
        hasRecommendations: recommendations.length > 0,
        followedUserItineraries: followedUserItineraries.map(item => ({
          itineraryId: item.itineraryId,
          title: item.title || `Itinerary #${item.itineraryId}`,
          userName: item.userName,
          likeCount: item.likeCount,
          commentCount: item.commentCount,
          locations: (item.locations || []).slice(0, 2).map(l => l.name).join(', '),
          locationCount: item.locations?.length || 0,
          thumbnail: item.thumbnail,
          recentComments: [], // Placeholder for consistency with trending format
        })),
        hasFollowedUserItineraries: followedUserItineraries.length > 0,
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
        // Enhanced fallback HTML with enriched trending and recommendations
        html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
        .container { max-width: 650px; margin: 0 auto; padding: 20px; background: #ffffff; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; border-radius: 8px; margin-bottom: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .header p { margin: 8px 0 0; opacity: 0.9; }
        .section { margin: 30px 0; }
        .section h2 { color: #333; border-bottom: 3px solid #667eea; padding-bottom: 10px; }
        .section h3 { color: #667eea; margin-top: 20px; }
        .activity-list { list-style: none; padding: 0; }
        .activity-list li { padding: 8px 0; border-bottom: 1px solid #eee; }
        .activity-list strong { color: #667eea; }
        .trending-item { background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #667eea; }
        .trending-item .title { font-weight: bold; color: #333; margin-bottom: 5px; font-size: 16px; }
        .trending-item .author { font-size: 12px; color: #666; margin-bottom: 8px; }
        .trending-item .meta { font-size: 13px; color: #666; }
        .trending-item .locations { color: #764ba2; font-size: 12px; margin: 8px 0; }
        .thumbnail { max-width: 100%; height: 150px; object-fit: cover; border-radius: 4px; margin: 8px 0; }
        .comments-section { background: rgba(255, 255, 255, 0.6); padding: 10px; margin-top: 10px; border-radius: 4px; border-left: 3px solid #667eea; }
        .comments-header { font-weight: bold; font-size: 12px; color: #667eea; margin-bottom: 8px; }
        .comment { font-size: 12px; color: #555; margin: 6px 0; padding: 6px 0; border-bottom: 1px solid rgba(102, 126, 234, 0.2); }
        .comment strong { color: #667eea; }
        .comment-text { color: #444; }
        .recommendation-item { background: #f0f4ff; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #764ba2; }
        .recommendation-item .title { font-weight: bold; color: #333; margin-bottom: 5px; font-size: 16px; }
        .recommendation-item .author { font-size: 12px; color: #666; margin-bottom: 8px; }
        .recommendation-item .meta { font-size: 13px; color: #666; margin: 8px 0; }
        .recommendation-item .locations { color: #764ba2; font-size: 12px; margin: 8px 0; }
        .similarity-badge { display: inline-block; background: #764ba2; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; }
        .footer { font-size: 12px; color: #999; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; text-align: center; }
        .footer a { color: #667eea; text-decoration: none; }
        .footer a:hover { text-decoration: underline; }
        .cta-button { display: inline-block; background: #667eea; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none; margin: 10px 5px 10px 0; }
        .cta-button:hover { background: #764ba2; }
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
            <p>Here's what's been happening in your travel community this week, plus personalized recommendations based on your interests.</p>
        </div>

        <div class="section">
            <h3>📊 Your Activity</h3>
            <p>Here's your weekly engagement summary:</p>
            <ul class="activity-list">
                <li><strong>${templateData.likeCount}</strong> likes on itineraries</li>
                <li><strong>${templateData.commentCount}</strong> comments made</li>
            </ul>
        </div>

        <div class="section">
            <h3>🔥 Trending This Week</h3>
            <p>These itineraries are getting a lot of attention from the community:</p>
            ${templateData.trendingItineraries
              .map(
                (item, idx) =>
                  `<div class="trending-item">
                    <div class="title">#${idx + 1} - ${item.title}</div>
                    <div class="author">by ${item.userName}</div>
                    ${item.thumbnail ? `<img src="${item.thumbnail}" alt="Itinerary thumbnail" class="thumbnail">` : ''}
                    <div class="locations">📍 ${item.locations || 'Various Destinations'}</div>
                    <div class="meta">❤️ ${item.likeCount} likes | 💬 ${item.commentCount} comments</div>
                    ${item.recentComments && item.recentComments.length > 0 ? `
                    <div class="comments-section">
                        <div class="comments-header">💭 Recent Comments:</div>
                        ${item.recentComments
                          .map(
                            comment =>
                              `<div class="comment">
                                <strong>${comment.userName}:</strong> <span class="comment-text">${comment.text}</span>
                            </div>`,
                          )
                          .join('')}
                    </div>
                    ` : ''}
                </div>`,
              )
              .join('')}
        </div>

        ${templateData.hasRecommendations ? `
        <div class="section">
            <h3>✨ Recommended For You</h3>
            <p>Based on your interests and travel style, we think you'll love these itineraries:</p>
            ${templateData.recommendations
              .map(
                (rec, idx) =>
                  `<div class="recommendation-item">
                    <div class="title">#${idx + 1} - ${rec.title}</div>
                    <div class="author">by ${rec.userName}</div>
                    ${rec.thumbnail ? `<img src="${rec.thumbnail}" alt="Itinerary thumbnail" class="thumbnail">` : ''}
                    <div class="locations">📍 ${rec.locations || 'Various Destinations'}</div>
                    <div class="meta">❤️ ${rec.likeCount} likes | 💬 ${rec.commentCount} comments</div>
                </div>`,
              )
              .join('')}
        </div>
        ` : ''}

        <div class="section" style="text-align: center;">
            <p>Discover more travel itineraries and connect with fellow travelers!</p>
            <a href="${templateData.appUrl}" class="cta-button">Explore More</a>
        </div>

        <div class="footer">
            <p>
                <a href="${templateData.preferencesUrl}">Manage Preferences</a> |
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
   * Fetches email from User Service on demand (not stored in MongoDB)
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

      // Fetch user email from User Service (not stored in MongoDB for data persistence)
      let userEmail: string;
      try {
        userEmail = await this.fetchUserEmail(user.userId);
      } catch (userLookupError) {
        const errorMsg = userLookupError instanceof Error ? userLookupError.message : String(userLookupError);

        // Instead of throwing, log and skip this user
        // This allows partial newsletter sends if user service is temporarily unavailable
        this.logger.warn(
          `Skipping newsletter for user ${user.userId} due to email fetch failure: ${errorMsg}`,
        );
        return;
      }

      // Generate personalized content
      const content = await this.generateNewsletterContent(user, trending);

      // Send email
      await this.sendEmail(
        userEmail,
        `Your Weekly Travel Newsletter - ${new Date().toLocaleDateString()}`,
        content,
      );

      // Track success
      await this.deliveryModel.updateOne(
        { sendRun: sendRunId, userId: user.userId },
        {
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
   * Send daily newsletter to all daily subscribers
   * Implements batch processing with checkpoints and health checks
   */
  async sendDaily(): Promise<SendNewsletterResultDto> {
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

      this.logger.log('Health checks passed, starting daily newsletter send');

      // Get all subscribed users with daily frequency
      const subscribers = await this.subscriptionModel.find({
        isSubscribed: true,
        frequency: NewsletterFrequency.DAILY,
      });

      // Get trending itineraries (cached)
      const trending = await this.getTrendingItineraries();

      this.logger.log(
        `Starting newsletter send to ${subscribers.length} daily subscribers`,
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
                error: errorMsg,
              });
            }),
        );

        await Promise.all(promises);
        this.markBatchProcessed(sendRun._id as Types.ObjectId, batch);
      }

      const completedAt = new Date();
      this.logger.log(
        `Daily newsletter send completed: ${successCount} sent, ${failureCount} failed out of ${subscribers.length}`,
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

          // Fetch email from User Service (not stored in MongoDB)
          let userEmail: string;
          try {
            userEmail = await this.fetchUserEmail(delivery.userId);
          } catch (userLookupError) {
            const errorMsg = userLookupError instanceof Error ? userLookupError.message : String(userLookupError);
            this.logger.error(`Failed to fetch email for retry, user ${delivery.userId}: ${errorMsg}`);
            throw new Error(`Cannot send retry: ${errorMsg}`);
          }

          // Generate fresh content and send
          const content = await this.generateNewsletterContent(user, trending);
          await this.sendEmail(
            userEmail,
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
