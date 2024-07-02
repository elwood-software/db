#!/usr/bin/env -S deno run -A

/**
 * release.ts
 *
 * This script will create a docker container with the latest version of postgres,
 * then install the latest extension
 *
 * Docs: https://elwood.software/docs/db
 * Have questions, email us at hello@elwood.software
 */

import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";
import { interval } from "https://deno.land/x/delayed@2.1.1/mod.ts";

import { compile } from "./compile.ts";

const client = new Client({
  user: "postgres",
  database: "postgres",
  password: "postgres",
  hostname: "127.0.0.1",
  port: 54322,
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

const version = `0.0.0-local.${Date.now()}`;
const sql = await compile(version);

try {
  const steps: [string, string[]][] = [
    [`create extension if not exists http with schema extensions;`, []],
    [`create extension if not exists pg_tle;`, []],
    [`create extension if not exists vector schema extensions;`, []],
    [`drop extension if exists "elwood-supabase" cascade;`, []],
    [`select pgtle.uninstall_extension_if_exists('elwood-supabase');`, []],
    [`drop extension if exists "elwood-supabase";`, []],
    [
      `select pgtle.install_extension('elwood-supabase','${version}','Elwood Supabase Database', $1);`,
      [sql],
    ],
    [`create extension "elwood-supabase";`, []],
  ];

  for (const [sql, params] of steps) {
    console.log("running...");
    console.log(` > ${sql}`);

    const { warnings } = await client.queryObject(sql, params);

    console.log(` > complete!`);
    warnings.forEach((w) => {
      console.log(` > [${w.severity}] ${w.message} (${w.line})`);
    });
  }
} catch (err) {
  console.log("ERROR", err.message);
}

await client.end();
