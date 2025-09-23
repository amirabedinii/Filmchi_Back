import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany('MovieList', 'user')
  movieLists: any[];

  // Hashed refresh token (optional). Null when logged out or rotated.
  @Column({ name: 'refresh_token_hash', type: 'varchar', nullable: true })
  refreshTokenHash: string | null;

  // Version to invalidate older tokens after rotation.
  @Column({ name: 'token_version', type: 'int', default: 0 })
  tokenVersion: number;
}
