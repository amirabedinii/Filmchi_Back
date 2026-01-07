import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListsService } from './lists.service';
import { ListsController } from './lists.controller';
import { MovieList } from '../entities/movie-list.entity';
import { ListItem } from '../entities/list-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MovieList, ListItem])],
  controllers: [ListsController],
  providers: [ListsService],
  exports: [ListsService],
})
export class ListsModule {}
