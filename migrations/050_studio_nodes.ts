import { type Kysely, sql } from "../src/deps.ts";

import { createFunction } from "../src/lib/create-function.ts";
import { TableName, ViewName } from "../src/constants.ts";

export async function up(db: Kysely): Promise<void> {
  await db.withSchema("public").schema.createView(ViewName.StudioNode)
    .orReplace()
    .as(
      db.selectFrom(`${TableName.Node} as p`)
        .select("id")
        .select("name")
        .select("parent_id")
        .select("category_id")
        .select("sub_category_id")
        .select(
          () => [sql`elwood.node_category_name(p.category_id)`.as("category")],
        )
        .select(
          () => [
            sql`elwood.node_category_name(p.sub_category_id)`.as(
              "sub_category",
            ),
          ],
        )
        .select(({ selectFrom }) => [
          selectFrom(`${TableName.Node} as c`)
            .whereRef("c.parent_id", "=", "p.id")
            .where(
              "c.category_id",
              "=",
              sql`elwood.node_category_id('CONTENT')`,
            )
            .select(() => [sql`
              jsonb_build_object(
                '__elwood_node_id', c.id,
                '__elwood_node_name', c.name
              ) || to_jsonb(c)->'data'`.as("content")])
            .limit(1)
            .as("content"),
        ])
        .where(
          "instance_id",
          "=",
          sql`elwood.current_instance_id()`,
        )
        .where(({ eb, or }) =>
          eb.and([
            or([
              eb("publish_at", "is", sql`null`),
              eb("publish_at", "<=", sql`now()`),
            ]),
            or([
              eb("unpublish_at", "is", sql`null`),
              eb("unpublish_at", ">=", sql`now()`),
            ]),
          ])
        ),
    )
    .execute();

  await createFunction(db, {
    schema: "public",
    name: "elwood_studio_feed_items",
    args: [["p_id", "uuid"]],
    returns:
      "table (id uuid, type varchar, title text, description text, content jsonb, video_id uuid, audio_id uuid)",
    declare: [
      "_feed record",
      "_table_name text := format('tmp_feed_items_%s', md5(p_id::text))",
      "_row record",
      "_video_node_id uuid",
      "_audio_node_id uuid",
      "_row_ids uuid[]",
      "_row_id uuid",
    ],
    body: `
      SELECT * INTO _feed FROM elwood_studio_node as f WHERE f.id = p_id AND f.category = 'FEED';

      IF _feed.id IS NULL THEN
        RAISE EXCEPTION 'Feed not found';
      END IF;
    
      EXECUTE format(
        '
          CREATE TEMP TABLE IF NOT EXISTS %s (
            id uuid,
            type varchar,
            title text,
            description text,
            content jsonb, 
            video_id uuid, 
            audio_id uuid
          )
        ',
        _table_name
      );



      -- search for episodes that are in the show
      -- which is the parent of the feed
      FOR _row IN (
        SELECT * FROM public.elwood_studio_node n WHERE 
          n.parent_id = _feed.parent_id AND
          n.category = 'EPISODE'
      ) LOOP 

         EXECUTE format(
          '
            INSERT INTO %s ("id", "type",  "title", "description", "content") VALUES
            ($1, $2, $3, $4, $5)
          ',
          _table_name
        ) USING
          _row.id,
          'EPISODE',
          _row.content->'title'::text,
          _row.content->'description'::text,
          _row.content
        ;

        _row_ids := array_append(_row_ids, _row.id);

      END LOOP;

      -- search for content in the feed that is 
      -- a parent of this feed
      FOR _row IN (
        SELECT * FROM public.elwood_studio_node as n WHERE 
          n.parent_id = _feed.id AND
          n.category = 'POST'
      ) LOOP 
    
        EXECUTE format(
          '
            INSERT INTO %s ("id", "type",  "title", "description", "content") VALUES
            ($1, $2, $3, $4, $5)
          ',
          _table_name
        ) USING
          _row.id,
          _row.category,
          _row.content->'title'::text,
          _row.content->'description'::text,
          _row.content
        ;

        _row_ids := array_append(_row_ids, _row.id);

      END LOOP;

      FOREACH _row_id IN ARRAY _row_ids LOOP
        _video_node_id := NULL;
        _audio_node_id := NULL;

        -- get the full episode audio and video
        SELECT vn.id INTO _video_node_id FROM public.elwood_studio_node vn WHERE
          parent_id = _row_id AND
          category = 'VIDEO' AND sub_category = 'FULL';

        SELECT an.id INTO _audio_node_id FROM public.elwood_studio_node an WHERE
          parent_id = _row_id AND
          category = 'AUDIO' AND sub_category = 'FULL';

        EXECUTE format('UPDATE %s SET "video_id" = $1, "audio_id" = $2 WHERE id = $3', _table_name) USING _video_node_id, _audio_node_id, _row_id;

      END LOOP;



      return query EXECUTE format('select * from %s', _table_name);
    `,
  });
}

export async function down(db: Kysely): Promise<void> {
  await db.schema.dropView(ViewName.StudioNode).execute();
}
