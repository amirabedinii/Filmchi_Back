import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { RecommendationsService } from './recommendations.service';
import { RecommendationsController } from './recommendations.controller';
import { ListsModule } from '../lists/lists.module';
import { LLMModule } from '../llm/llm.module';
import { TmdbModule } from '../movies/tmdb.module';

@Module({
  imports: [HttpModule, ConfigModule, ListsModule, LLMModule, TmdbModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
})
export class RecommendationsModule {}
