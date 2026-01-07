import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TmdbService } from './tmdb.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [TmdbService],
  exports: [TmdbService],
})
export class TmdbModule {}
