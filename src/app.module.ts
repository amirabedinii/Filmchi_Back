import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
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
          synchronize: true, // Only for development
        } as any;
      },
    }),
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
