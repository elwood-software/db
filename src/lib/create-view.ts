import { CreateViewBuilder, Kysely, sql } from "../deps.ts";

export type CreateViewBuilderFn = (
  table: CreateViewBuilder,
  db: Kysely,
) => CreateViewBuilder;

export type CreateViewOptions = {
  enabledSecurityInvoker?: boolean;
};

export async function createView(
  db: Kysely,
  viewName: string,
  builder: CreateViewBuilderFn,
  options: CreateViewOptions = {},
): Promise<void> {
  const view = db.schema.createView(viewName);

  // build the table
  await builder(view, db).execute();

  // add rls
  if (options.enabledSecurityInvoker !== false) {
    await sql`alter view public.${viewName} SET  (security_invoker=on);`
      .execute(db);
  }
}
