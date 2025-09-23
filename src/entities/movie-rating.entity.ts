import { Entity, PrimaryGeneratedColumn, Column, Unique, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('movie_ratings')
@Unique('UQ_movie_rating_user_tmdb', ['userId', 'tmdbId'])
export class MovieRating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ name: 'tmdb_id', type: 'int' })
  @Index()
  tmdbId: number;

  @Column({ type: 'int' })
  rating: number; // 1-10

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}


