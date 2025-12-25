import { Controller, Get, Param, Post, Query, Body, UseGuards } from '@nestjs/common';
import { MoviesService } from './movies.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { ListsService } from '../lists/lists.service';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { IRANIAN_CONTENT_FILTER } from './utils/movie-filter.util';

type ReqUser = { userId: string };

const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ReqUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as ReqUser;
  },
);

const OptionalUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ReqUser | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as ReqUser | undefined;
  },
);

// Utility function to validate language parameter (ISO 639-1 format)
function validateLanguage(lang?: string): string | undefined {
  if (!lang) return undefined;
  // Basic validation for ISO 639-1 format (2 letter codes)
  const langRegex = /^[a-z]{2}$/i;
  return langRegex.test(lang) ? lang.toLowerCase() : undefined;
}

@Controller('movies')
export class MoviesController {
  constructor(
    private readonly movies: MoviesService,
    private readonly lists: ListsService,
  ) {}

  @Get('search')
  async search(
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('year') year?: string,
    @Query('with_genres') withGenres?: string,
    @Query('sort_by') sortBy?: string,
    @Query('lang') lang?: string,
    @Query('contentFilter') contentFilter?: string,
  ) {
    const language = validateLanguage(lang);
    return this.movies.searchMovies({
      query: q,
      page: page ? Number(page) : 1,
      year: year ? Number(year) : undefined,
      withGenres,
      sortBy,
      language,
      contentFilter: contentFilter ? JSON.parse(contentFilter) : IRANIAN_CONTENT_FILTER,
    });
  }

  @Get('genres')
  async getGenres(@Query('lang') lang?: string) {
    const language = validateLanguage(lang);
    return this.movies.getGenres(language);
  }

  @Get('trending')
  trending(@Query('page') page?: string, @Query('lang') lang?: string) {
    const language = validateLanguage(lang);
    return this.movies.getList('trending', page ? Number(page) : 1, language, IRANIAN_CONTENT_FILTER);
  }

  @Get('popular')
  popular(@Query('page') page?: string, @Query('lang') lang?: string) {
    const language = validateLanguage(lang);
    return this.movies.getList('popular', page ? Number(page) : 1, language, IRANIAN_CONTENT_FILTER);
  }

  @Get('top-rated')
  topRated(@Query('page') page?: string, @Query('lang') lang?: string) {
    const language = validateLanguage(lang);
    return this.movies.getList('top_rated', page ? Number(page) : 1, language, IRANIAN_CONTENT_FILTER);
  }

  @Get('now-playing')
  nowPlaying(@Query('page') page?: string, @Query('lang') lang?: string) {
    const language = validateLanguage(lang);
    return this.movies.getList('now_playing', page ? Number(page) : 1, language, IRANIAN_CONTENT_FILTER);
  }

  @Get('upcoming')
  upcoming(@Query('page') page?: string, @Query('lang') lang?: string) {
    const language = validateLanguage(lang);
    return this.movies.getList('upcoming', page ? Number(page) : 1, language, IRANIAN_CONTENT_FILTER);
  }

  @UseGuards(JwtAuthGuard)
  @Get('bookmarks')
  async getUserBookmarks(
    @CurrentUser() user: ReqUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.movies.getUserBookmarks(user.userId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':tmdbId')
  async details(
    @Param('tmdbId') tmdbId: string,
    @Query('lang') lang?: string,
    @OptionalUser() user?: ReqUser,
  ) {
    const language = validateLanguage(lang);
    return this.movies.getMovieDetails(Number(tmdbId), language, user?.userId);
  }

  @Get(':tmdbId/similar')
  similar(@Param('tmdbId') tmdbId: string, @Query('page') page?: string, @Query('lang') lang?: string) {
    const language = validateLanguage(lang);
    return this.movies.getSimilar(Number(tmdbId), page ? Number(page) : 1, language, IRANIAN_CONTENT_FILTER);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':tmdbId/bookmark-status')
  async getBookmarkStatus(
    @CurrentUser() user: ReqUser,
    @Param('tmdbId') tmdbId: string,
  ) {
    return this.movies.isMovieBookmarked(user.userId, Number(tmdbId));
  }

  @UseGuards(JwtAuthGuard)
  @Post(':tmdbId/bookmark')
  async bookmark(
    @CurrentUser() user: ReqUser,
    @Param('tmdbId') tmdbId: string,
    @Body() body?: { title?: string; posterPath?: string; releaseDate?: string },
  ) {
    return this.movies.bookmarkMovie(user.userId, Number(tmdbId), body);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':tmdbId/unbookmark')
  async unbookmark(
    @CurrentUser() user: ReqUser,
    @Param('tmdbId') tmdbId: string,
  ) {
    return this.movies.unbookmarkMovie(user.userId, Number(tmdbId));
  }

  @UseGuards(JwtAuthGuard)
  @Post(':tmdbId/rating')
  async rate(
    @CurrentUser() user: ReqUser,
    @Param('tmdbId') tmdbId: string,
    @Body('rating') rating: number,
  ) {
    const r = Math.max(1, Math.min(10, Number(rating)));
    return this.movies.setUserRating(user.userId, Number(tmdbId), r);
  }
}


