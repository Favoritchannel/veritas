// The veritas data model. Everything the pipeline produces carries PROVENANCE + CONFIDENCE + STATUS.
//
// raw entry (collect stage)  → { text, kind, values?, dependsOn?, confidence, domain, source:{type,ref,title} }
// fact     (synthesize stage) → { statement, dependsOn[], affects[], values, formula, breakpoints[], hidden,
//                                 confidence, note, sources[], domain }
// verdict  (verify stage)     → fact + { status, engineRef?, engineGap? }
// rag doc  (rag-pack stage)   → { id, type, domain, status, confidence, text, sources[] }

export const STATUS = {
  TRUTH: "TRUTH",
  PLAUSIBLE: "PLAUSIBLE",
  NEEDS_VERIFICATION: "NEEDS-VERIFICATION",
  CONTRADICTED: "CONTRADICTED",
};
export const CONF_RANK = { high: 3, medium: 2, low: 1 };

export function normalizeDomain(domains, s) {
  const x = String(s || "")
    .toLowerCase()
    .trim();
  return domains.includes(x) ? x : domains[domains.length - 1] || "general";
}

// Derive an explicit truth status from a fact's confidence, source count, and any engine/oracle cross-check note.
export function deriveStatus(fact) {
  const note = (fact.note || "").toLowerCase();
  const contradiction =
    /contradict|refut|corrects? the|is wrong|overstat|understat|disagree/.test(
      note,
    );
  const nsrc = (fact.sources || []).length;
  if (contradiction) return STATUS.CONTRADICTED;
  if (fact.confidence === "high") return STATUS.TRUTH;
  if (fact.confidence === "medium")
    return nsrc >= 3 ? STATUS.TRUTH : STATUS.PLAUSIBLE;
  return STATUS.NEEDS_VERIFICATION;
}

export const uniq = (a) => [...new Set(a)];
export const esc = (s) => String(s || "").replace(/\n/g, " ");
