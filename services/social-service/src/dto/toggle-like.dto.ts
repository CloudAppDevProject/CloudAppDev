import { IsNotEmpty } from 'class-validator';

export class ToggleLikeDto {
  @IsNotEmpty()
  userId: string | number;

  @IsNotEmpty()
  itineraryId: string | number;
}
