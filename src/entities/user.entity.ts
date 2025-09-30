import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  DeleteDateColumn,
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

  // Profile fields
  @Column({ name: 'display_name', type: 'varchar', nullable: true })
  displayName: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  location: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', nullable: true })
  avatarUrl: string | null;

  // Preferences and interests (JSON for flexibility)
  @Column({ name: 'favorite_genres', type: 'simple-json', nullable: true })
  favoriteGenres: string[] | null;

  @Column({ name: 'favorite_directors', type: 'simple-json', nullable: true })
  favoriteDirectors: string[] | null;

  @Column({ name: 'favorite_actors', type: 'simple-json', nullable: true })
  favoriteActors: string[] | null;

  // Privacy and account preferences
  @Column({ name: 'privacy_settings', type: 'simple-json', nullable: true })
  privacySettings: Record<string, any> | null;

  @Column({ name: 'account_preferences', type: 'simple-json', nullable: true })
  accountPreferences: Record<string, any> | null;

  // Content filtering preferences
  @Column({ name: 'content_filter_settings', type: 'simple-json', nullable: true })
  contentFilterSettings: {
    includeAdult?: boolean;
    maxCertification?: string;
    certificationCountry?: string;
    excludeGenres?: number[];
    excludeKeywords?: string[];
    enabled?: boolean;
  } | null;

  // Activity status
  @Column({ name: 'activity_status', type: 'varchar', default: 'active' })
  activityStatus: string;

  // Soft delete support
  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date | null;
}
