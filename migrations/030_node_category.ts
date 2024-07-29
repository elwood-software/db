import { type AnyKysely, sql } from "@/deps.ts";
import { createTable } from "@/lib/create-table.ts";
import { createFunction } from "@/lib/create-function.ts";
import { TableName } from "@/constants.ts";

const standardCategories = [
  ["PROJECT", "Project"],
  ["FILE", "File"],
  ["FOLDER", "Folder"],
  ["SEASON", "Season"],
  ["SHOW", "Show"],
  ["EPISODE", "Episode"],
  ["VIDEO", "Video"],
  ["AUDIO", "Audio"],
  ["IMAGE", "Image"],
  ["DOCUMENT", "Document"],
  ["CONTENT", "Content"],
  ["NETWORK", "Network"],
  ["POST", "Post"],
  ["FEED", "Feed"],
  ["SRC_MEZZ", "Mezzanine Source"],
  ["SRC_MAIN", "Main Source"],
  ["SRC_PROXY", "Proxy Source"],
  ["FULL", "Full"],
  ["CLIP", "Clip"],
  ["PAID", "Paid"],
  ["FREE", "Free"],
];

export async function up(db: AnyKysely): Promise<void> {
  await createTable(db, TableName.NodeCategory, (tbl) =>
    tbl
      .addColumn(
        "id",
        "uuid",
        (col) => col.primaryKey().defaultTo(sql`uuid_generate_v4()`),
      )
      .addColumn(
        "name",
        "varchar(255)",
        (col) => col.notNull(),
      )
      .addColumn("is_public", "boolean", (col) => col.defaultTo(false))
      .addColumn("display_name", "text", (col) => col.notNull())
      .addColumn("metadata", "jsonb", (col) => col.defaultTo(sql`'{}'`))
      .addUniqueConstraint("node_category_instance_id_name_idx", [
        "instance_id",
        "name",
      ])
      .addCheckConstraint(
        "name_must_be_uppercase",
        sql`name ~ '^[A-Z_]+$'`,
      ));

  for (const [name, displayName] of standardCategories) {
    await db.insertInto(TableName.NodeCategory)
      .values({
        name,
        display_name: displayName,
        metadata: { is_standard: true },
      })
      .execute();
  }

  await createFunction(db, {
    name: "node_category_id",
    args: [["p_name", "varchar"]],
    returns: "uuid",
    declare: [
      `_id uuid;`,
    ],
    body: `
      SELECT id INTO _id FROM elwood.node_category WHERE name = p_name AND instance_id = elwood.current_instance_id();
      return _id;
    `,
  });

  await createFunction(db, {
    name: "node_category_name",
    args: [["p_id", "uuid"]],
    returns: "varchar",
    declare: [
      `_name varchar`,
    ],
    body: `
      SELECT name INTO _name FROM elwood.node_category WHERE id = p_id AND instance_id = elwood.current_instance_id();
      return _name;
    `,
  });
}

export async function down(db: AnyKysely): Promise<void> {
  await db.schema.dropTable(TableName.NodeCategory).execute();
}
