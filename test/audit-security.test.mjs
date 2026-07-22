import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { run as audit } from "../src/stages/audit.mjs";

// Minimal project stub: just enough surface for the audit stage (outDir + config + readOut/outPath/log).
function stubProject(outDir, config = {}) {
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = (...p) => path.join(outDir, ...p);
  return {
    outDir,
    root: outDir,
    config: { topic: "test", ...config },
    outPath,
    readOut(name, dflt) {
      try {
        return JSON.parse(fs.readFileSync(outPath(name), "utf-8"));
      } catch {
        return dflt;
      }
    },
    writeOut(name, data) {
      fs.writeFileSync(
        outPath(name),
        typeof data === "string" ? data : JSON.stringify(data, null, 2),
      );
    },
    log() {},
  };
}

// Write a minimal GO-able artifact set into outDir.
function seedArtifacts(outDir) {
  const facts = Array.from({ length: 6 }, (_, i) => ({
    domain: "d",
    statement: `fact ${i}`,
    status: "TRUTH",
  }));
  fs.writeFileSync(
    path.join(outDir, "facts.json"),
    JSON.stringify({ d: facts }),
  );
  fs.writeFileSync(
    path.join(outDir, "verified.json"),
    JSON.stringify({ items: facts, tally: { TRUTH: 6 } }),
  );
  fs.writeFileSync(
    path.join(outDir, "rag-corpus.jsonl"),
    facts.map((f) => JSON.stringify(f)).join("\n") + "\n",
  );
  fs.writeFileSync(path.join(outDir, "graph.html"), "x".repeat(6000));
}

test("audit secret-scan catches multiple token formats and reports all hits", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "veritas-sec-"));
  seedArtifacts(dir);
  // plant several distinct secret formats across two files
  fs.writeFileSync(
    path.join(dir, "leak1.txt"),
    "github_pat_ABCDEFGHIJKLMNOPQRSTUV0123456789 and sk-ant-abcdefghijklmnopqrstuvwxyz012345",
  );
  fs.writeFileSync(
    path.join(dir, "leak2.md"),
    "glpat-abcdefghij0123456789 and AKIAABCDEFGHIJKLMNOP",
  );
  const project = stubProject(dir);
  const { go, checks } = await audit(project, { flags: new Set(["--soft"]) });
  const sec = checks.find((c) => c.name === "security:no-secrets");
  assert.equal(sec.pass, false, "should fail on planted secrets");
  assert.match(sec.detail, /2 file\(s\)/);
  assert.equal(go, false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("audit gates config shell commands OFF by default, ON with --allow-exec", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "veritas-exec-"));
  seedArtifacts(dir);
  // A config that declares a shell command. Without --allow-exec it must NOT run and must not block GO.
  const project = stubProject(dir, {
    qa: { drift: { cmd: 'node -e "process.exit(1)"' } },
  });
  const gated = await audit(project, { flags: new Set() });
  const gate = gated.checks.find((c) => c.name === "security:exec-gate");
  assert.ok(gate, "exec-gate check present when qa declares a command");
  assert.equal(gate.warn, true, "gated-off exec is an advisory warning");
  assert.ok(
    !gated.checks.some((c) => c.name === "qa:drift"),
    "drift must not run",
  );
  assert.equal(gated.go, true, "gated exec must not block GO");

  // With --allow-exec the drift command runs (and here fails, exit 1) → qa:drift check appears and fails.
  const allowed = await audit(project, {
    flags: new Set(["--allow-exec", "--soft"]),
  });
  assert.ok(
    allowed.checks.some((c) => c.name === "qa:drift" && !c.pass),
    "qa:drift should run and fail when exec is allowed",
  );
  fs.rmSync(dir, { recursive: true, force: true });
});
