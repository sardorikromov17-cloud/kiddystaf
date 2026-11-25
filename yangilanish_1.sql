-- Xodim ma'lumotlari, filial ish vaqti, bir nechta dam olish kuni. SQL Editor'da bir marta ishga tushiring.
alter table profiles add column if not exists phone text,add column if not exists birth_date date,add column if not exists position text,add column if not exists off_days int[] default '{0}';
update profiles set off_days=array[off_day::int] where off_day is not null;
alter table branches add column if not exists work_start time default '08:00',add column if not exists work_end time default '19:00';
grant select(work_start,work_end) on branches to authenticated;
