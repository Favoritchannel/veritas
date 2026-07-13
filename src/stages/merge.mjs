// MERGE (mechanical) — combine per-domain facts into facts.json (grouped) + a dependency graph + the hidden/
// breakpoint slices. Dedups near-identical statements within a domain, unions sources, bumps multi-source to high.
import fs from "node:fs";
import { CONF_RANK, uniq } from "../lib/schema.mjs";

export async function run(project) {
  const dir = project.outPath("facts");
  if (!fs.existsSync(dir)) { project.log("merge: run synthesize first"); return; }
  const all = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) { const arr = project.readOut(`facts/${f}`, []); for (const m of Array.isArray(arr) ? arr : []) if (m.statement) all.push(m); }

  const key = (m) => `${m.domain}|${String(m.statement).toLowerCase().replace(/[^a-z0-9а-я]+/gi, " ").trim().slice(0, 70)}`;
  const merged = new Map();
  for (const m of all) {
    const k = key(m), cur = merged.get(k);
    if (!cur) { merged.set(k, { ...m, sources: uniq(m.sources || []) }); continue; }
    if ((CONF_RANK[m.confidence] || 0) > (CONF_RANK[cur.confidence] || 0)) { cur.confidence = m.confidence; cur.statement = m.statement; }
    cur.sources = uniq([...(cur.sources || []), ...(m.sources || [])]);
    cur.breakpoints = uniq([...(cur.breakpoints || []), ...(m.breakpoints || [])]);
    cur.dependsOn = uniq([...(cur.dependsOn || []), ...(m.dependsOn || [])]);
    cur.affects = uniq([...(cur.affects || []), ...(m.affects || [])]);
    cur.hidden = cur.hidden || m.hidden;
    if (!cur.formula && m.formula) cur.formula = m.formula;
    if ((cur.sources || []).length >= 2 && cur.confidence === "medium") cur.confidence = "high";
  }
  const facts = [...merged.values()];
  const byDomain = {}; for (const m of facts) (byDomain[m.domain] ||= []).push(m);
  project.writeOut("facts.json", byDomain);

  const nodes = new Map(), edges = [];
  for (const m of facts) for (const from of m.dependsOn || []) for (const to of ((m.affects && m.affects.length) ? m.affects : [m.statement.slice(0, 48)])) {
    if (!from || !to) continue;
    nodes.set(from.toLowerCase(), { id: from.toLowerCase(), name: from, domain: m.domain });
    nodes.set(String(to).toLowerCase(), { id: String(to).toLowerCase(), name: String(to).slice(0, 60), domain: m.domain });
    edges.push({ from, to: String(to).slice(0, 60), relation: m.hidden ? "hidden" : "affects", domain: m.domain, hidden: !!m.hidden });
  }
  project.writeOut("dependencies.json", { nodes: [...nodes.values()], edges });
  project.writeOut("hidden.json", facts.filter((m) => m.hidden));
  project.writeOut("breakpoints.json", facts.filter((m) => (m.breakpoints || []).length).map((m) => ({ domain: m.domain, statement: m.statement, breakpoints: m.breakpoints, confidence: m.confidence })));
  project.log(`merge: ${facts.length} facts, ${edges.length} edges, ${facts.filter((m) => m.hidden).length} hidden → facts.json + dependencies.json`);
}
