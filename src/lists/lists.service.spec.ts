import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListsService } from './lists.service';
import { MovieList } from '../entities/movie-list.entity';
import { ListItem } from '../entities/list-item.entity';
import { AddMovieDto } from './dto/add-movie.dto';

describe('ListsService', () => {
  let service: ListsService;
  let movieListRepo: jest.Mocked<Repository<MovieList>>;
  let listItemRepo: jest.Mocked<Repository<ListItem>>;

  const mockMovieList: MovieList = {
    id: 'list-1',
    userId: 'user-1',
    listName: 'watchlist',
    createdAt: new Date(),
  } as any;

  const mockListItem: ListItem = {
    id: 'item-1',
    movieListId: 'list-1',
    tmdbId: 123,
    title: 'Test Movie',
    posterPath: null,
    addedAt: new Date(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListsService,
        {
          provide: getRepositoryToken(MovieList),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ListItem),
          useValue: {
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ListsService>(ListsService);
    movieListRepo = module.get(getRepositoryToken(MovieList));
    listItemRepo = module.get(getRepositoryToken(ListItem));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMoviesForList', () => {
    it('should return empty response if list does not exist', async () => {
      movieListRepo.findOne.mockResolvedValue(null);

      const result = await service.getMoviesForList('user-1', 'watchlist');

      expect(movieListRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1', listName: 'watchlist' },
      });
      expect(result).toEqual({
        items: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
      });
    });

    it('should return movies from existing list with default options', async () => {
      movieListRepo.findOne.mockResolvedValue(mockMovieList);
      listItemRepo.findAndCount.mockResolvedValue([[mockListItem], 1]);

      const result = await service.getMoviesForList('user-1', 'watchlist');

      expect(movieListRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1', listName: 'watchlist' },
      });
      expect(listItemRepo.findAndCount).toHaveBeenCalledWith({
        where: { movieListId: mockMovieList.id },
        order: { addedAt: 'DESC' },
        skip: 0,
        take: 50,
      });
      expect(result).toEqual({
        items: [
          {
            id: mockListItem.id,
            tmdbId: mockListItem.tmdbId,
            title: mockListItem.title,
            posterPath: mockListItem.posterPath,
            addedAt: mockListItem.addedAt,
          },
        ],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      });
    });

    it('should handle custom pagination options', async () => {
      movieListRepo.findOne.mockResolvedValue(mockMovieList);
      listItemRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.getMoviesForList('user-1', 'watchlist', {
        page: 2,
        limit: 10,
        sort: 'asc',
      });

      expect(listItemRepo.findAndCount).toHaveBeenCalledWith({
        where: { movieListId: mockMovieList.id },
        order: { addedAt: 'ASC' },
        skip: 10,
        take: 10,
      });
    });

    it('should handle invalid pagination options with defaults', async () => {
      movieListRepo.findOne.mockResolvedValue(mockMovieList);
      listItemRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.getMoviesForList('user-1', 'watchlist', {
        page: -1,
        limit: 0,
        sort: 'asc',
      });

      expect(listItemRepo.findAndCount).toHaveBeenCalledWith({
        where: { movieListId: mockMovieList.id },
        order: { addedAt: 'ASC' },
        skip: 0,
        take: 50,
      });
    });

    it('should default sort to DESC when not specified or invalid', async () => {
      movieListRepo.findOne.mockResolvedValue(mockMovieList);
      listItemRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.getMoviesForList('user-1', 'watchlist', {
        sort: 'invalid' as any,
      });

      expect(listItemRepo.findAndCount).toHaveBeenCalledWith({
        where: { movieListId: mockMovieList.id },
        order: { addedAt: 'DESC' },
        skip: 0,
        take: 50,
      });
    });
  });

  describe('addMovieToList', () => {
    const addMovieDto: AddMovieDto = {
      tmdbId: 456,
      title: 'New Movie',
    };

    it('should create new list and add movie when list does not exist', async () => {
      movieListRepo.findOne.mockResolvedValue(null);
      movieListRepo.create.mockReturnValue(mockMovieList);
      movieListRepo.save.mockResolvedValue(mockMovieList);
      listItemRepo.findOne.mockResolvedValue(null);
      listItemRepo.create.mockReturnValue(mockListItem);
      listItemRepo.save.mockResolvedValue(mockListItem);

      const result = await service.addMovieToList(
        'user-1',
        'watchlist',
        addMovieDto,
      );

      expect(movieListRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1', listName: 'watchlist' },
      });
      expect(movieListRepo.create).toHaveBeenCalledWith({
        userId: 'user-1',
        listName: 'watchlist',
      });
      expect(movieListRepo.save).toHaveBeenCalledWith(mockMovieList);
      expect(listItemRepo.findOne).toHaveBeenCalledWith({
        where: { movieListId: mockMovieList.id, tmdbId: addMovieDto.tmdbId },
      });
      expect(listItemRepo.create).toHaveBeenCalledWith({
        movieListId: mockMovieList.id,
        tmdbId: addMovieDto.tmdbId,
        title: addMovieDto.title,
        posterPath: null,
      });
      expect(listItemRepo.save).toHaveBeenCalledWith(mockListItem);
      expect(result).toEqual({
        id: mockListItem.id,
        tmdbId: mockListItem.tmdbId,
        title: mockListItem.title,
        posterPath: mockListItem.posterPath,
        addedAt: mockListItem.addedAt,
      });
    });

    it('should add movie to existing list', async () => {
      movieListRepo.findOne.mockResolvedValue(mockMovieList);
      listItemRepo.findOne.mockResolvedValue(null);
      listItemRepo.create.mockReturnValue(mockListItem);
      listItemRepo.save.mockResolvedValue(mockListItem);

      const result = await service.addMovieToList(
        'user-1',
        'watchlist',
        addMovieDto,
      );

      expect(movieListRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1', listName: 'watchlist' },
      });
      expect(movieListRepo.create).not.toHaveBeenCalled();
      expect(movieListRepo.save).not.toHaveBeenCalled();
      expect(result).toEqual({
        id: mockListItem.id,
        tmdbId: mockListItem.tmdbId,
        title: mockListItem.title,
        posterPath: mockListItem.posterPath,
        addedAt: mockListItem.addedAt,
      });
    });

    it('should return existing item when movie already exists in list (idempotent)', async () => {
      movieListRepo.findOne.mockResolvedValue(mockMovieList);
      listItemRepo.findOne.mockResolvedValue(mockListItem);

      const result = await service.addMovieToList(
        'user-1',
        'watchlist',
        addMovieDto,
      );

      expect(listItemRepo.create).not.toHaveBeenCalled();
      expect(listItemRepo.save).not.toHaveBeenCalled();
      expect(result).toEqual({
        id: mockListItem.id,
        tmdbId: mockListItem.tmdbId,
        title: mockListItem.title,
        posterPath: mockListItem.posterPath,
        addedAt: mockListItem.addedAt,
      });
    });
  });

  describe('removeMovieFromList', () => {
    it('should return false if list does not exist', async () => {
      movieListRepo.findOne.mockResolvedValue(null);

      const result = await service.removeMovieFromList(
        'user-1',
        'watchlist',
        123,
      );

      expect(movieListRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1', listName: 'watchlist' },
      });
      expect(result).toBe(false);
    });

    it('should return false if movie does not exist in list', async () => {
      movieListRepo.findOne.mockResolvedValue(mockMovieList);
      listItemRepo.findOne.mockResolvedValue(null);

      const result = await service.removeMovieFromList(
        'user-1',
        'watchlist',
        123,
      );

      expect(movieListRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1', listName: 'watchlist' },
      });
      expect(listItemRepo.findOne).toHaveBeenCalledWith({
        where: { movieListId: mockMovieList.id, tmdbId: 123 },
      });
      expect(result).toBe(false);
    });

    it('should successfully remove movie from list', async () => {
      movieListRepo.findOne.mockResolvedValue(mockMovieList);
      listItemRepo.findOne.mockResolvedValue(mockListItem);
      listItemRepo.delete.mockResolvedValue({ affected: 1 } as any);

      const result = await service.removeMovieFromList(
        'user-1',
        'watchlist',
        123,
      );

      expect(movieListRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1', listName: 'watchlist' },
      });
      expect(listItemRepo.findOne).toHaveBeenCalledWith({
        where: { movieListId: mockMovieList.id, tmdbId: 123 },
      });
      expect(listItemRepo.delete).toHaveBeenCalledWith(mockListItem.id);
      expect(result).toBe(true);
    });
  });
});
