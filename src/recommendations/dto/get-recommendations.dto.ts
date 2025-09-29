import { IsString, MinLength, IsOptional, Matches } from 'class-validator';

export class GetRecommendationsDto {
  @IsString()
  @MinLength(2)
  query!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z]{2}$/i, { message: 'Language must be a valid ISO 639-1 code (e.g., "fa", "en")' })
  language?: string;
}
