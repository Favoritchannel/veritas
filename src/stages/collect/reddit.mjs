// REDDIT collector (social) — uses reddit's public .json endpoints (no auth for public data). Config:
// { subreddits:["MySubreddit"], threads:["https://reddit.com/r/x/comments/..."], sort?:"top", maxPosts?:30 }.
import { chat } from "../../lib/llm.mjs";
import { chunk } from "../../lib/waves.mjs";

const H = { "user-agent": "veritas/0.1 (knowledge collector)" };
const getJson = async (u) => {
  try {
    const r = await fetch(u, {
      headers: H,
      signal: AbortSignal.timeout(30000),
    });
    return r.ok ? r.json() : null;
  } catch {
    return null;
  }
};
const flat = (node, out) => {
  if (!node) return;
  const c = node.data?.children || [];
  for (const ch of c) {
    const d = ch.data || {};
    if (d.title || d.selftext || d.body)
      out.push(
        `${d.title ? "# " + d.title + "\n" : ""}${d.selftext || d.body || ""}`,
      );
    if (d.replies) flat(d.replies, out);
  }
};

export async function collect(project, cfg) {
  const collectTier = project.tier("collect");
  const urls = [];
  for (const s of cfg.subreddits || [])
    urls.push(
      `https://www.reddit.com/r/${s}/${cfg.sort || "top"}.json?limit=${cfg.maxPosts || 30}&t=all`,
    );
  for (const t of cfg.threads || []) urls.push(t.replace(/\/?$/, ".json"));
  const entries = [];
  for (const u of urls) {
    const j = await getJson(u);
    if (!j) continue;
    const texts = [];
    (Array.isArray(j) ? j : [j]).forEach((n) => flat(n, texts));
    for (const ch of chunk(texts.join("\n\n"), project.chunkChars)) {
      try {
        const sys = `Extract factual claims / advice / numbers about "${project.config.topic}" from these reddit posts/comments (community opinion — mark uncertain as low). STRICT JSON {"facts":[{"text":str,"confidence":"high|medium|low"}]}. In ${project.language}.`;
        const { text } = await chat(collectTier, sys, ch, {
          json: true,
          maxTokens: 3000,
        });
        let d;
        try {
          d = JSON.parse(text);
        } catch {
          const m = text.match(/\{[\s\S]*\}/);
          d = m ? JSON.parse(m[0]) : { facts: [] };
        }
        for (const x of d.facts || [])
          if (x.text)
            entries.push({
              text: x.text,
              confidence: x.confidence || "low",
              kind: "fact",
              source: { ref: u.replace(".json", ""), title: "reddit" },
            });
      } catch {
        /* */
      }
    }
  }
  return entries;
}
