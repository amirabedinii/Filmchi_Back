import { Entity, PrimaryGeneratedColumn, Column, Unique, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('movie_bookmarks')
@Unique('UQ_movie_bookmark_user_tmdb', ['userId', 'tmdbId'])
export class MovieBookmark {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ name: 'tmdb_id', type: 'int' })
  @Index()
  tmdbId: number;

  @Column({ name: 'movie_title', type: 'varchar', nullable: true })
  movieTitle: string | null;

  @Column({ name: 'movie_poster_path', type: 'varchar', nullable: true })
  moviePosterPath: string | null;

  @Column({ name: 'movie_release_date', type: 'varchar', nullable: true })
  movieReleaseDate: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
