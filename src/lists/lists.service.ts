import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MovieList } from '../entities/movie-list.entity';
import { ListItem } from '../entities/list-item.entity';
import { AddMovieDto } from './dto/add-movie.dto';

@Injectable()
export class ListsService {
  constructor(
    @InjectRepository(MovieList)
    private readonly movieListRepo: Repository<MovieList>,
    @InjectRepository(ListItem)
    private readonly listItemRepo: Repository<ListItem>,
  ) {}

  async getMoviesForList(
    userId: string,
    listName: string,
    options?: { page?: number; limit?: number; sort?: 'asc' | 'desc' },
  ) {
    const page = options?.page && options.page > 0 ? options.page : 1;
    const limit = options?.limit && options.limit > 0 ? options.limit : 50;
    const sort: 'ASC' | 'DESC' = options?.sort === 'asc' ? 'ASC' : 'DESC';

    const list = await this.movieListRepo.findOne({
      where: { userId, listName },
    });
    if (!list) {
      return {
        items: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    const [items, total] = await this.listItemRepo.findAndCount({
      where: { movieListId: list.id },
      order: { addedAt: sort },
      skip: (page - 1) * limit,
      take: limit,
    });
    
    return {
      items: items.map((i) => ({
        id: i.id,
        tmdbId: i.tmdbId,
        title: i.title,
        addedAt: i.addedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async addMovieToList(userId: string, listName: string, dto: AddMovieDto) {
    let list = await this.movieListRepo.findOne({
      where: { userId, listName },
    });
    if (!list) {
      list = this.movieListRepo.create({ userId, listName });
      list = await this.movieListRepo.save(list);
    }

    const exists = await this.listItemRepo.findOne({
      where: { movieListId: list.id, tmdbId: dto.tmdbId },
    });
    if (exists) {
      // idempotent: return existing item
      return {
        id: exists.id,
        tmdbId: exists.tmdbId,
        title: exists.title,
        addedAt: exists.addedAt,
      };
    }

    const item = this.listItemRepo.create({
      movieListId: list.id,
      tmdbId: dto.tmdbId,
      title: dto.title,
    });
    const saved = await this.listItemRepo.save(item);
    return {
      id: saved.id,
      tmdbId: saved.tmdbId,
      title: saved.title,
      addedAt: saved.addedAt,
    };
  }

  async removeMovieFromList(
    userId: string,
    listName: string,
    tmdbId: number,
  ): Promise<boolean> {
    const list = await this.movieListRepo.findOne({
      where: { userId, listName },
    });
    if (!list) return false;
    const item = await this.listItemRepo.findOne({
      where: { movieListId: list.id, tmdbId },
    });
    if (!item) return false;
    await this.listItemRepo.delete(item.id);
    return true;
  }
}
