import { type AnyKysely, sql } from "@/deps.ts";
import { TableName, ViewName } from "@/constants.ts";

export async function up(db: AnyKysely): Promise<void> {
  await db.withSchema("elwood").schema
    .createView(ViewName.StudioNode)
    .orReplace()
    .as(
      db.selectFrom(`${TableName.Node} as p`)
        .selectAll()
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
        .select(() => [
          sql`elwood.node_content(p.id)`.as("content"),
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

  await db.withSchema("public").schema
    .createView(ViewName.StudioContent)
    .orReplace()
    .as(
      db.selectFrom(`${TableName.Node} as p`)
        .select("id")
        .select("name")
        .select("type")
        .select("parent_id")
        .select("category_id")
        .select("sub_category_id")
        .select("other_category_ids")
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
        .select(() => [
          sql`elwood.node_content(p.id)`.as("content"),
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
}

export async function down(db: AnyKysely): Promise<void> {
  await db.schema.dropView(ViewName.StudioNode).execute();
}
