import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ListsModule } from './lists/lists.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { UsersModule } from './users/users.module';
import { MoviesModule } from './movies/movies.module';
import { APP_GUARD } from '@nestjs/core';
import * as Joi from 'joi';
import { CacheModule } from './cache/cache.module';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        redact: ['req.headers.authorization'],
      },
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: (() => {
        if (process.env.NODE_ENV === 'test') return '.env.test';
        if (process.env.NODE_ENV === 'production') return '.env';
        return '.env.development';
      })(),
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),
        DATABASE_URL: Joi.when('NODE_ENV', {
          is: Joi.valid('development', 'production'),
          then: Joi.string()
            .uri({ scheme: [/postgres(ql)?/] })
            .required(),
          otherwise: Joi.string().optional(),
        }),
        JWT_SECRET: Joi.string().min(16).required(),
        JWT_EXPIRES_IN: Joi.string().default('1d'),
        REFRESH_JWT_SECRET: Joi.string().min(16).required(),
        REFRESH_JWT_EXPIRES_IN: Joi.string().default('7d'),
        TMDB_API_KEY: Joi.string().allow('').optional(),
        TMDB_BEARER_TOKEN: Joi.string().allow('').optional(),
        OLLAMA_URL: Joi.string().uri().default('http://localhost:11434'),
        OLLAMA_MODEL: Joi.string().default('llama3.2:latest'),
        LLM_PRIMARY_PROVIDER: Joi.string()
          .valid('ollama', 'openai', 'anthropic', 'gemini', 'openrouter')
          .default('openrouter'),
        OPENAI_API_KEY: Joi.string().allow('').optional(),
        ANTHROPIC_API_KEY: Joi.string().allow('').optional(),
        GEMINI_API_KEY: Joi.string().allow('').optional(),
        OPENROUTER_API_KEY: Joi.string().allow('').optional(),
        OPENROUTER_MODEL: Joi.string().default('openai/gpt-4o-mini'),
        PORT: Joi.number().default(3001),
        // Redis configuration
        REDIS_HOST: Joi.string().default('localhost'),
        REDIS_PORT: Joi.number().default(6379),
        REDIS_PASSWORD: Joi.string().allow('').optional(),
        REDIS_DB: Joi.number().default(0),
        CACHE_ENABLED: Joi.boolean().default(true),
      }),
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 60 }],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        const isTest = process.env.NODE_ENV === 'test';
        if (isTest) {
          return {
            type: 'sqlite',
            database: ':memory:',
            dropSchema: true,
            entities: [__dirname + '/**/*.entity{.ts,.js}'],
            synchronize: true,
          } as any;
        }
        return {
          type: 'postgres',
          url: process.env.DATABASE_URL,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: process.env.NODE_ENV !== 'production',
        } as any;
      },
    }),
    CacheModule,
    AuthModule,
    ListsModule,
    RecommendationsModule,
    UsersModule,
    MoviesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
