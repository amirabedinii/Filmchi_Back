import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MoviesService } from './movies.service';
import { MoviesController } from './movies.controller';
import { MovieRating } from '../entities/movie-rating.entity';
import { ListsModule } from '../lists/lists.module';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([MovieRating]), ListsModule],
  controllers: [MoviesController],
  providers: [MoviesService],
})
export class MoviesModule {}


