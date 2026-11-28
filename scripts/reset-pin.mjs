#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashPin, normalizeUsername, validatePin } from "../worker/crypto.js";

function usage() {
  console.error(
    "Usage: npm run reset-pin -- [--remote|--local] <username> <new-pin>"
  );
}

export function parseResetPinArgs(args) {
  let targetFlag = "--local";
  let endOfFlags = false;
  const positional = [];

  for (const arg of args) {
    if (!endOfFlags && arg === "--") {
      endOfFlags = true;
      continue;
    }
    if (!endOfFlags && arg.startsWith("-")) {
      if (arg === "--remote") {
        targetFlag = "--remote";
      } else if (arg === "--local") {
        targetFlag = "--local";
      } else if (arg === "-h" || arg === "--help") {
        return { ok: true, help: true };
      } else {
        return { ok: false, error: `Unknown option "${arg}". Use --local or --remote.` };
      }
      continue;
    }
    positional.push(arg);
  }

  if (positional.length !== 2) {
    return { ok: false, error: "Expected <username> and <new-pin>." };
  }

  const userCheck = normalizeUsername(positional[0]);
  if (!userCheck.ok) return { ok: false, error: userCheck.error };

  const pinCheck = validatePin(positional[1]);
  if (!pinCheck.ok) return { ok: false, error: pinCheck.error };

  return {
    ok: true,
    help: false,
    targetFlag,
    username: userCheck.username,
    usernameLower: userCheck.usernameLower,
    pin: pinCheck.pin,
  };
}

export function buildResetPinSql({ usernameLower, hashHex, saltHex, iterations, nowIso }) {
  const escapedUser = usernameLower.replace(/'/g, "''");
  const lockoutKey = `user:${escapedUser}`;
  return [
    `UPDATE users SET pin_hash = '${hashHex}', pin_salt = '${saltHex}', pin_iterations = ${iterations}, updated_at = '${nowIso}' WHERE username_lower = '${escapedUser}' RETURNING id, username;`,
    `DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE username_lower = '${escapedUser}');`,
    `DELETE FROM login_attempts WHERE key = '${lockoutKey}';`,
  ].join(" ");
}

async function main() {
  const parsedArgs = parseResetPinArgs(process.argv.slice(2));
  if (!parsedArgs.ok) {
    console.error(`Error: ${parsedArgs.error}`);
    usage();
    process.exit(1);
  }
  if (parsedArgs.help) {
    usage();
    process.exit(0);
  }

  const { hashHex, saltHex, iterations } = await hashPin(parsedArgs.pin);
  const sql = buildResetPinSql({
    usernameLower: parsedArgs.usernameLower,
    hashHex,
    saltHex,
    iterations,
    nowIso: new Date().toISOString(),
  });

  const rootDir = path.resolve(import.meta.dirname, "..");
  const wranglerBin = path.join(rootDir, "node_modules", "wrangler", "bin", "wrangler.js");
  if (!fs.existsSync(wranglerBin)) {
    console.error("Error: local wrangler binary not found. Run `npm install` first.");
    process.exit(1);
  }

  // Use --command (D1 /query endpoint) so both --local and --remote return RETURNING rows cleanly without bulk import downtime
  const output = execFileSync(
    process.execPath,
    [
      wranglerBin,
      "d1",
      "execute",
      "turtlequest-db",
      parsedArgs.targetFlag,
      "-y",
      "--command",
      sql,
      "--json",
    ],
    { encoding: "utf8", stdio: ["inherit", "pipe", "pipe"] }
  );

  const parsed = JSON.parse(output);
  const firstResult = Array.isArray(parsed) ? parsed[0] : parsed;
  const updatedRows = firstResult?.results || [];
  if (updatedRows.length === 0 || !updatedRows[0]?.username) {
    console.error(
      `No user found with username "${parsedArgs.username}" in ${parsedArgs.targetFlag} D1.`
    );
    process.exit(1);
  }

  console.log(
    `PIN reset for "${updatedRows[0].username}" (${parsedArgs.targetFlag} D1). Existing sessions and login lockouts were cleared.`
  );
}

const isEntrypoint = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntrypoint) {
  main().catch((err) => {
    console.error(err && err.stderr ? String(err.stderr) : err);
    process.exit(1);
  });
}
