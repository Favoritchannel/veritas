import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const dom = new JSDOM("");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
const { default: mermaid } = await import("mermaid");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirectories = new Set([
  ".git",
  "node_modules",
  "out",
  "runs",
  "cache",
]);
const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsonc",
  ".md",
  ".mjs",
  ".txt",
  ".yaml",
  ".yml",
]);
const extensionlessTextFiles = new Set([
  ".editorconfig",
  ".env.example",
  ".gitattributes",
  ".gitignore",
  ".prettierignore",
  "CODEOWNERS",
  "LICENSE",
]);
const errors = [];

function relative(file) {
  return path.relative(root, file).replaceAll(path.sep, "/");
}

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, files);
    else files.push(absolute);
  }
  return files;
}

function isTextFile(file) {
  return (
    textExtensions.has(path.extname(file).toLowerCase()) ||
    extensionlessTextFiles.has(path.basename(file))
  );
}

function report(file, message) {
  errors.push(`${relative(file)}: ${message}`);
}

function checkRelativeLinks(file, text) {
  const linkPattern =
    /!?\[[^\]]*\]\((<[^>]+>|[^\s)]+)(?:\s+["'][^"']*["'])?\)/g;
  for (const match of text.matchAll(linkPattern)) {
    let target = match[1].replace(/^<|>$/g, "");
    if (/^(?:[a-z][a-z+.-]*:|#)/i.test(target)) continue;
    target = target.split("#", 1)[0].split("?", 1)[0];
    if (!target) continue;
    try {
      target = decodeURIComponent(target);
    } catch {
      report(file, `invalid percent-encoding in link ${match[1]}`);
      continue;
    }
    const resolved = path.resolve(path.dirname(file), target);
    if (!resolved.startsWith(root + path.sep) && resolved !== root) {
      report(file, `relative link escapes the repository: ${match[1]}`);
    } else if (!fs.existsSync(resolved)) {
      report(file, `broken relative link: ${match[1]}`);
    }
  }
}

async function checkMermaid(file, text) {
  const blocks = [...text.matchAll(/```mermaid\s*\r?\n([\s\S]*?)```/g)];
  for (const [index, block] of blocks.entries()) {
    try {
      await mermaid.parse(block[1], { suppressErrors: false });
    } catch (error) {
      report(
        file,
        `Mermaid block ${index + 1} does not parse: ${error.message}`,
      );
    }
  }
}

mermaid.initialize({ securityLevel: "strict", startOnLoad: false });

for (const file of walk(root)) {
  if (!isTextFile(file)) continue;
  const text = fs.readFileSync(file, "utf8");
  if (/\p{Script=Cyrillic}/u.test(text))
    report(
      file,
      "contains Cyrillic characters; repository content must be English",
    );
  if (text.includes("\uFFFD"))
    report(file, "contains a Unicode replacement character");
  if (/^(?:<<<<<<<|=======|>>>>>>>)(?: |$)/m.test(text))
    report(file, "contains an unresolved merge marker");
  if (path.extname(file).toLowerCase() === ".json") {
    try {
      JSON.parse(text);
    } catch (error) {
      report(file, `invalid JSON: ${error.message}`);
    }
  }
  if (path.extname(file).toLowerCase() === ".md") {
    checkRelativeLinks(file, text);
    await checkMermaid(file, text);
  }
}

if (errors.length) {
  console.error(
    `Repository checks failed (${errors.length}):\n- ${errors.join("\n- ")}`,
  );
  process.exitCode = 1;
} else {
  console.log(
    "Repository text is valid UTF-8, Cyrillic-free, linked, and Mermaid-parseable.",
  );
}

dom.window.close();
