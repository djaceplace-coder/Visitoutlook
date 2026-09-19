-- ============================================================================
-- OUTLOOK WEB CLONE SUPABASE COMPLETE PRODUCTION SCHEMA
-- Run this in your Supabase SQL Editor (Supabase Dashboard -> SQL Editor -> New Query)
-- ============================================================================

-- Enable UUID extension if not enabled
create extension if not exists "pgcrypto";

-- 1. Folders (Mail folders: Inbox, Sent Items, Drafts, Archive, Deleted Items, Junk, custom)
create table if not exists folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  parent_id uuid references folders(id) on delete cascade,
  icon text default 'Folder',
  created_at timestamptz default now()
);

-- 2. Messages (Email messages in folders or threads)
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid references folders(id) on delete set null,
  thread_id uuid,
  sender text not null,
  sender_name text,
  recipients text[] not null default '{}',
  cc text[] default '{}',
  bcc text[] default '{}',
  subject text default '(No subject)',
  body text default '',
  snippet text default '',
  is_read boolean default false,
  is_flagged boolean default false,
  is_focused boolean default true,
  has_attachments boolean default false,
  is_pinned boolean default false,
  category text,
  importance text default 'normal',
  date timestamptz default now(),
  created_at timestamptz default now()
);

-- 3. Drafts (Separate draft storage for composed items)
create table if not exists drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipients text[] default '{}',
  cc text[] default '{}',
  bcc text[] default '{}',
  subject text default '',
  body text default '',
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- 4. Contacts (People & Enterprise Directory)
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  first_name text,
  last_name text,
  email text,
  phone text,
  mobile text,
  job_title text,
  department text,
  company text,
  office_location text,
  notes text,
  avatar_color text default '#0078D4',
  category text default 'Work',
  is_favourite boolean default false,
  created_at timestamptz default now()
);

-- 5. Calendars (User calendar categories: Work, Personal, Executive)
create table if not exists calendars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text default '#0078D4',
  is_visible boolean default true,
  created_at timestamptz default now()
);

-- 6. Events (Calendar appointments, meetings, reminders)
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  calendar_id uuid references calendars(id) on delete set null,
  title text not null,
  description text default '',
  location text default '',
  attendees text[] default '{}',
  start_at timestamptz not null,
  end_at timestamptz not null,
  is_all_day boolean default false,
  recurrence_rule text,
  reminder_minutes int default 15,
  status text default 'busy',
  created_at timestamptz default now()
);

-- 7. Task Lists (To Do categories: Tasks, Planned, Important, Flagged, My Day)
create table if not exists task_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text default '#0078D4',
  created_at timestamptz default now()
);

-- 8. Tasks (To-do list tasks, subtasks, priorities)
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  list_id uuid references task_lists(id) on delete set null,
  parent_task_id uuid references tasks(id) on delete cascade,
  title text not null,
  notes text default '',
  due_at timestamptz,
  priority text default 'none',
  is_completed boolean default false,
  in_my_day boolean default false,
  show_on_calendar boolean default false,
  reminder_at timestamptz,
  recurrence_rule text,
  steps jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- 9. User Settings (Single row per user)
create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text default 'light',
  density text default 'comfortable',
  reading_pane_position text default 'right',
  signature text default '',
  default_reply_all boolean default false,
  undo_send_seconds int default 5,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) ACTIVATION
-- ============================================================================

alter table folders enable row level security;
alter table messages enable row level security;
alter table drafts enable row level security;
alter table contacts enable row level security;
alter table calendars enable row level security;
alter table events enable row level security;
alter table task_lists enable row level security;
alter table tasks enable row level security;
alter table user_settings enable row level security;

-- ============================================================================
-- RLS POLICIES (Users can only view, insert, update, delete their own data)
-- ============================================================================

-- folders
drop policy if exists "Users can view own folders" on folders;
drop policy if exists "Users can insert own folders" on folders;
drop policy if exists "Users can update own folders" on folders;
drop policy if exists "Users can delete own folders" on folders;

create policy "Users can view own folders" on folders for select using (auth.uid() = user_id);
create policy "Users can insert own folders" on folders for insert with check (auth.uid() = user_id);
create policy "Users can update own folders" on folders for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own folders" on folders for delete using (auth.uid() = user_id);

-- messages
drop policy if exists "Users can view own messages" on messages;
drop policy if exists "Users can insert own messages" on messages;
drop policy if exists "Users can update own messages" on messages;
drop policy if exists "Users can delete own messages" on messages;

create policy "Users can view own messages" on messages for select using (auth.uid() = user_id);
create policy "Users can insert own messages" on messages for insert with check (auth.uid() = user_id);
create policy "Users can update own messages" on messages for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own messages" on messages for delete using (auth.uid() = user_id);

-- drafts
drop policy if exists "Users can view own drafts" on drafts;
drop policy if exists "Users can insert own drafts" on drafts;
drop policy if exists "Users can update own drafts" on drafts;
drop policy if exists "Users can delete own drafts" on drafts;

create policy "Users can view own drafts" on drafts for select using (auth.uid() = user_id);
create policy "Users can insert own drafts" on drafts for insert with check (auth.uid() = user_id);
create policy "Users can update own drafts" on drafts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own drafts" on drafts for delete using (auth.uid() = user_id);

-- contacts
drop policy if exists "Users can view own contacts" on contacts;
drop policy if exists "Users can insert own contacts" on contacts;
drop policy if exists "Users can update own contacts" on contacts;
drop policy if exists "Users can delete own contacts" on contacts;

