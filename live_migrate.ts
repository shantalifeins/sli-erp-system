import { runSqlMigration } from './scripts/mcp-deploy-server';

const sql = `
CREATE TABLE IF NOT EXISTS "todo_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "priority" text DEFAULT 'Medium',
  "status" text DEFAULT 'To Do',
  "assigned_by_uid" text,
  "assigned_to_uid" text,
  "start_date" date,
  "due_date" date,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "todo_comments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL,
  "author_uid" text NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE "todo_tasks" ADD CONSTRAINT "todo_tasks_assigned_by_uid_users_uid_fk" FOREIGN KEY ("assigned_by_uid") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "todo_tasks" ADD CONSTRAINT "todo_tasks_assigned_to_uid_users_uid_fk" FOREIGN KEY ("assigned_to_uid") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "todo_comments" ADD CONSTRAINT "todo_comments_task_id_todo_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."todo_tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "todo_comments" ADD CONSTRAINT "todo_comments_author_uid_users_uid_fk" FOREIGN KEY ("author_uid") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE cascade;
EXCEPTION WHEN duplicate_object THEN null; END $$;
`;

async function main() {
  console.log('Running SQL Migration on live server...');
  try {
    const res = await runSqlMigration('10.16.49.78', 'iamadmin', sql);
    console.log(res);
  } catch (err) {
    console.error('Failed:', err);
  }
}

main();
