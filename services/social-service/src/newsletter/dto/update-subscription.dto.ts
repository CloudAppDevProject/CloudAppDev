import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { NewsletterFrequency } from '../../schemas/newsletter-subscription.schema';

/**
 * DTO for updating newsletter subscription preferences
 * Used in PATCH /api/v1/newsletter/preferences/:userId
 */
export class UpdateSubscriptionDto {
  /**
   * Subscribe or unsubscribe from newsletter
   */
  @IsBoolean()
  @IsOptional()
  isSubscribed?: boolean;

  /**
   * Update newsletter frequency preference
   */
  @IsEnum(NewsletterFrequency)
  @IsOptional()
  frequency?: NewsletterFrequency;
}
