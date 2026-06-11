create table if not exists public.alpha_receipts (
  id uuid primary key default gen_random_uuid(),
  purchaser text not null check (purchaser in ('Toby', 'Brian')),
  receipt_date date not null default current_date,
  vendor text not null,
  amount numeric(12,2) not null check (amount >= 0),
  category text not null default 'Other',
  reimbursement_type text not null default 'Reimbursable' check (reimbursement_type in ('Reimbursable', 'Company Card', 'Personal/Non-Reimbursable')),
  notes text,
  image_data_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists alpha_receipts_purchaser_date_idx on public.alpha_receipts (purchaser, receipt_date desc);
create index if not exists alpha_receipts_created_at_idx on public.alpha_receipts (created_at desc);

alter table public.alpha_receipts enable row level security;

-- This app uses Vercel API routes with the Supabase service-role key.
-- Browser/anon direct database access stays blocked.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'alpha_receipts'
      and policyname = 'alpha_receipts_no_anon_direct_access'
  ) then
    create policy alpha_receipts_no_anon_direct_access
      on public.alpha_receipts
      for all
      to anon
      using (false)
      with check (false);
  end if;
end $$;

create or replace function public.set_alpha_receipts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_alpha_receipts_updated_at on public.alpha_receipts;
create trigger trg_alpha_receipts_updated_at
  before update on public.alpha_receipts
  for each row
  execute function public.set_alpha_receipts_updated_at();
