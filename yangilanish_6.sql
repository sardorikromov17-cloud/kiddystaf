-- 6-yangilanish: xarajatga cheksiz chek rasmlari. SQL Editor'da bir marta ishga tushiring.
alter table expenses add column if not exists photos text[] default '{}';
