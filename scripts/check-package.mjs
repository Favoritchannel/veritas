import { spawnSync } from "node:child_process";

const npmCli = process.env.npm_execpath;
const command = npmCli
  ? process.execPath
  : process.platform === "win32"
    ? "npm.cmd"
    : "npm";
const args = npmCli
  ? [npmCli, "pack", "--dry-run", "--json", "--ignore-scripts"]
  : ["pack", "--dry-run", "--json", "--ignore-scripts"];
const result = spawnSync(command, args, {
  encoding: "utf8",
  env: { ...process.env, NO_COLOR: "1" },
  shell: !npmCli && process.platform === "win32",
});

if (result.status !== 0) {
  console.error(result.stderr || result.stdout || "npm pack failed");
  process.exit(1);
}

let report;
try {
  [report] = JSON.parse(result.stdout);
} catch (error) {
  console.error(`Could not parse npm pack report: ${error.message}`);
  process.exit(1);
}

const names = report.files.map((file) => file.path.replaceAll("\\", "/"));
const required = [
  "bin/veritas.mjs",
  "docs/config.schema.json",
  "examples/minimal/raw/facts.json",
  "examples/minimal/veritas.config.json",
  "LICENSE",
  "package.json",
  "README.md",
  "src/lib/project.mjs",
];
const forbidden = [
  /(^|\/)\.env$/,
  /(^|\/)node_modules\//,
  /(^|\/)out\//,
  /(^|\/)runs\//,
  /(^|\/)cache\//,
  /\.log$/,
];
const errors = [];

for (const file of required)
  if (!names.includes(file)) errors.push(`missing required file: ${file}`);
for (const file of names)
  for (const pattern of forbidden)
    if (pattern.test(file)) errors.push(`forbidden package file: ${file}`);
if (report.unpackedSize > 2_750_000)
  errors.push(`unpacked package is too large: ${report.unpackedSize} bytes`);

if (errors.length) {
  console.error(
    `Package checks failed:\n- ${[...new Set(errors)].join("\n- ")}`,
  );
  process.exit(1);
}

console.log(
  `Package contents are clean: ${names.length} files, ${report.size} byte tarball, ${report.unpackedSize} bytes unpacked.`,
);
