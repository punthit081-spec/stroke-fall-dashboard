-- Patients master table
create table if not exists public.patients (
  id bigint generated always as identity primary key,
  bed_no text not null unique,
  hn text not null,
  assessment_scope text not null default 'both',
  patient_name text,
  created_at timestamptz not null default now()
);

-- CAUTI + VAP assessment records
create table if not exists public.checklist_records (
  id bigint generated always as identity primary key,
  assessment_date date not null default current_date,
  bed_no text not null,
  hn text not null,
  assessment_scope text not null default 'both',
  cauti_1_no_reason text,
  vap_4_no_reason text,
  cauti_1 boolean not null,
  cauti_2 boolean not null,
  cauti_3 boolean not null,
  cauti_4 boolean not null,
  cauti_5 boolean not null,
  cauti_6 boolean not null,
  cauti_7 boolean not null,
  cauti_8 boolean not null,
  vap_1 boolean not null,
  vap_2 boolean not null,
  vap_3 boolean not null,
  vap_4 boolean not null,
  vap_5 boolean not null,
  vap_6 boolean not null,
  vap_7 boolean not null,
  vap_8 boolean not null,
  vap_9 boolean not null,
  created_at timestamptz not null default now()
);

alter table public.checklist_records add column if not exists assessment_scope text not null default 'both';
alter table public.checklist_records add column if not exists cauti_1_no_reason text;
alter table public.checklist_records add column if not exists vap_4_no_reason text;
alter table public.checklist_records add column if not exists cauti_7 boolean not null default false;
alter table public.checklist_records add column if not exists cauti_8 boolean not null default false;
alter table public.checklist_records add column if not exists vap_7 boolean not null default false;
alter table public.checklist_records add column if not exists vap_8 boolean not null default false;
alter table public.checklist_records add column if not exists vap_9 boolean not null default false;
alter table public.checklist_records alter column cauti_1 drop not null;
alter table public.checklist_records alter column cauti_2 drop not null;
alter table public.checklist_records alter column cauti_3 drop not null;
alter table public.checklist_records alter column cauti_4 drop not null;
alter table public.checklist_records alter column cauti_5 drop not null;
alter table public.checklist_records alter column cauti_6 drop not null;
alter table public.checklist_records alter column cauti_7 drop not null;
alter table public.checklist_records alter column cauti_8 drop not null;
alter table public.checklist_records alter column vap_1 drop not null;
alter table public.checklist_records alter column vap_2 drop not null;
alter table public.checklist_records alter column vap_3 drop not null;
alter table public.checklist_records alter column vap_4 drop not null;
alter table public.checklist_records alter column vap_5 drop not null;
alter table public.checklist_records alter column vap_6 drop not null;
alter table public.checklist_records alter column vap_7 drop not null;
alter table public.checklist_records alter column vap_8 drop not null;
alter table public.checklist_records alter column vap_9 drop not null;

create index if not exists idx_checklist_records_date on public.checklist_records(assessment_date);
create index if not exists idx_checklist_records_bed on public.checklist_records(bed_no);
create index if not exists idx_checklist_records_hn on public.checklist_records(hn);

-- sample data
insert into public.patients (bed_no, hn, patient_name)
values
  ('เตียง 1', 'HN001', 'ตัวอย่าง 1'),
  ('เตียง 2', 'HN002', 'ตัวอย่าง 2'),
  ('เตียง 3', 'HN003', 'ตัวอย่าง 3')
on conflict (bed_no) do nothing;
