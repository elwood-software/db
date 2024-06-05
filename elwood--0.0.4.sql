CREATE SCHEMA IF NOT EXISTS elwood;

grant usage on schema elwood to postgres, anon, authenticated, service_role;
alter default privileges in schema elwood grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema elwood grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema elwood grant all on sequences to postgres, anon, authenticated, service_role;


-- NODE_TYPE
DROP TYPE IF EXISTS public.elwood_node_type CASCADE;
CREATE TYPE public.elwood_node_type AS ENUM (
    'TREE',
    'BLOB',
    'BUCKET'
);

-- NODE
DROP TYPE IF EXISTS public.elwood_node CASCADE;
CREATE TYPE public.elwood_node AS  (
    "id" text,
    "object_id" uuid,
    "type" public.elwood_node_type, 
    "prefix" text[],
    "name" text,
    "mime_type" text,
    "size" int    
);


DROP TYPE IF EXISTS public.elwood_storage_search_result CASCADE;
CREATE TYPE public.elwood_storage_search_result AS (
    name text,
    id uuid,
    updated_at timestamptz,
    created_at timestamptz,
    last_accessed_at timestamptz,
    metadata jsonb
);

DROP TYPE IF EXISTS public.elwood_get_node_result CASCADE;
CREATE TYPE public.elwood_get_node_result AS  (
  "node" public.elwood_node,
  "parent" public.elwood_node,
  "children" public.elwood_node[],
  "key_children" text[]
);


DROP TYPE IF EXISTS public.elwood_node_tree CASCADE;
CREATE TYPE public.elwood_node_tree AS  (
  "node" public.elwood_node,
  "id" text,
  "parent" text
);

DROP TYPE IF EXISTS public.elwood_get_node_tree_result CASCADE;
CREATE TYPE public.elwood_get_node_tree_result AS  (
  "rootNodeId" text,
  "expandedIds" text[],
  "tree" public.elwood_node_tree[]
);

DROP TYPE IF EXISTS public.elwood_member_type CASCADE;
CREATE TYPE public.elwood_member_type AS ENUM (
  'USER',
  'TEAM'
);

--
-- @@ NAMESPACE: ELWOOD
--

DROP TYPE IF EXISTS elwood.get_node_leaf_result CASCADE;
CREATE TYPE elwood.get_node_leaf_result AS (
  "node" public.elwood_node
);

DROP TYPE IF EXISTS elwood.follow_type CASCADE;
CREATE TYPE elwood.follow_type AS ENUM (
  'SAVE',
  'SUBSCRIBE'
);

DROP TYPE IF EXISTS elwood.member_role CASCADE;
CREATE TYPE elwood.member_role AS ENUM (
  'ADMIN',
  'MANAGER',
  'MEMBER',
  'MEMBER_RO'
);

DROP TYPE IF EXISTS elwood.activity_type CASCADE;
CREATE TYPE elwood.activity_type AS ENUM (
    'COMMENT',
    'REACTION',
    'LIKE'
);


CREATE TABLE elwood.member (
  "instance_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "user_id" uuid NOT NULL,
  "type" public.elwood_member_type NOT NULL DEFAULT 'USER',
  "username" text NULL,
  "display_name" text NULL,
  "added_by_user_id" uuid NULL,
  "role" elwood.member_role NOT NULL DEFAULT 'MEMBER',
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now(),

  CONSTRAINT "elwood_member_user_id" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id"),
  CONSTRAINT "elwood_member_added_by_user_id" FOREIGN KEY ("added_by_user_id") REFERENCES "auth"."users"("id"),
  PRIMARY KEY ("id")
);


CREATE UNIQUE INDEX IF NOT EXISTS elwood_idx_member_user_id ON elwood.member("instance_id", "user_id");
CREATE UNIQUE INDEX IF NOT EXISTS elwood_idx_member_username ON elwood.member("instance_id", "username");
alter table elwood."member" enable row level security;

