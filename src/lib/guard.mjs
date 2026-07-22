// GUARD — security helpers shared across stages. Zero-dependency (node stdlib only).
//   assertCollector(type)          — allow-list the dynamic collector import (blocks path-traversal module loads)
//   assertWithin(root, candidate)  — keep resolved paths inside the project root (blocks ../ escapes)
//   withinRoot(root, candidate)    — boolean form, for filtering glob results
//   safeFetch(url, opts, guard)    — fetch with a private-IP/SSRF block + a response-size cap
import { resolve, sep } from "node:path";
import dns from "node:dns/promises";
import net from "node:net";

// The collector types Veritas ships. collect/index.mjs must validate source.type against this before it
// does `import(./${type}.mjs)`, otherwise a config value like "../../lib/llm" would import an arbitrary module.
export const COLLECTORS = new Set([
  "files",
  "web",
  "reddit",
  "api",
  "github",
  "database",
  "pdf",
  "youtube",
  "chat-export",
  "interview",
  "rss",
]);

export function assertCollector(type) {
  if (!COLLECTORS.has(type))
    throw new Error(`unknown/blocked collector type '${type}'`);
  return type;
}

// True iff `candidate` resolves to a path inside `root` (or is root itself).
export function withinRoot(root, candidate) {
  const r = resolve(root);
  const c = resolve(candidate);
  return c === r || c.startsWith(r + sep);
}

// Throwing form for single paths (config-supplied refs like oracle.ref).
export function assertWithin(root, candidate) {
  if (!withinRoot(root, candidate))
    throw new Error(`path escapes project root: ${candidate}`);
  return candidate;
}

// Private / link-local / loopback ranges we refuse to fetch from unless explicitly allowed. Blocking these on
// COLLECTOR fetches stops SSRF to cloud metadata (169.254.169.254) and internal services. The LLM baseURL is
// exempt (allowPrivate:true) because a local Ollama/vLLM legitimately lives at 127.0.0.1.
function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 127 || // loopback
      a === 10 || // private
      (a === 172 && b >= 16 && b <= 31) || // private
      (a === 192 && b === 168) || // private
      (a === 169 && b === 254) || // link-local (cloud metadata)
      a === 0 // "this host"
    );
  }
  const low = ip.toLowerCase();
  if (low.startsWith("::ffff:")) {
    // IPv4-mapped IPv6: judge by the embedded IPv4 address, not the prefix.
    const v4 = low.slice(7);
    return net.isIPv4(v4) ? isPrivateIp(v4) : true;
  }
  return (
    low === "::1" || // loopback
    low === "::" ||
    low.startsWith("fc") || // unique-local
    low.startsWith("fd") ||
    low.startsWith("fe80") // link-local
  );
}

// Sync, no-DNS check for a literal private/loopback host in a URL — used to filter scraped image URLs before
// they're handed to the vision provider (we don't fetch them ourselves, so a full DNS resolve isn't warranted).
export function hasPrivateHost(url) {
  let host;
  try {
    host = new URL(url).hostname.replace(/^\[|\]$/g, "");
  } catch {
    return true; // unparseable → treat as unsafe
  }
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  return net.isIP(host) ? isPrivateIp(host) : false;
}

/**
 * fetch() with two extra guarantees:
 *  - SSRF block: resolves the host and refuses private/loopback/link-local targets unless allowPrivate.
 *  - size cap: reads at most maxBytes of the body (defends against a hostile endpoint streaming forever).
 * Returns a small Response-like object with text() and json(). Never follows a redirect to a private host.
 */
export async function safeFetch(
  url,
  opts = {},
  { allowPrivate = false, maxBytes = 5_000_000 } = {},
) {
  let host;
  try {
    host = new URL(url).hostname.replace(/^\[|\]$/g, "");
  } catch {
    throw new Error(`safeFetch: invalid url ${url}`);
  }
  if (!allowPrivate) {
    const addrs = net.isIP(host)
      ? [{ address: host }]
      : await dns
          .lookup(host, { all: true })
          .catch(() => [{ address: "0.0.0.0" }]);
    for (const a of addrs)
      if (isPrivateIp(a.address))
        throw new Error(`safeFetch: blocked private/loopback host ${host}`);
  }
  const r = await fetch(url, { redirect: "manual", ...opts });
  // Manual redirect: re-run the guard on the redirect target instead of trusting fetch to follow it safely.
  if (r.status >= 300 && r.status < 400 && r.headers.get("location")) {
    const next = new URL(r.headers.get("location"), url).toString();
    return safeFetch(next, opts, { allowPrivate, maxBytes });
  }
  const buf = await r.arrayBuffer();
  const bytes = buf.byteLength > maxBytes ? buf.slice(0, maxBytes) : buf;
  const body = Buffer.from(bytes).toString("utf-8");
  return {
    ok: r.ok,
    status: r.status,
    headers: r.headers,
    text: async () => body,
    json: async () => JSON.parse(body),
  };
}
