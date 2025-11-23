import { IsArray, IsNotEmpty, IsOptional, ArrayMinSize } from 'class-validator';

/**
 * DTO for batch likes operations
 * Allows fetching like counts and user status for multiple itineraries in one request
 */
export class BatchLikesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsNotEmpty({ each: true })
  itineraryIds: (string | number)[];

  @IsOptional()
  userId?: string | number;
}

/**
 * Response type for batch likes
 */
export interface BatchLikesResponse {
  counts: Record<string, number>;
  userLiked?: Record<string, boolean>;
}
