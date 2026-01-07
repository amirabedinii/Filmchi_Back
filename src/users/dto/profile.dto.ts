import {
  IsOptional,
  IsString,
  IsArray,
  ArrayMaxSize,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  favoriteGenres?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  favoriteDirectors?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  favoriteActors?: string[];
}

export class UpdatePrivacyDto {
  @IsOptional()
  // free-form object; validated by business logic
  privacy?: Record<string, any>;
}

export class UpdatePreferencesDto {
  @IsOptional()
  // free-form object; validated by business logic
  preferences?: Record<string, any>;
}
