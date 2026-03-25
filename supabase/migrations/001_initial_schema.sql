-- ============================================================
-- MarkUX initial schema
-- ============================================================

-- 1. Tables
-- ------------------------------------------------------------

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  allowed_domains text[] not null default '{}',
  owner_email text not null,
  created_at timestamptz not null default now()
);

create table annotations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  page_url text not null,
  author_name text not null,
  author_email text not null,
  comment text not null,
  pin_x float not null,
  pin_y float not null,
  pin_selector text not null,
  viewport_width integer not null,
  viewport_height integer not null,
  screenshot_path text,
  drawings jsonb,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table replies (
  id uuid primary key default gen_random_uuid(),
  annotation_id uuid not null references annotations(id) on delete cascade,
  author_email text not null,
  author_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

-- Indexes for common queries
create index idx_annotations_project_id on annotations(project_id);
create index idx_annotations_page_url on annotations(project_id, page_url);
create index idx_replies_annotation_id on replies(annotation_id);

-- Auto-update updated_at on annotations
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger annotations_updated_at
  before update on annotations
  for each row execute function update_updated_at();

-- 2. Row-Level Security
-- ------------------------------------------------------------

alter table projects enable row level security;
alter table annotations enable row level security;
alter table replies enable row level security;

-- Projects: anon can read by ID (for script init), admin CRUD by owner_email
create policy "anon_read_project" on projects
  for select using (true);

create policy "admin_insert_project" on projects
  for insert with check (auth.email() = owner_email);

create policy "admin_update_project" on projects
  for update using (auth.email() = owner_email);

create policy "admin_delete_project" on projects
  for delete using (auth.email() = owner_email);

-- Annotations: anon can read, only admin can update/delete, NO anon insert (Edge Function)
create policy "anon_read_annotations" on annotations
  for select using (true);

create policy "admin_update_annotations" on annotations
  for update using (
    exists (
      select 1 from projects
      where projects.id = annotations.project_id
        and projects.owner_email = auth.email()
    )
  );

create policy "admin_delete_annotations" on annotations
  for delete using (
    exists (
      select 1 from projects
      where projects.id = annotations.project_id
        and projects.owner_email = auth.email()
    )
  );

-- Replies: anon can read, only admin can update/delete, NO anon insert (Edge Function)
create policy "anon_read_replies" on replies
  for select using (true);

create policy "admin_update_replies" on replies
  for update using (
    exists (
      select 1 from annotations
      join projects on projects.id = annotations.project_id
      where annotations.id = replies.annotation_id
        and projects.owner_email = auth.email()
    )
  );

create policy "admin_delete_replies" on replies
  for delete using (
    exists (
      select 1 from annotations
      join projects on projects.id = annotations.project_id
      where annotations.id = replies.annotation_id
        and projects.owner_email = auth.email()
    )
  );

-- 3. Storage
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', true);

-- Anon can read screenshots (they show public sites), no anon writes
create policy "anon_read_screenshots" on storage.objects
  for select using (bucket_id = 'screenshots');
