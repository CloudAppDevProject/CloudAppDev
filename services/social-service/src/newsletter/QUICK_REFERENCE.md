# Newsletter Service - Quick Reference

## Service Injection

```typescript
constructor(private readonly newsletterService: NewsletterService) {}
```

## Core Methods

### Subscription Management

```typescript
// Subscribe user
await newsletterService.subscribeUser(userId, email, 'weekly');

// Unsubscribe
await newsletterService.unsubscribeUser(userId);

// Get subscription
const sub = await newsletterService.getSubscription(userId);

// Update preferences
await newsletterService.updateSubscription(userId, { frequency: 'monthly' });
```

### Newsletter Operations

```typescript
// Send weekly newsletter to all subscribers
const result: SendNewsletterResultDto = await newsletterService.sendWeekly();
// Result: { successCount, failureCount, totalAttempted, startedAt, completedAt, errors? }

// Retry failed sends
const retryCount: number = await newsletterService.retryFailedSends();
```

### Data Retrieval

```typescript
// Get user activity (last 7 days)
const activity = await newsletterService.getUserActivity(userId);
// Result: { likeCount: number, commentCount: number }

// Get trending itineraries (cached 24 hours)
const trending = await newsletterService.getTrendingItineraries(10);
// Result: Array<{ itineraryId: number, likeCount, commentCount, score }>
```

### Infrastructure

```typescript
// Check dependent services
const health = await newsletterService.checkServiceHealth();
// Result: { userService: boolean, itineraryService: boolean }

// Send email directly
const sent = await newsletterService.sendEmail(to, subject, html);
// Returns: boolean
```

## DTOs

### CreateSubscriptionDto
```typescript
{
  userId: number,           // Required
  email: string,            // Required, must be valid email
  frequency?: 'weekly' | 'monthly'  // Optional, default: 'weekly'
}
```

### UpdateSubscriptionDto
```typescript
{
  isSubscribed?: boolean,   // Optional
  frequency?: 'weekly' | 'monthly'  // Optional
}
```

### SendNewsletterResultDto
```typescript
{
  successCount: number,
  failureCount: number,
  totalAttempted: number,
  startedAt: Date,
  completedAt: Date,
  errors?: Array<{ userId: number, email?: string, error: string }>
}
```

## Common Patterns

### Send Newsletter and Check Results

```typescript
try {
  const result = await this.newsletterService.sendWeekly();

  if (result.errors && result.errors.length > 0) {
    this.logger.warn(`Newsletter send had ${result.errors.length} errors`);
  }

  return {
    message: `Sent ${result.successCount}/${result.totalAttempted}`,
    result
  };
} catch (error) {
  this.logger.error('Newsletter send failed:', error);
  throw new BadRequestException('Failed to send newsletter');
}
```

### Subscribe with Validation

```typescript
async subscribeUser(@Body() dto: CreateSubscriptionDto) {
  // DTO validation happens automatically via class-validator
  const subscription = await this.newsletterService.subscribeUser(
    dto.userId,
    dto.email,
    dto.frequency || 'weekly'
  );

  return {
    message: 'Successfully subscribed',
    subscription
  };
}
```

### Handle Retry Results

```typescript
const retryCount = await this.newsletterService.retryFailedSends();
return {
  message: `Retried ${retryCount} newsletters`,
  retryCount
};
```

## Database Collections Used

- `newsletter_subscriptions` - User preferences
- `newsletter_deliveries` - Delivery history and tracking
- `likes` - For aggregating engagement (read-only)
- `comments` - For aggregating engagement (read-only)

## Features

| Feature | Method | Details |
|---------|--------|---------|
| Subscribe | `subscribeUser()` | Upsert operation |
| Unsubscribe | `unsubscribeUser()` | Sets isSubscribed=false |
| Batch Send | `sendWeekly()` | 50 users per batch, parallel |
| Retry | `retryFailedSends()` | Respects retry limits |
| Trending | `getTrendingItineraries()` | 24-hour cache |
| Content | `generateNewsletterContent()` | Personalized HTML |
| Health | `checkServiceHealth()` | Validates dependencies |
| Email | `sendEmail()` | SMTP or dry-run |

## Environment Variables

```bash
# SMTP (optional)
NEWSLETTER_SMTP_HOST=smtp.gmail.com
NEWSLETTER_SMTP_PORT=587
NEWSLETTER_SMTP_USER=***
NEWSLETTER_SMTP_PASSWORD=***

# Processing
NEWSLETTER_BATCH_SIZE=50
NEWSLETTER_RETRY_LIMIT=3
NEWSLETTER_RETRY_DELAY_MS=5000

# URLs
USER_SERVICE_URL=http://localhost:8080
ITINERARY_SERVICE_URL=http://localhost:8081
FRONTEND_URL=http://localhost:3000
```

## Error Handling

All methods include try-catch with logging:

```typescript
try {
  const result = await this.newsletterService.sendWeekly();
  // Handle success
} catch (error) {
  // Error is already logged
  // Handle error response
}
```

## Performance Notes

- **Batch Size:** 50 users (configurable)
- **Trending Cache:** 24 hours
- **Quality Filter:** Minimum 3 likes for trending
- **Retry Delay:** 5 seconds between retries
- **Health Check Timeout:** 3 seconds

## Dry-Run Mode

If `NEWSLETTER_SMTP_USER` and `NEWSLETTER_SMTP_PASSWORD` are not set:
- Email sends are logged but not actually sent
- Perfect for development/testing
- No configuration required

## Idempotency

All operations are idempotent:
- Safe to call multiple times
- Database state prevents duplicates
- Retries won't cause double-sends
- Safe for microservices architecture

---

**For full documentation, see:** `services/social-service/src/newsletter/README.md`
