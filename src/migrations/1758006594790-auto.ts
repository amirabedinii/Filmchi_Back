import { MigrationInterface, QueryRunner } from 'typeorm';

export class Auto1758006594790 implements MigrationInterface {
  name = 'Auto1758006594790';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "list_items" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "tmdb_id" integer NOT NULL,
                "title" character varying NOT NULL,
                "added_at" TIMESTAMP NOT NULL DEFAULT now(),
                "movie_list_id" uuid NOT NULL,
                CONSTRAINT "UQ_list_item_movie_list_tmdb" UNIQUE ("movie_list_id", "tmdb_id"),
                CONSTRAINT "PK_26260957b2b71a1d8e2ecd005f8" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE INDEX "IDX_d932b0901762f04cf627303663" ON "list_items" ("tmdb_id")
        `);
    await queryRunner.query(`
            CREATE TABLE "movie_lists" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "list_name" character varying NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "user_id" uuid NOT NULL,
                CONSTRAINT "PK_371c44d24da036181280f46af8b" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" character varying NOT NULL,
                "password_hash" character varying NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "list_items"
            ADD CONSTRAINT "FK_68c27941e2c53afd5078ad62218" FOREIGN KEY ("movie_list_id") REFERENCES "movie_lists"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "movie_lists"
            ADD CONSTRAINT "FK_ae48691ff04948d479fadc2ef9a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "movie_lists" DROP CONSTRAINT "FK_ae48691ff04948d479fadc2ef9a"
        `);
    await queryRunner.query(`
            ALTER TABLE "list_items" DROP CONSTRAINT "FK_68c27941e2c53afd5078ad62218"
        `);
    await queryRunner.query(`
            DROP TABLE "users"
        `);
    await queryRunner.query(`
            DROP TABLE "movie_lists"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IDX_d932b0901762f04cf627303663"
        `);
    await queryRunner.query(`
            DROP TABLE "list_items"
        `);
  }
}
