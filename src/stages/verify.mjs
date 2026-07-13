// VERIFY — assign every fact an explicit truth STATUS (TRUTH / PLAUSIBLE / NEEDS-VERIFICATION / CONTRADICTED)
// from its confidence + source count + notes, and — if an ORACLE is configured — cross-check the uncertain ones
// against it with the analyze tier. Writes verified.json + VERIFIED.md + expert-report.md + next-targets.md.
import fs from "node:fs";
import { join } from "node:path";
import { STATUS, deriveStatus, esc } from "../lib/schema.mjs";
import { chatJson, asData } from "../lib/llm.mjs";

export function globToRegExp(value) {
  const normalized = String(value).replaceAll("\\", "/");
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const globbed = escaped.replaceAll("\\*\\*", ".*").replaceAll("\\*", "[^/]*");
  return new RegExp(`^${globbed}$`);
}

function oracleText(project) {
  const o = project.config.oracle || {};
  if (!o.type || o.type === "none" || !o.ref) return "";
  try {
    if (o.type === "api") return ""; // per-fact fetch not generalized; use code/dataset for now
    // code/dataset: read files matching the ref (glob-ish) under root, cap total size
    const abs = join(project.root, o.ref);
    const dir = abs.replace(/[\\/][^\\/]*\*.*$/, "");
    const rx = globToRegExp(abs);
    const out = [];
    let total = 0;
    const walk = (d) => {
      let e;
      try {
        e = fs.readdirSync(d, { withFileTypes: true });
      } catch {
        return;
      }
      for (const x of e) {
        const p = join(d, x.name).replace(/\\/g, "/");
        if (total > 400000) return;
        if (x.isDirectory()) walk(p);
        else if (
          rx.test(p) ||
          (fs.existsSync(abs) && p === abs.replace(/\\/g, "/"))
        ) {
          const t = fs.readFileSync(p, "utf-8");
          out.push(`\n===== ${p} =====\n` + t);
          total += t.length;
        }
      }
    };
    if (fs.existsSync(abs) && fs.statSync(abs).isFile())
      return fs.readFileSync(abs, "utf-8").slice(0, 400000);
    walk(fs.existsSync(dir) ? dir : project.root);
    return out.join("\n");
  } catch {
    return "";
  }
}

