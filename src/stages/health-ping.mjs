// HEALTH-PING — periodically checks the running answering-AI: fires the config's canary questions, verifies each
// returns a non-trivial, on-topic answer, and reports drift. `--once` runs a single check; otherwise it loops on
// config.healthPing.intervalMinutes. Meant to be wired to cron / Task Scheduler, or run with --once from a monitor.
import { loadCorpus, answer } from "./serve.mjs";

async function check(project, corpus) {
  const canaries = project.config.healthPing?.canaries || [];
  if (!canaries.length) { project.log("health-ping: no canaries configured"); return { ok: true, results: [] }; }
  const results = [];
  for (const q of canaries) {
    let text = "", ok = false;
    try { text = await answer(project, corpus, q); ok = text && text.length > 20 && !/no relevant facts/i.test(text); } catch (e) { text = "ERROR: " + e.message; }
    results.push({ q, ok, preview: (text || "").slice(0, 120) });
    project.log(`  ${ok ? "✅" : "⚠️"} "${q.slice(0, 50)}" → ${(text || "").slice(0, 70)}`);
  }
  const ok = results.every((r) => r.ok);
  project.writeOut("health-last.json", { at: new Date().toISOString(), ok, results });
  return { ok, results };
}

export async function run(project, { flags } = { flags: new Set() }) {
  const corpus = loadCorpus(project);
  const once = flags?.has("--once");
  const interval = (project.config.healthPing?.intervalMinutes || 1440) * 60000;
  const tick = async () => { const r = await check(project, corpus); project.log(`health-ping: ${r.ok ? "healthy ✅" : "DEGRADED ⚠️"}`); return r; };
  if (once) { await tick(); return; }
  await tick();
  setInterval(tick, interval);
  project.log(`health-ping: looping every ${interval / 60000} min (ctrl-c to stop)`);
}
