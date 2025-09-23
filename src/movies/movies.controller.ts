import { Controller, Get, Param, Post, Query, Body, UseGuards } from '@nestjs/common';
import { MoviesService } from './movies.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ListsService } from '../lists/lists.service';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

type ReqUser = { userId: string };

const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ReqUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as ReqUser;
  },
);

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
  ) {
    return this.movies.searchMovies({
      query: q,
      page: page ? Number(page) : 1,
      year: year ? Number(year) : undefined,
      withGenres,
      sortBy,
    });
  }

  @Get(':tmdbId')
  async details(@Param('tmdbId') tmdbId: string) {
    return this.movies.getMovieDetails(Number(tmdbId));
  }

  @Get('trending')
  trending(@Query('page') page?: string) {
    return this.movies.getList('trending', page ? Number(page) : 1);
  }

  @Get('popular')
  popular(@Query('page') page?: string) {
    return this.movies.getList('popular', page ? Number(page) : 1);
  }

  @Get('top-rated')
  topRated(@Query('page') page?: string) {
    return this.movies.getList('top_rated', page ? Number(page) : 1);
  }

  @Get('now-playing')
  nowPlaying(@Query('page') page?: string) {
    return this.movies.getList('now_playing', page ? Number(page) : 1);
  }

  @Get('upcoming')
  upcoming(@Query('page') page?: string) {
    return this.movies.getList('upcoming', page ? Number(page) : 1);
  }

  @Get(':tmdbId/similar')
  similar(@Param('tmdbId') tmdbId: string, @Query('page') page?: string) {
    return this.movies.getSimilar(Number(tmdbId), page ? Number(page) : 1);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':tmdbId/bookmark')
  async bookmark(
    @CurrentUser() user: ReqUser,
    @Param('tmdbId') tmdbId: string,
    @Body('title') title: string,
  ) {
    // Use the generic lists system with a dedicated favorites list
    return this.lists.addMovieToList(user.userId, 'favorites', {
      tmdbId: Number(tmdbId),
      title,
    } as any);
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


