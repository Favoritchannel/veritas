// INTERVIEW collector (lite) — capture expert knowledge from interview/meeting transcripts, ATTRIBUTED per expert.
// Accepts .md/.txt with "Speaker: text" / "**Speaker:** text" lines, or JSON {participants?, turns:[{speaker,text}]}.
// The expert's name is carried in source.ref ("interview:<Name>") so it survives consolidate/synthesize and shows
// up in CONFLICTS.md as "Maria vs Jonas". With a collect key: facts are extracted per speaker (attribution can't
// leak across experts). Keyless: each substantial turn becomes a medium-confidence entry, deterministically.
import fs from "node:fs";
import { join, relative, basename } from "node:path";
import { chat, asData, DATA_CLAUSE } from "../../lib/llm.mjs";
import { withinRoot } from "../../lib/guard.mjs";
import { chunk } from "../../lib/waves.mjs";

function files(root, pat, exts) {
  const abs = join(root, pat);
  const dir = abs.replace(/[\\/][^\\/]*\*.*$/, "");
  let out;
  if (fs.existsSync(abs) && fs.statSync(abs).isFile?.()) out = [abs];
  else
    try {
      out = fs
        .readdirSync(dir)
        .filter((f) => exts.some((e) => f.endsWith(e)))
        .map((f) => join(dir, f));
    } catch {
      out = [];
    }
  return out.filter((p) => withinRoot(root, p)); // reject ../ escapes from cfg.path
}

/** Parse a transcript into [{speaker, text}] turns. Exported for tests. */
export function parseTranscript(raw, name = "") {
  if (name.endsWith(".json") || /^\s*[[{]/.test(raw)) {
    try {
      const j = JSON.parse(raw);
      const turns = j.turns || (Array.isArray(j) ? j : []);
      return turns
        .map((t) => ({
          speaker: String(t.speaker || t.author || "?").trim(),
          text: String(t.text || t.content || "").trim(),
        }))
        .filter((t) => t.speaker && t.text);
    } catch {
      return [];
    }
  }
  const turns = [];
  let cur = null;
  for (const line of raw.split("\n")) {
    // "**Maria Rossi:** text" | "Maria Rossi: text" — speaker = 1-4 capitalized-ish words before the colon
    const m = line.match(/^\s*(?:\*\*)?([^:*\n]{2,40}?)(?:\*\*)?:\s+(.*)$/);
    const speaker = m && m[1].trim();
    if (
      speaker &&
      /^[^\d]/.test(speaker) &&
      speaker.split(/\s+/).length <= 4 &&
      m[2].trim()
    ) {
      cur = { speaker, text: m[2].trim() };
      turns.push(cur);
    } else if (cur && line.trim() && !/^#/.test(line.trim())) {
      cur.text += " " + line.trim(); // continuation line of the same turn
    }
  }
  return turns;
}

export async function collect(project, cfg) {
  let tier;
  try {
    tier = project.tier("collect");
    if (!process.env[tier.keyEnv]) tier = null;
  } catch {
    tier = null;
  }
  const entries = [];
  for (const f of files(project.root, cfg.path || "raw/interviews/*", [
    ".md",
    ".txt",
    ".json",
  ])) {
    let raw;
    try {
      raw = fs.readFileSync(f, "utf-8");
    } catch {
      continue;
    }
    const turns = parseTranscript(raw, f);
    if (!turns.length) {
      project.log(
        `  interview: no speaker turns found in ${basename(f)} — expected "Speaker: text" lines`,
      );
      continue;
    }
    const title = relative(project.root, f).replace(/\\/g, "/");
    const bySpeaker = Object.create(null); // null proto: a "__proto__" speaker must not crash the collector
    for (const t of turns) (bySpeaker[t.speaker] ||= []).push(t.text);

    for (const [speaker, texts] of Object.entries(bySpeaker)) {
      const src = { ref: `interview:${speaker}`, title, expert: speaker };
      if (!tier) {
        // keyless: deterministic pass-through — substantial turns become medium-confidence entries
        for (const text of texts)
          if (text.length > 25)
            entries.push({
              text,
              confidence: "medium",
              kind: "fact",
              domain: cfg.domain,
              source: src,
            });
        continue;
      }
      for (const ch of chunk(texts.join("\n"), project.chunkChars)) {
        try {
          const sys = `Extract this expert's factual claims / recommendations / numbers about "${project.config.topic}". Keep each claim self-contained. Tag a domain from: ${project.domains.join(", ")}. STRICT JSON {"facts":[{"text":str,"domain":str,"confidence":"high|medium|low"}]}. In ${project.language}. Empty if none.${DATA_CLAUSE}`;
          const { text } = await chat(
            tier,
            sys,
            asData(`STATEMENTS BY ${speaker}`, ch),
            { json: true, maxTokens: 3500 },
          );
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
                domain: x.domain || cfg.domain,
                source: src,
              });
        } catch {
          /* degrade per-chunk */
        }
      }
    }
  }
  return entries;
}
