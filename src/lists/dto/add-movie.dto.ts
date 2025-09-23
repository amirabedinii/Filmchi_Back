import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class AddMovieDto {
  @IsInt()
  @Min(1)
  tmdbId: number;

  @IsNotEmpty()
  title: string;
}
