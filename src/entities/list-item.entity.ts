import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';

@Entity('list_items')
@Unique('UQ_list_item_movie_list_tmdb', ['movieListId', 'tmdbId'])
export class ListItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'tmdb_id' })
  tmdbId: number;

  @Column()
  title: string;

  @Column({ name: 'poster_path', type: 'varchar', nullable: true })
  posterPath: string | null;

  @CreateDateColumn({ name: 'added_at' })
  addedAt: Date;

  @Column({ name: 'movie_list_id' })
  movieListId: string;

  @ManyToOne('MovieList', 'listItems')
  @JoinColumn({ name: 'movie_list_id' })
  movieList: any;
}
