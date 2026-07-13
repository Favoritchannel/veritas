// RAG-PACK — turn the verified library into rag-corpus.jsonl: one self-contained, retrieval-ready document per
// fact (carrying its truth STATUS + provenance) and per novel finding. This is what `serve` retrieves over.
export async function run(project) {
  const verified = project.readOut("verified.json", { items: [] }).items || [];
  const novel = project.readOut("novel-findings.json", []);
  const docs = [];
  verified.forEach((m, i) => {
    const parts = [m.statement];
    if ((m.dependsOn || []).length)
      parts.push(`Depends on: ${m.dependsOn.join(", ")}.`);
    if (m.values) parts.push(`Values: ${m.values}.`);
    if (m.formula) parts.push(`Formula: ${m.formula}.`);
    if ((m.breakpoints || []).length)
      parts.push(`Breakpoints: ${m.breakpoints.join("; ")}.`);
    if (m.note) parts.push(m.note);
    docs.push({
      id: `fact-${m.domain}-${i}`,
      type: "fact",
      domain: m.domain,
      status: m.status,
      confidence: m.confidence,
      hidden: !!m.hidden,
      text: parts.join(" "),
      sources: m.sources || [],
    });
  });
  (Array.isArray(novel) ? novel : []).forEach((f, i) =>
    docs.push({
      id: `novel-${i}`,
      type: "novel-finding",
      domain: f.domain,
      status: "NEEDS-VERIFICATION",
      confidence: f.confidence || "medium",
      text: `${f.finding} Mechanism: ${f.mechanism}. Test: ${f.test}.`,
      sources: [],
    }),
  );
  project.writeOut(
    "rag-corpus.jsonl",
    docs.map((d) => JSON.stringify(d)).join("\n") + "\n",
  );
  const byType = docs.reduce((a, d) => {
    a[d.type] = (a[d.type] || 0) + 1;
    return a;
  }, {});
  project.log(
    `rag-pack: ${docs.length} docs (${Object.entries(byType)
      .map(([k, v]) => `${v} ${k}`)
      .join(", ")}) → rag-corpus.jsonl`,
  );
}
