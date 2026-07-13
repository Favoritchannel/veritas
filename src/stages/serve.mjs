// SERVE — the answering AI. Retrieves over rag-corpus.jsonl (portable keyword/TF retrieval, no vector DB needed)
// and answers with the serve tier, citing sources + truth status. Modes:
//   veritas serve config.json --ask "question"     one-shot
//   veritas serve config.json --repl               interactive
// Offline (no serve key): returns the top retrieved facts verbatim (extractive answer) so it works keyless.
import fs from "node:fs";
import readline from "node:readline";
import { chat, asData } from "../lib/llm.mjs";

export const tokenize = (s) =>
  String(s)
    .toLowerCase()
    .match(/[\p{L}\p{N}]{3,}/gu) || [];
function loadCorpus(project) {
  const p = project.outPath("rag-corpus.jsonl");
  if (!fs.existsSync(p))
    throw new Error("no rag-corpus.jsonl — run the build first (rag-pack)");
  const docs = fs
    .readFileSync(p, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  const df = new Map();
  for (const d of docs)
    for (const t of new Set(tokenize(d.text))) df.set(t, (df.get(t) || 0) + 1);
  return { docs, df, N: docs.length };
}
function retrieve({ docs, df, N }, query, k = 8) {
  const q = tokenize(query);
  const scored = docs.map((d) => {
    const dt = tokenize(d.text);
    const set = new Set(dt);
    let s = 0;
    for (const t of q)
      if (set.has(t)) s += Math.log(1 + N / (1 + (df.get(t) || 0)));
    const boost =
      d.status === "TRUTH" ? 1.15 : d.status === "CONTRADICTED" ? 0.9 : 1;
    return { d, s: s * boost };
  });
  return scored
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .map((x) => x.d);
}

async function answer(project, corpus, question) {
  const hits = retrieve(corpus, question, 8);
  if (!hits.length) return "No relevant facts found in the knowledge base.";
  let tier;
  try {
    tier = project.tier("serve");
    if (!process.env[tier.keyEnv]) tier = null;
  } catch {
    tier = null;
  }
  const context = hits
    .map(
      (h, i) =>
        `[${i + 1}] (${h.status}${h.sources?.length ? " · " + h.sources[0] : ""}) ${h.text}`,
    )
    .join("\n");
  if (!tier) return `(extractive — no serve tier configured)\n\n${context}`;
  const sys = `You answer questions about "${project.config.topic}" ONLY from the retrieved facts below. Cite the [n] you use. Respect the truth status: prefer TRUTH, flag PLAUSIBLE/NEEDS-VERIFICATION as tentative, and warn on CONTRADICTED. If the facts do not answer, say so. In ${project.language}.`;
  const { text } = await chat(
    tier,
    sys,
    `QUESTION: ${question}\n${asData("RETRIEVED FACTS", context)}`,
    { maxTokens: 1200 },
  );
  return text;
}

export async function run(project, { flags, positional }) {
  const corpus = loadCorpus(project);
  project.log(`serve: ${corpus.N} docs loaded`);
  const askIdx = process.argv.indexOf("--ask");
  const q = askIdx >= 0 ? process.argv[askIdx + 1] : positional[1];
  if (q && !flags.has("--repl")) {
    console.log("\n" + (await answer(project, corpus, q)) + "\n");
    return;
  }
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  console.log(
    `\nVeritas KB serve — ask about "${project.config.topic}" (ctrl-c to exit)\n`,
  );
  const loop = () =>
    rl.question("? ", async (line) => {
      if (!line.trim()) return loop();
      console.log("\n" + (await answer(project, corpus, line)) + "\n");
      loop();
    });
  loop();
}

export { loadCorpus, retrieve, answer };
