import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_clients\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`tagline\` text,
  	\`logo_id\` integer,
  	\`status\` text DEFAULT 'prospect',
  	\`notes\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_clients\`("id", "name", "tagline", "logo_id", "status", "notes", "updated_at", "created_at") SELECT "id", "name", "tagline", "logo_id", "status", "notes", "updated_at", "created_at" FROM \`clients\`;`)
  await db.run(sql`DROP TABLE \`clients\`;`)
  await db.run(sql`ALTER TABLE \`__new_clients\` RENAME TO \`clients\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`clients_logo_idx\` ON \`clients\` (\`logo_id\`);`)
  await db.run(sql`CREATE INDEX \`clients_status_idx\` ON \`clients\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`clients_updated_at_idx\` ON \`clients\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`clients_created_at_idx\` ON \`clients\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`__new_proposals\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`internal_title\` text,
  	\`url_slug\` text,
  	\`client_id\` integer,
  	\`project_name\` text,
  	\`subtitle\` text,
  	\`accent_color\` text DEFAULT '#f97316',
  	\`font_family\` text DEFAULT 'League Spartan',
  	\`proposal_date\` text,
  	\`overview\` text,
  	\`cost_section_label\` text DEFAULT 'Cost Breakdown',
  	\`cost_total_label\` text DEFAULT 'Total',
  	\`status\` text DEFAULT 'draft',
  	\`sent_at\` text,
  	\`last_contact_at\` text,
  	\`responded_at\` text,
  	\`attached_pdf_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`client_id\`) REFERENCES \`clients\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`attached_pdf_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_proposals\`("id", "internal_title", "url_slug", "client_id", "project_name", "subtitle", "accent_color", "font_family", "proposal_date", "overview", "cost_section_label", "cost_total_label", "status", "sent_at", "last_contact_at", "responded_at", "attached_pdf_id", "updated_at", "created_at", "_status") SELECT "id", "internal_title", "url_slug", "client_id", "project_name", "subtitle", "accent_color", "font_family", "proposal_date", "overview", "cost_section_label", "cost_total_label", "status", "sent_at", "last_contact_at", "responded_at", "attached_pdf_id", "updated_at", "created_at", "_status" FROM \`proposals\`;`)
  await db.run(sql`DROP TABLE \`proposals\`;`)
  await db.run(sql`ALTER TABLE \`__new_proposals\` RENAME TO \`proposals\`;`)
  await db.run(sql`CREATE UNIQUE INDEX \`proposals_url_slug_idx\` ON \`proposals\` (\`url_slug\`);`)
  await db.run(sql`CREATE INDEX \`proposals_client_idx\` ON \`proposals\` (\`client_id\`);`)
  await db.run(sql`CREATE INDEX \`proposals_status_idx\` ON \`proposals\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`proposals_attached_pdf_idx\` ON \`proposals\` (\`attached_pdf_id\`);`)
  await db.run(sql`CREATE INDEX \`proposals_updated_at_idx\` ON \`proposals\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`proposals_created_at_idx\` ON \`proposals\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`proposals__status_idx\` ON \`proposals\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`__new__proposals_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_internal_title\` text,
  	\`version_url_slug\` text,
  	\`version_client_id\` integer,
  	\`version_project_name\` text,
  	\`version_subtitle\` text,
  	\`version_accent_color\` text DEFAULT '#f97316',
  	\`version_font_family\` text DEFAULT 'League Spartan',
  	\`version_proposal_date\` text,
  	\`version_overview\` text,
  	\`version_cost_section_label\` text DEFAULT 'Cost Breakdown',
  	\`version_cost_total_label\` text DEFAULT 'Total',
  	\`version_status\` text DEFAULT 'draft',
  	\`version_sent_at\` text,
  	\`version_last_contact_at\` text,
  	\`version_responded_at\` text,
  	\`version_attached_pdf_id\` integer,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`proposals\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_client_id\`) REFERENCES \`clients\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_attached_pdf_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new__proposals_v\`("id", "parent_id", "version_internal_title", "version_url_slug", "version_client_id", "version_project_name", "version_subtitle", "version_accent_color", "version_font_family", "version_proposal_date", "version_overview", "version_cost_section_label", "version_cost_total_label", "version_status", "version_sent_at", "version_last_contact_at", "version_responded_at", "version_attached_pdf_id", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest") SELECT "id", "parent_id", "version_internal_title", "version_url_slug", "version_client_id", "version_project_name", "version_subtitle", "version_accent_color", "version_font_family", "version_proposal_date", "version_overview", "version_cost_section_label", "version_cost_total_label", "version_status", "version_sent_at", "version_last_contact_at", "version_responded_at", "version_attached_pdf_id", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest" FROM \`_proposals_v\`;`)
  await db.run(sql`DROP TABLE \`_proposals_v\`;`)
  await db.run(sql`ALTER TABLE \`__new__proposals_v\` RENAME TO \`_proposals_v\`;`)
  await db.run(sql`CREATE INDEX \`_proposals_v_parent_idx\` ON \`_proposals_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_version_url_slug_idx\` ON \`_proposals_v\` (\`version_url_slug\`);`)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_version_client_idx\` ON \`_proposals_v\` (\`version_client_id\`);`)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_version_status_idx\` ON \`_proposals_v\` (\`version_status\`);`)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_version_attached_pdf_idx\` ON \`_proposals_v\` (\`version_attached_pdf_id\`);`)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_version_updated_at_idx\` ON \`_proposals_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_version_created_at_idx\` ON \`_proposals_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_version__status_idx\` ON \`_proposals_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_proposals_v_created_at_idx\` ON \`_proposals_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_proposals_v_updated_at_idx\` ON \`_proposals_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_proposals_v_latest_idx\` ON \`_proposals_v\` (\`latest\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_clients\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`tagline\` text,
  	\`default_logo_id\` integer,
  	\`status\` text DEFAULT 'prospect',
  	\`notes\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`default_logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_clients\`("id", "name", "tagline", "default_logo_id", "status", "notes", "updated_at", "created_at") SELECT "id", "name", "tagline", "default_logo_id", "status", "notes", "updated_at", "created_at" FROM \`clients\`;`)
  await db.run(sql`DROP TABLE \`clients\`;`)
  await db.run(sql`ALTER TABLE \`__new_clients\` RENAME TO \`clients\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`clients_default_logo_idx\` ON \`clients\` (\`default_logo_id\`);`)
  await db.run(sql`CREATE INDEX \`clients_status_idx\` ON \`clients\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`clients_updated_at_idx\` ON \`clients\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`clients_created_at_idx\` ON \`clients\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`proposals\` ADD \`logo_id\` integer REFERENCES media(id);`)
  await db.run(sql`CREATE INDEX \`proposals_logo_idx\` ON \`proposals\` (\`logo_id\`);`)
  await db.run(sql`ALTER TABLE \`_proposals_v\` ADD \`version_logo_id\` integer REFERENCES media(id);`)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_version_logo_idx\` ON \`_proposals_v\` (\`version_logo_id\`);`)
}