DROP FUNCTION IF EXISTS elwood.is_a_member(boolean) CASCADE;
create function elwood.is_a_member(not_read_only boolean default false)
returns boolean
language plpgsql
security definer
as $$
begin
  if not_read_only then
    return exists (
      select 1 from elwood.member
      where auth.uid() = user_id AND "role" != 'MEMBER_RO'
    );
  end if;

  return exists (
    select 1 from elwood.member
    where auth.uid() = user_id 
  );
end;
$$;


CREATE VIEW public.elwood_member with (security_invoker=on)
  AS SELECT 
    "id",
    "user_id",
    "type",
    "username",
    "display_name",
    "added_by_user_id",
    "role",
    "created_at",
    "updated_at"
  FROM elwood.member;

create policy "Members can view all members."
on elwood.member for select
to authenticated
using (elwood.is_a_member());

create policy "Member can update their own member row."
on elwood.member for update
to authenticated           
using ( auth.uid() = user_id )
with check ( auth.uid() = user_id ); 
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


CREATE TABLE IF NOT EXISTS elwood.activity (
  "instance_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  "user_id" uuid NOT NULL,
  "member_id" uuid NOT NULL,
  "asset_id" text NOT NULL,
  "asset_type" TEXT NOT NULL,
  "is_resolved" BOOLEAN NOT NULL DEFAULT FALSE,
  "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "type" elwood.activity_type NOT NULL,
  "text" text NOT NULL,  
  "attachments" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now(),
  
  CONSTRAINT "elwood_activity_user_id" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id"),
  CONSTRAINT "elwood_activity_member_id" FOREIGN KEY ("member_id") REFERENCES "elwood"."member"("id"),
  PRIMARY KEY ("id")
);

alter table elwood."activity" enable row level security;

DROP VIEW  IF EXISTS public.elwood_activity;
CREATE VIEW public.elwood_activity with (security_invoker=on)
  AS SELECT
    "a"."id",
    "a"."user_id",
    "a"."member_id",
    "a"."asset_id",
    "a"."asset_type",
    "a"."is_deleted",
    "a"."is_resolved",
    "a"."type",
    "a"."text",  
    "a"."attachments",
    "a"."created_at",
    "a"."updated_at"
  FROM elwood.activity as a;

create policy "Members can view all activity."
on elwood.activity for select
to authenticated
using (elwood.is_a_member());

create policy "Members can create activity."
on elwood.activity for insert
to authenticated                     
with check (elwood.is_a_member());  


-- BEFORE INSERT
CREATE OR REPLACE FUNCTION elwood.before_activity_insert()
  RETURNS TRIGGER
  LANGUAGE PLPGSQL
AS
$$
DECLARE
  _user_id uuid := auth.uid();
  _member_id uuid;
BEGIN
  SELECT id INTO _member_id FROM elwood.member WHERE user_id = _user_id;
  NEW.member_id = _member_id;
  -- users can only insert activity for themselves
  NEW.user_id = _user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_before_activity_insert
BEFORE INSERT
ON elwood.activity
FOR EACH ROW
EXECUTE FUNCTION elwood.before_activity_insert();

create table if not exists elwood.follow (
  "instance_id" uuid not null default '00000000-0000-0000-0000-000000000000',
  "id" uuid not null default extensions.uuid_generate_v4(),
  "user_id" uuid not null,
  "type" elwood.follow_type not null DEFAULT 'SAVE',
  "asset_type" text not null,
  "asset_id" text not null,
  "is_active" boolean not null default false,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now(),

  constraint "elwood_follow_user_id"
    foreign key ("user_id") references "auth"."users" ("id"),

  primary key ("id")
);

create unique index if not exists elwood_idx_follow_user_asset on elwood.follow (
  "user_id",
  "type",
  "asset_type",
  "asset_id"
);


alter table "elwood"."follow" enable row level security;

