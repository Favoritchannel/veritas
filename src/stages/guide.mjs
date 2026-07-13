// GUIDE — the hand-holding walkthrough. `veritas guide` prints an interactive-style setup checklist so a newcomer
// knows exactly what to configure and what to do next. When veritas runs inside an agent (see SKILL.md) the agent
// turns these steps into real questions; standalone, it prints the checklist and points at the config + docs.
import fs from "node:fs";

export function guide(configPath) {
  const has = configPath && fs.existsSync(configPath);
  console.log(`
  veritas — guided setup
  ======================

  Goal: turn a TOPIC + diverse SOURCES into a verified knowledge base with an answering AI.

  1. TOPIC & DOMAINS
     Copy veritas.config.example.json → veritas.config.json. Set "topic" and the "domains"
     (the sub-areas your facts split into — they become the graph's nuclei).

  2. ORACLE (optional but powerful)
     If you have an authoritative reference (a codebase, dataset, or API), set "oracle".
     verify then cross-checks facts against it → higher-confidence TRUTH, and the discover
     stage can find interconnections the sources never stated.

  3. SOURCES  (add as many as you like — this is where breadth comes from)
     web · youtube · chat-export (Discord/Slack/Telegram/WhatsApp exports) · reddit · rss ·
     api · github · database (sqlite/postgres/mysql) · pdf · files.
     Each source is one entry in "sources". Add your own by dropping a module in
     src/stages/collect/ that exports  collect(project, cfg) => rawEntry[]  (see docs/source-modules.md).

  4. COMPUTE TIERS  (provider-flexible — google/openai/anthropic/perplexity/local)
     collect = cheap extraction · vision = reads charts/images · analyze = strong synthesis/
     verification/discovery · serve = the runtime answerer. Put keys in .env (never commit).

  5. RUN
     veritas run --auto veritas.config.json      # full autonomous build → out/
     ...or stage by stage: collect → consolidate → synthesize → merge → verify → discover →
     rag-pack → graph → audit.

  6. WHAT TO DO NEXT  (the tool guides you)
     Read out/next-targets.md — the completeness critic tells you which domains are thin and
     what to collect next. Add sources, re-run. Repeat until the truth ledger is solid.

  7. USE IT
     veritas serve veritas.config.json --ask "your question"   # cited, status-tagged answers
     open out/graph.html                                        # 3D knowledge graph
     read out/audit-report.md                                   # go/no-go + coverage

  ${has ? `Detected config: ${configPath}` : `No config yet — start from veritas.config.example.json`}
  Docs: README.md, docs/architecture.md, docs/source-modules.md, docs/verification.md
`);
}
