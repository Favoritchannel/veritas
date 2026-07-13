// RSS / Atom collector — for blogs, news, forums, podcasts, anything with a feed. Fetches feed(s), pulls each
// item's title+summary (and optionally the linked page via the web collector), then extracts facts.
// Config: { feeds:["https://site/feed.xml"], fetchLinked?:false, maxItems?:40 }.
import { chat } from "../../lib/llm.mjs";
import { chunk } from "../../lib/waves.mjs";

const strip = (s) =>
  String(s || "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

function parseFeed(xml) {
  const items = [];
  const blocks = xml.match(/<(item|entry)[\s\S]*?<\/(item|entry)>/gi) || [];
  for (const b of blocks) {
    const title = strip((b.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]);
    const desc = strip(
      (b.match(/<(description|summary|content)[^>]*>([\s\S]*?)<\/\1>/i) ||
        [])[2],
    );
    const link = strip(
      (b.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || [])[1] ||
        (b.match(/<link[^>]*href="([^"]+)"/i) || [])[1],
    );
    if (title || desc) items.push({ title, desc, link });
  }
  return items;
}

export async function collect(project, cfg) {
  const collectTier = project.tier("collect");
  const entries = [];
  for (const feed of cfg.feeds || []) {
    let xml;
    try {
      const r = await fetch(feed, {
        signal: AbortSignal.timeout(30000),
        headers: { "user-agent": "veritas" },
      });
      xml = await r.text();
    } catch (e) {
      project.log(`    rss ${feed}: ${e.message}`);
      continue;
    }
    const items = parseFeed(xml).slice(0, cfg.maxItems || 40);
    const corpus = items
      .map((it) => `# ${it.title}\n${it.desc}\n(${it.link})`)
      .join("\n\n");
    for (const ch of chunk(corpus, project.chunkChars)) {
      try {
        const sys = `Extract factual claims / numbers about "${project.config.topic}" from these feed items. STRICT JSON {"facts":[{"text":str,"confidence":"high|medium|low"}]}. In ${project.language}.`;
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
              confidence: x.confidence || "medium",
              kind: "fact",
              source: { ref: feed, title: cfg.title || feed },
            });
      } catch {
        /* */
      }
    }
  }
  return entries;
}
