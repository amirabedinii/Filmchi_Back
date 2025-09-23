import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UpdatePreferencesDto, UpdatePrivacyDto, UpdateProfileDto } from './dto/profile.dto';
import { MovieList } from '../entities/movie-list.entity';
import { ListItem } from '../entities/list-item.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async getById(userId: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getProfile(userId: string): Promise<User> {
    return this.getById(userId);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    const user = await this.getById(userId);
    Object.assign(user, dto);
    return this.userRepo.save(user);
  }

  async updatePrivacy(userId: string, dto: UpdatePrivacyDto): Promise<User> {
    const user = await this.getById(userId);
    user.privacySettings = dto.privacy ?? user.privacySettings ?? {};
    return this.userRepo.save(user);
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto): Promise<User> {
    const user = await this.getById(userId);
    user.accountPreferences = dto.preferences ?? user.accountPreferences ?? {};
    return this.userRepo.save(user);
  }

  async stats(userId: string): Promise<{ lists: number; items: number } & Record<string, number>> {
    // Counts based on movie lists and list items
    const listsCount = await this.userRepo.manager.count(MovieList, { where: { userId } });
    const itemsCount = await this.userRepo.manager
      .createQueryBuilder(ListItem, 'li')
      .innerJoin(MovieList, 'ml', 'ml.id = li.movie_list_id')
      .where('ml.user_id = :userId', { userId })
      .getCount();
    return { lists: listsCount, items: itemsCount };
  }

  async softDelete(userId: string): Promise<void> {
    await this.userRepo.softDelete({ id: userId });
  }

  async setActivityStatus(userId: string, status: string): Promise<User> {
    const user = await this.getById(userId);
    user.activityStatus = status;
    return this.userRepo.save(user);
  }

  async exportData(userId: string): Promise<Record<string, any>> {
    const user = await this.getById(userId);
    // Basic export for now; can be expanded
    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        bio: user.bio,
        location: user.location,
        favorites: {
          genres: user.favoriteGenres || [],
          directors: user.favoriteDirectors || [],
          actors: user.favoriteActors || [],
        },
        privacy: user.privacySettings || {},
        preferences: user.accountPreferences || {},
        createdAt: user.createdAt,
      },
    };
  }
}


