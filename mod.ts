export * from "./src/types.ts";
export * from "./src/constants.ts";

if (import.meta.main) {
  Deno.stderr.write(
    new TextEncoder().encode("You can not execute this module directly\n"),
  );
  Deno.exit(1);
}
