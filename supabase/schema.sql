-- FSB RRHH · Esquema inicial. Ejecutar en Supabase SQL Editor.
create extension if not exists pgcrypto;
create table if not exists public.branches(id uuid primary key default gen_random_uuid(),name text unique not null,latitude double precision,longitude double precision,radius_m integer default 250);
insert into public.branches(name) values('Fiesta'),('Bonita'),('Libertad'),('Alondras') on conflict(name) do nothing;
create table if not exists public.profiles(id uuid primary key references auth.users(id) on delete cascade,full_name text not null,role text not null default 'employee' check(role in ('employee','manager')),active boolean not null default true,default_branch_id uuid references public.branches(id),created_at timestamptz not null default now());
create table if not exists public.shifts(id uuid primary key default gen_random_uuid(),employee_id uuid not null references public.profiles(id),branch_id uuid not null references public.branches(id),starts_at timestamptz not null,ends_at timestamptz not null,commission_starts_at timestamptz,commission_ends_at timestamptz,status text not null default 'published',created_by uuid references public.profiles(id),created_at timestamptz default now(),constraint shift_times check(ends_at>starts_at),constraint commission_pair check((commission_starts_at is null and commission_ends_at is null) or (commission_starts_at is not null and commission_ends_at>commission_starts_at)));
create table if not exists public.attendance(id uuid primary key default gen_random_uuid(),employee_id uuid not null references public.profiles(id),shift_id uuid references public.shifts(id),clock_in_at timestamptz not null default now(),clock_out_at timestamptz,clock_in_branch_id uuid references public.branches(id),clock_out_branch_id uuid references public.branches(id),current_branch_id uuid references public.branches(id),clock_in_method text,clock_out_method text,clock_in_accuracy_m double precision,clock_out_accuracy_m double precision,created_at timestamptz default now(),constraint chronological check(clock_out_at is null or clock_out_at>=clock_in_at));
create unique index if not exists one_open_attendance on public.attendance(employee_id) where clock_out_at is null;
create table if not exists public.transfers(id uuid primary key default gen_random_uuid(),attendance_id uuid not null references public.attendance(id),from_branch_id uuid references public.branches(id),to_branch_id uuid not null references public.branches(id),authorized_by uuid not null references public.profiles(id),reason text not null,transferred_at timestamptz not null default now());
create table if not exists public.correction_requests(id uuid primary key default gen_random_uuid(),employee_id uuid not null references public.profiles(id),attendance_id uuid references public.attendance(id),kind text not null check(kind in ('in','out')),requested_at timestamptz not null,reason text not null,status text not null default 'pending' check(status in ('pending','approved','rejected')),resolved_by uuid references public.profiles(id),resolved_at timestamptz,created_at timestamptz default now());
create table if not exists public.audit_log(id bigint generated always as identity primary key,actor_id uuid references public.profiles(id),action text not null,entity text not null,entity_id uuid,details jsonb not null default '{}'::jsonb,created_at timestamptz not null default now());
create or replace function public.is_manager() returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.profiles where id=(select auth.uid()) and role='manager' and active)$$;
revoke all on function public.is_manager() from public;grant execute on function public.is_manager() to authenticated;
alter table public.branches enable row level security;alter table public.profiles enable row level security;alter table public.shifts enable row level security;alter table public.attendance enable row level security;alter table public.transfers enable row level security;alter table public.correction_requests enable row level security;alter table public.audit_log enable row level security;
create policy branches_read on public.branches for select to authenticated using(true);
create policy profiles_read on public.profiles for select to authenticated using(id=(select auth.uid()) or public.is_manager());
create policy shifts_read on public.shifts for select to authenticated using(employee_id=(select auth.uid()) or public.is_manager());
create policy shifts_manager_insert on public.shifts for insert to authenticated with check(public.is_manager());
create policy shifts_manager_update on public.shifts for update to authenticated using(public.is_manager()) with check(public.is_manager());
create policy attendance_read on public.attendance for select to authenticated using(employee_id=(select auth.uid()) or public.is_manager());
create policy transfers_read on public.transfers for select to authenticated using(public.is_manager() or exists(select 1 from public.attendance a where a.id=attendance_id and a.employee_id=(select auth.uid())));
create policy corrections_read on public.correction_requests for select to authenticated using(employee_id=(select auth.uid()) or public.is_manager());
create policy corrections_insert on public.correction_requests for insert to authenticated with check(employee_id=(select auth.uid()) and status='pending' and resolved_by is null and resolved_at is null);
create policy audit_manager_read on public.audit_log for select to authenticated using(public.is_manager());
-- Checadas: solo servidor; nunca permitir escritura directa a attendance.
create or replace function public.clock_event(p_kind text,p_lat double precision,p_lon double precision,p_accuracy double precision) returns timestamptz language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid();v_shift public.shifts%rowtype;v_open public.attendance%rowtype;v_time timestamptz:=clock_timestamp();v_branch uuid;begin
if v_uid is null or not exists(select 1 from public.profiles where id=v_uid and active) then raise exception 'Cuenta no activa';end if;
if p_kind not in ('in','out') then raise exception 'Movimiento inválido';end if;
if p_lat is null or p_lon is null or p_lat not between -90 and 90 or p_lon not between -180 and 180 or p_accuracy is null or p_accuracy<0 then raise exception 'Ubicación inválida';end if;
select * into v_open from public.attendance where employee_id=v_uid and clock_out_at is null for update;
if p_kind='in' then
if found then raise exception 'Ya tienes una jornada abierta';end if;
select * into v_shift from public.shifts where employee_id=v_uid and starts_at<=v_time+interval '12 hours' and ends_at>=v_time-interval '12 hours' order by abs(extract(epoch from (starts_at-v_time))) limit 1;
v_branch:=coalesce(v_shift.branch_id,(select default_branch_id from public.profiles where id=v_uid));
insert into public.attendance(employee_id,shift_id,clock_in_at,clock_in_branch_id,current_branch_id,clock_in_method,clock_in_accuracy_m)values(v_uid,v_shift.id,v_time,v_branch,v_branch,'gps_unverified',p_accuracy);
else
if not found then raise exception 'No tienes una jornada abierta';end if;
update public.attendance set clock_out_at=v_time,clock_out_branch_id=current_branch_id,clock_out_method='gps_unverified',clock_out_accuracy_m=p_accuracy where id=v_open.id;
end if;
return v_time;end$$;
revoke all on function public.clock_event(text,double precision,double precision,double precision) from public;grant execute on function public.clock_event(text,double precision,double precision,double precision) to authenticated;
create or replace function public.authorize_transfer(p_attendance_id uuid,p_destination_branch_id uuid,p_reason text) returns void language plpgsql security definer set search_path=public as $$declare v public.attendance%rowtype;begin
if not public.is_manager() then raise exception 'Solo Gerencia';end if;
if nullif(trim(p_reason),'') is null then raise exception 'Motivo requerido';end if;
select * into v from public.attendance where id=p_attendance_id and clock_out_at is null for update;
if not found then raise exception 'Jornada no encontrada';end if;
if not exists(select 1 from public.branches where id=p_destination_branch_id) then raise exception 'Sucursal no encontrada';end if;
insert into public.transfers(attendance_id,from_branch_id,to_branch_id,authorized_by,reason)values(v.id,v.current_branch_id,p_destination_branch_id,auth.uid(),p_reason);
update public.attendance set current_branch_id=p_destination_branch_id where id=v.id;
insert into public.audit_log(actor_id,action,entity,entity_id,details)values(auth.uid(),'transfer','attendance',v.id,jsonb_build_object('to_branch_id',p_destination_branch_id));end$$;
revoke all on function public.authorize_transfer(uuid,uuid,text) from public;grant execute on function public.authorize_transfer(uuid,uuid,text) to authenticated;
-- Corrección aprobada: mantiene el original en audit_log; no se permite hora futura.
create or replace function public.resolve_correction(p_id uuid,p_approve boolean) returns void language plpgsql security definer set search_path=public as $$declare c public.correction_requests%rowtype;v_att public.attendance%rowtype;begin
if not public.is_manager() then raise exception 'Solo Gerencia';end if;
select * into c from public.correction_requests where id=p_id and status='pending' for update;
if not found then raise exception 'Solicitud no disponible';end if;
if p_approve and c.requested_at>clock_timestamp() then raise exception 'No se admiten horas futuras';end if;
if p_approve then
if c.kind='out' then
select * into v_att from public.attendance where employee_id=c.employee_id and clock_out_at is null and clock_in_at<=c.requested_at order by clock_in_at desc limit 1 for update;
if not found then raise exception 'No existe jornada abierta compatible';end if;
update public.attendance set clock_out_at=c.requested_at,clock_out_branch_id=current_branch_id,clock_out_method='correction' where id=v_att.id;
else
if exists(select 1 from public.attendance where employee_id=c.employee_id and clock_out_at is null) then raise exception 'Ya existe jornada abierta';end if;
insert into public.attendance(employee_id,clock_in_at,clock_in_method,clock_in_branch_id,current_branch_id) values(c.employee_id,c.requested_at,'correction',(select default_branch_id from public.profiles where id=c.employee_id),(select default_branch_id from public.profiles where id=c.employee_id));
end if;end if;
update public.correction_requests set status=case when p_approve then 'approved' else 'rejected' end,resolved_by=auth.uid(),resolved_at=clock_timestamp() where id=c.id;
insert into public.audit_log(actor_id,action,entity,entity_id,details) values(auth.uid(),case when p_approve then 'correction_approved' else 'correction_rejected' end,'correction_requests',c.id,jsonb_build_object('requested_at',c.requested_at,'kind',c.kind));end$$;
revoke all on function public.resolve_correction(uuid,boolean) from public;grant execute on function public.resolve_correction(uuid,boolean) to authenticated;
-- Provisionar perfiles desde Supabase Dashboard, tras crear usuario en Authentication > Users.
-- EJEMPLO (reemplazar UUID real): insert into public.profiles(id,full_name,role) values('UUID_REAL','Gerencia FSB','manager');
-- No colocar credenciales en SQL ni habilitar auto-registro público.
