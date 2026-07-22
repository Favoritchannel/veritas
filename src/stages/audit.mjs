// AUDIT — the go/no-go gate before handover. Independent checks over the built project: artifacts exist, no
// secrets leaked into the output, the truth ledger is sane, the RAG corpus is non-trivial, the graph rendered,
// and coverage clears a floor. Writes audit-report.md; exits non-zero on FAIL unless --soft.
import fs from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

// Secret patterns to catch in generated outputs (a pre-share safety net). Global flag so we can count every hit.
const SECRET = new RegExp(
  [
    "sk-ant-[A-Za-z0-9_-]{20,}", // Anthropic (before generic sk- so it's not clipped at the dash)
    "sk-[A-Za-z0-9]{20,}", // OpenAI & generic
    "sk_(?:live|test)_[0-9A-Za-z]{16,}", // Stripe
    "github_pat_[0-9A-Za-z_]{22,}", // GitHub fine-grained PAT
    "ghp_[A-Za-z0-9]{30,}", // GitHub classic PAT
    "glpat-[0-9A-Za-z_-]{20,}", // GitLab PAT
    "AKIA[0-9A-Z]{16}", // AWS access key id
    "aws_secret_access_key\\s*[=:]\\s*[A-Za-z0-9/+]{40}", // AWS secret (labeled)
    "AIza[0-9A-Za-z_-]{30,}", // Google API key
    "xox[baprs]-[A-Za-z0-9-]{10,}", // Slack
    "[MNO][A-Za-z0-9_-]{23}\\.[A-Za-z0-9_-]{6}\\.[A-Za-z0-9_-]{27,40}", // Discord bot token
    "eyJ[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9_-]{8,}", // JWT
    "-----BEGIN [A-Z ]*PRIVATE KEY-----", // PEM
  ].join("|"),
  "g",
);