create policy "Users can view own contacts" on contacts for select using (auth.uid() = user_id);
create policy "Users can insert own contacts" on contacts for insert with check (auth.uid() = user_id);
create policy "Users can update own contacts" on contacts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own contacts" on contacts for delete using (auth.uid() = user_id);

-- calendars
drop policy if exists "Users can view own calendars" on calendars;
drop policy if exists "Users can insert own calendars" on calendars;
drop policy if exists "Users can update own calendars" on calendars;
drop policy if exists "Users can delete own calendars" on calendars;

create policy "Users can view own calendars" on calendars for select using (auth.uid() = user_id);
create policy "Users can insert own calendars" on calendars for insert with check (auth.uid() = user_id);
create policy "Users can update own calendars" on calendars for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own calendars" on calendars for delete using (auth.uid() = user_id);

-- events
drop policy if exists "Users can view own events" on events;
drop policy if exists "Users can insert own events" on events;
drop policy if exists "Users can update own events" on events;
drop policy if exists "Users can delete own events" on events;

create policy "Users can view own events" on events for select using (auth.uid() = user_id);
create policy "Users can insert own events" on events for insert with check (auth.uid() = user_id);
create policy "Users can update own events" on events for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own events" on events for delete using (auth.uid() = user_id);

-- task_lists
drop policy if exists "Users can view own task_lists" on task_lists;
drop policy if exists "Users can insert own task_lists" on task_lists;
drop policy if exists "Users can update own task_lists" on task_lists;
drop policy if exists "Users can delete own task_lists" on task_lists;

create policy "Users can view own task_lists" on task_lists for select using (auth.uid() = user_id);
create policy "Users can insert own task_lists" on task_lists for insert with check (auth.uid() = user_id);
create policy "Users can update own task_lists" on task_lists for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own task_lists" on task_lists for delete using (auth.uid() = user_id);

-- tasks
drop policy if exists "Users can view own tasks" on tasks;
drop policy if exists "Users can insert own tasks" on tasks;
drop policy if exists "Users can update own tasks" on tasks;
drop policy if exists "Users can delete own tasks" on tasks;

create policy "Users can view own tasks" on tasks for select using (auth.uid() = user_id);
create policy "Users can insert own tasks" on tasks for insert with check (auth.uid() = user_id);
create policy "Users can update own tasks" on tasks for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own tasks" on tasks for delete using (auth.uid() = user_id);

-- user_settings
drop policy if exists "Users can view own user_settings" on user_settings;
drop policy if exists "Users can insert own user_settings" on user_settings;
drop policy if exists "Users can update own user_settings" on user_settings;
drop policy if exists "Users can delete own user_settings" on user_settings;

create policy "Users can view own user_settings" on user_settings for select using (auth.uid() = user_id);
create policy "Users can insert own user_settings" on user_settings for insert with check (auth.uid() = user_id);
create policy "Users can update own user_settings" on user_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own user_settings" on user_settings for delete using (auth.uid() = user_id);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================
create index if not exists idx_messages_user_folder on messages(user_id, folder_id);
create index if not exists idx_messages_created on messages(created_at desc);
create index if not exists idx_contacts_user on contacts(user_id);
create index if not exists idx_events_user_start on events(user_id, start_at);
create index if not exists idx_tasks_user_list on tasks(user_id, list_id);
create index if not exists idx_tasks_completed on tasks(user_id, is_completed);

-- ============================================================================
-- AUTOMATIC NEW USER INITIALIZATION (Trigger on auth.users sign-up)
-- Creates default folders and settings whenever a user registers
-- ============================================================================
create or replace function public.handle_new_user_setup()
returns trigger as $$
begin
  -- Initialize Default Folders
  insert into public.folders (user_id, name, icon)
  values 
    (new.id, 'Inbox', 'Inbox'),
    (new.id, 'Sent Items', 'Send'),
    (new.id, 'Drafts', 'FileText'),
    (new.id, 'Archive', 'Archive'),
    (new.id, 'Deleted Items', 'Trash2'),
    (new.id, 'Junk Email', 'AlertOctagon')
  on conflict do nothing;

  -- Initialize User Settings
  insert into public.user_settings (user_id, theme, density, reading_pane_position)
  values (new.id, 'light', 'comfortable', 'right')
  on conflict do nothing;

  -- Initialize Default Calendar
  insert into public.calendars (user_id, name, color)
  values (new.id, 'Calendar', '#0078D4')
  on conflict do nothing;

  -- Initialize Default To-Do List
  insert into public.task_lists (user_id, name, color)
  values (new.id, 'Tasks', '#0078D4')
  on conflict do nothing;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users
drop trigger if exists on_auth_user_created_setup on auth.users;
create trigger on_auth_user_created_setup
  after insert on auth.users
  for each row execute function public.handle_new_user_setup();

-- ============================================================================
-- BACKEND PASSWORD MANAGEMENT FROM SUPABASE
-- ============================================================================
-- 1. To change a user's password directly from the Supabase SQL Editor:
--    UPDATE auth.users 
--    SET encrypted_password = crypt('YourNewPassword123!', gen_salt('bf'))
--    WHERE email = 'user@example.com';
--
-- 2. Or change it from the Supabase Dashboard:
--    Authentication -> Users -> Click user -> "Send password reset" or edit.
-- ============================================================================

