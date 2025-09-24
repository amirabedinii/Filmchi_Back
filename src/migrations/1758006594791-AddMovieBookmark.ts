import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMovieBookmark1758006594791 implements MigrationInterface {
  name = 'AddMovieBookmark1758006594791';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "movie_bookmarks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "tmdb_id" integer NOT NULL,
        "movie_title" character varying,
        "movie_poster_path" character varying,
        "movie_release_date" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_movie_bookmark_user_tmdb" UNIQUE ("user_id", "tmdb_id"),
        CONSTRAINT "PK_movie_bookmarks" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_movie_bookmarks_user_id" ON "movie_bookmarks" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_movie_bookmarks_tmdb_id" ON "movie_bookmarks" ("tmdb_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "movie_bookmarks"
      ADD CONSTRAINT "FK_movie_bookmarks_user_id" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "movie_bookmarks" DROP CONSTRAINT "FK_movie_bookmarks_user_id"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_movie_bookmarks_tmdb_id"
    `);

    await queryRunner.query(`
      DROP INDEX "IDX_movie_bookmarks_user_id"
    `);

    await queryRunner.query(`
      DROP TABLE "movie_bookmarks"
    `);
  }
}
