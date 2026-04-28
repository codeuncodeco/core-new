import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`proposals_sent_method\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`proposals\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`proposals_sent_method_order_idx\` ON \`proposals_sent_method\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`proposals_sent_method_parent_idx\` ON \`proposals_sent_method\` (\`parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_proposals_v_version_sent_method\` (
  	\`order\` integer NOT NULL,
  	\`parent_id\` integer NOT NULL,
  	\`value\` text,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`_proposals_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_sent_method_order_idx\` ON \`_proposals_v_version_sent_method\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_sent_method_parent_idx\` ON \`_proposals_v_version_sent_method\` (\`parent_id\`);`)
  await db.run(sql`ALTER TABLE \`proposals\` DROP COLUMN \`sent_method\`;`)
  await db.run(sql`ALTER TABLE \`_proposals_v\` DROP COLUMN \`version_sent_method\`;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`proposals_sent_method\`;`)
  await db.run(sql`DROP TABLE \`_proposals_v_version_sent_method\`;`)
  await db.run(sql`ALTER TABLE \`proposals\` ADD \`sent_method\` text;`)
  await db.run(sql`ALTER TABLE \`_proposals_v\` ADD \`version_sent_method\` text;`)
}
