// YOUTUBE / media collector — pull transcripts (captions via yt-dlp; whisper fallback if you wire it) and extract
// facts. Needs yt-dlp on PATH. Config: { ids:[], channels:[], ytdlp?:"yt-dlp" }.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { chat } from "../../lib/llm.mjs";
import { chunk } from "../../lib/waves.mjs";

export async function collect(project, cfg) {
  const YT = cfg.ytdlp || "yt-dlp";
  try {
    execFileSync(YT, ["--version"], { stdio: "ignore" });
  } catch {
    project.log("    youtube: yt-dlp not found on PATH — skipping");
    return [];
  }
  const tmp = join(project.outDir, "_yt");
  fs.mkdirSync(tmp, { recursive: true });
  const ids = [...(cfg.ids || [])];
  for (const chn of cfg.channels || []) {
    try {
      const out = execFileSync(YT, ["--flat-playlist", "--print", "id", chn], {
        encoding: "utf-8",
        timeout: 60000,
      });
      ids.push(
        ...out
          .trim()
          .split("\n")
          .filter(Boolean)
          .slice(0, cfg.maxPerChannel || 10),
      );
    } catch {
      /* */
    }
  }
  const collectTier = project.tier("collect");
  const entries = [];
  for (const id of ids) {
    let text = "";
    try {
      execFileSync(
        YT,
        [
          "--write-auto-sub",
          "--sub-langs",
          project.language + ",en",
          "--sub-format",
          "json3",
          "--skip-download",
          "-o",
          join(tmp, "%(id)s.%(ext)s"),
          "--", // ids are data, never option flags
          id,
        ],
        { stdio: "ignore", timeout: 120000 },
      );
      for (const lang of [project.language, "en"]) {
        const f = join(tmp, `${id}.${lang}.json3`);
        if (fs.existsSync(f)) {
          const j = JSON.parse(fs.readFileSync(f, "utf-8"));
          text = (j.events || [])
            .filter((e) => e.segs)
            .map((e) => e.segs.map((s) => s.utf8).join(""))
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
          break;
        }
      }
    } catch {
      /* */
    }
    if (text.length < 500) continue;
    for (const ch of chunk(text, project.chunkChars)) {
      try {
        const sys = `Extract factual claims / mechanisms / numbers about "${project.config.topic}" from this video transcript fragment. STRICT JSON {"facts":[{"text":str,"confidence":"high|medium|low"}]}. In ${project.language}.`;
        const { text: out } = await chat(collectTier, sys, ch, {
          json: true,
          maxTokens: 3500,
        });
        let d;
        try {
          d = JSON.parse(out);
        } catch {
          const m = out.match(/\{[\s\S]*\}/);
          d = m ? JSON.parse(m[0]) : { facts: [] };
        }
        for (const x of d.facts || [])
          if (x.text)
            entries.push({
              text: x.text,
              confidence: x.confidence || "medium",
              kind: "fact",
              source: { ref: `https://youtu.be/${id}`, title: id },
            });
      } catch {
        /* */
      }
    }
  }
  return entries;
}
