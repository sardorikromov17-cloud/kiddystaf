-- 5-yangilanish: bir reysda bir nechta mijoz. SQL Editor'da bir marta ishga tushiring.
create table trip_stops(id bigserial primary key,trip_id bigint references trips on delete cascade,owner text,phone text,address text,cargo text,price numeric default 0,status text default 'ontheway' check(status in('ontheway','arrived','done')),collected numeric,arrived_at timestamptz,arrive_photo text,arrive_note text,sign_photo text,created_at timestamptz default now());
alter table trip_stops enable row level security;
revoke update on trip_stops from authenticated;
grant update(status,collected,arrived_at,arrive_photo,arrive_note,sign_photo) on trip_stops to authenticated;
create policy ts1 on trip_stops for select to authenticated using(is_admin() or exists(select 1 from trips t where t.id=trip_id and t.driver_id=auth.uid()));
create policy ts2 on trip_stops for insert to authenticated with check(is_admin());
create policy ts3 on trip_stops for delete to authenticated using(is_admin());
create policy ts4 on trip_stops for update to authenticated using(exists(select 1 from trips t where t.id=trip_id and t.driver_id=auth.uid())) with check(exists(select 1 from trips t where t.id=trip_id and t.driver_id=auth.uid()));
