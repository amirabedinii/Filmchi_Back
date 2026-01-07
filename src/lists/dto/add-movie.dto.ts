import { IsInt, IsNotEmpty, Min, IsOptional, IsString } from 'class-validator';

export class AddMovieDto {
  @IsInt()
  @Min(1)
  tmdbId: number;

  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  posterPath?: string;
}