DROP VIEW  IF EXISTS public.elwood_follow;
CREATE VIEW public.elwood_follow with (security_invoker=on)
  AS SELECT
    "id",
    "user_id",
    "type",
    "asset_type",
    "asset_id",
    "is_active",
    "created_at",
    "updated_at",
    (split_part(asset_id, ':', 3) = 'blob')::boolean as is_object_blob,
    (select name from storage.buckets where id = split_part(asset_id, ':', 4)) as bucket_name,
    replace(
      CASE
        WHEN split_part(asset_id, ':', 5) = '' THEN NULL
        ELSE (select name from storage.objects where id = split_part(asset_id, ':', 5)::uuid)
      END,
      '/.emptyFolderPlaceholder',
      ''
    ) as object_name
  FROM elwood.follow;

create policy "Members can view their own follows."
on elwood.follow for select
to authenticated
using (elwood.is_a_member() AND "user_id" = auth.uid());

create policy "Members can create their own follow."
on elwood.follow for insert
to authenticated                     
with check (elwood.is_a_member() AND "user_id" = auth.uid());  

create policy "Members can update their own follow."
on elwood.follow for update
to authenticated                     
with check (elwood.is_a_member() AND "user_id" = auth.uid());  


-- BEFORE INSERT
CREATE OR REPLACE FUNCTION elwood.before_follow_insert()
  RETURNS TRIGGER
  LANGUAGE PLPGSQL
AS
$$
DECLARE
  _user_id uuid := auth.uid();
BEGIN
  -- users can only insert activity for themselves
  NEW.user_id = _user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_before_follow_insert
BEFORE INSERT
ON elwood.follow
FOR EACH ROW
EXECUTE FUNCTION elwood.before_follow_insert();

create table if not exists elwood.notification (
  "instance_id" uuid not null default '00000000-0000-0000-0000-000000000000',
  "id" uuid not null default extensions.uuid_generate_v4(),
  "user_id" uuid not null,
  "type" text not null default 'GENERIC',
  "data" jsonb not null default '{}'::jsonb,
  "has_seen" boolean not null default false,
  "seen_at" timestamptz null,
  "bucket_id" text null,
  "object_id" uuid null,
  "created_at" timestamptz default now(),
  "updated_at" timestamptz default now(),

  constraint "elwood_notification_user_id"
    foreign key ("user_id") references "auth"."users" ("id"),
  constraint "elwood_follow_bucket_id"
    foreign key ("bucket_id") references "storage"."buckets"("id"),
  constraint "elwood_follow_object_id"
    foreign key ("object_id") references "storage"."objects"("id"),
  primary key ("id")
);

alter table "elwood"."notification" enable row level security;

drop view if exists public.elwood_notification;
create view public.elwood_notification with (security_invoker=on)
 AS SELECT
    "id",
    "type",
    "data",
    "has_seen",
    "seen_at",
    "bucket_id",
    "object_id",
    "created_at",
    "updated_at"
  from elwood.notification;


create policy "Members can view their own notifications."
on elwood.notification for select
to authenticated
using (elwood.is_a_member() AND "user_id" = auth.uid());

create policy "Members can update their own notification."
on elwood.notification for update
to authenticated                     
with check (elwood.is_a_member() AND "user_id" = auth.uid());  



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

-- BEFORE INSERT

create or replace function elwood.after_object_insert_or_update()
returns trigger
language PLPGSQL
as $$
DECLARE
  _path_parts text[];
  _path_parts_length int;
  _prefix text[];
  _part text;
  _path_tokens text[];
BEGIN

  -- ignore if there is a file name
  IF storage.filename(NEW.name) = '.emptyFolderPlaceholder' THEN
    RETURN NEW;
  END IF;

  -- split the new path into parts
  _path_parts := regexp_split_to_array(NEW.name, '/');
  _path_parts_length := array_length(_path_parts, 1);

  IF _path_parts_length = 1 THEN
    RETURN NEW;
  END IF;

  -- now loop through each part and make sure there's an object
  -- for the tree path so we can have an object id
  FOREACH _part IN ARRAY _path_parts[1:_path_parts_length-1] LOOP
    _prefix := _prefix || array[_part];
    _path_tokens := _prefix || array['.emptyFolderPlaceholder'];

    -- insert a placeholder object if it doesn't exist
    INSERT INTO storage.objects ("bucket_id", "owner_id", "name") VALUES (
      NEW.bucket_id,
      NEW.owner_id,
      array_to_string(
        _path_tokens,
        '/'
      )
    ) ON CONFLICT ("bucket_id","name") DO NOTHING;
  END LOOP;
  

  -- if we think this is a folder, insert a placeholder object 
  IF NEW.metadata IS NULL OR NEW.metadata->>'eTag' IS NULL THEN
    _path_tokens := _path_parts || array['.emptyFolderPlaceholder'];

   -- insert a placeholder object if it doesn't exist
    INSERT INTO storage.objects ("bucket_id", "owner_id", "name") VALUES (
      NEW.bucket_id,
      NEW.owner_id,
      array_to_string(
        _path_tokens,
        '/'
      )
    ) ON CONFLICT ("bucket_id","name") DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_after_object_insert_or_update on storage.objects;
