# Elwood Database Control

Get more information at [elwood.software](https://elwood.software).

This is a [PostgreSQL TLE](https://github.com/aws/pg_tle) (extension) which attempts to provide supabase projects.

Docs available at [elwood.software/docs/db](https://elwood.software/docs/db).

## Install or Update
```sql
/*
Requires:
  - pg_tle: https://github.com/aws/pg_tle
  - pgsql-http: https://github.com/pramsey/pgsql-http
*/
create extension if not exists http with schema extensions;
create extension if not exists pg_tle;
create extension if not exists vector schema extensions;
drop extension if exists "elwood-supabase";
select pgtle.uninstall_extension_if_exists('elwood-supabase');
select
    pgtle.install_extension(
        'elwood-supabase',
        resp.contents ->> 'version',
        'Elwood Supabase Database',
        resp.contents ->> 'sql'
    )
from http(
    (
        'GET',
        'https://elwood.software/db/latest.json',
        array[]::http_header[],
        null,
        null
    )
) x,
lateral (
    select
        ((row_to_json(x) -> 'content') #>> '{}')::json
) resp(contents);

create extension "elwood-supabase";

```