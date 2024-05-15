#!/usr/bin/env -S deno run -A

/**
 *
 * release.ts
 *
 * This script will create a docker container with the latest version of postgres,
 * then install the latest extension
 *
 * Docs: https://elwood.software/docs/db
 * Have questions, email us at hello@elwood.software
 * 
 */

import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import { Client } from "https://deno.land/x/postgres@v0.19.3/mod.ts";
import { interval } from "https://deno.land/x/delayed@2.1.1/mod.ts"


const __dirname = dirname(fileURLToPath(import.meta.url));

await executeDocker('stop','elwood_db_test');
await executeDocker('rm','elwood_db_test');
await executeDocker(
  'run', 
  '--name=elwood_db_test', 
  '-d', 
   '-p',
  '5432:5432',
  '-e',
  'POSTGRES_PASSWORD=simple_password',
  'public.ecr.aws/supabase/postgres:15.1.1.37',  
)



const client = new Client({
  user: "postgres",
  database: "postgres",
  password: "simple_password",
  hostname: 'localhost',
  port: 5432,
});

async function connect() {
  try {
   await client.connect();
  }
  catch (_) {
    // ignore  
  }
}

console.log('Waiting for connection to postgres...');

// wait for connection
for await (const _ of interval(connect, 500, {})) {
    if (client.connected) {
      break;
    }
}

console.log('Connected to postgres');
console.log('Running latest migration...');

const latest = JSON.parse(await Deno.readTextFile(join(__dirname, '../versions/latest.json')));

try {
  const {warnings} = await client.queryObject(latest.sql)

console.log('COMPETE!!');
warnings.forEach(w => {
  console.log(`[${w.severity}] ${w.message} (${w.line})`)
});

}
catch (err) {
  console.log('ERROR', err.message)
}

await executeDocker('stop','elwood_db_test');
await executeDocker('rm','elwood_db_test');


await client.end();




async function executeDocker(...args:string[]): Promise<void> {
const cmd = new Deno.Command('docker', {args, stdout:'inherit', stderr: 'inherit'})
await cmd.output();
}