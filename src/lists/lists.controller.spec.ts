import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ListsController } from './lists.controller';
import { ListsService } from './lists.service';
import { AddMovieDto } from './dto/add-movie.dto';
import type { User as ReqUser } from './types';

describe('ListsController', () => {
  let controller: ListsController;
  let listsService: jest.Mocked<ListsService>;

  const mockUser: ReqUser = {
    userId: 'user-123',
    email: 'test@example.com',
  };

  const mockMovie = {
    id: 'item-1',
    tmdbId: 123,
    title: 'Test Movie',
    addedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ListsController],
      providers: [
        {
          provide: ListsService,
          useValue: {
            getMoviesForList: jest.fn(),
            addMovieToList: jest.fn(),
            removeMovieFromList: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ListsController>(ListsController);
    listsService = module.get(ListsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getList', () => {
    it('should get movies from list with default parameters', async () => {
      const mockMovies = [mockMovie];
      listsService.getMoviesForList.mockResolvedValue(mockMovies);

      const result = await controller.getList(mockUser, 'watchlist');

      expect(listsService.getMoviesForList).toHaveBeenCalledWith(
        mockUser.userId,
        'watchlist',
        {
          page: 1,
          limit: 50,
          sort: 'desc',
        },
      );
      expect(result).toEqual(mockMovies);
    });

    it('should handle custom query parameters', async () => {
      const mockMovies = [mockMovie];
      listsService.getMoviesForList.mockResolvedValue(mockMovies);

      const result = await controller.getList(
        mockUser,
        'watched',
        '2',
        '25',
        'addedAt:asc',
      );

      expect(listsService.getMoviesForList).toHaveBeenCalledWith(
        mockUser.userId,
        'watched',
        {
          page: 2,
          limit: 25,
          sort: 'asc',
        },
      );
      expect(result).toEqual(mockMovies);
    });

    it('should limit the maximum limit to 100', async () => {
      const mockMovies = [mockMovie];
      listsService.getMoviesForList.mockResolvedValue(mockMovies);

      await controller.getList(mockUser, 'watchlist', '1', '1000');

      expect(listsService.getMoviesForList).toHaveBeenCalledWith(
        mockUser.userId,
        'watchlist',
        {
          page: 1,
          limit: 100,
          sort: 'desc',
        },
      );
    });

    it('should default sort to desc if not addedAt:asc', async () => {
      const mockMovies = [mockMovie];
      listsService.getMoviesForList.mockResolvedValue(mockMovies);

      await controller.getList(
        mockUser,
        'watchlist',
        undefined,
        undefined,
        'invalid-sort',
      );

      expect(listsService.getMoviesForList).toHaveBeenCalledWith(
        mockUser.userId,
        'watchlist',
        {
          page: 1,
          limit: 50,
          sort: 'desc',
        },
      );
    });

    it('should handle invalid page and limit parameters', async () => {
      const mockMovies = [mockMovie];
      listsService.getMoviesForList.mockResolvedValue(mockMovies);

      await controller.getList(mockUser, 'watchlist', 'invalid', 'invalid');

      expect(listsService.getMoviesForList).toHaveBeenCalledWith(
        mockUser.userId,
        'watchlist',
        {
          page: NaN,
          limit: NaN,
          sort: 'desc',
        },
      );
    });
  });

  describe('addMovie', () => {
    it('should add a movie to the list', async () => {
      const addMovieDto: AddMovieDto = {
        tmdbId: 456,
        title: 'New Movie',
      };

      listsService.addMovieToList.mockResolvedValue(mockMovie);

      const result = await controller.addMovie(
        mockUser,
        'watchlist',
        addMovieDto,
      );

      expect(listsService.addMovieToList).toHaveBeenCalledWith(
        mockUser.userId,
        'watchlist',
        addMovieDto,
      );
      expect(result).toEqual(mockMovie);
    });

    it('should handle errors from service', async () => {
      const addMovieDto: AddMovieDto = {
        tmdbId: 456,
        title: 'New Movie',
      };

      const error = new Error('Service error');
      listsService.addMovieToList.mockRejectedValue(error);

      await expect(
        controller.addMovie(mockUser, 'watchlist', addMovieDto),
      ).rejects.toThrow('Service error');
    });
  });

  describe('removeMovie', () => {
    it('should remove a movie from the list', async () => {
      listsService.removeMovieFromList.mockResolvedValue(true);

      const result = await controller.removeMovie(
        mockUser,
        'watchlist',
        '123',
      );

      expect(listsService.removeMovieFromList).toHaveBeenCalledWith(
        mockUser.userId,
        'watchlist',
        123,
      );
      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundException when movie is not found', async () => {
      listsService.removeMovieFromList.mockResolvedValue(false);

      await expect(
        controller.removeMovie(mockUser, 'watchlist', '123'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.removeMovie(mockUser, 'watchlist', '123'),
      ).rejects.toThrow('Movie not found in list');
    });

    it('should handle invalid tmdbId parameter', async () => {
      listsService.removeMovieFromList.mockResolvedValue(false);

      await expect(
        controller.removeMovie(mockUser, 'watchlist', 'invalid'),
      ).rejects.toThrow(NotFoundException);

      expect(listsService.removeMovieFromList).toHaveBeenCalledWith(
        mockUser.userId,
        'watchlist',
        NaN,
      );
    });
  });
});