create table elwood.setting (
  "instance_id" uuid not null default '00000000-0000-0000-0000-000000000000',
  "name" varchar(20) not null primary key,
  "value" jsonb not null default '{}'::jsonb,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now()
);

create unique index if not exists elwood_idx_settings_name on elwood.setting (
  "instance_id",
  "name"
);

alter table elwood."setting" enable row level security;

insert into elwood.setting (name, value) 
  values ('db_ptle_version', json_build_object('version', '$$ELWOOD_PTLE_VERSION$$'))
  ON CONFLICT (name) 
  DO UPDATE 
    SET value = json_build_object('version', '$$ELWOOD_PTLE_VERSION$$');