import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

const isTest = process.env.NODE_ENV === 'test';

export default new DataSource(
  isTest
    ? {
        type: 'sqlite',
        database: ':memory:',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
      }
    : {
        type: 'postgres',
        url: process.env.DATABASE_URL,
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
      },
);


