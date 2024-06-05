create table elwood.setting (
  "instance_id" uuid not null default '00000000-0000-0000-0000-000000000000',
  "name" varchar(50) not null primary key,
  "label" text null,
  "value" text null,
  "data" jsonb not null default '{}'::jsonb,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now()
);

create unique index if not exists elwood_idx_settings_name on elwood.setting (
  "instance_id",
  "name"
);

alter table elwood."setting" enable row level security;

drop function if exists elwood.set_setting(text, text, jsonb);
create or replace function elwood.set_setting(
  p_name text,
  p_value text,
  p_data jsonb default '{}'
)
returns void
as $$
DECLARE 
BEGIN

  insert into elwood.setting ("name", "value", "data") 
    values (p_name, p_value, p_data)
    ON CONFLICT ("name") 
    DO UPDATE 
      SET "value" = p_value, "data" = p_data;

END;
$$
language plpgsql;


SELECT elwood.set_setting('db_ptle_version', '$$ELWOOD_PTLE_VERSION$$');