export async function run(project) {
  const byDomain = project.readOut("facts.json", {});
  const all = Object.values(byDomain).flat();
  if (!all.length) {
    project.log("verify: run merge first");
    return;
  }

  // baseline status from confidence/sources/notes
  for (const m of all) {
    m.status = deriveStatus(m);
    m.engineGap = /not (yet )?model|gap|absent|missing/i.test(m.note || "");
  }

  // optional oracle cross-check of the uncertain ones
  let tier;
  try {
    tier = project.tier("analyze");
    if (!process.env[tier.keyEnv]) tier = null;
  } catch {
    tier = null;
  }
  const ora = oracleText(project);
  if (tier && ora) {
    const uncertain = all.filter((m) => m.status !== STATUS.TRUTH).slice(0, 60);
    project.log(
      `verify: oracle cross-check on ${uncertain.length} uncertain facts…`,
    );
    for (const m of uncertain) {
      const terms = (
        m.statement.toLowerCase().match(/\p{L}{4,}|\p{N}+/gu) || []
      ).slice(0, 8);
      const lines = ora
        .split("\n")
        .filter((l) => {
          const low = l.toLowerCase();
          return terms.filter((t) => low.includes(t)).length >= 2;
        })
        .slice(0, 40)
        .join("\n");
      if (!lines) continue;
      try {
        const d = await chatJson(
          tier,
          `Given an AUTHORITATIVE reference excerpt, judge the CLAIM. Verdict CONFIRMED (reference supports it) / REFUTED (reference contradicts it) / UNCLEAR. STRICT JSON {"verdict":"CONFIRMED|REFUTED|UNCLEAR","note":str}. In ${project.language}.`,
          `CLAIM: ${m.statement}\n${asData("REFERENCE", lines)}`,
          { maxTokens: 500 },
        );
        if (d.verdict === "CONFIRMED") {
          m.status = STATUS.TRUTH;
          m.note = `${m.note || ""} [oracle: confirmed]`.trim();
        } else if (d.verdict === "REFUTED") {
          m.status = STATUS.CONTRADICTED;
          m.note = `${m.note || ""} [oracle: ${d.note || "refuted"}]`.trim();
        }
      } catch {
        /* */
      }
    }
  } else
    project.log(
      "verify: no oracle/analyze key → status derived from confidence + sources only",
    );

  const tally = all.reduce((a, m) => {
    a[m.status] = (a[m.status] || 0) + 1;
    return a;
  }, {});
  const gaps = all.filter((m) => m.engineGap);
  project.writeOut("verified.json", {
    tally,
    gaps: gaps.map((m) => ({
      domain: m.domain,
      statement: m.statement,
      note: m.note,
    })),
    items: all,
  });

  // reports
  let md = `# Verified facts — truth status\n\n${all.length} facts. Tally: ${Object.entries(
    tally,
  )
    .map(([k, v]) => `${k} ${v}`)
    .join(
      " · ",
    )}.\n\nStatus: TRUTH = oracle-confirmed or multi-source · PLAUSIBLE = one credible source · NEEDS-VERIFICATION = single/low/uncertain · CONTRADICTED = conflicts oracle or sources.\n`;
  for (const st of [
    STATUS.CONTRADICTED,
    STATUS.TRUTH,
    STATUS.PLAUSIBLE,
    STATUS.NEEDS_VERIFICATION,
  ]) {
    const list = all.filter((m) => m.status === st);
    if (!list.length) continue;
    md += `\n## ${st} (${list.length})\n\n`;
    for (const m of st === STATUS.TRUTH ? list.slice(0, 60) : list)
      md += `- ${m.hidden ? "🔒 " : ""}_[${m.domain}]_ ${esc(m.statement)}${m.note ? ` — ${esc(m.note).slice(0, 140)}` : ""}\n`;
  }
  project.writeOut("VERIFIED.md", md);

  // deterministic expert report + next-targets (completeness critic)
  const counts = Object.fromEntries(
    Object.entries(byDomain).map(([d, a]) => [d, a.length]),
  );
  const thin = Object.entries(counts)
    .filter(
      ([, n]) => n < Math.max(3, all.length / (project.domains.length * 3)),
    )
    .map(([d]) => d);
  let report = `# Expert report — ${project.config.topic}\n\nReconstructed ${all.length} facts across ${Object.keys(byDomain).length} domains. Truth ledger: ${Object.entries(
    tally,
  )
    .map(([k, v]) => `${k} ${v}`)
    .join(" · ")}.\n\n`;
  for (const [d, a] of Object.entries(byDomain)) {
    const hi = a.filter((m) => m.status === STATUS.TRUTH).length;
    report +=
      `## ${d} (${a.length} facts · ${hi} TRUTH)\n\n` +
      a
        .filter((m) => m.status === STATUS.TRUTH)
        .slice(0, 6)
        .map((m) => `- ${esc(m.statement)}`)
        .join("\n") +
      "\n\n";
  }
  project.writeOut("expert-report.md", report);
  const nt = `# Next targets\n\n## Thin domains (need more sources)\n${thin.map((d) => `- ${d} (${counts[d]} facts)`).join("\n") || "- (none)"}\n\n## To verify (needs a source or an oracle)\n${all
    .filter((m) => m.status === STATUS.NEEDS_VERIFICATION)
    .slice(0, 20)
    .map((m) => `- _[${m.domain}]_ ${esc(m.statement)}`)
    .join("\n")}\n\n## Gaps flagged\n${
    gaps
      .slice(0, 20)
      .map((m) => `- _[${m.domain}]_ ${esc(m.statement)}`)
      .join("\n") || "- (none)"
  }\n`;
  project.writeOut("next-targets.md", nt);

  project.log(
    `verify: ${JSON.stringify(tally)} · ${gaps.length} gaps → verified.json + VERIFIED.md + expert-report.md + next-targets.md`,
  );
}
