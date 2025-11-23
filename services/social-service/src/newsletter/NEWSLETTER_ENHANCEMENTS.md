# Newsletter Enhancements Documentation

## Overview

The newsletter system has been enhanced with two major features:

1. **Enriched Trending Itineraries** - Detailed trending recommendations with locations and thumbnail images
2. **Personalized Recommendations** - Interest-based recommendations using keyword and tag matching

These enhancements provide users with more relevant and visually appealing newsletter content, fulfilling the requirements for:
- Content based on user interests and travel behavior
- Recommendations from travelers with overlapping interests

## Architecture

### New MongoDB Schemas

#### 1. TrendingItinerary Schema
Location: `src/schemas/trending-itinerary.schema.ts`

Stores enriched details for trending itineraries including:
- **Core Data**: itineraryId, title, description, userId, userName
- **Engagement Metrics**: likeCount, commentCount, score
- **Rich Content**:
  - `locations` - Array of LocationDetail with name, description, coordinates
  - `images` - Array of ImageMetadata with URLs and descriptions
  - `keywords` - Extracted keywords from title/description for matching
  - `tags` - User-defined tags/categories
- **Timestamps**: trendingComputedAt for cache invalidation

**Indexes**:
- `score`, `trendingComputedAt` - For ranking queries
- `keywords`, `tags` - For interest matching
- `userId` - For user queries

#### 2. UserInterests Schema
Location: `src/schemas/user-interests.schema.ts`

Tracks user interests based on their activity:
- **Keywords**: Frequency-weighted keywords from liked itineraries
- **Tags**: Categories the user has engaged with
- **Destinations**: Preferred locations/countries
- **Metadata**: Last computation time, total liked itineraries

**Computation**:
- Based on itineraries liked in past 90 days
- Automatically updated when `computeUserInterests()` is called
- Used for interest similarity calculations

### Enhanced NewsletterSubscription Schema
Location: `src/schemas/newsletter-subscription.schema.ts`

New preference fields:
- `includeTrending` - Include trending section (default: true)
- `includeRecommendations` - Include recommendations section (default: true)
- `includeActivitySummary` - Include activity summary (default: true)
- `recommendationCount` - Number of recommendations to include (default: 5)

## Service Methods

### NewsletterService Enhancements

#### 1. `computeUserInterests(userId: number)`
Analyzes user's liked itineraries and extracts:
- Keyword frequencies (normalized, top 20)
- Tags from liked itineraries (top 15)
- Preferred destinations (top 10)

**Flow**:
1. Fetch all itineraries liked in past 90 days
2. For each itinerary, extract keywords/tags/locations from trending cache
3. Count frequencies and sort by popularity
4. Store in UserInterests collection (upsert)

**Returns**: UserInterestsDocument or null

#### 2. `calculateInterestSimilarity(userInterests, itinerary)`
Scores itinerary match to user interests using weighted formula:
- **Keywords** (40%): Percentage of itinerary keywords matching user interests
- **Tags** (30%): Percentage of itinerary tags in user's liked tags
- **Destinations** (30%): Percentage of itinerary locations in user's preferred destinations

**Score Range**: 0 to 1.0 (higher = better match)

#### 3. `getRecommendedItineraries(userId, limit)`
Generates personalized recommendations:

**Algorithm**:
1. Get or compute user interests
2. If no interests, fallback to trending itineraries
3. Fetch fresh trending itineraries from past 7 days
4. Exclude user's own itineraries
5. Score each candidate using interest similarity
6. Return top N matches with highest similarity scores

**Output Format**:
```typescript
{
  itineraryId: number;
  title: string;
  userName: string;
  likeCount: number;
  commentCount: number;
  score: number;
  locations: Array<{ name: string; description?: string }>;
  thumbnail?: string;  // First image URL
  similarityScore: number;  // 0-1 scale
}
```

#### 4. `enrichTrendingItineraries(trendingList)`
Fetches full details for trending itineraries:

