import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MovieRating } from '../entities/movie-rating.entity';
import { MovieBookmark } from '../entities/movie-bookmark.entity';
import { TmdbService } from './tmdb.service';
import { filterTmdbResponse, filterSingleMovie, filterMoviesWithPoster, ContentFilterOptions, createTmdbFilterParams } from './utils/movie-filter.util';

type SearchOptions = {
  query?: string;
  page?: number;
  year?: number;
  withGenres?: string; // comma-separated ids
  sortBy?: string; // popularity.desc, vote_average.desc, etc.
  language?: string; // ISO 639-1 language code (e.g., 'fa', 'en')
  contentFilter?: ContentFilterOptions;
};

@Injectable()
export class MoviesService {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly tmdb: TmdbService,
    @InjectRepository(MovieRating)
    private readonly ratingRepo: Repository<MovieRating>,
    @InjectRepository(MovieBookmark)
    private readonly bookmarkRepo: Repository<MovieBookmark>,
  ) {}

  // Deprecated internal TMDB helpers are replaced by TmdbService

  async searchMovies(options: SearchOptions) {
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
    
    // Apply content filtering (only include_adult works on search endpoint)
    if (options.contentFilter) {
      params.include_adult = options.contentFilter.includeAdult ?? false;
      // Note: certification filtering doesn't work on /search/movie, only on /discover/movie
      // We'll filter results after receiving them
    }
    
    const response = await this.tmdb.get('/search/movie', params);
    // Apply post-filtering for content (keywords, genres, etc.)
    return filterTmdbResponse(response, options.contentFilter);
  }

  async getMovieDetails(tmdbId: number, language?: string, userId?: string) {
    const movie = await this.tmdb.getMovieDetails(tmdbId, language);
    const filteredMovie = filterSingleMovie(movie);
    
    // If user is authenticated, fetch their rating
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
    
    return filteredMovie;
  }

  async getList(kind: 'trending' | 'popular' | 'top_rated' | 'now_playing' | 'upcoming', page = 1, language?: string, contentFilter?: ContentFilterOptions) {
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
    return filterTmdbResponse(response, contentFilter);
  }

  async getSimilar(tmdbId: number, page = 1, language?: string, contentFilter?: ContentFilterOptions) {
    const response = await this.tmdb.getSimilar(tmdbId, page, language, contentFilter);
    return filterTmdbResponse(response, contentFilter);
  }

  async getGenres(language?: string) {
    return this.tmdb.getGenres(language);
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

  async bookmarkMovie(userId: string, tmdbId: number, movieData?: { title?: string; posterPath?: string; releaseDate?: string }) {
    // Check if already bookmarked
    const existing = await this.bookmarkRepo.findOne({ where: { userId, tmdbId } });
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

    // Create new bookmark
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
    const bookmark = await this.bookmarkRepo.findOne({ where: { userId, tmdbId } });
    if (!bookmark) {
      return { isBookmarked: false };
    }

    await this.bookmarkRepo.delete(bookmark.id);
    return { isBookmarked: false };
  }

  async getUserBookmarks(userId: string, options?: { page?: number; limit?: number }) {
    const page = options?.page && options.page > 0 ? options.page : 1;
    const limit = options?.limit && options.limit > 0 ? options.limit : 50;

    const [bookmarks, total] = await this.bookmarkRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const mappedBookmarks = bookmarks.map(bookmark => ({
      id: bookmark.tmdbId, // Use tmdbId as id to match TMDB format
      title: bookmark.movieTitle,
      poster_path: bookmark.moviePosterPath,
      release_date: bookmark.movieReleaseDate,
      // Add media_type to match trending format
      media_type: 'movie',
      // Add bookmark-specific data
      bookmark_id: bookmark.id,
      bookmark_created_at: bookmark.createdAt,
    }));

    // Filter out bookmarks with null poster_path
    const filteredBookmarks = filterMoviesWithPoster(mappedBookmarks);

    return {
      page,
      results: filteredBookmarks,
      total_pages: Math.ceil(total / limit),
      total_results: total,
    };
  }

  async isMovieBookmarked(userId: string, tmdbId: number) {
    const bookmark = await this.bookmarkRepo.findOne({ where: { userId, tmdbId } });
    return { isBookmarked: !!bookmark };
  }
}