create trigger trigger_after_object_insert_or_update
before insert on storage.objects
for each row
when (pg_trigger_depth() < 1)
execute function elwood.after_object_insert_or_update();


DROP FUNCTION IF EXISTS elwood.create_node_id(text, text, uuid);
CREATE OR REPLACE FUNCTION elwood.create_node_id(
  p_type public.elwood_node_type,
  p_bucket text default null,
  p_object_id uuid default null
) RETURNS text
AS $$
DECLARE 
  _node_id text[];
  _prefix_part text;
  _prefix_parts text[];
BEGIN
  _node_id := ARRAY['urn', 'enid', lower(p_type::text)];

  IF p_bucket IS NOT NULL THEN    
    _node_id := _node_id || ARRAY[p_bucket::text];
  END IF;

  IF p_object_id IS NOT NULL THEN
    _node_id := _node_id || ARRAY[p_object_id::text];
  END IF;
  
  return array_to_string(_node_id,':');
END;
$$ language plpgsql;



DROP FUNCTION IF EXISTS elwood.create_node_id_for_tree(text[]);
CREATE OR REPLACE FUNCTION elwood.create_node_id_for_tree(
  p_path text[]
) RETURNS text
AS $$
DECLARE 
  _bucket_id text;
  _name text[];
  _object_row storage.objects;  
  _path_length int;
BEGIN
  _path_length := array_length(p_path, 1);
  _bucket_id := ARRAY_TO_STRING(p_path[:1], '');
  _name := p_path[2:] || ARRAY['.emptyFolderPlaceholder'];
  
  RAISE WARNING 'create_node_id_for_tree: p_path % || %', p_path, array_to_string(_name, '/');

  SELECT * INTO _object_row FROM storage.objects WHERE "bucket_id" = _bucket_id AND "name" = array_to_string(_name, '/');

  IF _object_row IS NULL THEN
    return 'urn:enid:no_object_row_found';
  END IF;
  
  return elwood.create_node_id('TREE', _bucket_id, _object_row.id);

END;
$$ language plpgsql;

drop function if exists elwood.get_node_children(uuid, text[]);
create or replace function elwood.get_node_children(p_prefix text[])
returns jsonb[]
language PLPGSQL
as $$
DECLARE 
    _bucket_row storage.buckets;
    _search_row public.elwood_storage_search_result;    
    _object_row public.elwood_node;
    _nodes jsonb[];  
    _node_type public.elwood_node_type;
    _bucket_id text;
    _prefix text;
    _path text;
    _depth int;
