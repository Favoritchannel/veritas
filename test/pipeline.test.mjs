import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "bin", "veritas.mjs");
const fixture = path.join(root, "examples", "minimal");

test("the keyless example completes in an isolated path", () => {
  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "veritas smoke test "),
  );
  const project = path.join(temporaryRoot, "minimal project");
  fs.cpSync(fixture, project, {
    recursive: true,
    filter: (source) => !source.includes(`${path.sep}out`),
  });

  try {
    const config = path.join(project, "veritas.config.json");
    const result = spawnSync(process.execPath, [cli, "run", "--auto", config], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, ANALYZE_KEY: "", COLLECT_KEY: "", SERVE_KEY: "" },
      timeout: 30_000,
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const audit = fs.readFileSync(
      path.join(project, "out", "audit-report.md"),
      "utf8",
    );
    assert.match(audit, /GO/);
    assert.ok(fs.existsSync(path.join(project, "out", "rag-corpus.jsonl")));
    assert.ok(fs.existsSync(path.join(project, "out", "graph.html")));
  } finally {
    fs.rmSync(temporaryRoot, { force: true, recursive: true });
  }
});
