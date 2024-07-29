import { type AnyKysely, type CreateViewBuilder, sql } from "@/deps.ts";

export type CreateViewBuilderFn = (
  table: CreateViewBuilder,
  db: AnyKysely,
) => CreateViewBuilder;

export type CreateViewOptions = {
  enabledSecurityInvoker?: boolean;
};

export async function createView(
  db: AnyKysely,
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
