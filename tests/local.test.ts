import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";
import { interval } from "https://deno.land/x/delayed@2.1.1/mod.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

Deno.test("test local install", async (t) => {
  await executeDocker("stop", "elwood_db_test");
  await executeDocker("rm", "elwood_db_test");
  await executeDocker(
    "run",
    "--name=elwood_db_test",
    "-d",
    "-p",
    "5432:5432",
    "-e",
    "POSTGRES_PASSWORD=simple_password",
    "public.ecr.aws/supabase/postgres:15.1.1.37",
  );

  const client = new Client({
    user: "postgres",
    database: "postgres",
    password: "simple_password",
    hostname: "localhost",
    port: 5432,
  });

  async function connect() {
    try {
      await client.connect();
    } catch (_) {
      // ignore
    }
  }

  console.log("Waiting for connection to postgres...");

  // wait for connection
  for await (const _ of interval(connect, 500, {})) {
    if (client.connected) {
      break;
    }
  }

  console.log("Connected to postgres");
  console.log("Running latest migration...");

  const latest = JSON.parse(
    await Deno.readTextFile(join(__dirname, "../versions/latest.json")),
  );

  try {
    const steps: [string, string[]][] = [
      [`create extension if not exists http with schema extensions;`, []],
      [`create extension if not exists pg_tle;`, []],
      [`create extension if not exists vector schema extensions;`, []],
      [`drop extension if exists "elwood-supabase";`, []],
      [`select pgtle.uninstall_extension_if_exists('elwood-supabase');`, []],
      [
        `select pgtle.install_extension('elwood-supabase','${latest.version}','Elwood Supabase Database', $1);`,
        [latest.sql],
      ],
      [`create extension "elwood-supabase";`, []],
    ];

    for (const [sql, params] of steps) {
      const { warnings } = await client.queryObject(sql, params);

      console.log(`COMPETE!! ${sql}`);
      warnings.forEach((w) => {
        console.log(` [${w.severity}] ${w.message} (${w.line})`);
      });
    }
  } catch (err) {
    console.log("ERROR", err.message);
  }

  await t.step("Check if schema is installed", async () => {
    assertEquals(
      !!(await client.queryObject(
        "SELECT schema_name FROM information_schema.schemata",
      )).rows.find(
        (row) => (row as { schema_name: string }).schema_name === "elwood",
      ),
      true,
    );
  });

  await t.step("Check if extension is installed", async () => {
    assertEquals(
      !!(await client.queryObject("SELECT extname FROM pg_extension;")).rows
        .find(
          (row) => (row as { extname: string }).extname === "elwood-supabase",
        ),
      true,
    );
  });

  await executeDocker("stop", "elwood_db_test");
  await executeDocker("rm", "elwood_db_test");

  await client.end();
});

async function executeDocker(...args: string[]): Promise<void> {
  const cmd = new Deno.Command("docker", {
    args,
    stdout: "inherit",
    stderr: "inherit",
  });
  await cmd.output();
}
