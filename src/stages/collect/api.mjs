// API collector — GET one or more endpoints and extract facts from the response (JSON or text) with the collect tier.
import { chat } from "../../lib/llm.mjs";
import { chunk } from "../../lib/waves.mjs";

export async function collect(project, cfg) {
  const urls = cfg.urls || (cfg.url ? [cfg.url] : []);
  const headers = cfg.headers || {};
  if (cfg.keyEnv && process.env[cfg.keyEnv]) headers.authorization = `Bearer ${process.env[cfg.keyEnv]}`;
  const collectTier = project.tier("collect");
  const entries = [];
  for (const url of urls) {
    let body = "";
    try { const r = await fetch(url, { headers, signal: AbortSignal.timeout(30000) }); body = await r.text(); } catch (e) { project.log(`    api ${url}: ${e.message}`); continue; }
    for (const ch of chunk(body, project.chunkChars)) {
      try {
        const sys = `Extract factual claims / fields / numbers about "${project.config.topic}" from this API response. STRICT JSON {"facts":[{"text":str,"confidence":"high|medium|low"}]}. In ${project.language}.`;
        const { text } = await chat(collectTier, sys, ch, { json: true, maxTokens: 3000 });
        let d; try { d = JSON.parse(text); } catch { const m = text.match(/\{[\s\S]*\}/); d = m ? JSON.parse(m[0]) : { facts: [] }; }
        for (const x of d.facts || []) if (x.text) entries.push({ text: x.text, confidence: x.confidence || "medium", kind: "fact", source: { ref: url, title: cfg.title || url } });
      } catch { /* */ }
    }
  }
  return entries;
}
