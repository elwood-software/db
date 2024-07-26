import { type Kysely, sql } from "../src/deps.ts";
import { createTable } from "../src/lib/create-table.ts";
import { createFunction } from "../src/lib/create-function.ts";
import { TableName, TypeName } from "../src/constants.ts";

export async function up(db: Kysely): Promise<void> {
  await db.schema.createType(TypeName.NodeType).asEnum([
    "REPOSITORY",
    "TREE",
    "BLOB",
    "SYMLINK",
  ]).execute();

  await db.schema.createType(TypeName.NodeStatus).asEnum([
    "INACTIVE",
    "ACTIVE",
    "DELETED",
    "ARCHIVED",
    "DRAFT",
    "UNLISTED",
  ]).execute();

  await createTable(db, TableName.Node, (tbl) =>
    tbl
      .addColumn(
        "id",
        "uuid",
        (col) => col.primaryKey().defaultTo(sql`uuid_generate_v4()`),
      )
      .addColumn("parent_id", "uuid")
      .addColumn(
        "status",
        sql.raw(`"elwood"."${TypeName.NodeStatus}"`),
        (col) => col.notNull().defaultTo(sql`'INACTIVE'`),
      )
      .addColumn("name", "text", (col) => col.notNull())
      .addColumn(
        "type",
        sql.raw(`"elwood"."${TypeName.NodeType}"`),
        (col) => col.notNull().defaultTo(sql`'TREE'`),
      )
      .addColumn("category_id", `uuid`, (col) => col.notNull())
      .addColumn("sub_category_id", `uuid`, (col) => col)
      .addColumn("metadata", "jsonb", (col) => col.defaultTo(sql`'{}'`))
      .addColumn("data", "jsonb", (col) => col.defaultTo(sql`'{}'`))
      .addColumn("version", "integer", (col) => col.defaultTo(0))
      .addColumn("publish_at", "timestamptz")
      .addColumn("unpublish_at", "timestamptz")
      .addUniqueConstraint("node_instance_id_name_idx", ["instance_id", "name"])
      .addForeignKeyConstraint(
        "node_parent_id_fkey",
        ["parent_id"],
        TableName.Node,
        ["id"],
      ).addForeignKeyConstraint(
        "node_category_fkey",
        ["category_id"],
        TableName.NodeCategory,
        ["id"],
      ).addForeignKeyConstraint(
        "node_sub_category_fkey",
        ["sub_category_id"],
        TableName.NodeCategory,
        ["id"],
      ));

  await createFunction(db, {
    name: "node_to_json",
    args: [["p_id", "uuid"]],
    returns: "jsonb",
    declare: [
      `_node elwood.node;`,
    ],
    body: `
      SELECT * INTO _node FROM elwood.node WHERE id = p_id;

      IF _node IS NULL THEN
        RAISE EXCEPTION 'Node not found: %', p_id;
      END IF;

      return to_jsonb(_node);
    `,
  });

  await createFunction(db, {
    name: "node_row_to_json",
    args: [["p_node", "elwood.node"]],
    returns: "jsonb",
    declare: [],
    body: `
      return to_jsonb(p_node);
    `,
  });

  await createFunction(db, {
    schema: "public",
    name: "elwood_create_node",
    args: [["p_node", "jsonb"]],
    returns: "jsonb",
    declare: [
      "_node_id uuid",
      "_metadata jsonb := '{}'",
      "_data jsonb := '{}'",
      "_category_id uuid",
      "_sub_category_id uuid",
      "_parent_id uuid",
      "_type elwood.node_type := 'TREE'",
      "_status elwood.node_status := 'INACTIVE'",
      "_publish_at timestamptz",
      "_unpublish_at timestamptz",
    ],
    body: `

    RAISE WARNING 'p_node: %', p_node;

      IF p_node->>'parent_id' IS NOT NULL THEN
        _parent_id := CAST(p_node->>'parent_id' as text)::uuid;
      END IF;

      IF p_node->>'type' IS NOT NULL THEN
        _type := CAST(p_node->>'type' AS text)::elwood.node_type;
      END IF;

      IF p_node->>'metadata' IS NOT NULL THEN
        _metadata := CAST(p_node->>'metadata' as jsonb);
      END IF;

      IF p_node->>'data' IS NOT NULL THEN
        _data := CAST(p_node->>'data' AS jsonb);
      END IF;

      IF p_node->>'category' IS NOT NULL THEN
        _category_id = elwood.node_category_id(p_node->>'category'::varchar);
      END IF;

      IF p_node->>'sub_category' IS NOT NULL THEN
        _sub_category_id = elwood.node_category_id(p_node->>'sub_category'::varchar);
      END IF;

      IF p_node->>'sub_category_id' IS NOT NULL THEN
        _sub_category_id := CAST(p_node->>'sub_category_id' as uuid);
      END IF;

      IF p_node->>'status' IS NOT NULL THEN
        _status := CAST(p_node->>'status' AS text)::elwood.node_status;
      END IF;

      IF p_node->>'category_id' IS NOT NULL THEN
        _category_id := CAST(p_node->>'category_id' as uuid);
      END IF;

      IF p_node->>'publish_at' IS NOT NULL THEN
        _publish_at := CAST(p_node->>'publish_at' as timestamptz);
      END IF;

      IF p_node->>'unpublish_at' IS NOT NULL THEN
        _unpublish_at := CAST(p_node->>'unpublish_at' as timestamptz);
      END IF;

      IF _category_id IS NULL THEN
        RAISE EXCEPTION 'category_id is required';
      END IF;

      IF _type IS NULL THEN
        RAISE EXCEPTION 'type is required';
      END IF;


      INSERT INTO elwood.node (
        "instance_id",
        "name",
        "category_id",
        "sub_category_id",
        "parent_id",
        "type",
        "metadata",
        "data",
        "publish_at",
        "unpublish_at",
        "status"
      ) VALUES (
        elwood.current_instance_id(),
        CAST(p_node->>'name' as text),
        _category_id,
        _sub_category_id,
        _parent_id,
        _type,
        _metadata,
        _data,
        _publish_at,
        _unpublish_at,
        _status
      ) 
        ON CONFLICT ("instance_id", "name")
        DO UPDATE SET
          "category_id" = _category_id,
          "parent_id" = _parent_id,
          "type" = _type,
          "metadata" = _metadata,
          "data" = _data,
          "publish_at" = _publish_at,
          "unpublish_at" = _unpublish_at,
          "status" = _status,
          "sub_category_id" = _sub_category_id
      RETURNING id INTO _node_id;

      return elwood.node_to_json(_node_id);
    `,
  });
}

export async function down(db: Kysely): Promise<void> {
  await db.schema.dropTable(TableName.Node).execute();
  await db.schema.dropType(TypeName.NodeType).execute();
}
