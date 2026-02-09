-- Patients master table
create table if not exists public.patients (
  id bigint generated always as identity primary key,
  bed_no text not null unique,
  hn text not null,
  patient_name text,
  created_at timestamptz not null default now()
);

-- CAUTI + VAP assessment records
create table if not exists public.checklist_records (
  id bigint generated always as identity primary key,
  assessment_date date not null default current_date,
  bed_no text not null,
  hn text not null,
  cauti_1 boolean not null,
  cauti_2 boolean not null,
  cauti_3 boolean not null,
  cauti_4 boolean not null,
  cauti_5 boolean not null,
  cauti_6 boolean not null,
  vap_1 boolean not null,
  vap_2 boolean not null,
  vap_3 boolean not null,
  vap_4 boolean not null,
  vap_5 boolean not null,
  vap_6 boolean not null,
  created_at timestamptz not null default now()
);

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
