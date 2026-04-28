import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`engagements_notes\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`note\` text NOT NULL,
  	\`author_id\` integer,
  	\`created_at\` text,
  	FOREIGN KEY (\`author_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`engagements\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`engagements_notes_order_idx\` ON \`engagements_notes\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`engagements_notes_parent_id_idx\` ON \`engagements_notes\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`engagements_notes_author_idx\` ON \`engagements_notes\` (\`author_id\`);`)
  await db.run(sql`CREATE TABLE \`engagements\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`internal_title\` text NOT NULL,
  	\`client_id\` integer NOT NULL,
  	\`source_proposal_id\` integer,
  	\`stage\` text DEFAULT 'scoping' NOT NULL,
  	\`start_date\` text,
  	\`target_end_date\` text,
  	\`actual_end_date\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`client_id\`) REFERENCES \`clients\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`source_proposal_id\`) REFERENCES \`proposals\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`engagements_client_idx\` ON \`engagements\` (\`client_id\`);`)
  await db.run(sql`CREATE INDEX \`engagements_source_proposal_idx\` ON \`engagements\` (\`source_proposal_id\`);`)
  await db.run(sql`CREATE INDEX \`engagements_stage_idx\` ON \`engagements\` (\`stage\`);`)
  await db.run(sql`CREATE INDEX \`engagements_updated_at_idx\` ON \`engagements\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`engagements_created_at_idx\` ON \`engagements\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`tasks_comments\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`note\` text NOT NULL,
  	\`author_id\` integer,
  	\`created_at\` text,
  	FOREIGN KEY (\`author_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`tasks\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`tasks_comments_order_idx\` ON \`tasks_comments\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`tasks_comments_parent_id_idx\` ON \`tasks_comments\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`tasks_comments_author_idx\` ON \`tasks_comments\` (\`author_id\`);`)
  await db.run(sql`CREATE TABLE \`tasks\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`description\` text,
  	\`engagement_id\` integer,
  	\`assignee_id\` integer,
  	\`status\` text DEFAULT 'todo' NOT NULL,
  	\`priority\` text DEFAULT 'medium',
  	\`due_date\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`engagement_id\`) REFERENCES \`engagements\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`assignee_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`tasks_engagement_idx\` ON \`tasks\` (\`engagement_id\`);`)
  await db.run(sql`CREATE INDEX \`tasks_assignee_idx\` ON \`tasks\` (\`assignee_id\`);`)
  await db.run(sql`CREATE INDEX \`tasks_status_idx\` ON \`tasks\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`tasks_updated_at_idx\` ON \`tasks\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`tasks_created_at_idx\` ON \`tasks\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`tasks_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`media_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`tasks\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`tasks_rels_order_idx\` ON \`tasks_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`tasks_rels_parent_idx\` ON \`tasks_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`tasks_rels_path_idx\` ON \`tasks_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`tasks_rels_media_id_idx\` ON \`tasks_rels\` (\`media_id\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`engagements_id\` integer REFERENCES engagements(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`tasks_id\` integer REFERENCES tasks(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_engagements_id_idx\` ON \`payload_locked_documents_rels\` (\`engagements_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_tasks_id_idx\` ON \`payload_locked_documents_rels\` (\`tasks_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`engagements_notes\`;`)
  await db.run(sql`DROP TABLE \`engagements\`;`)
  await db.run(sql`DROP TABLE \`tasks_comments\`;`)
  await db.run(sql`DROP TABLE \`tasks\`;`)
  await db.run(sql`DROP TABLE \`tasks_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	\`media_id\` integer,
  	\`categories_id\` integer,
  	\`tags_id\` integer,
  	\`services_id\` integer,
  	\`projects_id\` integer,
  	\`brands_id\` integer,
  	\`partners_id\` integer,
  	\`contact_submissions_id\` integer,
  	\`clients_id\` integer,
  	\`proposals_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`categories_id\`) REFERENCES \`categories\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`tags_id\`) REFERENCES \`tags\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`services_id\`) REFERENCES \`services\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`projects_id\`) REFERENCES \`projects\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`brands_id\`) REFERENCES \`brands\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`partners_id\`) REFERENCES \`partners\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`contact_submissions_id\`) REFERENCES \`contact_submissions\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`clients_id\`) REFERENCES \`clients\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`proposals_id\`) REFERENCES \`proposals\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "users_id", "media_id", "categories_id", "tags_id", "services_id", "projects_id", "brands_id", "partners_id", "contact_submissions_id", "clients_id", "proposals_id") SELECT "id", "order", "parent_id", "path", "users_id", "media_id", "categories_id", "tags_id", "services_id", "projects_id", "brands_id", "partners_id", "contact_submissions_id", "clients_id", "proposals_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_categories_id_idx\` ON \`payload_locked_documents_rels\` (\`categories_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_tags_id_idx\` ON \`payload_locked_documents_rels\` (\`tags_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_services_id_idx\` ON \`payload_locked_documents_rels\` (\`services_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_projects_id_idx\` ON \`payload_locked_documents_rels\` (\`projects_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_brands_id_idx\` ON \`payload_locked_documents_rels\` (\`brands_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_partners_id_idx\` ON \`payload_locked_documents_rels\` (\`partners_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_contact_submissions_id_idx\` ON \`payload_locked_documents_rels\` (\`contact_submissions_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_clients_id_idx\` ON \`payload_locked_documents_rels\` (\`clients_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_proposals_id_idx\` ON \`payload_locked_documents_rels\` (\`proposals_id\`);`)
}