BEGIN
    _nodes := ARRAY[]::jsonb[];
    _prefix := ARRAY_TO_STRING(p_prefix, '/');

    -- if there's nothing in input then return the root
    -- which is all the buckets
    IF array_length(p_prefix, 1) IS NULL THEN    
        FOR _bucket_row IN
            SELECT * FROM storage.buckets
        LOOP
            _object_row.id := elwood.create_node_id('BUCKET', _bucket_row.name::text, null);
            _object_row.type := 'BUCKET';
            _object_row.prefix := p_prefix;
            _object_row.name := _bucket_row.name;
            _object_row.mime_type := 'inode/directory';
            _object_row.size := (SELECT SUM(COALESCE((o.metadata->>'size')::int, 0)) FROM storage.objects as o WHERE o.bucket_id = _bucket_row.id);
            _nodes := _nodes || ARRAY[to_jsonb(_object_row)];
        END LOOP;
    END IF;


    _bucket_id := ARRAY_TO_STRING(p_prefix[:1], '');
    _path := ARRAY_TO_STRING(p_prefix[2:], '/');
    _depth := array_length(p_prefix[2:], 1) + 1;

    IF _depth IS NULL THEN  
        _depth := 1;
    END IF;

    RAISE WARNING 'get_node_children: p_prefix %, _bucket_id: %, _path: %, _depth: %', p_prefix, _bucket_id, _path, _depth;

    FOR _search_row IN
        SELECT * FROM storage.search(_path, _bucket_id, 100, _depth)
    LOOP
    RAISE WARNING 'get_node_children: _search_row %', _search_row.name;

        IF _search_row.id IS NULL THEN

        RAISE WARNING 'xxxx: xxx %', ARRAY[_bucket_id] || string_to_array(_path,'/')|| string_to_array(_search_row.name,'/');

            _object_row.type := 'TREE';
            _object_row.id := elwood.create_node_id_for_tree(ARRAY[_bucket_id] || string_to_array(_path,'/')|| string_to_array(_search_row.name,'/'));
        ELSE 
            _object_row.type := 'BLOB'; 
            _object_row.id := elwood.create_node_id(_node_type, _bucket_id, _search_row.id);
        END IF;

        IF _search_row.name != '.emptyFolderPlaceholder' THEN
            _object_row.prefix := p_prefix;
            _object_row.name := _search_row.name;
            _object_row.mime_type := _search_row.metadata->>'mimetype';
            _object_row.size := COALESCE((_search_row.metadata->>'size')::int, 0);
            _nodes := _nodes || to_jsonb(_object_row);
        END IF;
    END LOOP;

    RAISE WARNING 'get_node_children: length _depth: %', array_length(_nodes, 1);

    return _nodes;
END;
$$;



DROP FUNCTION IF EXISTS elwood.get_node_leaf(text[]);
CREATE OR REPLACE FUNCTION elwood.get_node_leaf(
  "p_path" text[]
) RETURNS elwood.get_node_leaf_result LANGUAGE PLPGSQL
AS $$
DECLARE 
  _path_length int;
  _name text;
  _path text;
  _prefix text[];
  _bucket_id text;
  _node public.elwood_node;
  _bucket_row storage.buckets;
  _object_row storage.objects;  
  _result elwood.get_node_leaf_result;
BEGIN
  _path_length := array_length(p_path, 1);

  -- no path means root
  IF _path_length IS NULL THEN 
    _node.id = 'root';
    _node.type = 'BUCKET';  
    _node.prefix = ARRAY[]::text[];
  END IF;

  -- single path means bucket
  IF _path_length = 1 THEN
    SELECT * INTO _bucket_row FROM storage.buckets WHERE "name" = p_path[1];

    IF _bucket_row.id IS NULL THEN
      return null;
    END IF; 

    _node.id = elwood.create_node_id('BUCKET', _bucket_row.name, null);
    _node.type = 'BUCKET';
    _node.prefix = ARRAY[]::text[];
    _node.name = _bucket_row.name;
    _node.mime_type = 'inode/directory';
  END IF;

  -- multiple paths means object
  IF _path_length > 1 THEN
    _bucket_id := ARRAY_TO_STRING(p_path[:1], '');
    _prefix := p_path[1:_path_length-1];
    _path := ARRAY_TO_STRING(p_path[2:], '/');
    _name := p_path[_path_length];

    SELECT * INTO _object_row FROM storage.objects WHERE "bucket_id" = _bucket_id AND "name" = _path;

    IF _object_row.id IS NULL THEN
      _node.id = elwood.create_node_id_for_tree(p_path);
      _node.type = 'TREE';
      _node.prefix = _prefix;
      _node.name = _name;
      _node.mime_type = 'inode/directory';      
    END IF;
      
    IF _object_row.id IS NOT NULL THEN
      _node.id = elwood.create_node_id('BLOB', _bucket_id, _object_row.id);
      _node.type = 'BLOB';
      _node.prefix = _prefix;
      _node.name = _name;
      _node.mime_type = _object_row.metadata->>'mimetype';
      _node.size = COALESCE((_object_row.metadata->>'size')::int, 0);
    END IF;
  END IF;

  _result.node := _node;

  -- give it back
  return _result;

