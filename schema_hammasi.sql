-- KIDDY ISHXONA: to'liq baza. Supabase > SQL Editor ga BUTUNLAY qo'yib Run bosing (bir marta)
-- Supabase > SQL Editor: to'liq qo'yib Run bosing (yangi, bo'sh loyiha uchun)
create table branches(id serial primary key,name text not null,lat float8,lng float8,radius int default 150,qr_token text default gen_random_uuid()::text);
create table profiles(id uuid primary key references auth.users on delete cascade,full_name text,role text default 'employee' check(role in('admin','employee','driver')),branch_id int references branches,shift_start time default '08:00',shift_end time default '19:00',off_day smallint default 0,active boolean default true);
create table attendance(id bigserial primary key,user_id uuid references profiles,branch_id int references branches,kind text check(kind in('in','out')),lat float8,lng float8,note text,edited_by uuid references profiles,created_at timestamptz default now());
create table leaves(id bigserial primary key,user_id uuid references profiles,from_date date,to_date date,reason text,status text default 'pending' check(status in('pending','approved','rejected')),created_at timestamptz default now());
create table audit(id bigserial primary key,actor uuid references profiles,action text,detail text,created_at timestamptz default now());
create function is_admin() returns boolean language sql security definer stable set search_path=public as $$select exists(select 1 from profiles where id=auth.uid() and role='admin')$$;
create function new_user() returns trigger language plpgsql security definer set search_path=public as $$begin insert into public.profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',new.email));return new;end$$;
create trigger on_signup after insert on auth.users for each row execute function new_user();
-- Keldi/ketdi faqat shu funksiya orqali: QR kod + GPS hudud + ketma-ketlik serverda tekshiriladi
create function mark(k text,la float8,ln float8,tok text) returns text language plpgsql security definer set search_path=public as $$
declare p profiles;b branches;d float8;l attendance;
begin
select * into p from profiles where id=auth.uid();
select * into b from branches where qr_token=tok;
if b.id is null then raise exception 'QR kod noto''g''ri'; end if;
if p.branch_id is not null and p.branch_id<>b.id and p.role<>'driver' then raise exception 'Bu boshqa filialning QR kodi'; end if;
d:=12742000*asin(sqrt(power(sin(radians(la-b.lat)/2),2)+cos(radians(b.lat))*cos(radians(la))*power(sin(radians(ln-b.lng)/2),2)));
if d>b.radius then raise exception 'Filial hududidan % m uzoqdasiz',round(d); end if;
select * into l from attendance where user_id=p.id and created_at>=date_trunc('day',now() at time zone 'Asia/Tashkent') at time zone 'Asia/Tashkent' order by created_at desc limit 1;
if k='in' and l.kind='in' then raise exception 'Siz allaqachon "Keldim" bosgansiz'; end if;
if k='out' and (l.id is null or l.kind='out') then raise exception 'Avval "Keldim" bosing'; end if;
insert into attendance(user_id,branch_id,kind,lat,lng) values(p.id,b.id,k,la,ln);
return 'ok';end$$;
create function qr_of(bid int) returns text language plpgsql security definer set search_path=public as $$begin if not is_admin() then raise exception 'Ruxsat yo''q'; end if;return (select qr_token from branches where id=bid);end$$;
alter table branches enable row level security;alter table profiles enable row level security;alter table attendance enable row level security;alter table leaves enable row level security;alter table audit enable row level security;
revoke select on branches from anon,authenticated;grant select(id,name,lat,lng,radius) on branches to authenticated;grant insert,update,delete on branches to authenticated;
create policy b1 on branches for select to authenticated using(true);
create policy b2 on branches for all to authenticated using(is_admin()) with check(is_admin());
create policy p1 on profiles for select to authenticated using(true);
create policy p2 on profiles for all to authenticated using(is_admin()) with check(is_admin());
create policy a1 on attendance for select to authenticated using(user_id=auth.uid() or is_admin());
create policy a2 on attendance for all to authenticated using(is_admin()) with check(is_admin());
create policy l1 on leaves for select to authenticated using(user_id=auth.uid() or is_admin());
create policy l2 on leaves for insert to authenticated with check(user_id=auth.uid() and status='pending');
create policy l3 on leaves for update to authenticated using(is_admin()) with check(is_admin());
create policy u1 on audit for all to authenticated using(is_admin()) with check(is_admin());

-- schema.sql DAN KEYIN ishga tushiring: vazifalar, moliya, shafyor, chat
create table tasks(id bigserial primary key,user_id uuid references profiles,title text,note text,due date,status text default 'new' check(status in('new','accepted','done','rejected')),created_by uuid references profiles,created_at timestamptz default now());
create table transactions(id bigserial primary key,user_id uuid references profiles,amount numeric,kind text,note text,created_by uuid references profiles,created_at timestamptz default now());
create table trips(id bigserial primary key,driver_id uuid references profiles,title text,owner text,phone text,address text,cargo text,price numeric default 0,status text default 'ontheway' check(status in('ontheway','arrived','done')),collected numeric,arrived_at timestamptz,created_at timestamptz default now());
create table locations(user_id uuid primary key references profiles,lat float8,lng float8,updated_at timestamptz default now());
create table messages(id bigserial primary key,user_id uuid references profiles,body text,created_at timestamptz default now());
alter table tasks enable row level security;alter table transactions enable row level security;alter table trips enable row level security;alter table locations enable row level security;alter table messages enable row level security;
revoke update on tasks from authenticated;grant update(status) on tasks to authenticated;
revoke update on trips from authenticated;grant update(status,collected,arrived_at) on trips to authenticated;
create policy k1 on tasks for select to authenticated using(user_id=auth.uid() or is_admin());
create policy k2 on tasks for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy k3 on tasks for insert to authenticated with check(is_admin());
create policy k4 on tasks for delete to authenticated using(is_admin());
create policy t1 on transactions for select to authenticated using(user_id=auth.uid() or is_admin());
create policy t2 on transactions for insert to authenticated with check(is_admin());
create policy t3 on transactions for delete to authenticated using(is_admin());
create policy r1 on trips for select to authenticated using(driver_id=auth.uid() or is_admin());
create policy r2 on trips for update to authenticated using(driver_id=auth.uid()) with check(driver_id=auth.uid());
create policy r3 on trips for insert to authenticated with check(is_admin());
create policy r4 on trips for delete to authenticated using(is_admin());
create policy o1 on locations for select to authenticated using(user_id=auth.uid() or is_admin());
create policy o2 on locations for insert to authenticated with check(user_id=auth.uid());
create policy o3 on locations for update to authenticated using(user_id=auth.uid());
create policy m1 on messages for select to authenticated using(true);
create policy m2 on messages for insert to authenticated with check(user_id=auth.uid());
alter publication supabase_realtime add table messages;
-- Xodim ma'lumotlari, filial ish vaqti, bir nechta dam olish kuni. SQL Editor'da bir marta ishga tushiring.
alter table profiles add column if not exists phone text,add column if not exists birth_date date,add column if not exists position text,add column if not exists off_days int[] default '{0}';
update profiles set off_days=array[off_day::int] where off_day is not null;
alter table branches add column if not exists work_start time default '08:00',add column if not exists work_end time default '19:00';
grant select(work_start,work_end) on branches to authenticated;
