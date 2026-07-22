// CHAT-EXPORT collector — read a chat export (generic messages JSON, or DiscordChatExporter -f Json). Pulls
// message text + links, then extracts facts with the collect tier. Point `path` at the export file(s).
import fs from "node:fs";
import { join, relative, basename } from "node:path";
import { chat, asData, DATA_CLAUSE } from "../../lib/llm.mjs";
import { withinRoot } from "../../lib/guard.mjs";
import { chunk } from "../../lib/waves.mjs";

function files(root, pat) {
  const abs = join(root, pat);
  const dir = abs.replace(/[\\/][^\\/]*\*.*$/, "");
  let out;
  if (fs.existsSync(abs) && fs.statSync(abs).isFile?.()) out = [abs];
  else
    try {
      out = fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => join(dir, f));
    } catch {
      out = [];
    }
  return out.filter((p) => withinRoot(root, p)); // reject ../ escapes from cfg.path
}

export async function collect(project, cfg) {
  const collectTier = project.tier("collect");
  const entries = [];
  for (const f of files(project.root, cfg.path || "raw/chat/*.json")) {
    let j;
    try {
      j = JSON.parse(fs.readFileSync(f, "utf-8"));
    } catch {
      continue;
    }
    const msgs = (j.messages || (Array.isArray(j) ? j : []))
      .map(
        (m) =>
          `@${m.author?.nickname || m.author?.name || m.author || "?"}: ${m.content || m.text || ""}`,
      )
      .filter((s) => s.length > 6);
    const channel = j.channel?.name || basename(f, ".json");
    const ref = relative(project.root, f).replace(/\\/g, "/");
    for (const ch of chunk(msgs.join("\n"), project.chunkChars)) {
      try {
        const sys = `Extract factual claims / advice / numbers about "${project.config.topic}" from this chat log. STRICT JSON {"facts":[{"text":str,"confidence":"high|medium|low"}]}. In ${project.language}. Empty if none.${DATA_CLAUSE}`;
        const { text } = await chat(collectTier, sys, asData("CHAT LOG", ch), {
          json: true,
          maxTokens: 3500,
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
              source: { ref, title: channel },
            });
      } catch {
        /* */
      }
    }
  }
  return entries;
}
