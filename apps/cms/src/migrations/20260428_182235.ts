import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`users\` ADD \`first_name\` text NOT NULL;`)
  await db.run(sql`ALTER TABLE \`users\` ADD \`last_name\` text;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`first_name\`;`)
  await db.run(sql`ALTER TABLE \`users\` DROP COLUMN \`last_name\`;`)
}
