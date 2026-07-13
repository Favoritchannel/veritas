// DISCOVER — the differentiator. Cross-reference the ORACLE (authoritative reference) against the community FACTS
// to surface interconnections the sources never state — things that are likely true but nobody has connected.
// Requires an oracle + the analyze tier; otherwise it is skipped (there is nothing to cross-check against).
import fs from "node:fs";
import { join } from "node:path";
import { chatJson, asData } from "../lib/llm.mjs";
import { waves } from "../lib/waves.mjs";

function oracleExcerpt(project) {
  const o = project.config.oracle || {}; if (!o.type || o.type === "none" || !o.ref) return "";
  try { const abs = join(project.root, o.ref); if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return fs.readFileSync(abs, "utf-8").slice(0, 120000);
    const dir = abs.replace(/[\\/][^\\/]*\*.*$/, ""); const out = []; let tot = 0;
    const walk = (d) => { let e; try { e = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } for (const x of e) { if (tot > 120000) return; const p = join(d, x.name); if (x.isDirectory()) walk(p); else if (/\.(md|txt|json|ts|js|py|rb|go)$/i.test(x.name)) { const t = fs.readFileSync(p, "utf-8"); out.push(t); tot += t.length; } } };
    walk(fs.existsSync(dir) ? dir : project.root); return out.join("\n").slice(0, 120000);
  } catch { return ""; }
}

export async function run(project) {
  let tier = null; try { tier = project.tier("analyze"); if (!process.env[tier.keyEnv]) tier = null; } catch { tier = null; }
  const ora = oracleExcerpt(project);
  if (!tier || !ora) { project.log("discover: skipped (needs an oracle + analyze tier to cross-check)"); project.writeOut("NOVEL-FINDINGS.md", `# Novel findings\n\n_Skipped: configure an \`oracle\` (authoritative reference) + an \`analyze\` compute tier to enable discovery._\n`); return; }
  const byDomain = project.readOut("facts.json", {});
  const domains = Object.keys(byDomain);
  const findings = [];
  await waves(domains.map((domain) => async () => {
    const facts = (byDomain[domain] || []).map((m) => `- ${m.statement}`).join("\n").slice(0, 8000);
    const sys = `You find HIDDEN interconnections that an AUTHORITATIVE reference encodes but the community FACTS do NOT state — likely-true relationships nobody has connected. For domain "${domain}" of "${project.config.topic}": read the reference, trace how variables/entities depend on each other, and report couplings/thresholds/chains ABSENT from the facts list. Each finding must follow from the reference (cite it). Output STRICT JSON {"findings":[{"finding":str,"mechanism":str,"why_missed":str,"test":str,"confidence":"high|medium|low"}]}. In ${project.language}. Empty if none.`;
    try { const d = await chatJson(tier, sys, `DOMAIN: ${domain}\n${asData("REFERENCE", ora)}\n${asData("KNOWN FACTS", facts)}`, { maxTokens: 4000 }); for (const f of d.findings || []) if (f.finding) findings.push({ domain, ...f }); }
    catch (e) { project.log(`    discover ${domain}: ${String(e.message).slice(0, 60)}`); }
  }), project.waveWidth, (i, t) => project.log(`discover wave ${i}/${t}`));

  project.writeOut("novel-findings.json", findings);
  let md = `# Novel findings — interconnections the reference encodes that the sources never stated\n\n${findings.length} candidates, each cited + testable. Cross-check in-domain before trusting.\n`;
  const byd = {}; for (const f of findings) (byd[f.domain] ||= []).push(f);
  for (const [d, list] of Object.entries(byd)) { md += `\n## ${d}\n\n`; for (const f of list) md += `- **${f.finding}** [${f.confidence}]\n  - mechanism: ${f.mechanism}\n  - why missed: ${f.why_missed}\n  - test: ${f.test}\n`; }
  project.writeOut("NOVEL-FINDINGS.md", md);
  project.log(`discover: ${findings.length} novel findings → NOVEL-FINDINGS.md`);
}
