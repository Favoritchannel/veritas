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
  DISPUTED: "DISPUTED",
};
export const CONF_RANK = { high: 3, medium: 2, low: 1 };

// Stable fact identity. normKey mirrors the merge dedup key (so id == dedup identity); NFKD-fold first so
// diacritic variants ("Müller"/"Muller") normalize to the same key.
export const normKey = (s) =>
  String(s || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .slice(0, 70);

function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
export const factId = (m) =>
  "f-" + fnv1a(`${m.domain}|${normKey(m.statement)}`).toString(36);
export const conflictId = (idA, idB) =>
  "c-" + fnv1a([idA, idB].sort().join("|")).toString(36);

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
