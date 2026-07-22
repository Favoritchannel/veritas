// DATABASE collector — pull rows from a SQL database and turn them into facts. Optional drivers (install the one
// you need): better-sqlite3 (sqlite), pg (postgres), mysql2 (mysql). Config:
// { driver:"sqlite"|"postgres"|"mysql", conn:"file.db" | connStringEnv:"DB_URL", query:"SELECT ...", textColumns?:[], maxRows?:2000, llm?:false }
import { chat, asData, DATA_CLAUSE } from "../../lib/llm.mjs";
import { chunk } from "../../lib/waves.mjs";

async function rows(cfg) {
  const conn = cfg.connStringEnv ? process.env[cfg.connStringEnv] : cfg.conn;
  if (cfg.driver === "sqlite") {
    const { default: Database } = await import("better-sqlite3");
    const db = new Database(conn, { readonly: true });
    const r = db.prepare(cfg.query).all();
    db.close();
    return r;
  }
  if (cfg.driver === "postgres") {
    const { default: pg } = await import("pg");
    const c = new pg.Client({ connectionString: conn });
    await c.connect();
    const r = await c.query(cfg.query);
    await c.end();
    return r.rows;
  }
  if (cfg.driver === "mysql") {
    const mysql = await import("mysql2/promise");
    const c = await mysql.createConnection(conn);
    const [r] = await c.query(cfg.query);
    await c.end();
    return r;
  }
  throw new Error(`unknown driver '${cfg.driver}'`);
}

export async function collect(project, cfg) {
  let data;
  try {
    data = (await rows(cfg)).slice(0, cfg.maxRows || 2000);
  } catch (e) {
    project.log(
      `    database (${cfg.driver}): ${String(e.message).slice(0, 120)} — is the driver installed?`,
    );
    return [];
  }
  const asText = (row) =>
    cfg.textColumns?.length
      ? cfg.textColumns
          .map((c) => row[c])
          .filter(Boolean)
          .join(" — ")
      : Object.entries(row)
          .map(([k, v]) => `${k}: ${v}`)
          .join("; ");
  // Direct-to-facts (no LLM) unless cfg.llm — each row is already structured.
  if (!cfg.llm)
    return data.map((r) => ({
      text: asText(r),
      confidence: "high",
      kind: "record",
      source: {
        ref: cfg.title || cfg.driver,
        title: cfg.title || `${cfg.driver} query`,
      },
    }));
  const collectTier = project.tier("collect");
  const entries = [];
  for (const ch of chunk(data.map(asText).join("\n"), project.chunkChars)) {
    try {
      const sys = `Extract factual claims / numbers about "${project.config.topic}" from these database rows. STRICT JSON {"facts":[{"text":str,"confidence":"high|medium|low"}]}. In ${project.language}.${DATA_CLAUSE}`;
      const { text } = await chat(
        collectTier,
        sys,
        asData("DATABASE ROWS", ch),
        {
          json: true,
          maxTokens: 3000,
        },
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
            source: {
              ref: cfg.title || cfg.driver,
              title: cfg.title || cfg.driver,
            },
          });
    } catch {
      /* */
    }
  }
  return entries;
}
