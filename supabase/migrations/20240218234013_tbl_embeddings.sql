

create table if not exists elwood.embedding (
  "instance_id" uuid not null default '00000000-0000-0000-0000-000000000000',
  "id" uuid not null default extensions.uuid_generate_v4(),
  "object_id" uuid null,
  "chunk_id" text not null,
  "embedding" extensions.vector(1536),
  "summary" text null,
  "content" text null,
  "search_text" tsvector null,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now(),

  constraint "elwood_follow_object_id"
    foreign key ("object_id") references "storage"."objects"("id"),
  primary key ("id")
);


create unique index if not exists elwood_idx_embedding_object on elwood.embedding (
  "instance_id",
  "object_id",
  "chunk_id"
);

create index if not exists elwood_idx_embedding_search_text on elwood.embedding using gin("search_text");

alter table elwood."embedding" enable row level security;


drop function if exists elwood.generate_embeddings_for_object(uuid);
create or replace function elwood.generate_embeddings_for_object(
  object_id uuid
)
returns extensions.http_response
as $$
DECLARE 
  setting_value jsonb;
  is_enabled boolean;
  function_url text;
  response extensions.http_response;
BEGIN

  SELECT "data" into setting_value from elwood.setting WHERE "name" = 'ai';

  IF setting_value IS NULL THEN 
    RAISE EXCEPTION 'Setting "ai" is not available';
    return null;
  END IF;

  is_enabled := setting_value->>'generate_embeddings';
  function_url := setting_value->>'embeddings_function_url';

  IF is_enabled != true THEN
    RAISE EXCEPTION 'Embedding is not enabled';
    return null;
  END IF;

  IF function_url IS NULL THEN
    RAISE EXCEPTION 'Setting "embeddings_function_url" is not available';
    return null;
  END IF;

  SELECT * INTO response FROM extensions.http((
    'POST',
    function_url::text,
    ARRAY[extensions.http_header('Content-Type', 'application/json')],
    'application/json',
    json_build_object('type', 'DIRECT', 'record', json_build_object('id', object_id))::varchar
  )::http_request);

  RETURN response;
END;
$$
language plpgsql;
