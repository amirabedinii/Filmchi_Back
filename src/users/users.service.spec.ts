import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from '../entities/user.entity';
import { MovieList } from '../entities/movie-list.entity';
import { ListItem } from '../entities/list-item.entity';

describe('UsersService', () => {
  let service: UsersService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          dropSchema: true,
          entities: [User, MovieList, ListItem],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([User]),
      ],
      providers: [UsersService],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  it('should create and update profile and compute stats', async () => {
    // Create user
    const repo = (service as any).userRepo;
    const user = repo.create({
      email: 'a@example.com',
      passwordHash: 'x',
    });
    await repo.save(user);

    // Update profile
    await service.updateProfile(user.id, { displayName: 'Alice' });
    const got = await service.getProfile(user.id);
    expect(got.displayName).toBe('Alice');

    // Stats baseline
    const s0 = await service.stats(user.id);
    expect(s0.lists).toBe(0);
    expect(s0.items).toBe(0);
  });
});
