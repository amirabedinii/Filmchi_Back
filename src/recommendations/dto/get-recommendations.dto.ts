import {
  IsString,
  MinLength,
  IsOptional,
  Matches,
  IsBoolean,
  IsArray,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ContentFilterDto {
  @IsOptional()
  @IsBoolean()
  includeAdult?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^(G|PG|PG-13|R|NC-17)$/, {
    message: 'Certification must be G, PG, PG-13, R, or NC-17',
  })
  maxCertification?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/, {
    message:
      'Country code must be a valid ISO 3166-1 alpha-2 code (e.g., "US", "IR")',
  })
  certificationCountry?: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  excludeGenres?: number[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeKeywords?: string[];
}

export class GetRecommendationsDto {
  @IsString()
  @MinLength(2)
  query!: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z]{2}$/i, {
    message: 'Language must be a valid ISO 639-1 code (e.g., "fa", "en")',
  })
  language?: string;

  @IsOptional()
  @Type(() => ContentFilterDto)
  contentFilter?: ContentFilterDto;
}
