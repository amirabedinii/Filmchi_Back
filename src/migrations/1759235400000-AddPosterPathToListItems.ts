import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPosterPathToListItems1759235400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'list_items',
      new TableColumn({
        name: 'poster_path',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('list_items', 'poster_path');
  }
}
