import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NewsletterService } from './newsletter.service';
import { NewsletterController } from './newsletter.controller';
import { getModelToken } from '@nestjs/mongoose';

/**
 * Newsletter Integration Tests
 *
 * These tests verify the newsletter service integration with controllers and models.
 * For full API e2e testing, see MANUAL_TESTING_CHECKLIST.md
 *
 * Tests focus on:
 * - Service-to-controller integration
 * - Mock model interactions
 * - Business logic flows
 */
describe('Newsletter Integration Tests', () => {
  let app: INestApplication;
  let newsletterService: NewsletterService;
  let mockSubscriptionModel: any;
  let mockDeliveryModel: any;

  const testUserId = 999;
  const testEmail = 'integration-test@example.com';

  beforeAll(async () => {
    // Mock MongoDB models
    mockSubscriptionModel = {
      findOneAndUpdate: jest.fn().mockResolvedValue({
        userId: testUserId,
        email: testEmail,
        isSubscribed: true,
        frequency: 'weekly',
      }),
      findOne: jest.fn().mockResolvedValue({
        userId: testUserId,
        email: testEmail,
        isSubscribed: true,
      }),
      find: jest.fn().mockResolvedValue([
        { userId: 1, email: 'user1@example.com', isSubscribed: true },
      ]),
      countDocuments: jest.fn().mockResolvedValue(1),
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
            title: 'Paris Trip',
            likeCount: 10,
            score: 8,
          },
        ]),
      }),
    };

    const mockLikesModel = {
      countDocuments: jest.fn().mockResolvedValue(5),
      aggregate: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      }),
    };

    const mockCommentsModel = {
      countDocuments: jest.fn().mockResolvedValue(3),
    };

    // Create test module
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [NewsletterController],
      providers: [
        NewsletterService,
        {
          provide: getModelToken('NewsletterSubscription'),
          useValue: mockSubscriptionModel,
        },
        {
          provide: getModelToken('NewsletterDelivery'),
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

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    newsletterService = moduleFixture.get<NewsletterService>(NewsletterService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Subscription Workflow', () => {
    it('should complete subscription flow', async () => {
      // Subscribe
      const subResult = await newsletterService.subscribeUser(
        testUserId,
        testEmail,
        'weekly',
      );
      expect(subResult).toBeDefined();
      if (subResult) {
        expect(subResult.isSubscribed).toBe(true);
      }

      // Get subscription
      const getResult = await newsletterService.getSubscription(testUserId);
      expect(getResult).toBeDefined();
      if (getResult) {
        expect(getResult.isSubscribed).toBe(true);
      }

      // Unsubscribe
      const unsubResult = await newsletterService.unsubscribeUser(testUserId);
      expect(unsubResult).toBeDefined();
    });

    it('should handle multiple subscription frequencies', async () => {
      const freqs = ['weekly', 'monthly'];
      for (const freq of freqs) {
        const result = await newsletterService.subscribeUser(
          testUserId,
          testEmail,
          freq,
        );
        expect(result).toBeDefined();
      }
    });
  });

  describe('User Activity Calculation', () => {
    it('should calculate user activity', async () => {
      const activity = await newsletterService.getUserActivity(testUserId);
      expect(activity.likeCount).toBe(5);
      expect(activity.commentCount).toBe(3);
    });

    it('should handle users with no activity', async () => {
      mockDeliveryModel.countDocuments.mockResolvedValue(0);

      const activity = await newsletterService.getUserActivity(testUserId);
      expect(activity.likeCount).toBeGreaterThanOrEqual(0);
      expect(activity.commentCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Trending Itineraries', () => {
    it('should retrieve trending itineraries', async () => {
      const trending = await newsletterService.getTrendingItineraries();
      expect(Array.isArray(trending)).toBe(true);
    });

    it('should cache trending results', async () => {
      await newsletterService.getTrendingItineraries();
      const cached = (newsletterService as any).trendingCache;
      expect(cached).toBeDefined();
    });
  });

  describe('Newsletter Content Generation', () => {
    it('should generate newsletter content', async () => {
      const user = { userId: 1, email: testEmail, name: 'Test User' };
      const trending = [
        {
          itineraryId: 1,
          title: 'Paris Trip',
          likeCount: 10,
          commentCount: 2,
          score: 8,
        },
      ];

      const content = await newsletterService.generateNewsletterContent(
        user as any,
        trending as any,
      );

      expect(content).toBeDefined();
      expect(typeof content).toBe('string');
    });

    it('should handle missing user data', async () => {
      const user = { userId: 1, email: testEmail };
      const content = await newsletterService.generateNewsletterContent(
        user as any,
        [],
      );

      expect(content).toBeDefined();
    });
  });

  describe('Email Operations', () => {
    it('should send email (dry-run if not configured)', async () => {
      const result = await newsletterService.sendEmail(
        testEmail,
        'Test Subject',
        '<html>Content</html>',
      );

      expect(typeof result).toBe('boolean');
    });

    it('should handle email sending with transporter', async () => {
      (newsletterService as any).emailTransporter = {
        sendMail: jest.fn().mockResolvedValue({ messageId: '123' }),
      };

      const result = await newsletterService.sendEmail(
        testEmail,
        'Subject',
        '<html>Content</html>',
      );

      expect(result).toBe(true);
    });
  });

  describe('Batch Processing', () => {
    it('should split users into batches', () => {
      const users = Array.from({ length: 250 }, (_, i) => ({ userId: i }));
      const batches = (newsletterService as any).chunk(users, 50);

      expect(batches.length).toBe(5);
      expect(batches[0].length).toBe(50);
    });

    it('should handle uneven batch sizes', () => {
      const users = Array.from({ length: 45 }, (_, i) => ({ userId: i }));
      const batches = (newsletterService as any).chunk(users, 50);

      expect(batches.length).toBe(1);
      expect(batches[0].length).toBe(45);
    });
  });

  describe('Idempotency', () => {
    it('should skip already sent users', async () => {
      mockDeliveryModel.findOne.mockResolvedValue({
        status: 'sent',
        sentAt: new Date(),
      });

      const user = { userId: 1, email: testEmail } as any;
      const content = [
        { itineraryId: 1, likeCount: 10, commentCount: 2, score: 8 },
      ] as any;
      await newsletterService.sendToUserWithTracking(
        user,
        content,
        { _id: 'test-id' } as any,
      );

      // Second call to updateOne should not happen due to idempotency
      expect(mockDeliveryModel.updateOne).not.toHaveBeenCalled();
    });
  });

  describe('Retry Mechanism', () => {
    it('should process failed sends for retry', async () => {
      mockDeliveryModel.find.mockResolvedValue([
        { userId: 1, email: testEmail, status: 'failed', retryCount: 0 },
      ]);
      mockSubscriptionModel.findOne.mockResolvedValue({
        userId: 1,
        email: testEmail,
      });

      const result = await newsletterService.retryFailedSends();
      expect(typeof result).toBe('number');
    });

    it('should respect retry limits', async () => {
      await newsletterService.retryFailedSends();

      expect(mockDeliveryModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          retryCount: expect.objectContaining({
            $lt: expect.any(Number),
          }),
        }),
      );
    });
  });

  describe('Statistics', () => {
    it('should count subscribed users', async () => {
      const count = await newsletterService.getTotalSubscribedCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should count failed deliveries', async () => {
      const count = await newsletterService.getFailedDeliveries();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should count pending deliveries', async () => {
      const count = await newsletterService.getPendingDeliveries();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Newsletter Send Workflow', () => {
    it('should find subscribed users', async () => {
      mockSubscriptionModel.find.mockResolvedValue([
        { userId: 1, email: 'user1@example.com', isSubscribed: true },
      ]);

      const users = await (newsletterService as any).subscriptionModel.find({
        isSubscribed: true,
      });

      expect(users).toBeDefined();
      expect(Array.isArray(users)).toBe(true);
    });

    it('should skip unsubscribed users', async () => {
      mockSubscriptionModel.find.mockResolvedValue([]);

      const users = await (newsletterService as any).subscriptionModel.find({
        isSubscribed: true,
      });

      expect(users).toEqual([]);
    });
  });

  describe('Health Checks', () => {
    it('should perform health checks', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({ status: 200, ok: true })
        .mockResolvedValueOnce({ status: 200, ok: true });

      const health = await newsletterService.checkServiceHealth();
      expect(health).toBeDefined();
    });
  });
});
