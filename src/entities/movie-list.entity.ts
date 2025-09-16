import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';

@Entity('movie_lists')
export class MovieList {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'list_name' })
  listName: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne('User', 'movieLists')
  @JoinColumn({ name: 'user_id' })
  user: any;

  @OneToMany('ListItem', 'movieList')
  listItems: any[];
}
