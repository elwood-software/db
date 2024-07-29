import { type Kysely, sql } from "@/deps.ts";
import { createTable } from "@/lib/create-table.ts";
import { createFunction } from "@/lib/create-function.ts";
import { TableName, TypeName } from "@/constants.ts";

export async function up(db: Kysely<any>): Promise<void> {
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
      .addColumn("other_category_ids", sql`uuid[]`, (col) =>
        col.notNull().defaultTo(sql`ARRAY[]::uuid[]`))
      .addColumn("metadata", "jsonb", (col) =>
        col.defaultTo(sql`'{}'`))
      .addColumn("data", "jsonb", (col) =>
        col.defaultTo(sql`'{}'`))
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
      "_other_category_ids uuid[] := ARRAY[]::uuid[]",
      "_other_category_name varchar",
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

      IF p_node->>'other_categories' IS NOT NULL THEN
        FOR _other_category_name IN (SELECT jsonb_array_elements_text(p_node->'other_categories')) LOOP
          _other_category_ids = _other_category_ids || elwood.node_category_id(_other_category_name);
        END LOOP;
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
        "other_category_ids",
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
        _other_category_ids,
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
          "other_category_ids" = _other_category_ids,
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

  await createFunction(db, {
    name: "get_node_content",
    args: [["p_node", "elwood.node"]],
    returns: "jsonb",
    declare: [
      `_target elwood.node := p_node`,
    ],
    body: `
      IF CAST(p_node.type AS elwood.node_type) = 'SYMLINK' THEN
        SELECT * INTO _target FROM elwood.node WHERE id = p_node.data->'target_node_id'::uuid;
      END IF;

      IF _target IS NULL THEN 
        return null;
      END IF;

      return jsonb_build_object(
        '__elwood_node_id', _target.id,
        '__elwood_node_name', _target.name
      ) || to_jsonb(_target)->'data';
    `,
  });
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable(TableName.Node).execute();
  await db.schema.dropType(TypeName.NodeType).execute();
}