**Features**:
- Tries to fetch from TrendingItinerary cache first
- Falls back to creating basic entries if not cached
- Graceful error handling (continues on individual failures)
- Returns locations and images for rendering

**Returns**: Enhanced trending list with media and location details

#### 5. `extractKeywords(text, limit)`
Private helper that extracts meaningful keywords:
- Removes common stop words
- Filters short words (< 3 chars)
- Returns limited array of keywords
- Used for interest computation

## Newsletter Content Generation

### Enhanced `generateNewsletterContent()` Method

**Process**:
1. Get user activity (likes/comments from past week)
2. Enrich trending data with locations and images
3. Compute or fetch user interests
4. Generate recommendations based on interests
5. Prepare template data with both sections
6. Render using Handlebars template (or fallback HTML)

**Template Data Structure**:
```typescript
{
  // User info
  userName: string;
  weekStart: string;
  weekEnd: string;

  // Activity metrics
  likeCount: number;
  commentCount: number;

  // Trending section (enriched)
  trendingItineraries: Array<{
    itineraryId: number;
    likeCount: number;
    commentCount: number;
    locations: string;      // "Location 1, Location 2"
    thumbnail?: string;     // Image URL
  }>;

  // Recommendations section
  recommendations: Array<{
    itineraryId: number;
    title: string;
    userName: string;
    likeCount: number;
    commentCount: number;
    locations: string;
    thumbnail?: string;
    similarityScore: string;  // "75%" format
  }>;
  hasRecommendations: boolean;

  // URLs
  preferencesUrl: string;
  unsubscribeUrl: string;
  appUrl: string;
}
```

### HTML Email Template

**Sections**:
1. **Header** - Purple gradient with newsletter title and week range
2. **Greeting** - Personalized welcome message
3. **Your Activity** - Engagement summary (likes, comments)
4. **Trending This Week** - Top trending itineraries with:
   - Location names (2 locations max)
   - Thumbnail image
   - Like and comment counts
5. **Recommended For You** - Personalized recommendations with:
   - Title and creator name
   - Match percentage badge
   - Thumbnail image
   - Locations
   - Engagement metrics
6. **Call-to-Action** - Link to explore more
7. **Footer** - Links to manage preferences and unsubscribe