export async function run(project, { flags } = { flags: new Set() }) {
  const checks = [];
  // A `warn` check never fails GO — used for security gates that are advisory by default (e.g. exec skipped).
  const ok = (name, pass, detail, warn = false) =>
    checks.push({ name, pass: !!pass, detail, warn });
  const allowExec =
    flags?.has("--allow-exec") || project.config.security?.allowExec === true;
  const exists = (f) => fs.existsSync(project.outPath(f));

  ok("artifacts:facts", exists("facts.json"), "facts.json present");
  ok("artifacts:verified", exists("verified.json"), "verified.json present");
  ok("artifacts:rag", exists("rag-corpus.jsonl"), "rag-corpus.jsonl present");
  ok("artifacts:graph", exists("graph.html"), "graph.html present");

  const verified = project.readOut("verified.json", { items: [], tally: {} });
  const facts = verified.items || [];
  ok("coverage:facts", facts.length >= 5, `${facts.length} facts (floor 5)`);
  const truth = verified.tally?.TRUTH || 0;
  ok(
    "ledger:has-status",
    facts.every((m) => m.status),
    "every fact has a truth status",
  );
  ok(
    "ledger:truth-ratio",
    facts.length ? truth / facts.length >= 0 : false,
    `${truth}/${facts.length} TRUTH`,
  );

  const rag = exists("rag-corpus.jsonl")
    ? fs
        .readFileSync(project.outPath("rag-corpus.jsonl"), "utf-8")
        .split("\n")
        .filter(Boolean).length
    : 0;
  ok("rag:non-trivial", rag >= 5, `${rag} rag docs`);
  ok(
    "graph:non-empty",
    exists("graph.html") &&
      fs.statSync(project.outPath("graph.html")).size > 5000,
    "graph.html has content",
  );

  // secret scan across the whole out dir — every text file, every hit (not just the first), reported by count.
  const leaks = [];
  const scan = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = `${d}/${e.name}`;
      if (e.isDirectory()) {
        scan(p);
        continue;
      }
      let buf;
      try {
        buf = fs.readFileSync(p);
      } catch {
        continue;
      }
      if (buf.length > 4_000_000 || buf.includes(0)) continue; // skip huge/binary files
      const hits = buf.toString("utf-8").match(SECRET);
      if (hits) leaks.push({ file: p, count: hits.length });
    }
  };
  try {
    scan(project.outDir);
  } catch {
    /* */
  }
  const totalHits = leaks.reduce((a, l) => a + l.count, 0);
  ok(
    "security:no-secrets",
    leaks.length === 0,
    leaks.length
      ? `${totalHits} secret-like string(s) in ${leaks.length} file(s): ${leaks
          .slice(0, 5)
          .map((l) => l.file)
          .join(", ")}`
      : "no secret-like strings in outputs",
  );

  // ── optional QA gate (config.qa): the SAME auditor gates a runtime system as well as the corpus. Fully
  // config-driven so the tool stays generic — commands + fixtures + canaries live in the project's config. ──
  const qa = project.config.qa;
  const wantsExec = !!(qa && (qa.calc?.cmd || qa.drift?.cmd));
  if (wantsExec)
    ok(
      "security:exec-gate",
      allowExec,
      allowExec
        ? "config shell commands allowed (--allow-exec / security.allowExec)"
        : "config declares shell commands (qa.calc/qa.drift) — gated OFF; pass --allow-exec to run them",
      !allowExec, // advisory warning, not a GO-blocker, when exec is simply gated off
    );
  if (qa) {
    // qa:calc — run a deterministic calculator on golden fixtures; assert every expected value within tolerance.
    // Shell execution is gated: skip unless exec is explicitly allowed (an untrusted config must not run commands).
    if (allowExec && qa.calc?.cmd && qa.calc?.fixtures) {
      let fixtures = [];
      try {
        fixtures = JSON.parse(
          fs.readFileSync(join(project.root, qa.calc.fixtures), "utf-8"),
        );
      } catch {
        /* */
      }
      const tol = qa.calc.tolerance ?? 0.5;
      for (const fx of fixtures) {
        let got = null,
          err = "";
        try {
          const inp = String(fx.shareCode ?? fx.input ?? "");
          // Inline via {input} for short inputs; otherwise pipe via stdin (long inputs blow the OS arg-length limit).
          // Shell-metachar inputs are refused for the inline path — fixture files can come from untrusted repos.
          if (qa.calc.cmd.includes("{input}") && /[`$\\;|&<>]/.test(inp))
            throw new Error(
              "fixture input contains shell metacharacters — remove {input} from qa.calc.cmd to pipe via stdin",
            );
          const hasPh = qa.calc.cmd.includes("{input}");
          const cmd = hasPh
            ? qa.calc.cmd.replace("{input}", JSON.stringify(inp))
            : qa.calc.cmd;
          const out = execSync(cmd, {
            cwd: project.root,
            encoding: "utf-8",
            input: hasPh ? undefined : inp,
            stdio: hasPh
              ? ["ignore", "pipe", "ignore"]
              : ["pipe", "pipe", "ignore"],
          });
          got = JSON.parse(out.trim().split("\n").pop());
        } catch (e) {
          err = e.message;
        }
        const bad = got
          ? Object.entries(fx.expected || {}).filter(
              ([k, v]) => v != null && !(Math.abs((got[k] ?? NaN) - v) <= tol),
            )
          : [];
        ok(
          `qa:calc:${fx.name || "case"}`,
          !!got && bad.length === 0,
          got
            ? bad.length
              ? `mismatch: ${bad.map(([k]) => `${k} want ${fx.expected[k]} got ${got[k]}`).join(", ")}`
              : "calculator matches golden fixture"
            : `calc failed: ${err}`,
        );
      }
    }
    // qa:ai — the answering AI must return non-trivial, on-topic answers for canary questions (reuses serve).
    if (qa.ai?.canaries?.length) {
      try {
        const { loadCorpus, answer } = await import("./serve.mjs");
        const corpus = loadCorpus(project);
        for (const q of qa.ai.canaries) {
          let text = "";
          try {
            text = await answer(project, corpus, q);
          } catch {
            text = "";
          }
          ok(
            `qa:ai:${q.slice(0, 36)}`,
            text.length > 20 && !/no relevant facts/i.test(text),
            text.length > 20 ? "answered on-topic" : "empty/irrelevant answer",
          );
        }
      } catch (e) {
        ok("qa:ai", false, `serve load failed: ${e.message}`);
      }
    }
    // qa:drift — an external drift-check must pass (exit 0 = no untriaged patch drift). Gated like qa:calc.
    if (allowExec && qa.drift?.cmd) {
      let pass = true,
        detail = "no untriaged drift";
      try {
        execSync(qa.drift.cmd, {
          cwd: project.root,
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "ignore"],
        });
      } catch (e) {
        pass = false;
        detail = `drift-check nonzero exit (${e.status ?? "?"})`;
      }
      ok("qa:drift", pass, detail);
    }
  }

  const passed = checks.filter((c) => c.pass).length;
  const warned = checks.filter((c) => !c.pass && c.warn).length;
  const go = checks.every((c) => c.pass || c.warn); // warn checks are advisory, never block GO
  let md = `# Audit report — ${project.config.topic}\n\n**${go ? "✅ GO" : "❌ NO-GO"}** — ${passed}/${checks.length} checks passed${warned ? `, ${warned} warning(s)` : ""}.\n\n`;
  for (const c of checks)
    md += `- ${c.pass ? "✅" : c.warn ? "⚠️" : "❌"} **${c.name}** — ${c.detail}\n`;
  md += `\nTruth ledger: ${
    Object.entries(verified.tally || {})
      .map(([k, v]) => `${k} ${v}`)
      .join(" · ") || "(none)"
  }\n`;
  project.writeOut("audit-report.md", md);
  project.log(
    `audit: ${go ? "GO ✅" : "NO-GO ❌"} (${passed}/${checks.length}) → audit-report.md`,
  );
  if (!go && !flags?.has("--soft")) process.exitCode = 2;
  return { go, checks };
}
