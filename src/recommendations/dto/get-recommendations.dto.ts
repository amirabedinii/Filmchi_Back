import { IsString, MinLength } from 'class-validator';

export class GetRecommendationsDto {
  @IsString()
  @MinLength(2)
  query!: string;
}


