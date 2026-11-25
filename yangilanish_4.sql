-- 4-yangilanish: chatda rasm/fayl/stiker va o'qilmagan xabar belgisi. SQL Editor'da bir marta ishga tushiring.
alter table messages add column if not exists kind text default 'text',add column if not exists path text,add column if not exists fname text;
create table chat_reads(user_id uuid references profiles on delete cascade,room text,last_read timestamptz default now(),primary key(user_id,room));
alter table chat_reads enable row level security;
create policy cr1 on chat_reads for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
insert into storage.buckets(id,name,public) values('chat','chat',false) on conflict do nothing;
create policy ch1 on storage.objects for insert to authenticated with check(bucket_id='chat' and (storage.foldername(name))[1]=auth.uid()::text);
create policy ch2 on storage.objects for select to authenticated using(bucket_id='chat' and exists(select 1 from messages m where m.path=name));
