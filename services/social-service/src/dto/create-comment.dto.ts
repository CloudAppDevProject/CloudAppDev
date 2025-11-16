import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCommentDto {
  @IsNotEmpty()
  userId: string | number;

  @IsNotEmpty()
  itineraryId: string | number;

  @IsNotEmpty()
  @IsString()
  text: string;
}
