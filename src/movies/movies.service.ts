import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MovieRating } from '../entities/movie-rating.entity';

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
    @InjectRepository(MovieRating)
    private readonly ratingRepo: Repository<MovieRating>,
  ) {}

  private tmdbHeaders() {
    const bearer = this.config.get<string>('TMDB_BEARER_TOKEN') || '';
    return bearer ? { Authorization: `Bearer ${bearer}` } : undefined;
  }

  private tmdbBaseUrl(path: string, withApiKey = false) {
    const base = 'https://api.themoviedb.org/3';
    if (!withApiKey) return `${base}${path}`;
    const key = this.config.get<string>('TMDB_API_KEY') || '';
    const sep = path.includes('?') ? '&' : '?';
    return `${base}${path}${sep}api_key=${key}`;
  }

  private useBearer(): boolean {
    return Boolean(this.config.get<string>('TMDB_BEARER_TOKEN'));
  }

  async searchMovies(options: SearchOptions) {
    const page = options.page && options.page > 0 ? options.page : 1;
    const params = new URLSearchParams();
    if (options.query) params.set('query', options.query);
    if (options.year) params.set('year', String(options.year));
    if (options.withGenres) params.set('with_genres', options.withGenres);
    if (options.sortBy) params.set('sort_by', options.sortBy);
    params.set('page', String(page));

    const useBearer = this.useBearer();
    const url = useBearer
      ? this.tmdbBaseUrl(`/search/movie?${params.toString()}`)
      : this.tmdbBaseUrl(`/search/movie?${params.toString()}`, true);
    const resp = await firstValueFrom(this.http.get(url, { headers: this.tmdbHeaders() }));
    return resp.data;
  }

  async getMovieDetails(tmdbId: number) {
    const useBearer = this.useBearer();
    const url = useBearer
      ? this.tmdbBaseUrl(`/movie/${tmdbId}`)
      : this.tmdbBaseUrl(`/movie/${tmdbId}`, true);
    const resp = await firstValueFrom(this.http.get(url, { headers: this.tmdbHeaders() }));
    return resp.data;
  }

  async getList(kind: 'trending' | 'popular' | 'top_rated' | 'now_playing' | 'upcoming', page = 1) {
    const pathMap: Record<string, string> = {
      trending: '/trending/movie/week',
      popular: '/movie/popular',
      top_rated: '/movie/top_rated',
      now_playing: '/movie/now_playing',
      upcoming: '/movie/upcoming',
    };
    const params = new URLSearchParams({ page: String(page) });
    const useBearer = this.useBearer();
    const url = useBearer
      ? this.tmdbBaseUrl(`${pathMap[kind]}?${params.toString()}`)
      : this.tmdbBaseUrl(`${pathMap[kind]}?${params.toString()}`, true);
    const resp = await firstValueFrom(this.http.get(url, { headers: this.tmdbHeaders() }));
    return resp.data;
  }

  async getSimilar(tmdbId: number, page = 1) {
    const params = new URLSearchParams({ page: String(page) });
    const useBearer = this.useBearer();
    const url = useBearer
      ? this.tmdbBaseUrl(`/movie/${tmdbId}/similar?${params.toString()}`)
      : this.tmdbBaseUrl(`/movie/${tmdbId}/similar?${params.toString()}`, true);
    const resp = await firstValueFrom(this.http.get(url, { headers: this.tmdbHeaders() }));
    return resp.data;
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


