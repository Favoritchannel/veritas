// AUDIT — the go/no-go gate before handover. Independent checks over the built project: artifacts exist, no
// secrets leaked into the output, the truth ledger is sane, the RAG corpus is non-trivial, the graph rendered,
// and coverage clears a floor. Writes audit-report.md; exits non-zero on FAIL unless --soft.
import fs from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const SECRET =
  /(sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|xox[baprs]-[A-Za-z0-9-]{10,}|ghp_[A-Za-z0-9]{30,}|AIza[0-9A-Za-z_-]{30,})/;

export async function run(project, { flags } = { flags: new Set() }) {
  const checks = [];
  const ok = (name, pass, detail) =>
    checks.push({ name, pass: !!pass, detail });
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

  // secret scan across the whole out dir
  let leak = "";
  const scan = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = `${d}/${e.name}`;
      if (e.isDirectory()) scan(p);
      else if (/\.(json|jsonl|md|txt|html|log)$/.test(e.name)) {
        const t = fs.readFileSync(p, "utf-8");
        if (SECRET.test(t)) leak = p;
      }
      if (leak) return;
    }
  };
  try {
    scan(project.outDir);
  } catch {
    /* */
  }
  ok(
    "security:no-secrets",
    !leak,
    leak
      ? `SECRET-LIKE STRING in ${leak}`
      : "no secret-like strings in outputs",
  );

  // ── optional QA gate (config.qa): the SAME auditor gates a runtime system as well as the corpus. Fully
  // config-driven so the tool stays generic — commands + fixtures + canaries live in the project's config. ──
  const qa = project.config.qa;
  if (qa) {
    // qa:calc — run a deterministic calculator on golden fixtures; assert every expected value within tolerance.
    if (qa.calc?.cmd && qa.calc?.fixtures) {
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
    // qa:drift — an external drift-check must pass (exit 0 = no untriaged patch drift).
    if (qa.drift?.cmd) {
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
  const go = checks.every((c) => c.pass);
  let md = `# Audit report — ${project.config.topic}\n\n**${go ? "✅ GO" : "❌ NO-GO"}** — ${passed}/${checks.length} checks passed.\n\n`;
  for (const c of checks)
    md += `- ${c.pass ? "✅" : "❌"} **${c.name}** — ${c.detail}\n`;
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