**Visual Design**:
- Purple theme (#667eea, #764ba2)
- Responsive layout (max-width: 650px)
- Gradient backgrounds for visual appeal
- Emoji indicators for different sections
- Clean typography and spacing

## Data Flow

### Example: User Newsletter Generation

```
User likes itinerary X
    ↓
Interest.computeUserInterests(userId)
    → Finds all likes in past 90 days
    → Extracts keywords, tags, destinations
    → Stores in UserInterests collection
    ↓
Newsletter.sendWeekly()
    → For each subscriber:
        ↓
        getTrendingItineraries()
            → Aggregates likes/comments from past 7 days
            → Scores using multi-factor formula
            → Returns top 10
        ↓
        enrichTrendingItineraries(trendingList)
            → Fetches locations and images
            → Returns enriched data
        ↓
        getRecommendedItineraries(userId)
            → computeUserInterests(userId) [if not cached]
            → Scores fresh trending itineraries against interests
            → Returns top 5 recommendations
        ↓
        generateNewsletterContent(user, trending)
            → Combines activity, trending, and recommendations
            → Renders HTML email
        ↓
        sendEmail()
            → Delivers via SendGrid/SMTP
```

## Performance Considerations

### Caching Strategy

1. **Trending Cache** (24 hours)
   - Computed trending itineraries cached in memory
   - Invalidates daily for freshness
   - Reduces database aggregation queries

2. **User Interests Cache** (Implicit)
   - Stored in MongoDB with `lastComputedAt` field
   - Recomputed on-demand if stale
   - One computation per week typical (during newsletter send)

3. **TrendingItinerary Collection**
   - Caches enriched details (locations, images, keywords)
   - Built on-demand from itinerary data
   - Indexes on score, keywords, tags for fast lookup

### Query Optimization

- **Batch Processing**: Newsletter sends 50 users at a time
- **Parallel Scoring**: Recommendations computed in parallel
- **Index Usage**: Strategic indexes on frequently queried fields
- **Projection**: Only fetching needed fields from MongoDB

## Configuration

### Environment Variables

```bash
# Newsletter batch size (default: 50)
NEWSLETTER_BATCH_SIZE=50

# Retry configuration
NEWSLETTER_RETRY_LIMIT=3
NEWSLETTER_RETRY_DELAY_MS=5000

# Frontend URL for links in newsletter
FRONTEND_URL=http://localhost:3000

# Email configuration
SENDGRID_FROM_EMAIL=noreply@cloudappdev.com
```

### Default Values

- **Recommendations per user**: 5
- **Trending sample in template**: 3
- **Interest keywords tracked**: Top 20
- **Interest tags tracked**: Top 15
- **Preferred destinations tracked**: Top 10
- **Similarity threshold**: > 0 (any match shown)

## Integration Points

### With Other Services

1. **Itinerary Service**
   - Currently uses TrendingItinerary cache
   - Future: Direct API calls to fetch real-time details

2. **User Service**
   - Fetches user emails for sending
   - Gets user details for personalization

3. **Like/Comment Collections**
   - Used to compute trending scores
   - Used to extract user interests

## Future Enhancements

1. **Machine Learning Recommendations**
   - Replace keyword matching with collaborative filtering
   - Track recommendation click-through rates
   - A/B test content layouts

2. **Dynamic Content**
   - User preference learning
   - Seasonal destination suggestions
   - Weather-based recommendations

3. **Cross-Service Personalization**
   - Travel warnings relevant to user destinations
   - Flight deals for user's traveled routes
   - Weather alerts for upcoming trips

4. **Advanced Analytics**
   - Track newsletter engagement (opens, clicks)
   - A/B test recommendation algorithms
   - Measure recommendation quality (conversion)

## Testing

### Unit Tests Coverage

```typescript
// computeUserInterests()
- Extract keywords from liked itineraries
- Handle users with no likes
- Normalize keyword frequencies

// calculateInterestSimilarity()
- Score matching keywords
- Score matching tags
- Score matching destinations
- Weighted calculation accuracy

// getRecommendedItineraries()
- Fallback to trending if no interests
- Exclude user's own itineraries
- Filter by similarity score
- Limit results properly

// enrichTrendingItineraries()
- Handle missing cache entries
- Graceful error on failures
- Return complete enhanced data
```

### Integration Testing

- Full newsletter generation with enriched content
- End-to-end recommendation scoring
- Email delivery tracking
- Interest computation validation

## Monitoring & Logging

### Log Messages

```
Computed interests for user 123: 15 keywords, 8 tags
Generated 5 recommendations for user 123
Failed to enrich itinerary 456: [error details]
Newsletter sent successfully to user 123
```

### Metrics to Track

- Recommendations generated per newsletter
- Average similarity score of recommendations
- Interest computation time
- Newsletter generation time
- Enrichment success rate

## Dependencies

- NestJS/Mongoose for database operations
- Handlebars for HTML templating
- Native MongoDB for aggregation queries
- SendGrid/SMTP for email delivery

## Error Handling

All recommendation methods include:
- Try-catch blocks with detailed logging
- Graceful degradation (fallback to basic content)
- Partial success handling (some failures don't block entire newsletter)
- Idempotency checks to prevent duplicate sends

## Related Files

- `newsletter.service.ts` - Service implementation
- `newsletter-subscription.schema.ts` - User preferences
- `trending-itinerary.schema.ts` - Enriched trending cache
- `user-interests.schema.ts` - Interest tracking
- `newsletter.module.ts` - Module configuration
- `newsletter.controller.ts` - API endpoints
