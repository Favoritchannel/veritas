// Load a veritas project: config + .env + resolved paths + tier accessors + a logger. Every stage takes a `project`.
import fs from "node:fs";
import { dirname, join, resolve, isAbsolute } from "node:path";
import { loadEnv } from "./llm.mjs";

export function loadProject(configPath) {
  const cfgAbs = resolve(configPath);
  if (!fs.existsSync(cfgAbs)) throw new Error(`config not found: ${cfgAbs}`);
  const root = dirname(cfgAbs);
  const config = JSON.parse(fs.readFileSync(cfgAbs, "utf-8"));
  loadEnv(root, (config.privacy && config.privacy.secretsEnv) || ".env");
  const outDir = isAbsolute(config.out || "out")
    ? config.out
    : join(root, config.out || "out");
  fs.mkdirSync(outDir, { recursive: true });
  const rawDir = join(root, "raw");

  const logFile = join(outDir, "veritas.log");
  const log = (m) => {
    const line = `[${new Date().toISOString().slice(11, 19)}] ${m}`;
    console.log(line);
    try {
      fs.appendFileSync(logFile, line + "\n");
    } catch {
      /* */
    }
  };

  const tier = (name) => {
    const t = config.compute && config.compute[name];
    if (!t) throw new Error(`compute tier '${name}' not configured`);
    // Carry the optional LLM host allow-list onto the tier so llm.chat can enforce it (exfil defense).
    return config.security?.allowedLLMHosts
      ? { ...t, allowedHosts: config.security.allowedLLMHosts }
      : t;
  };
  const outPath = (...p) => join(outDir, ...p);
  const readOut = (name, dflt) => {
    try {
      return JSON.parse(fs.readFileSync(outPath(name), "utf-8"));
    } catch {
      return dflt;
    }
  };
  const writeOut = (name, data) => {
    fs.mkdirSync(dirname(outPath(name)), { recursive: true });
    fs.writeFileSync(
      outPath(name),
      typeof data === "string" ? data : JSON.stringify(data, null, 2),
    );
  };

  return {
    config,
    root,
    outDir,
    rawDir,
    log,
    tier,
    outPath,
    readOut,
    writeOut,
    waveWidth: config.parallelism?.waves ?? 3,
    chunkChars: config.parallelism?.chunkChars ?? 12000,
    domains: config.domains || ["general"],
    language: config.language || "en",
  };
}
