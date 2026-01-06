import { Injectable, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MovieRating } from '../entities/movie-rating.entity';
import { MovieBookmark } from '../entities/movie-bookmark.entity';
import { TmdbService } from './tmdb.service';
import {
  filterTmdbResponse,
  filterSingleMovie,
  filterMoviesWithPoster,
  ContentFilterOptions,
  createTmdbFilterParams,
  addMobileBackdrop,
} from './utils/movie-filter.util';
import type { ICacheProvider } from '../cache/cache.interface';
import { CACHE_PROVIDER } from '../cache/cache.interface';

type SearchOptions = {
  query?: string;
  page?: number;
  year?: number;
  withGenres?: string;
  sortBy?: string;
  language?: string;
  contentFilter?: ContentFilterOptions;
};

@Injectable()
export class MoviesService {
  // Cache TTL values in seconds
  private readonly CACHE_TTL = {
    MOVIE_DETAILS: 24 * 60 * 60, // 24 hours
    MOVIE_LISTS: 60 * 60, // 1 hour
    SEARCH_RESULTS: 30 * 60, // 30 minutes
    GENRES: 7 * 24 * 60 * 60, // 7 days
  };

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly tmdb: TmdbService,
    @InjectRepository(MovieRating)
    private readonly ratingRepo: Repository<MovieRating>,
    @InjectRepository(MovieBookmark)
    private readonly bookmarkRepo: Repository<MovieBookmark>,
    @Inject(CACHE_PROVIDER)
    private readonly cache: ICacheProvider,
  ) { }

  /**
   * Generate cache key for movie searches
   */
  private getSearchCacheKey(options: SearchOptions): string {
    const parts = [
      'movie:search',
      options.query || '',
      options.page || 1,
      options.year || '',
      options.withGenres || '',
      options.sortBy || '',
      options.language || 'en',
      JSON.stringify(options.contentFilter || {}),
    ];
    return parts.join(':');
  }

  /**
   * Generate cache key for movie details
   */
  private getMovieDetailsCacheKey(tmdbId: number, language?: string): string {
    return `movie:details:${tmdbId}:${language || 'en'}`;
  }

  /**
   * Generate cache key for movie lists
   */
  private getListCacheKey(
    kind: string,
    page: number,
    language?: string,
    contentFilter?: ContentFilterOptions,
  ): string {
    return `movie:list:${kind}:${page}:${language || 'en'}:${JSON.stringify(contentFilter || {})}`;
  }

  /**
   * Generate cache key for similar movies
   */
  private getSimilarCacheKey(
    tmdbId: number,
    page: number,
    language?: string,
    contentFilter?: ContentFilterOptions,
  ): string {
    return `movie:similar:${tmdbId}:${page}:${language || 'en'}:${JSON.stringify(contentFilter || {})}`;
  }

  /**
   * Generate cache key for genres
   */
  private getGenresCacheKey(language?: string): string {
    return `movie:genres:${language || 'en'}`;
  }

  async searchMovies(options: SearchOptions) {
    const cacheKey = this.getSearchCacheKey(options);

    // Try to get from cache
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - fetch from TMDB
    const page = options.page && options.page > 0 ? options.page : 1;
    const params: any = {
      query: options.query,
      year: options.year,
      with_genres: options.withGenres,
      sort_by: options.sortBy,
      page,
    };
    if (options.language) {
      params.language = options.language;
    }

    if (options.contentFilter) {
      const filterParams = createTmdbFilterParams(options.contentFilter);

      if (filterParams.include_adult !== undefined) {
        params.include_adult = filterParams.include_adult;
      }
    }

    const response = await this.tmdb.get('/search/movie', params);
    const result = filterTmdbResponse(response, options.contentFilter, options.language);

    // Cache the result
    await this.cache.set(cacheKey, result, this.CACHE_TTL.SEARCH_RESULTS);

    return result;
  }

  async getMovieDetails(tmdbId: number, language?: string, userId?: string) {
    const cacheKey = this.getMovieDetailsCacheKey(tmdbId, language);

    // Try to get from cache (only if no userId - user-specific data shouldn't be cached)
    if (!userId) {
      const cached = await this.cache.get<any>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Cache miss - fetch from TMDB
    const movie = await this.tmdb.getMovieDetails(tmdbId, language);
    const filteredMovie = filterSingleMovie(movie);

    if (!filteredMovie) {
      return null;
    }

    if (userId) {
      const userRating = await this.ratingRepo.findOne({
        where: { userId, tmdbId },
      });
      if (userRating) {
        return {
          ...filteredMovie,
          user_rating: userRating.rating,
        };
      }
    }

    // Cache the result (only if no userId)
    if (!userId) {
      await this.cache.set(cacheKey, filteredMovie, this.CACHE_TTL.MOVIE_DETAILS);
    }

    return filteredMovie;
  }

  async getList(
    kind: 'trending' | 'popular' | 'top_rated' | 'now_playing' | 'upcoming',
    page = 1,
    language?: string,
    contentFilter?: ContentFilterOptions,
  ) {
    const cacheKey = this.getListCacheKey(kind, page, language, contentFilter);

    // Try to get from cache
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - fetch from TMDB
    let response;
    switch (kind) {
      case 'trending':
        response = await this.tmdb.getTrending(page, language, contentFilter);
        break;
      case 'popular':
        response = await this.tmdb.getPopular(page, language, contentFilter);
        break;
      case 'top_rated':
        response = await this.tmdb.getTopRated(page, language, contentFilter);
        break;
      case 'now_playing':
        response = await this.tmdb.getNowPlaying(page, language, contentFilter);
        break;
      case 'upcoming':
        response = await this.tmdb.getUpcoming(page, language, contentFilter);
        break;
    }
    const result = filterTmdbResponse(response, contentFilter, language);

    // Cache the result
    await this.cache.set(cacheKey, result, this.CACHE_TTL.MOVIE_LISTS);

    return result;
  }

  async getSimilar(
    tmdbId: number,
    page = 1,
    language?: string,
    contentFilter?: ContentFilterOptions,
  ) {
    const cacheKey = this.getSimilarCacheKey(tmdbId, page, language, contentFilter);

    // Try to get from cache
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - fetch from TMDB
    const response = await this.tmdb.getSimilar(
      tmdbId,
      page,
      language,
      contentFilter,
    );
    const result = filterTmdbResponse(response, contentFilter, language);

    // Cache the result
    await this.cache.set(cacheKey, result, this.CACHE_TTL.MOVIE_LISTS);

    return result;
  }

  async getGenres(language?: string) {
    const cacheKey = this.getGenresCacheKey(language);

    // Try to get from cache
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    // Cache miss - fetch from TMDB
    const result = await this.tmdb.getGenres(language);

    // Cache the result
    await this.cache.set(cacheKey, result, this.CACHE_TTL.GENRES);

    return result;
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

  async bookmarkMovie(
    userId: string,
    tmdbId: number,
    movieData?: { title?: string; posterPath?: string; releaseDate?: string },
  ) {
    const existing = await this.bookmarkRepo.findOne({
      where: { userId, tmdbId },
    });
    if (existing) {
      return {
        id: existing.id,
        tmdbId: existing.tmdbId,
        movieTitle: existing.movieTitle,
        moviePosterPath: existing.moviePosterPath,
        movieReleaseDate: existing.movieReleaseDate,
        createdAt: existing.createdAt,
        isBookmarked: true,
      };
    }

    const bookmark = this.bookmarkRepo.create({
      userId,
      tmdbId,
      movieTitle: movieData?.title || null,
      moviePosterPath: movieData?.posterPath || null,
      movieReleaseDate: movieData?.releaseDate || null,
    });

    const saved = await this.bookmarkRepo.save(bookmark);
    return {
      id: saved.id,
      tmdbId: saved.tmdbId,
      movieTitle: saved.movieTitle,
      moviePosterPath: saved.moviePosterPath,
      movieReleaseDate: saved.movieReleaseDate,
      createdAt: saved.createdAt,
      isBookmarked: true,
    };
  }

  async unbookmarkMovie(userId: string, tmdbId: number) {
    const bookmark = await this.bookmarkRepo.findOne({
      where: { userId, tmdbId },
    });
    if (!bookmark) {
      return { isBookmarked: false };
    }

    await this.bookmarkRepo.delete(bookmark.id);
    return { isBookmarked: false };
  }

  async getUserBookmarks(
    userId: string,
    options?: { page?: number; limit?: number },
  ) {
    const page = options?.page && options.page > 0 ? options.page : 1;
    const limit = options?.limit && options.limit > 0 ? options.limit : 50;

    const [bookmarks, total] = await this.bookmarkRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const mappedBookmarks = bookmarks.map((bookmark) => ({
      id: bookmark.tmdbId,
      title: bookmark.movieTitle,
      poster_path: bookmark.moviePosterPath,
      release_date: bookmark.movieReleaseDate,

      media_type: 'movie',

      bookmark_id: bookmark.id,
      bookmark_created_at: bookmark.createdAt,
    }));

    const filteredBookmarks = filterMoviesWithPoster(mappedBookmarks);

    return {
      page,
      results: filteredBookmarks,
      total_pages: Math.ceil(total / limit),
      total_results: total,
    };
  }

  async isMovieBookmarked(userId: string, tmdbId: number) {
    const bookmark = await this.bookmarkRepo.findOne({
      where: { userId, tmdbId },
    });
    return { isBookmarked: !!bookmark };
  }
}
