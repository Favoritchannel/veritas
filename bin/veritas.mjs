#!/usr/bin/env node
// Veritas KB CLI — orchestrates the pipeline.
//   veritas run --auto <config.json>     # full autonomous build (collect → … → audit)
//   veritas <stage> <config.json>        # run one stage (collect|consolidate|synthesize|merge|verify|discover|rag-pack|graph|serve|audit|health-ping)
//   veritas guide                        # print the guided setup walkthrough
//   veritas --help
import { loadProject } from "../src/lib/project.mjs";
import packageJson from "../package.json" with { type: "json" };

const STAGES = [
  "collect",
  "consolidate",
  "synthesize",
  "merge",
  "verify",
  "discover",
  "rag-pack",
  "graph",
  "serve",
  "audit",
  "health-ping",
];
const AUTO_ORDER = [
  "collect",
  "consolidate",
  "synthesize",
  "merge",
  "verify",
  "discover",
  "rag-pack",
  "graph",
  "audit",
];
const MODULE = {
  collect: "collect/index",
  graph: "build-graph",
  "rag-pack": "rag-pack",
  "health-ping": "health-ping",
};
const modPath = (s) => `../src/stages/${MODULE[s] || s}.mjs`;

const argv = process.argv.slice(2);
const cmd = argv[0];
const rest = argv.slice(1);
const flags = new Set(rest.filter((a) => a.startsWith("--")));
const positional = rest.filter((a) => !a.startsWith("--"));

function banner() {
  console.log("\n  Veritas KB — verified knowledge base + answering AI\n");
}

async function runStage(stage, project) {
  const mod = await import(modPath(stage));
  if (typeof mod.run !== "function")
    throw new Error(`stage '${stage}' has no run()`);
  project.log(`▶ stage: ${stage}`);
  return mod.run(project, { flags, positional });
}

async function main() {
  if (cmd === "--version" || cmd === "-v") {
    console.log(packageJson.version);
    return;
  }
  if (!cmd || cmd === "--help" || cmd === "-h") {
    banner();
    console.log("  veritas run --auto <config.json>    full autonomous build");
    console.log(
      "  veritas guide                       guided setup walkthrough",
    );
    console.log(
      `  veritas <stage> <config.json>       one stage: ${STAGES.join(" | ")}`,
    );
    console.log("");
    return;
  }
  if (cmd === "guide") {
    const { guide } = await import("../src/stages/guide.mjs");
    return guide(positional[0]);
  }

  if (cmd === "run") {
    const cfg = positional[0];
    if (!cfg) {
      console.error("usage: veritas run --auto <config.json>");
      process.exit(1);
    }
    banner();
    const project = loadProject(cfg);
    project.log(
      `=== veritas run: "${project.config.topic}" → ${project.outDir} ===`,
    );
    for (const stage of AUTO_ORDER) {
      try {
        await runStage(stage, project);
      } catch (e) {
        project.log(`✗ ${stage} failed: ${e.message}`);
        if (stage === "audit") break;
        if (!flags.has("--keep-going")) {
          console.error(
            `\nStopped at '${stage}'. Fix + re-run this stage, or pass --keep-going.`,
          );
          process.exit(1);
        }
      }
    }
    project.log(
      "=== veritas run complete — see the audit report in the out dir ===",
    );
    return;
  }

  if (STAGES.includes(cmd)) {
    const cfg = positional[0];
    if (!cfg) {
      console.error(`usage: veritas ${cmd} <config.json>`);
      process.exit(1);
    }
    const project = loadProject(cfg);
    await runStage(cmd, project);
    return;
  }

  console.error(`unknown command '${cmd}'. Try: veritas --help`);
  process.exit(1);
}

main().catch((e) => {
  console.error("veritas error:", e.message);
  process.exit(1);
});
