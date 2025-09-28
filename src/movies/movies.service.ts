import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MovieRating } from '../entities/movie-rating.entity';
import { MovieBookmark } from '../entities/movie-bookmark.entity';
import { TmdbService } from './tmdb.service';
import { filterTmdbResponse, filterSingleMovie, filterMoviesWithPoster } from './utils/movie-filter.util';

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
    @InjectRepository(MovieBookmark)
    private readonly bookmarkRepo: Repository<MovieBookmark>,
  ) {}

  // Deprecated internal TMDB helpers are replaced by TmdbService

  async searchMovies(options: SearchOptions) {
    const page = options.page && options.page > 0 ? options.page : 1;
    const response = await this.tmdb.get('/search/movie', {
      query: options.query,
      year: options.year,
      with_genres: options.withGenres,
      sort_by: options.sortBy,
      page,
    });
    return filterTmdbResponse(response);
  }

  async getMovieDetails(tmdbId: number) {
    const movie = await this.tmdb.get(`/movie/${tmdbId}`);
    return filterSingleMovie(movie);
  }

  async getList(kind: 'trending' | 'popular' | 'top_rated' | 'now_playing' | 'upcoming', page = 1) {
    const pathMap: Record<string, string> = {
      trending: '/trending/movie/week',
      popular: '/movie/popular',
      top_rated: '/movie/top_rated',
      now_playing: '/movie/now_playing',
      upcoming: '/movie/upcoming',
    };
    const response = await this.tmdb.get(pathMap[kind], { page });
    return filterTmdbResponse(response);
  }

  async getSimilar(tmdbId: number, page = 1) {
    const response = await this.tmdb.get(`/movie/${tmdbId}/similar`, { page });
    return filterTmdbResponse(response);
  }

  async getGenres() {
    return this.tmdb.getGenres();
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
      id: bookmark.id,
      tmdbId: bookmark.tmdbId,
      movieTitle: bookmark.movieTitle,
      moviePosterPath: bookmark.moviePosterPath,
      movieReleaseDate: bookmark.movieReleaseDate,
      createdAt: bookmark.createdAt,
    }));

    // Filter out bookmarks with null poster_path
    const filteredBookmarks = filterMoviesWithPoster(mappedBookmarks);

    return {
      bookmarks: filteredBookmarks,
      total: filteredBookmarks.length,
      page,
      limit,
      totalPages: Math.ceil(filteredBookmarks.length / limit),
    };
  }

  async isMovieBookmarked(userId: string, tmdbId: number) {
    const bookmark = await this.bookmarkRepo.findOne({ where: { userId, tmdbId } });
    return { isBookmarked: !!bookmark };
  }
}


