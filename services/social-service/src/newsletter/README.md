# Newsletter Service

## Overview

The Newsletter Service handles user subscriptions, newsletter generation, and delivery with advanced features like:

- User subscription management
- Personalized newsletter content generation
- Batch processing with checkpoints
- Idempotent delivery (prevents duplicate sends)
- Retry mechanism with exponential backoff
- Service health checks
- Trending itineraries computation with caching

## Architecture

### Components

1. **NewsletterService** - Core business logic
2. **NewsletterController** - HTTP endpoints (endpoints in BATCH 3)
3. **NewsletterModule** - NestJS module configuration
4. **DTOs** - Data validation and transformation

### Database Collections

- **newsletter_subscriptions** - User subscription preferences
- **newsletter_deliveries** - Delivery tracking and retry history
- **likes** - Social engagement data (for trending)
- **comments** - Social engagement data (for trending)

## Key Features

### 1. Subscription Management

```typescript
// Subscribe user
await newsletterService.subscribeUser(userId, email, 'weekly');

// Unsubscribe
await newsletterService.unsubscribeUser(userId);

// Get subscription
const subscription = await newsletterService.getSubscription(userId);

// Update preferences
await newsletterService.updateSubscription(userId, { isSubscribed: true });
```

### 2. Newsletter Sending

**Weekly Newsletter:**
```typescript
const result = await newsletterService.sendWeekly();
// Result: { successCount, failureCount, totalAttempted, startedAt, completedAt, errors }
```

**Features:**
- Batch processing (50 users per batch, configurable)
- Health checks for dependent services
- Idempotency (prevents duplicate sends)
- Comprehensive logging

### 3. Content Generation

**Personalized Content:**
- User activity summary (likes, comments)
- Trending itineraries (multi-factor scoring)
- Preference management links
- Unsubscribe links

**Scoring Algorithm:**
```
Score = (likes × 0.5) + (comments × 0.3) + (recency × 0.2)
```

### 4. Trending Itineraries

```typescript
const trending = await newsletterService.getTrendingItineraries(limit);
```

**Features:**
- 24-hour caching (performance optimization)
- Quality filter (minimum 3 likes)
- Multi-factor scoring
- Automatic cache invalidation

### 5. Retry Mechanism

```typescript
const retryCount = await newsletterService.retryFailedSends();
```

