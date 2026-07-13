import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "bin", "veritas.mjs");

function run(...args) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: "utf8",
  });
}

test("CLI prints help", () => {
  const result = run("--help");
  assert.equal(result.status, 0);
  assert.match(result.stdout, /veritas run --auto/);
});

test("CLI prints its package version", () => {
  const result = run("--version");
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), "0.1.0");
});

test("CLI rejects unknown commands", () => {
  const result = run("unknown-command");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /unknown command/);
});

test("CLI rejects a missing config argument", () => {
  const result = run("run", "--auto");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /usage:/);
});
