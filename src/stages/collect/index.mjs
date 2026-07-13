// COLLECT — run each configured source module, aggregate provenance-tagged raw entries → out/raw-entries.json.
// Each collector exports  async collect(project, sourceConfig) => rawEntry[]  where
//   rawEntry = { text, kind, values?, dependsOn?, confidence, domain, source:{type,ref,title} }.
// Unknown/unavailable source types are skipped with a warning (the tool degrades, never crashes).
export async function run(project) {
  const sources = project.config.sources || [];
  const all = [];
  for (const s of sources) {
    const type = s.type;
    let mod;
    try {
      mod = await import(`./${type}.mjs`);
    } catch {
      project.log(`  ! no collector for source type '${type}' — skipping`);
      continue;
    }
    if (typeof mod.collect !== "function") {
      project.log(`  ! collector '${type}' has no collect() — skipping`);
      continue;
    }
    try {
      const entries = await mod.collect(project, s.config || {});
      const tagged = (entries || []).map((e) => ({
        confidence: "medium",
        domain: project.domains[0],
        ...e,
        source: { type, ...(e.source || {}) },
      }));
      all.push(...tagged);
      project.log(`  ${type}: +${tagged.length} entries`);
    } catch (e) {
      project.log(
        `  ! ${type} collector failed: ${String(e.message).slice(0, 100)}`,
      );
    }
  }
  project.writeOut("raw-entries.json", all);
  project.log(
    `collect: ${all.length} raw entries from ${sources.length} source(s) → raw-entries.json`,
  );
  return all;
}
