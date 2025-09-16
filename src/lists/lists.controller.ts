import { Controller, Get, Post, Delete, Param, Body, UseGuards, ConflictException, NotFoundException, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ListsService } from './lists.service';
import { AddMovieDto } from './dto/add-movie.dto';
import type { User as ReqUser } from './types';
import { Request } from 'express';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext): ReqUser => {
  const request = ctx.switchToHttp().getRequest<Request>();
  return request.user as ReqUser;
});

@UseGuards(JwtAuthGuard)
@Controller('lists')
export class ListsController {
  constructor(private readonly listsService: ListsService) {}

  @Get(':listName')
  async getList(
    @CurrentUser() user: ReqUser,
    @Param('listName') listName: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
  ) {
    return this.listsService.getMoviesForList(user.userId, listName, {
      page: page ? Number(page) : 1,
      limit: limit ? Math.min(Number(limit), 100) : 50,
      sort: sort === 'addedAt:asc' ? 'asc' : 'desc',
    });
  }

  @Post(':listName')
  async addMovie(
    @CurrentUser() user: ReqUser,
    @Param('listName') listName: string,
    @Body() addMovieDto: AddMovieDto,
  ) {
    return this.listsService.addMovieToList(user.userId, listName, addMovieDto);
  }

  @Delete(':listName/:tmdbId')
  async removeMovie(
    @CurrentUser() user: ReqUser,
    @Param('listName') listName: string,
    @Param('tmdbId') tmdbId: string,
  ) {
    const removed = await this.listsService.removeMovieFromList(user.userId, listName, Number(tmdbId));
    if (!removed) {
      throw new NotFoundException('Movie not found in list');
    }
    return { success: true };
  }
}


