import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity('list_items')
export class ListItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tmdb_id' })
  tmdbId: number;

  @Column()
  title: string;

  @CreateDateColumn({ name: 'added_at' })
  addedAt: Date;

  @Column({ name: 'movie_list_id' })
  movieListId: string;

  @ManyToOne('MovieList', 'listItems')
  @JoinColumn({ name: 'movie_list_id' })
  movieList: any;
}
