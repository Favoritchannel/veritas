// PDF collector — extract text from PDFs (papers, manuals, reports) and pull facts. Optional dep: `npm i pdf-parse`.
import fs from "node:fs";
import { join, relative, basename } from "node:path";
import { chat } from "../../lib/llm.mjs";
import { chunk } from "../../lib/waves.mjs";

function pdfFiles(root, pat) { const abs = join(root, pat); const dir = abs.replace(/[\\/][^\\/]*\*.*$/, ""); try { return fs.readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".pdf")).map((f) => join(dir, f)); } catch { return fs.existsSync(abs) ? [abs] : []; } }

export async function collect(project, cfg) {
  let pdfParse; try { ({ default: pdfParse } = await import("pdf-parse")); } catch { project.log("    pdf: install `pdf-parse` to enable — skipping"); return []; }
  const collectTier = project.tier("collect");
  const entries = [];
  for (const f of pdfFiles(project.root, cfg.path || "raw/papers/*.pdf")) {
    let text = ""; try { text = (await pdfParse(fs.readFileSync(f))).text; } catch { continue; }
    const ref = relative(project.root, f).replace(/\\/g, "/");
    for (const ch of chunk(text, project.chunkChars)) {
      try {
        const sys = `Extract factual claims / findings / numbers about "${project.config.topic}" from this document fragment. STRICT JSON {"facts":[{"text":str,"confidence":"high|medium|low"}]}. In ${project.language}.`;
        const { text: out } = await chat(collectTier, sys, ch, { json: true, maxTokens: 3000 });
        let d; try { d = JSON.parse(out); } catch { const m = out.match(/\{[\s\S]*\}/); d = m ? JSON.parse(m[0]) : { facts: [] }; }
        for (const x of d.facts || []) if (x.text) entries.push({ text: x.text, confidence: x.confidence || "medium", kind: "fact", source: { ref, title: basename(f) } });
      } catch { /* */ }
    }
  }
  return entries;
}
