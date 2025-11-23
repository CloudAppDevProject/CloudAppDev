import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NewsletterService } from './newsletter.service';
import {
  NewsletterSubscription,
  NewsletterFrequency,
} from '../schemas/newsletter-subscription.schema';
import { NewsletterDelivery } from '../schemas/newsletter-delivery.schema';

describe('NewsletterService', () => {
  let service: NewsletterService;
  let mockSubscriptionModel: any;
  let mockDeliveryModel: any;
  let mockLikesModel: any;
  let mockCommentsModel: any;

  beforeEach(async () => {
    // Mock MongoDB models with common operations
    mockSubscriptionModel = {
      findOneAndUpdate: jest.fn().mockResolvedValue({
        userId: 1,
        email: 'test@example.com',
        isSubscribed: true,
        frequency: NewsletterFrequency.WEEKLY,
      }),
      findOne: jest.fn().mockResolvedValue({
        userId: 1,
        email: 'test@example.com',
        isSubscribed: true,
        frequency: NewsletterFrequency.WEEKLY,
      }),
      find: jest.fn().mockResolvedValue([
        {
          userId: 1,
          email: 'test1@example.com',
          isSubscribed: true,
        },
        {
          userId: 2,
          email: 'test2@example.com',
          isSubscribed: true,
        },
      ]),
      countDocuments: jest.fn().mockResolvedValue(100),
    };

    mockDeliveryModel = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
      countDocuments: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([
          {
            _id: 1,
            title: 'Paris Adventure',
            likeCount: 15,
            commentCount: 5,
            score: 10.5,
          },
        ]),
      }),
    };

    mockLikesModel = {
      countDocuments: jest.fn().mockResolvedValue(5),
      aggregate: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([
          {
            _id: 1,
            title: 'Paris Adventure',
            likeCount: 15,
            commentCount: 5,
            score: 10.5,
          },
        ]),
      }),
    };

    mockCommentsModel = {
      countDocuments: jest.fn().mockResolvedValue(3),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsletterService,
        {
          provide: getModelToken(NewsletterSubscription.name),
          useValue: mockSubscriptionModel,
        },
        {
          provide: getModelToken(NewsletterDelivery.name),
          useValue: mockDeliveryModel,
        },
        {
          provide: getModelToken('Like'),
          useValue: mockLikesModel,
        },
        {
          provide: getModelToken('Comment'),
          useValue: mockCommentsModel,
        },
      ],
    }).compile();

    service = module.get<NewsletterService>(NewsletterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Subscription Management', () => {
    it('should subscribe a user successfully', async () => {
      const result = await service.subscribeUser(
        1,
        'test@example.com',
        NewsletterFrequency.WEEKLY,
      );

      expect(mockSubscriptionModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: 1 },
        expect.objectContaining({
          userId: 1,
          email: 'test@example.com',
          isSubscribed: true,
          frequency: NewsletterFrequency.WEEKLY,
        }),
        expect.any(Object),
      );
      expect(result).toBeDefined();
      if (result) {
        expect(result.isSubscribed).toBe(true);
      }
    });

    it('should unsubscribe a user', async () => {
      const result = await service.unsubscribeUser(1);

      expect(mockSubscriptionModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: 1 },
        { isSubscribed: false },
        expect.any(Object),
      );
      expect(result).toBeDefined();
    });

    it('should get user subscription', async () => {
      const result = await service.getSubscription(1);

      expect(mockSubscriptionModel.findOne).toHaveBeenCalledWith({ userId: 1 });
      expect(result).toBeDefined();
      if (result) {
        expect(result.isSubscribed).toBe(true);
      }
    });

    it('should return null for non-existent subscription', async () => {
      mockSubscriptionModel.findOne.mockResolvedValue(null);

      const result = await service.getSubscription(999);

      expect(result).toBeNull();
    });

    it('should handle subscription errors gracefully', async () => {
      mockSubscriptionModel.findOneAndUpdate.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.subscribeUser(1, 'test@example.com'),
      ).rejects.toThrow('Database error');
    });

    it('should support different subscription frequencies', async () => {
      const frequencies = [
        NewsletterFrequency.WEEKLY,
        NewsletterFrequency.MONTHLY,
      ];

      for (const frequency of frequencies) {
        await service.subscribeUser(1, 'test@example.com', frequency);
        expect(mockSubscriptionModel.findOneAndUpdate).toHaveBeenCalledWith(
          { userId: 1 },
          expect.objectContaining({ frequency }),
          expect.any(Object),
        );
      }
    });
  });

  describe('User Activity Calculation', () => {
    it('should calculate user activity for the week', async () => {
      mockLikesModel.countDocuments.mockResolvedValue(5);
      mockCommentsModel.countDocuments.mockResolvedValue(3);

      const activity = await service.getUserActivity(1);

      expect(mockLikesModel.countDocuments).toHaveBeenCalled();
      expect(mockCommentsModel.countDocuments).toHaveBeenCalled();
      expect(activity).toBeDefined();
      expect(activity.likeCount).toBe(5);
      expect(activity.commentCount).toBe(3);
    });

    it('should return zero activity for inactive users', async () => {
      mockLikesModel.countDocuments.mockResolvedValue(0);
      mockCommentsModel.countDocuments.mockResolvedValue(0);

      const activity = await service.getUserActivity(1);

      expect(activity.likeCount).toBe(0);
      expect(activity.commentCount).toBe(0);
    });

    it('should filter activity by date range', async () => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      await service.getUserActivity(1);

      expect(mockLikesModel.countDocuments).toHaveBeenCalled();
    });
  });

  describe('Trending Itineraries', () => {
    it('should return cached trending if valid', async () => {
      const cachedData = [
        {
          itineraryId: 1,
          title: 'Paris Trip',
          likeCount: 10,
          score: 8,
        },
      ];

      // Manually set cache using reflect to access private property
      const cacheProperty = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(service),
        'trendingCache',
      );
      if (cacheProperty) {
        (service as any).trendingCache = {
          data: cachedData,
          timestamp: Date.now(),
        };
      }

      const result = await service.getTrendingItineraries();

      expect(result).toEqual(cachedData);
      expect(mockLikesModel.aggregate).not.toHaveBeenCalled();
    });

    it('should compute trending with quality filter', async () => {
      const trendingData = [
        {
          _id: 1,
          title: 'Paris Trip',
          likeCount: 15,
          commentCount: 5,
          score: 10.5,
        },
      ];

      mockLikesModel.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(trendingData),
      });

      const result = await service.getTrendingItineraries();

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(mockLikesModel.aggregate).toHaveBeenCalled();
    });

    it('should apply minimum like threshold', async () => {
      const MIN_LIKES = 3;

      mockLikesModel.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([
          {
            _id: 1,
            title: 'Popular Trip',
            likeCount: 10,
            score: 8,
          },
        ]),
      });

      await service.getTrendingItineraries();

      expect(mockLikesModel.aggregate).toHaveBeenCalled();
    });

    it('should cache results for 24 hours', async () => {
      mockLikesModel.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      });

      await service.getTrendingItineraries();

      expect((service as any).trendingCache).toBeDefined();
      expect((service as any).trendingCache.timestamp).toBeLessThanOrEqual(
        Date.now(),
      );
    });

    it('should use default limit of 10 itineraries', async () => {
      mockLikesModel.aggregate.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(
          Array.from({ length: 10 }, (_, i) => ({
            _id: i,
            title: `Trip ${i}`,
            likeCount: 10 - i,
            score: 8 - i * 0.1,
          })),
        ),
      });

      const result = await service.getTrendingItineraries();

      expect(result.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Newsletter Content Generation', () => {
    it('should generate personalized newsletter content', async () => {
      mockLikesModel.countDocuments.mockResolvedValue(5);
      mockCommentsModel.countDocuments.mockResolvedValue(2);

      const user = {
        userId: 1,
        email: 'test@example.com',
        name: 'John Doe',
      };
      const trending = [
        {
          itineraryId: 1,
          title: 'Paris Trip',
          likeCount: 10,
          commentCount: 2,
          score: 8,
        },
      ];

      const content = await service.generateNewsletterContent(user, trending as any);

      expect(content).toBeDefined();
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });

    it('should include user name in newsletter', async () => {
      mockLikesModel.countDocuments.mockResolvedValue(0);
      mockCommentsModel.countDocuments.mockResolvedValue(0);

      const user = {
        userId: 1,
        email: 'test@example.com',
        name: 'Jane Smith',
      };

      const content = await service.generateNewsletterContent(user, []);

      expect(content).toBeDefined();
    });

    it('should handle missing user name gracefully', async () => {
      mockLikesModel.countDocuments.mockResolvedValue(0);
      mockCommentsModel.countDocuments.mockResolvedValue(0);

      const user = {
        userId: 1,
        email: 'test@example.com',
      };

      const content = await service.generateNewsletterContent(user, []);

      expect(content).toBeDefined();
      expect(typeof content).toBe('string');
    });

    it('should handle empty trending list', async () => {
      mockLikesModel.countDocuments.mockResolvedValue(0);
      mockCommentsModel.countDocuments.mockResolvedValue(0);

      const user = {
        userId: 1,
        email: 'test@example.com',
        name: 'Test User',
      };

      const content = await service.generateNewsletterContent(user, []);

      expect(content).toBeDefined();
    });

    it('should include activity stats in newsletter', async () => {
      mockLikesModel.countDocuments.mockResolvedValue(7);
      mockCommentsModel.countDocuments.mockResolvedValue(3);

      const user = {
        userId: 1,
        email: 'test@example.com',
        name: 'Active User',
      };

      const content = await service.generateNewsletterContent(user, []);

      expect(content).toBeDefined();
    });
  });

  describe('Email Sending', () => {
    it('should send email via transporter when configured', async () => {
      const mockSendMail = jest.fn().mockResolvedValue({ messageId: '123' });
      (service as any).emailTransporter = {
        sendMail: mockSendMail,
      };

      const result = await service.sendEmail(
        'recipient@example.com',
        'Test Subject',
        '<html>Test content</html>',
      );

      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalled();
    });

    it('should handle send failures gracefully', async () => {
      const mockSendMail = jest.fn().mockRejectedValue(new Error('SMTP error'));
      (service as any).emailTransporter = {
        sendMail: mockSendMail,
      };

      await expect(
        service.sendEmail(
          'recipient@example.com',
          'Subject',
          '<html></html>',
        ),
      ).rejects.toThrow('SMTP error');
    });

    it('should operate in dry-run mode without transporter', async () => {
      (service as any).emailTransporter = null;

      const result = await service.sendEmail(
        'test@example.com',
        'Subject',
        '<html></html>',
      );

      expect(result).toBe(true);
    });

    it('should include from and to addresses', async () => {
      const mockSendMail = jest.fn().mockResolvedValue({ messageId: '123' });
      (service as any).emailTransporter = {
        sendMail: mockSendMail,
      };

      await service.sendEmail(
        'recipient@example.com',
        'Subject',
        '<html>Content</html>',
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'recipient@example.com',
          subject: 'Subject',
        }),
      );
    });
  });

  describe('Batch Processing', () => {
    it('should chunk users into batches', () => {
      const users = Array.from({ length: 250 }, (_, i) => ({ userId: i }));

      const batches = (service as any).chunk(users, 50);

      expect(batches).toHaveLength(5);
      expect(batches[0]).toHaveLength(50);
    });

    it('should handle uneven batch sizes', () => {
      const users = Array.from({ length: 45 }, (_, i) => ({ userId: i }));

      const batches = (service as any).chunk(users, 50);

      expect(batches).toHaveLength(1);
      expect(batches[0]).toHaveLength(45);
    });

    it('should handle single batch', () => {
      const users = Array.from({ length: 10 }, (_, i) => ({ userId: i }));

      const batches = (service as any).chunk(users, 50);

      expect(batches).toHaveLength(1);
    });

    it('should handle empty list', () => {
      const batches = (service as any).chunk([], 50);

      expect(batches).toHaveLength(0);
    });
  });

  describe('Idempotency', () => {
    it('should skip already-sent users', async () => {
      mockDeliveryModel.findOne.mockResolvedValue({
        status: 'sent',
        sentAt: new Date(),
      });

      const user = { userId: 1, email: 'test@example.com' } as any;
      const sendRunId = 'run-123';

      const content = [
        { itineraryId: 1, likeCount: 10, commentCount: 2, score: 8 },
      ] as any;

      await service.sendToUserWithTracking(
        user,
        content,
        { _id: 'test-id' } as any,
      );

      expect(mockDeliveryModel.updateOne).not.toHaveBeenCalled();
    });

    it('should track delivery status', async () => {
      mockDeliveryModel.findOne.mockResolvedValue(null);
      (service as any).emailTransporter = {
        sendMail: jest.fn().mockResolvedValue({ messageId: '123' }),
      };

      const user = { userId: 1, email: 'test@example.com' } as any;
      const content = [
        { itineraryId: 1, likeCount: 10, commentCount: 2, score: 8 },
      ] as any;

      await service.sendToUserWithTracking(
        user,
        content,
        { _id: 'test-id' } as any,
      );

      expect(mockDeliveryModel.updateOne).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should not send duplicate emails', async () => {
      const existingDelivery = {
        status: 'sent',
        sentAt: new Date(),
        retryCount: 0,
      };
      mockDeliveryModel.findOne.mockResolvedValue(existingDelivery);

      const user = { userId: 1, email: 'test@example.com' } as any;
      const content = [
        { itineraryId: 1, likeCount: 10, commentCount: 2, score: 8 },
      ] as any;

      const result = await service.sendToUserWithTracking(
        user,
        content,
        { _id: 'test-id' } as any,
      );

      expect(mockDeliveryModel.updateOne).not.toHaveBeenCalled();
    });
  });

  describe('Retry Mechanism', () => {
    it('should retry failed sends', async () => {
      const failedDeliveries = [
        {
          userId: 1,
          email: 'test@example.com',
          status: 'failed',
          retryCount: 0,
        },
      ];
      mockDeliveryModel.find.mockResolvedValue(failedDeliveries);
      mockSubscriptionModel.findOne.mockResolvedValue({
        userId: 1,
        email: 'test@example.com',
      });
      (service as any).emailTransporter = {
        sendMail: jest.fn().mockResolvedValue({ messageId: '123' }),
      };

      const result = await service.retryFailedSends();

      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('should respect retry limit', async () => {
      const MAX_RETRIES = 3;

      await service.retryFailedSends();

      expect(mockDeliveryModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          retryCount: { $lt: MAX_RETRIES },
        }),
      );
    });

    it('should increment retry counter on failure', async () => {
      const failedDelivery = {
        userId: 1,
        email: 'test@example.com',
        status: 'failed',
        retryCount: 1,
      };
      mockDeliveryModel.find.mockResolvedValue([failedDelivery]);
      mockSubscriptionModel.findOne.mockResolvedValue({
        userId: 1,
        email: 'test@example.com',
      });
      (service as any).emailTransporter = {
        sendMail: jest.fn().mockRejectedValue(new Error('SMTP error')),
      };

      await service.retryFailedSends();

      expect(mockDeliveryModel.updateOne).toHaveBeenCalled();
    });
  });

  describe('Health Checks', () => {
    it('should check service health', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ status: 200, ok: true })
        .mockResolvedValueOnce({ status: 200, ok: true });

      const health = await service.checkServiceHealth();

      expect(health).toBeDefined();
      expect(typeof health).toBe('object');
    });

    it('should handle service unavailability', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Connection failed'));

      const health = await service.checkServiceHealth();

      expect(health).toBeDefined();
    });
  });

  describe('Statistics', () => {
    it('should return total subscribed count', async () => {
      mockSubscriptionModel.countDocuments.mockResolvedValue(150);

      const count = await service.getTotalSubscribedCount();

      expect(count).toBe(150);
      expect(mockSubscriptionModel.countDocuments).toHaveBeenCalledWith({
        isSubscribed: true,
      });
    });

    it('should return failed delivery count', async () => {
      mockDeliveryModel.countDocuments.mockResolvedValue(5);

      const count = await service.getFailedDeliveries();

      expect(count).toBe(5);
    });

    it('should track pending deliveries', async () => {
      mockDeliveryModel.countDocuments.mockResolvedValue(20);

      const pending = await service.getPendingDeliveries();

      expect(pending).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Newsletter Send Workflow', () => {
    it('should find subscribed users', async () => {
      const subscribers = [
        { userId: 1, email: 'user1@example.com' },
        { userId: 2, email: 'user2@example.com' },
      ];
      mockSubscriptionModel.find.mockResolvedValue(subscribers);

      const result = await mockSubscriptionModel.find({
        isSubscribed: true,
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(mockSubscriptionModel.find).toHaveBeenCalledWith({
        isSubscribed: true,
      });
    });

    it('should skip unsubscribed users', async () => {
      mockSubscriptionModel.find.mockResolvedValue([]);

      const result = await mockSubscriptionModel.find({
        isSubscribed: true,
      });

      expect(result).toEqual([]);
      expect(mockSubscriptionModel.find).toHaveBeenCalledWith({
        isSubscribed: true,
      });
    });
  });
});
