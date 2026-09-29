alter table quests add column kana text;
update quests set kana = 'あ' where island_id = 1 and kana is null;
insert into quests (island_id, title, reward_points, kana)
select 1, k, (select reward_points from quests where island_id = 1 and kana = 'あ' limit 1), k
from unnest(array['い','う','え','お']) as k;

insert into quests (island_id, title, reward_points, kana)
select 1, k, (select reward_points from quests where island_id = 1 and kana = 'あ' limit 1), k
from unnest(array['か','き','く','け','こ','さ','し','す','せ','そ','た','ち','つ','て','と']) as k;