**Features:**
- Respects retry limits (configurable, default 3)
- Exponential backoff (configurable delay)
- Idempotent retry (won't resend already-sent newsletters)
- Comprehensive error tracking

### 6. Health Checks

```typescript
const health = await newsletterService.checkServiceHealth();
// Result: { userService: boolean, itineraryService: boolean }
```

## Environment Variables

```bash
# SMTP Configuration
NEWSLETTER_SMTP_HOST=smtp.gmail.com
NEWSLETTER_SMTP_PORT=587
NEWSLETTER_SMTP_USER=your-email@gmail.com
NEWSLETTER_SMTP_PASSWORD=your-app-password

# Email Settings
NEWSLETTER_FROM_NAME=CloudAppDev
NEWSLETTER_FROM_EMAIL=noreply@cloudappdev.com

# Processing Configuration
NEWSLETTER_BATCH_SIZE=50              # Users per batch
NEWSLETTER_RETRY_LIMIT=3              # Max retries
NEWSLETTER_RETRY_DELAY_MS=5000        # Delay between retries

# Service URLs (for health checks)
USER_SERVICE_URL=http://localhost:8080
ITINERARY_SERVICE_URL=http://localhost:8081

# Frontend URL (for newsletter links)
FRONTEND_URL=http://localhost:3000
```

## Dry-Run Mode

If SMTP credentials are not configured, the service operates in **dry-run mode**:
- Logs emails instead of sending them
- Useful for development and testing
- No actual emails are sent

## Implementation Details

### Idempotency

Newsletter delivery is idempotent through database state tracking:
1. Before sending, checks if user already received newsletter in this run
2. Skips duplicate sends automatically
3. Prevents double-sending if operation is retried

### Batch Processing with Checkpoints

```
1. Get all subscribers
2. Split into batches (50 per batch)
3. For each batch:
   - Send to all users in parallel (Promise.all)
   - Mark batch as processed
   - Continue to next batch
```

### Error Handling

- **Send Failures** - Logged and marked for retry
- **Health Check Failures** - Abort entire send operation
- **Service Unavailability** - Graceful degradation with logging
- **Missing Data** - Handled with sensible defaults

### Logging

Comprehensive logging with NestJS Logger:
- Service initialization
- Subscription changes
- Newsletter sends (success/failure)
- Health checks
- Batch processing progress
- Retry operations

## Usage Examples

### Subscribe User

```typescript
const subscription = await newsletterService.subscribeUser(
  42,
  'user@example.com',
  'weekly'
);
```

### Send Weekly Newsletter

```typescript
try {
  const result = await newsletterService.sendWeekly();
  console.log(`Sent ${result.successCount}/${result.totalAttempted}`);

  if (result.errors) {
    console.log('Failures:', result.errors);
  }
} catch (error) {
  console.error('Newsletter send failed:', error);
}
```

### Retry Failed Sends

```typescript
const retryCount = await newsletterService.retryFailedSends();
console.log(`Retried ${retryCount} emails`);
```

### Check Service Health

```typescript
const health = await newsletterService.checkServiceHealth();
if (!health.userService) {
  console.error('User Service is unavailable');
}
```

## Testing

### Unit Tests (Phase 4)

- Service methods
- Error handling
- Idempotency verification
- Batch processing logic

### Integration Tests (Phase 4)

- Full send workflow
- Email delivery
- Database consistency

### Load Tests (Phase 4)

- Large subscriber lists
- Batch processing performance
- Concurrent retry operations

## Future Enhancements

### Phase 4 (Production Grade)

1. **Email Templates**
   - Handlebars template integration
   - HTML email design
   - Responsive layouts

2. **Advanced Features**
   - Personalized newsletter based on user interests
   - A/B testing for subject lines
   - Segmentation by user activity level
   - Analytics tracking (opens, clicks)

3. **Scheduling**
   - Cron job integration
   - Time zone aware scheduling
   - Frequency preferences (daily, weekly, monthly)

4. **Performance**
   - Message queuing (Bull, RabbitMQ)
   - Async job processing
   - Database optimization

5. **Reliability**
   - Circuit breaker pattern
   - Graceful degradation
   - Dead letter queues

6. **Monitoring**
   - Prometheus metrics
   - Alert integration
   - Delivery rate tracking

## Database Schemas

### NewsletterSubscription

```typescript
{
  userId: number,           // Unique index
  email: string,
  isSubscribed: boolean,    // Default: true
  frequency: string,        // 'weekly' | 'monthly', Default: 'weekly'
  createdAt: Date,
  updatedAt: Date
}

// Indexes:
// - userId (unique)
// - (isSubscribed, frequency) - composite
```

### NewsletterDelivery

```typescript
{
  sendRun: ObjectId,        // Tracking ID for batch
  userId: number,           // Index
  email: string,
  status: string,           // 'pending' | 'sent' | 'failed'
  error: string,            // Error message if failed
  retryCount: number,       // Default: 0
  sentAt: Date,             // When actually sent
  createdAt: Date,
  updatedAt: Date
}

// Indexes:
// - (sendRun, status) - composite
// - (status, retryCount, updatedAt) - for retry queries
// - (userId, createdAt) - for delivery history
```

## File Structure

```
newsletter/
├── dto/
│   ├── create-subscription.dto.ts
│   ├── update-subscription.dto.ts
│   ├── send-newsletter-result.dto.ts
│   └── index.ts
├── newsletter.service.ts       # Core business logic
├── newsletter.controller.ts     # HTTP endpoints (BATCH 3)
├── newsletter.module.ts         # Module configuration
└── README.md                    # This file
```

## Related Files

- `services/social-service/src/schemas/newsletter-subscription.schema.ts`
- `services/social-service/src/schemas/newsletter-delivery.schema.ts`
- `services/social-service/src/app.module.ts`

## Notes

- All timestamps use UTC
- Email sending uses nodemailer (supports SMTP, Gmail, etc.)
- MongoDB is used for all data persistence
- Service is stateless and horizontally scalable
- Implements 12-Factor App principles
