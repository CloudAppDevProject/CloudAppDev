import { IsEmail, IsEnum, IsNumber, IsOptional } from 'class-validator';

/**
 * DTO for subscribing a user to the newsletter
 * Used in POST /api/v1/newsletter/subscribe
 */
export class CreateSubscriptionDto {
  /**
   * User ID from user service
   */
  @IsNumber()
  userId: number;

  /**
   * Email address to send newsletter to
   */
  @IsEmail()
  email: string;

  /**
   * Newsletter frequency preference
   * @default 'weekly'
   */
  @IsEnum(['weekly', 'monthly'])
  @IsOptional()
  frequency?: 'weekly' | 'monthly';
}
