// GITHUB collector — pull text files (docs/code) from a repo via the GitHub API and extract facts. Config:
// { repo: "owner/name", branch?: "main", include?: "\\.(md|txt|ts|py)$", max?: 40, keyEnv?: "GITHUB_TOKEN" }.
import { chat, asData, DATA_CLAUSE } from "../../lib/llm.mjs";
import { safeFetch } from "../../lib/guard.mjs";
import { chunk } from "../../lib/waves.mjs";

export async function collect(project, cfg) {
  const repo = cfg.repo;
  if (!repo) return [];
  const enc = (s) => String(s).split("/").map(encodeURIComponent).join("/");
  const branch = cfg.branch || "main";
  const inc = new RegExp(cfg.include || "\\.(md|markdown|txt|rst)$", "i");
  const max = cfg.max || 40;
  const headers = { "user-agent": "veritas" };
  const tok = cfg.keyEnv && process.env[cfg.keyEnv];
  if (tok) headers.authorization = `Bearer ${tok}`;
  const api = async (u) => {
    const r = await safeFetch(`https://api.github.com${u}`, {
      headers,
      signal: AbortSignal.timeout(30000),
    });
    return r.ok ? r.json() : null;
  };
  const tree = await api(
    `/repos/${enc(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
  ).catch(() => null);
  if (!tree?.tree) {
    project.log(`    github ${repo}: could not list tree`);
    return [];
  }
  const paths = tree.tree
    .filter((t) => t.type === "blob" && inc.test(t.path))
    .slice(0, max);
  const collectTier = project.tier("collect");
  const entries = [];
  for (const p of paths) {
    let text;
    try {
      const r = await safeFetch(
        `https://raw.githubusercontent.com/${enc(repo)}/${encodeURIComponent(branch)}/${enc(p.path)}`,
        { headers, signal: AbortSignal.timeout(20000) },
      );
      text = await r.text();
    } catch {
      continue;
    }
    for (const ch of chunk(text, project.chunkChars)) {
      try {
        const sys = `Extract factual claims / rules / numbers about "${project.config.topic}" from this repo file. STRICT JSON {"facts":[{"text":str,"confidence":"high|medium|low"}]}. In ${project.language}.${DATA_CLAUSE}`;
        const { text: out } = await chat(
          collectTier,
          sys,
          asData("REPO FILE", ch),
          {
            json: true,
            maxTokens: 3000,
          },
        );
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
              source: { ref: `${repo}/${p.path}`, title: p.path },
            });
      } catch {
        /* */
      }
    }
  }
  return entries;
}
