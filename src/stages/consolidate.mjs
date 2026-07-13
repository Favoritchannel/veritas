// CONSOLIDATE (mechanical, no LLM) — normalize raw entries by domain, drop exact dupes, split into per-domain
// files for the synthesize stage, and write a provenance list. Fast + deterministic.
import { normalizeDomain } from "../lib/schema.mjs";

export async function run(project) {
  const raw = project.readOut("raw-entries.json", []);
  if (!raw.length) { project.log("consolidate: no raw-entries.json (run collect first)"); return; }
  const seen = new Set(), entries = [];
  for (const e of raw) {
    const key = (e.text || "").toLowerCase().replace(/[^a-z0-9а-я]+/gi, " ").trim().slice(0, 80);
    if (!key || seen.has(key)) continue; seen.add(key);
    entries.push({ ...e, domain: normalizeDomain(project.domains, e.domain) });
  }
  const byDomain = {};
  for (const e of entries) (byDomain[e.domain] ||= []).push(e);
  for (const [d, arr] of Object.entries(byDomain)) project.writeOut(`by-domain/${d}.json`, { domain: d, count: arr.length, entries: arr });
  const sources = new Map(); for (const e of entries) sources.set(e.source?.ref, e.source);
  project.writeOut("sources.json", [...sources.values()].filter(Boolean));
  project.writeOut("consolidated.json", entries);
  project.log(`consolidate: ${entries.length} entries (deduped from ${raw.length}) across ${Object.keys(byDomain).length} domains → by-domain/`);
}
