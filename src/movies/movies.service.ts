import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MovieRating } from '../entities/movie-rating.entity';
import { TmdbService } from './tmdb.service';

type SearchOptions = {
  query?: string;
  page?: number;
  year?: number;
  withGenres?: string; // comma-separated ids
  sortBy?: string; // popularity.desc, vote_average.desc, etc.
};

@Injectable()
export class MoviesService {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly tmdb: TmdbService,
    @InjectRepository(MovieRating)
    private readonly ratingRepo: Repository<MovieRating>,
  ) {}

  // Deprecated internal TMDB helpers are replaced by TmdbService

  async searchMovies(options: SearchOptions) {
    const page = options.page && options.page > 0 ? options.page : 1;
    return this.tmdb.get('/search/movie', {
      query: options.query,
      year: options.year,
      with_genres: options.withGenres,
      sort_by: options.sortBy,
      page,
    });
  }

  async getMovieDetails(tmdbId: number) {
    return this.tmdb.get(`/movie/${tmdbId}`);
  }

  async getList(kind: 'trending' | 'popular' | 'top_rated' | 'now_playing' | 'upcoming', page = 1) {
    const pathMap: Record<string, string> = {
      trending: '/trending/movie/week',
      popular: '/movie/popular',
      top_rated: '/movie/top_rated',
      now_playing: '/movie/now_playing',
      upcoming: '/movie/upcoming',
    };
    return this.tmdb.get(pathMap[kind], { page });
  }

  async getSimilar(tmdbId: number, page = 1) {
    return this.tmdb.get(`/movie/${tmdbId}/similar`, { page });
  }

  async setUserRating(userId: string, tmdbId: number, rating: number) {
    let entity = await this.ratingRepo.findOne({ where: { userId, tmdbId } });
    if (!entity) {
      entity = this.ratingRepo.create({ userId, tmdbId, rating });
    } else {
      entity.rating = rating;
    }
    const saved = await this.ratingRepo.save(entity);
    return { tmdbId: saved.tmdbId, rating: saved.rating };
  }
}


