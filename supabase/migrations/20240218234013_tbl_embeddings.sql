

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