// BUILD-GRAPH — a self-contained 3D viewer of the knowledge dependency graph. Domain hubs are nuclei; entities
// orbit them like electrons on RANDOM 3D orbital planes, flying in space. Rotate the whole scene freely (drag),
// zoom (scroll). three.js via 3d-force-graph is inlined for offline use. Opens in any browser.
import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { esc } from "../lib/schema.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

export async function run(project) {
  const byDomain = project.readOut("facts.json", {});
  const verified = project.readOut("verified.json", { items: [] }).items || [];
  const statusOf = new Map(
    verified.map((v) => [`${v.domain}|${v.statement}`, v.status]),
  );
  const all = Object.entries(byDomain).flatMap(([domain, arr]) =>
    arr.map((m) => ({ ...m, domain })),
  );
  if (!all.length) {
    project.log("graph: run merge first");
    return;
  }
  const DOMAINS = project.domains;
  const isEntity = (s) =>
    s && typeof s === "string" && s.length <= 40 && !/[.]{2,}/.test(s);
  const norm = (s) => s.trim().toLowerCase().replace(/\s+/g, " ");

  const nodes = new Map(),
    addN = (id, name, domain, kind) => {
      if (!nodes.has(id))
        nodes.set(id, { id, name, domain, kind, deg: 0, facts: [] });
      return nodes.get(id);
    };
  for (const d of DOMAINS) addN(`dom:${d}`, d, d, "domain");
  const links = new Map(),
    addL = (a, b, hidden) => {
      if (a === b) return;
      const k = a < b ? `${a}~${b}` : `${b}~${a}`;
      const e = links.get(k) || { source: a, target: b, hidden: false };
      if (hidden) e.hidden = true;
      links.set(k, e);
    };
  const entDom = new Map();
  for (const m of all)
    for (const e of [
      ...new Set(
        [...(m.dependsOn || []), ...(m.affects || [])].filter(isEntity),
      ),
    ])
      if (!entDom.has(norm(e))) entDom.set(norm(e), m.domain);
  for (const m of all) {
    const deps = (m.dependsOn || []).filter(isEntity),
      affs = (m.affects || []).filter(isEntity);
    const rec = {
      statement: m.statement,
      status: statusOf.get(`${m.domain}|${m.statement}`) || m.confidence,
      hidden: !!m.hidden,
      breakpoints: m.breakpoints || [],
    };
    for (const e of [...new Set([...deps, ...affs])]) {
      const n = addN(
        `ent:${norm(e)}`,
        e,
        entDom.get(norm(e)) || m.domain,
        "entity",
      );
      if (n.facts.length < 12) n.facts.push(rec);
      addL(`ent:${norm(e)}`, `dom:${m.domain}`, false);
    }
    for (const dep of deps) {
      if (affs.length)
        for (const a of affs)
          addL(`ent:${norm(dep)}`, `ent:${norm(a)}`, m.hidden);
      else addL(`ent:${norm(dep)}`, `dom:${m.domain}`, m.hidden);
    }
  }
  const linkArr = [...links.values()];
  for (const e of linkArr) {
    nodes.get(e.source).deg++;
    nodes.get(e.target).deg++;
  }
  const nodeArr = [...nodes.values()].filter(
    (n) => n.kind === "domain" || n.deg > 0,
  );
  const ids = new Set(nodeArr.map((n) => n.id));
  const DATA = {
    nodes: nodeArr,
    links: linkArr.filter((e) => ids.has(e.source) && ids.has(e.target)),
  };
  const THREE = fs.readFileSync(
    join(HERE, "..", "templates", "graph", "_three.js"),
    "utf-8",
  ); // sets window.THREE
  const FG = fs.readFileSync(
    join(HERE, "..", "templates", "graph", "_3dfg.js"),
    "utf-8",
  ); // uses window.THREE if present
  const PAL = [
    "#f778ba",
    "#3fb950",
    "#a371f7",
    "#f85149",
    "#d29922",
    "#39c5cf",
    "#db6d28",
    "#9aa4b0",
    "#58a6ff",
    "#e3b341",
    "#bc8cff",
    "#7ee787",
  ];
  const colors = {};
  DOMAINS.forEach((d, i) => (colors[d] = PAL[i % PAL.length]));

  const html = `<title>${esc(project.config.topic)} — 3D Knowledge Graph</title>
<style>:root{--panel:#0b1020f5;--line:#233;--txt:#c9d1d9;--dim:#8b949e}*{box-sizing:border-box}html,body{margin:0;height:100%;background:#05070d;color:var(--txt);font:13px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;overflow:hidden}#graph{position:fixed;inset:0}#side{position:fixed;top:0;right:0;width:330px;height:100vh;background:var(--panel);backdrop-filter:blur(8px);border-left:1px solid var(--line);padding:14px 16px;overflow:auto}#side h1{font-size:15px;margin:0 0 2px}.sub{color:var(--dim);font-size:11px;margin-bottom:12px}.leg{display:flex;flex-wrap:wrap;gap:6px 10px;margin:8px 0 12px}.leg span{display:flex;align-items:center;gap:5px;cursor:pointer;font-size:11px;color:var(--dim)}.leg span.off{opacity:.32;text-decoration:line-through}.dot{width:9px;height:9px;border-radius:50%;box-shadow:0 0 6px currentColor}#search{width:100%;background:#0d1117;border:1px solid var(--line);color:var(--txt);border-radius:6px;padding:7px 9px;margin-bottom:10px}.row{font-size:11px;color:var(--dim);margin:6px 0}#detail{border-top:1px solid var(--line);margin-top:12px;padding-top:12px}#detail h2{font-size:14px;margin:0 0 2px;word-break:break-word}.fct{border-left:2px solid var(--line);padding:4px 0 4px 9px;margin:8px 0}.st{font-size:10px;font-weight:700}.TRUTH,.high{color:#3fb950}.PLAUSIBLE{color:#58a6ff}.CONTRADICTED{color:#f85149}.NEEDS-VERIFICATION,.medium,.low{color:#d29922}.hint{color:var(--dim);font-size:11px}</style>
<div id=graph></div><div id=side><h1>${esc(project.config.topic)}</h1><div class=sub>${nodeArr.filter((n) => n.kind === "entity").length} entities · ${DOMAINS.length} domains · ${DATA.links.length} edges · ${all.length} facts</div><input id=search placeholder="Search…"><div class=leg id=legend></div><div class=row><label><input type=checkbox id=hidden checked> hidden-dependency edges</label> <label style="margin-left:8px"><input type=checkbox id=spin> auto-rotate</label></div><div class=hint>drag = orbit camera · scroll = zoom · click node = focus + facts</div><div id=detail><div class=hint>Click a node for its facts.</div></div></div>
<script>${THREE}</script>
<script>/* Timer is an addon not in core three UMD; 3d-force-graph needs it. Minimal shim. */
if(window.THREE&&!window.THREE.Timer){window.THREE.Timer=class{constructor(){this._p=0;this._d=0;this._e=0;this._s=1}connect(){return this}disconnect(){return this}dispose(){return this}setTimescale(s){this._s=s;return this}reset(){this._p=0;return this}getDelta(){return this._d}getElapsed(){return this._e}update(ts){const t=ts!=null?ts:performance.now();if(!this._p)this._p=t;this._d=Math.min(0.1,(t-this._p)/1000)*this._s;this._e+=this._d;this._p=t;return this}}}</script>
<script>${FG}</script>
<script>
const DATA=${JSON.stringify(DATA)},COLORS=${JSON.stringify(colors)};
const byId=new Map(DATA.nodes.map(n=>[n.id,n]));let off=new Set(),showHidden=true,sel=null;
const esc=s=>(s||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const dom=n=>typeof n==='object'?n.domain:(byId.get(n)||{}).domain;const vis=n=>!off.has(dom(n));
const el=document.getElementById('graph');const T=window.THREE,DK=Object.keys(COLORS);
// Each domain's electrons get a distinct MATERIAL style: 0 glow · 1 metallic · 2 foggy-with-sharp-edge · 3 crystal · 4 energy-wire · 5 matte-rim.
function makeNode(n){ if(!T) return undefined; const c=new T.Color(COLORS[n.domain]||'#8899aa'); const g=new T.Group();
 if(n.kind==='domain'){ g.add(new T.Mesh(new T.SphereGeometry(9,22,22),new T.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:0.9,roughness:0.4,metalness:0.2}))); g.add(new T.Mesh(new T.SphereGeometry(16,16,16),new T.MeshBasicMaterial({color:c,transparent:true,opacity:0.11,depthWrite:false}))); return g; }
 const r=2.2+Math.sqrt(n.deg||1)*1.1, s=DK.indexOf(n.domain)%6;
 if(s===0){ g.add(new T.Mesh(new T.SphereGeometry(r,16,16),new T.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:1.1,roughness:0.5}))); g.add(new T.Mesh(new T.SphereGeometry(r*1.9,12,12),new T.MeshBasicMaterial({color:c,transparent:true,opacity:0.14,depthWrite:false}))); }
 else if(s===1){ g.add(new T.Mesh(new T.SphereGeometry(r,22,22),new T.MeshStandardMaterial({color:c,metalness:0.95,roughness:0.15}))); }
 else if(s===2){ g.add(new T.Mesh(new T.SphereGeometry(r*0.55,14,14),new T.MeshStandardMaterial({color:c,roughness:0.6}))); g.add(new T.Mesh(new T.SphereGeometry(r,18,18),new T.MeshStandardMaterial({color:c,transparent:true,opacity:0.4,roughness:0.95}))); }
 else if(s===3){ g.add(new T.Mesh(new T.IcosahedronGeometry(r,0),new T.MeshStandardMaterial({color:c,roughness:0.08,metalness:0.15,transparent:true,opacity:0.72,flatShading:true}))); }
 else if(s===4){ g.add(new T.Mesh(new T.SphereGeometry(r*0.7,14,14),new T.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:1.3,roughness:0.3}))); g.add(new T.Mesh(new T.IcosahedronGeometry(r*1.35,1),new T.MeshBasicMaterial({color:c,wireframe:true,transparent:true,opacity:0.35}))); }
 else { g.add(new T.Mesh(new T.SphereGeometry(r,18,18),new T.MeshStandardMaterial({color:c,roughness:0.85}))); g.add(new T.Mesh(new T.SphereGeometry(r*1.15,16,16),new T.MeshBasicMaterial({color:c,transparent:true,opacity:0.1,depthWrite:false}))); }
 return g; }
const G=ForceGraph3D()(el).graphData(DATA).nodeId('id').backgroundColor('#05070d')
 .nodeThreeObject(makeNode).nodeThreeObjectExtend(false).nodeVal(n=>n.kind==='domain'?60:1+n.deg/4)
 .nodeLabel(n=>esc(n.name)+(n.kind==='entity'?' ('+n.deg+')':' [domain]'))
 .nodeVisibility(vis).linkVisibility(l=>(showHidden||!l.hidden)&&vis(l.source)&&vis(l.target))
 .linkColor(l=>l.hidden?'rgba(230,175,60,0.55)':'rgba(130,150,180,0.22)').linkOpacity(0.32).linkWidth(l=>l.hidden?0.6:0.2)
 .linkDirectionalParticles(l=>l.hidden?2:0).linkDirectionalParticleWidth(1.3).linkDirectionalParticleSpeed(0.006)
 .onNodeClick(n=>{sel=n;detail(n);const r=Math.hypot(n.x,n.y,n.z)||1,k=1+180/r;G.cameraPosition({x:n.x*k,y:n.y*k,z:n.z*k},n,900)})
 .onNodeDragEnd(n=>{if(n.kind==='domain'){n.fx=n.x;n.fy=n.y;n.fz=n.z;return}n.fx=null;n.fy=null;n.fz=null});
// frame the whole graph after the force layout cools, and again once electrons settle into orbit
setTimeout(()=>G.zoomToFit(1200,110),3800);setTimeout(()=>G.zoomToFit(1400,110),9800);
// domain nuclei repel each other (spread apart) but a gentle center-pull keeps the whole atom bounded so no
// weakly-linked domain drifts off alone; electrons stay tight on short links to their nucleus.
G.d3Force('charge').strength(n=>n.kind==='domain'?-780:-22);
G.d3Force('domCenter',()=>{for(const n of DATA.nodes){if(n.kind!=='domain')continue;n.vx-=n.x*0.02;n.vy-=n.y*0.02;n.vz-=(n.z||0)*0.02}});
G.d3Force('link').distance(l=>((l.source&&l.source.kind==='domain')||(l.target&&l.target.kind==='domain'))?44:60).strength(l=>((l.source&&l.source.kind==='domain')||(l.target&&l.target.kind==='domain'))?0.9:0.15);
// electrons on RANDOM 3D orbital planes around their domain nucleus
let homed=false;const SPRING=.05;
G.d3Force('interact',()=>{if(!homed)return;for(const n of DATA.nodes){if(n.kind==='domain'||!n.par)continue;n.oa+=n.os;const c=Math.cos(n.oa),s=Math.sin(n.oa);const tx=n.par.x+(c*n.ux+s*n.wx)*n.or,ty=n.par.y+(c*n.uy+s*n.wy)*n.or,tz=n.par.z+(c*n.uz+s*n.wz)*n.or;n.vx+=(tx-n.x)*SPRING;n.vy+=(ty-n.y)*SPRING;n.vz+=(tz-(n.z||0))*SPRING}});
setTimeout(()=>{for(const n of DATA.nodes){if(n.kind==='domain'){n.fx=n.x;n.fy=n.y;n.fz=n.z;continue}const p=byId.get('dom:'+n.domain);if(!p)continue;n.par=p;let dx=n.x-p.x,dy=n.y-p.y,dz=(n.z||0)-(p.z||0);n.or=Math.min(Math.hypot(dx,dy,dz)||40,58);let ul=Math.hypot(dx,dy,dz)||n.or;let ux=dx/ul,uy=dy/ul,uz=dz/ul;let rx=Math.random()-.5,ry=Math.random()-.5,rz=Math.random()-.5;let wx=uy*rz-uz*ry,wy=uz*rx-ux*rz,wz=ux*ry-uy*rx;let wl=Math.hypot(wx,wy,wz)||1;n.ux=ux;n.uy=uy;n.uz=uz;n.wx=wx/wl;n.wy=wy/wl;n.wz=wz/wl;n.oa=0;n.os=(.0015+Math.random()*.0035)*(Math.random()<.5?1:-1)}homed=true},9000);
// controls
let spin=false;document.getElementById('spin').onchange=e=>{spin=e.target.checked};
(function rot(){if(spin){const c=G.cameraPosition();const a=Math.atan2(c.z,c.x)+0.0016,r=Math.hypot(c.x,c.z);G.cameraPosition({x:Math.cos(a)*r,z:Math.sin(a)*r,y:c.y})}requestAnimationFrame(rot)})();
const legend=document.getElementById('legend');for(const d of Object.keys(COLORS)){const e=document.createElement('span');e.innerHTML='<i class=dot style="color:'+COLORS[d]+';background:'+COLORS[d]+'"></i>'+d;e.onclick=()=>{off.has(d)?off.delete(d):off.add(d);e.classList.toggle('off');G.nodeVisibility(vis).linkVisibility(G.linkVisibility())};legend.appendChild(e)}
document.getElementById('hidden').onchange=e=>{showHidden=e.target.checked;G.linkVisibility(G.linkVisibility())};
document.getElementById('search').oninput=e=>{const q=e.target.value.trim().toLowerCase();if(!q)return;const n=DATA.nodes.find(x=>x.name.toLowerCase().includes(q));if(n&&n.x!=null){sel=n;detail(n);const r=Math.hypot(n.x,n.y,n.z)||1,k=1+180/r;G.cameraPosition({x:n.x*k,y:n.y*k,z:n.z*k},n,700)}};
function detail(n){const d=document.getElementById('detail');if(n.kind==='domain'){d.innerHTML='<h2>'+esc(n.name)+'</h2><div class=sub>domain nucleus · '+n.deg+' connections</div>';return}let h='<h2>'+esc(n.name)+'</h2><div class=sub>'+esc(n.domain)+' · degree '+n.deg+' · '+n.facts.length+' fact(s)</div>';for(const m of n.facts){const st=(m.status||'').toString();h+='<div class=fct><div class="st '+st+'">'+st+(m.hidden?' · hidden':'')+'</div>'+esc(m.statement)+((m.breakpoints&&m.breakpoints.length)?'<div class=hint>'+esc(m.breakpoints.join(' · '))+'</div>':'')+'</div>'}d.innerHTML=h}
</script>`;
  project.writeOut("graph.html", html);
  project.log(
    `graph (3D): ${nodeArr.length} nodes, ${DATA.links.length} edges → graph.html (open in a browser)`,
  );
}
