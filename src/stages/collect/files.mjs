// FILES collector — read local files (md/txt/json) into raw entries. No LLM/network needed, so this is the
// keyless path used by the demo. Markdown is split into bullet/heading/paragraph units; structured JSON entries
// keep their fields (statement/dependsOn/affects/…) so the graph has edges even in offline mode.
import fs from "node:fs";
import { join, relative, basename } from "node:path";

// minimal glob for patterns like "raw/docs/**/*.md" (** = any dirs incl. none, * = within a segment). No braces.
function globFiles(root, pattern) {
  const abs = join(root, pattern).replace(/\\/g, "/");
  const parts = abs.split("/");
  const wildAt = parts.findIndex((p) => p.includes("*"));
  const base = wildAt < 0 ? abs : parts.slice(0, wildAt).join("/");
  const esc = abs.replace(/[.*+?^${}()|[\]\\]/g, (m) => "\\" + m); // escape ALL specials incl. *
  const src = esc
    .split("\\*\\*/")
    .join("(?:.*/)?")
    .split("\\*\\*")
    .join(".*")
    .split("\\*")
    .join("[^/]*");
  const rx = new RegExp("^" + src + "$");
  const out = [];
  const walk = (d) => {
    let ents;
    try {
      ents = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of ents) {
      const p = join(d, e.name).replace(/\\/g, "/");
      if (e.isDirectory()) walk(p);
      else if (rx.test(p)) out.push(p);
    }
  };
  if (fs.existsSync(base) && fs.statSync(base).isDirectory()) walk(base);
  else if (fs.existsSync(abs)) out.push(abs);
  return out;
}

function splitMarkdown(text) {
  const units = [];
  for (let line of text.split("\n")) {
    line = line.trim();
    const m = line.match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/);
    if (m && m[1].length > 12) units.push(m[1].replace(/\*\*/g, ""));
    else if (line.length > 40 && !line.startsWith("#") && !line.startsWith("|"))
      units.push(line.replace(/\*\*/g, ""));
  }
  return units;
}

export async function collect(project, cfg) {
  const patterns = Array.isArray(cfg.path)
    ? cfg.path
    : [cfg.path || "raw/**/*.md"];
  const entries = [];
  for (const pat of patterns) {
    for (const f of globFiles(project.root, pat)) {
      let raw;
      try {
        raw = fs.readFileSync(f, "utf-8");
      } catch {
        continue;
      }
      const ref = relative(project.root, f).replace(/\\/g, "/");
      const title = basename(f);
      if (f.endsWith(".json")) {
        try {
          const j = JSON.parse(raw);
          const arr = Array.isArray(j) ? j : j.entries || j.items || [j];
          for (const it of arr) {
            if (typeof it === "string") {
              entries.push({ text: it, kind: "fact", source: { ref, title } });
              continue;
            }
            entries.push({
              text: it.text || it.statement || JSON.stringify(it),
              values: it.values,
              formula: it.formula,
              dependsOn: it.dependsOn,
              affects: it.affects,
              breakpoints: it.breakpoints,
              hidden: it.hidden,
              domain: it.domain,
              confidence: it.confidence,
              kind: it.kind || "fact",
              source: it.source || { ref, title },
            });
          }
        } catch {
          /* */
        }
      } else {
        for (const u of splitMarkdown(raw))
          entries.push({ text: u, kind: "fact", source: { ref, title } });
      }
    }
  }
  return entries;
}
