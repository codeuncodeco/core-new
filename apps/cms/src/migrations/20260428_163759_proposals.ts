import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`clients_contacts\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`email\` text,
  	\`phone\` text,
  	\`role\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`clients\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`clients_contacts_order_idx\` ON \`clients_contacts\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`clients_contacts_parent_id_idx\` ON \`clients_contacts\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`clients\` (
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
  await db.run(sql`CREATE INDEX \`clients_default_logo_idx\` ON \`clients\` (\`default_logo_id\`);`)
  await db.run(sql`CREATE INDEX \`clients_status_idx\` ON \`clients\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`clients_updated_at_idx\` ON \`clients\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`clients_created_at_idx\` ON \`clients\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`proposals_summary_cards\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text,
  	\`value\` text,
  	\`caption\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`proposals\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`proposals_summary_cards_order_idx\` ON \`proposals_summary_cards\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`proposals_summary_cards_parent_id_idx\` ON \`proposals_summary_cards\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`proposals_scope_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`description\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`proposals\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`proposals_scope_items_order_idx\` ON \`proposals_scope_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`proposals_scope_items_parent_id_idx\` ON \`proposals_scope_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`proposals_cost_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`item\` text,
  	\`amount\` numeric,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`proposals\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`proposals_cost_items_order_idx\` ON \`proposals_cost_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`proposals_cost_items_parent_id_idx\` ON \`proposals_cost_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`proposals_tech_stack\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text,
  	\`value\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`proposals\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`proposals_tech_stack_order_idx\` ON \`proposals_tech_stack\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`proposals_tech_stack_parent_id_idx\` ON \`proposals_tech_stack\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`proposals_recurring_costs\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`item\` text,
  	\`cost\` text,
  	\`notes\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`proposals\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`proposals_recurring_costs_order_idx\` ON \`proposals_recurring_costs\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`proposals_recurring_costs_parent_id_idx\` ON \`proposals_recurring_costs\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`proposals_payment_terms\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`milestone\` text,
  	\`share_percent\` numeric,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`proposals\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`proposals_payment_terms_order_idx\` ON \`proposals_payment_terms\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`proposals_payment_terms_parent_id_idx\` ON \`proposals_payment_terms\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`proposals_sent_to\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`email\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`proposals\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`proposals_sent_to_order_idx\` ON \`proposals_sent_to\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`proposals_sent_to_parent_id_idx\` ON \`proposals_sent_to\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`proposals_notes\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`note\` text,
  	\`author_id\` integer,
  	\`created_at\` text,
  	FOREIGN KEY (\`author_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`proposals\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`proposals_notes_order_idx\` ON \`proposals_notes\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`proposals_notes_parent_id_idx\` ON \`proposals_notes\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`proposals_notes_author_idx\` ON \`proposals_notes\` (\`author_id\`);`)
  await db.run(sql`CREATE TABLE \`proposals\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`internal_title\` text,
  	\`url_slug\` text,
  	\`client_id\` integer,
  	\`project_name\` text,
  	\`subtitle\` text,
  	\`logo_id\` integer,
  	\`accent_color\` text DEFAULT '#f97316',
  	\`font_family\` text DEFAULT 'League Spartan',
  	\`proposal_date\` text,
  	\`overview\` text,
  	\`cost_section_label\` text DEFAULT 'Cost Breakdown',
  	\`cost_total_label\` text DEFAULT 'Total',
  	\`status\` text DEFAULT 'draft',
  	\`sent_at\` text,
  	\`sent_method\` text,
  	\`last_contact_at\` text,
  	\`responded_at\` text,
  	\`attached_pdf_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`client_id\`) REFERENCES \`clients\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`attached_pdf_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`proposals_url_slug_idx\` ON \`proposals\` (\`url_slug\`);`)
  await db.run(sql`CREATE INDEX \`proposals_client_idx\` ON \`proposals\` (\`client_id\`);`)
  await db.run(sql`CREATE INDEX \`proposals_logo_idx\` ON \`proposals\` (\`logo_id\`);`)
  await db.run(sql`CREATE INDEX \`proposals_status_idx\` ON \`proposals\` (\`status\`);`)
  await db.run(sql`CREATE INDEX \`proposals_attached_pdf_idx\` ON \`proposals\` (\`attached_pdf_id\`);`)
  await db.run(sql`CREATE INDEX \`proposals_updated_at_idx\` ON \`proposals\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`proposals_created_at_idx\` ON \`proposals\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`proposals__status_idx\` ON \`proposals\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`_proposals_v_version_summary_cards\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`label\` text,
  	\`value\` text,
  	\`caption\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_proposals_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_summary_cards_order_idx\` ON \`_proposals_v_version_summary_cards\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_summary_cards_parent_id_idx\` ON \`_proposals_v_version_summary_cards\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_proposals_v_version_scope_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`description\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_proposals_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_scope_items_order_idx\` ON \`_proposals_v_version_scope_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_scope_items_parent_id_idx\` ON \`_proposals_v_version_scope_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_proposals_v_version_cost_items\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`item\` text,
  	\`amount\` numeric,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_proposals_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_cost_items_order_idx\` ON \`_proposals_v_version_cost_items\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_cost_items_parent_id_idx\` ON \`_proposals_v_version_cost_items\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_proposals_v_version_tech_stack\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`label\` text,
  	\`value\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_proposals_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_tech_stack_order_idx\` ON \`_proposals_v_version_tech_stack\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_tech_stack_parent_id_idx\` ON \`_proposals_v_version_tech_stack\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_proposals_v_version_recurring_costs\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`item\` text,
  	\`cost\` text,
  	\`notes\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_proposals_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_recurring_costs_order_idx\` ON \`_proposals_v_version_recurring_costs\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_recurring_costs_parent_id_idx\` ON \`_proposals_v_version_recurring_costs\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_proposals_v_version_payment_terms\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`milestone\` text,
  	\`share_percent\` numeric,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_proposals_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_payment_terms_order_idx\` ON \`_proposals_v_version_payment_terms\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_payment_terms_parent_id_idx\` ON \`_proposals_v_version_payment_terms\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_proposals_v_version_sent_to\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`email\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_proposals_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_sent_to_order_idx\` ON \`_proposals_v_version_sent_to\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_sent_to_parent_id_idx\` ON \`_proposals_v_version_sent_to\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_proposals_v_version_notes\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`note\` text,
  	\`author_id\` integer,
  	\`created_at\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`author_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_proposals_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_notes_order_idx\` ON \`_proposals_v_version_notes\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_notes_parent_id_idx\` ON \`_proposals_v_version_notes\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_notes_author_idx\` ON \`_proposals_v_version_notes\` (\`author_id\`);`)
  await db.run(sql`CREATE TABLE \`_proposals_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_internal_title\` text,
  	\`version_url_slug\` text,
  	\`version_client_id\` integer,
  	\`version_project_name\` text,
  	\`version_subtitle\` text,
  	\`version_logo_id\` integer,
  	\`version_accent_color\` text DEFAULT '#f97316',
  	\`version_font_family\` text DEFAULT 'League Spartan',
  	\`version_proposal_date\` text,
  	\`version_overview\` text,
  	\`version_cost_section_label\` text DEFAULT 'Cost Breakdown',
  	\`version_cost_total_label\` text DEFAULT 'Total',
  	\`version_status\` text DEFAULT 'draft',
  	\`version_sent_at\` text,
  	\`version_sent_method\` text,
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
  	FOREIGN KEY (\`version_logo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_attached_pdf_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_proposals_v_parent_idx\` ON \`_proposals_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_version_url_slug_idx\` ON \`_proposals_v\` (\`version_url_slug\`);`)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_version_client_idx\` ON \`_proposals_v\` (\`version_client_id\`);`)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_version_logo_idx\` ON \`_proposals_v\` (\`version_logo_id\`);`)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_version_status_idx\` ON \`_proposals_v\` (\`version_status\`);`)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_version_attached_pdf_idx\` ON \`_proposals_v\` (\`version_attached_pdf_id\`);`)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_version_updated_at_idx\` ON \`_proposals_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_version_created_at_idx\` ON \`_proposals_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_proposals_v_version_version__status_idx\` ON \`_proposals_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_proposals_v_created_at_idx\` ON \`_proposals_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_proposals_v_updated_at_idx\` ON \`_proposals_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_proposals_v_latest_idx\` ON \`_proposals_v\` (\`latest\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`clients_id\` integer REFERENCES clients(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`proposals_id\` integer REFERENCES proposals(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_clients_id_idx\` ON \`payload_locked_documents_rels\` (\`clients_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_proposals_id_idx\` ON \`payload_locked_documents_rels\` (\`proposals_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`clients_contacts\`;`)
  await db.run(sql`DROP TABLE \`clients\`;`)
  await db.run(sql`DROP TABLE \`proposals_summary_cards\`;`)
  await db.run(sql`DROP TABLE \`proposals_scope_items\`;`)
  await db.run(sql`DROP TABLE \`proposals_cost_items\`;`)
  await db.run(sql`DROP TABLE \`proposals_tech_stack\`;`)
  await db.run(sql`DROP TABLE \`proposals_recurring_costs\`;`)
  await db.run(sql`DROP TABLE \`proposals_payment_terms\`;`)
  await db.run(sql`DROP TABLE \`proposals_sent_to\`;`)
  await db.run(sql`DROP TABLE \`proposals_notes\`;`)
  await db.run(sql`DROP TABLE \`proposals\`;`)
  await db.run(sql`DROP TABLE \`_proposals_v_version_summary_cards\`;`)
  await db.run(sql`DROP TABLE \`_proposals_v_version_scope_items\`;`)
  await db.run(sql`DROP TABLE \`_proposals_v_version_cost_items\`;`)
  await db.run(sql`DROP TABLE \`_proposals_v_version_tech_stack\`;`)
  await db.run(sql`DROP TABLE \`_proposals_v_version_recurring_costs\`;`)
  await db.run(sql`DROP TABLE \`_proposals_v_version_payment_terms\`;`)
  await db.run(sql`DROP TABLE \`_proposals_v_version_sent_to\`;`)
  await db.run(sql`DROP TABLE \`_proposals_v_version_notes\`;`)
  await db.run(sql`DROP TABLE \`_proposals_v\`;`)
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
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`categories_id\`) REFERENCES \`categories\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`tags_id\`) REFERENCES \`tags\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`services_id\`) REFERENCES \`services\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`projects_id\`) REFERENCES \`projects\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`brands_id\`) REFERENCES \`brands\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`partners_id\`) REFERENCES \`partners\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`contact_submissions_id\`) REFERENCES \`contact_submissions\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "users_id", "media_id", "categories_id", "tags_id", "services_id", "projects_id", "brands_id", "partners_id", "contact_submissions_id") SELECT "id", "order", "parent_id", "path", "users_id", "media_id", "categories_id", "tags_id", "services_id", "projects_id", "brands_id", "partners_id", "contact_submissions_id" FROM \`payload_locked_documents_rels\`;`)
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
}