END;
$$;


-- @@
-- GET_NODE
-- get a node with all the other info you might need for that node
drop function if exists public.elwood_get_node(text[], int, int);
create or replace function public.elwood_get_node(
  p_path text[],
  p_limit int default 100,
  p_offset int default 0
)
returns jsonb
as $$
DECLARE 
  _node_leaf elwood.get_node_leaf_result;
  _parent_leaf elwood.get_node_leaf_result;
  _node public.elwood_node;  
  _prefix text[];
  _child_row jsonb;
  _children jsonb[] = ARRAY[]::jsonb[];  
  _key_children text[] = ARRAY[]::text[];
BEGIN
  -- get this node leaf
  _node_leaf := elwood.get_node_leaf(p_path);
  _node = _node_leaf.node;

  -- no node means stop
  IF _node.id IS NULL THEN
    return null;
  END IF;

  -- if this isn't root, get the parent
  IF _node.id != 'root' THEN
    SELECT * INTO _parent_leaf FROM elwood.get_node_leaf(p_path[1:array_length(p_path, 1)-1]);
    _prefix := _node.prefix || ARRAY[_node.name]::text[];
  END IF;

  IF _node.type = 'TREE' OR _node.type = 'BUCKET' THEN
    _children := elwood.get_node_children(_prefix);

    FOREACH _child_row IN ARRAY _children LOOP
      IF (SELECT _child_row->>'name' = ANY(ARRAY['readme.md']::text[])) THEN
        _key_children := _key_children || ARRAY[_child_row->>'name'];
      END IF; 
    END LOOP;
  END IF;

  return jsonb_build_object(
    'node', to_jsonb(_node),
    'parent', to_jsonb(_parent_leaf.node),
    'children', _children,
    'key_children', _key_children
  );
END;
$$
language plpgsql;

drop function if exists public.elwood_get_node_tree(text[]);
create or replace function public.elwood_get_node_tree(p_path text[])
returns jsonb
as $$
DECLARE 
  _id text;
  _bucket_id text;
  _path text;
  _part text;
  _result jsonb[];
  _row jsonb;
  _node_row jsonb;
  _row_path text[];
  _node_type public.elwood_node_type;
  _expanded_ids text[]; 
  _path_id text;
  _leaf elwood.get_node_leaf_result;
  _leaf_node public.elwood_node;
  _root_id text := 'root';
BEGIN

  IF array_length(p_path, 1) > 0 THEN
    _root_id := elwood.create_node_id('BUCKET', array_to_string(p_path[0:1],'')::text, null);
  END IF;

  FOREACH _part IN ARRAY p_path LOOP
    _row_path := _row_path || _part;
    _node_row := elwood_get_node(_row_path);
    
    -- if this is a blob, it will be added when we loop to the parent
    -- so don't push it to the row now
    IF (_node_row->'node')::jsonb->>'type' != 'BLOB' THEN

      _result := _result || jsonb_build_object(
        'id', (_node_row->>'node')::jsonb->>'id',
        'node', _node_row->'node',
        'parent', (_node_row->'parent')::jsonb->>'id'
      );

      _expanded_ids := _expanded_ids || ARRAY[(_node_row->>'node')::jsonb->>'id'::text];

      FOR _row IN SELECT jsonb_array_elements FROM jsonb_array_elements(_node_row->'children') LOOP
        _result := _result || jsonb_build_object(
          'id', _row->>'id',
          'node', _row,
          'parent', (_node_row->>'node')::jsonb->>'id'
        );
      END LOOP;
    END IF;

  END LOOP;


  RETURN jsonb_build_object(
    'rootNodeId', _root_id,
    'expandedIds', _expanded_ids,
    'tree', _result
  );

END;
$$
language plpgsql;
