import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddContentFilterSettings1758006594792
  implements MigrationInterface
{
  name = 'AddContentFilterSettings1758006594792';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'content_filter_settings',
        type: 'text',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'content_filter_settings');
  }
}
