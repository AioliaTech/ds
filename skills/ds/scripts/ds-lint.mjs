#!/usr/bin/env node
// ds-lint: confere arquivos de front contra o DESIGN.md do projeto e expõe o documento pro agente.
// Uso:
//   node ds-lint.mjs [--design caminho/DESIGN.md] <arquivos ou pastas>   lint do código (sem arquivos: só o documento)
//   node ds-lint.mjs --catalog [--json]                                   catálogo, blocos, receitas e fichas em texto denso
//   node ds-lint.mjs --search <termo> [--json]                            "tenho peça pra X?"
//   node ds-lint.mjs --doctor                                             saúde do projeto: documento, catálogo, CLAUDE.md
//   node ds-lint.mjs --init                                               grava o bloco da skill no CLAUDE.md da app (idempotente)
//   node ds-lint.mjs --self-test
// Sai com 1 quando há erro. Desligar uma linha: comentário `ds-lint-disable-next-line`;
// um arquivo inteiro: `ds-lint-disable-file` em qualquer lugar dele.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const EXTS = new Set([".tsx", ".jsx", ".ts", ".js", ".css", ".scss", ".vue", ".svelte", ".html"]);

// ---------- YAML mínimo (mapas, escalares, listas em bloco e em fluxo) ----------
function parseYaml(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#"));
  let i = 0;
  const indentOf = (l) => l.match(/^ */)[0].length;
  function scalar(s) {
    s = s.trim();
    if (s.startsWith("[")) return s.slice(1, -1).split(",").map((x) => scalar(x)).filter((x) => x !== "");
    if (s.startsWith("{")) {
      const o = {};
      for (const part of splitTop(s.slice(1, -1))) {
        const k = part.slice(0, part.indexOf(":")).trim();
        o[k] = scalar(part.slice(part.indexOf(":") + 1));
      }
      return o;
    }
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1);
    if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
    if (s === "true") return true;
    if (s === "false") return false;
    return s.replace(/\s+#.*$/, "");
  }
  function splitTop(s) {
    const out = [];
    let depth = 0, q = null, cur = "";
    for (const ch of s) {
      if (q) { cur += ch; if (ch === q) q = null; continue; }
      if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
      if (ch === "{" || ch === "[") depth++;
      if (ch === "}" || ch === "]") depth--;
      if (ch === "," && depth === 0) { out.push(cur); cur = ""; continue; }
      cur += ch;
    }
    if (cur.trim()) out.push(cur);
    return out;
  }
  function block(indent) {
    const isList = lines[i] && lines[i].trim().startsWith("- ");
    const out = isList ? [] : {};
    while (i < lines.length) {
      const l = lines[i];
      const ind = indentOf(l);
      if (ind < indent) break;
      if (ind > indent) { i++; continue; } // linha órfã: ignora
      const t = l.trim();
      if (isList) {
        if (!t.startsWith("- ")) break;
        const body = t.slice(2);
        if (/^[\w-]+:/.test(body) && !body.startsWith("{")) {
          lines[i] = " ".repeat(ind + 2) + body; // item que é um mapa: primeira chave na mesma linha
          out.push(block(ind + 2));
        } else { out.push(scalar(body)); i++; }
      } else {
        const m = t.match(/^([\w.-]+):\s*(.*)$/);
        if (!m) { i++; continue; }
        i++;
        if (m[2] === "") out[m[1]] = i < lines.length && indentOf(lines[i]) > ind ? block(indentOf(lines[i])) : null;
        else out[m[1]] = scalar(m[2]);
      }
    }
    return out;
  }
  return block(0);
}

// ---------- DESIGN.md ----------
function findDesign(startDir) {
  let dir = path.resolve(startDir);
  for (;;) {
    const p = path.join(dir, "DESIGN.md");
    if (fs.existsSync(p)) return p;
    const up = path.dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

function loadDesign(file) {
  const text = fs.readFileSync(file, "utf8");
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) throw new Error(`${file}: sem frontmatter YAML`);
  const meta = parseYaml(fm[1]);
  const root = path.dirname(file);
  const lint = meta.lint ?? {};
  const toList = (v) => (Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : []);
  const num = (v) => Number(String(v).replace(/px|ms/, ""));
  const abs = (list) => toList(list).map((p) => path.resolve(root, String(p)));
  return {
    file, root, text, meta,
    colors: new Set(Object.values(meta.colors ?? {}).map((c) => String(c).toLowerCase())),
    colorByValue: Object.fromEntries(Object.entries(meta.colors ?? {}).map(([k, v]) => [String(v).toLowerCase(), k])),
    spacing: new Set([0, ...toList(meta.spacing).map(num)]),
    rounded: new Set([0, ...toList(meta.rounded).map(num)]),
    tokensFiles: abs(lint.tokens_files),
    glassOnlyIn: abs(lint.glass_only_in),
    ignoreFiles: abs(lint.ignore_files),
    allowHex: new Set(toList(lint.allow_hex).map((h) => String(h).toLowerCase())),
    durations: new Set(toList(lint.durations).map(num)),
    banned: toList(lint.banned).map((b) => ({ re: new RegExp(b.pattern, "g"), message: b.message ?? `proibido: ${b.pattern}` })),
  };
}

// ---------- leitura do documento pro agente ----------
const sections = (text) => text.split(/^(?=##+\s)/m).map((s) => ({ title: s.split("\n")[0].replace(/^#+\s*/, ""), body: s }));
const findSection = (text, re) => sections(text).find((s) => re.test(s.title))?.body ?? "";
const HISTORY = /pend[êe]ncia|a decidir|hist[óo]rico|changelog|decis[õo]es|migra[çc][ãa]o/i;
function tableRows(sec) {
  const rows = sec.split("\n").filter((l) => /^\|/.test(l) && !/^\|\s*:?-+/.test(l))
    .map((l) => l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
  return rows.slice(1); // sem cabeçalho
}
function readDoc(ds) {
  const cat = tableRows(findSection(ds.text, /cat[aá]logo/i)).map(([need, use]) => ({ need, use }));
  const blocks = tableRows(findSection(ds.text, /\bblocos?\b/i)).map(([name, definedIn, madeOf, states]) => ({ name, definedIn, madeOf, states }));
  const recipes = tableRows(findSection(ds.text, /receita/i)).map(([name, stack, example]) => ({ name, stack, example }));
  const sheetsFile = path.join(ds.root, "DESIGN.components.md");
  const sheets = fs.existsSync(sheetsFile)
    ? fs.readFileSync(sheetsFile, "utf8").split(/^(?=## )/m).slice(1).map((s) => {
        const m = s.match(/^## `([^`]+)`(?:\s*\(`([^`]+)`\))?/);
        return { name: m?.[1] ?? s.split("\n")[0].replace(/^## /, ""), path: m?.[2] ?? "", body: s.trim() };
      })
    : [];
  return { cat, blocks, recipes, sheets };
}
function printCatalog(ds, doc, json) {
  if (json) { console.log(JSON.stringify({ design: ds.file, catalog: doc.cat, blocks: doc.blocks, recipes: doc.recipes, sheets: doc.sheets.map(({ name, path: p }) => ({ name, path: p })) }, null, 2)); return; }
  console.log(`DESIGN.md: ${path.relative(process.cwd(), ds.file)}\n`);
  console.log(`Catálogo (${doc.cat.length}) — reaproveitar antes de criar`);
  for (const r of doc.cat) console.log(`  ${r.need} → ${r.use}`);
  console.log(`\nBlocos (${doc.blocks.length}) — toda tela é uma pilha destes`);
  for (const b of doc.blocks) console.log(`  ${b.name} · ${b.definedIn} · ${b.madeOf} · estados: ${b.states}`);
  if (doc.recipes.length) {
    console.log(`\nReceitas (${doc.recipes.length}) — tela nova começa por uma receita`);
    for (const r of doc.recipes) console.log(`  ${r.name} → ${r.stack}${r.example ? ` · ex.: ${r.example}` : ""}`);
  }
  if (doc.sheets.length) console.log(`\nFichas (${doc.sheets.length}): ${doc.sheets.map((s) => s.name).join(", ")}\n  (--search <nome> mostra a ficha inteira)`);
  console.log(`\nPeça que não está aqui: pare e pergunte antes de criar.`);
}
function search(ds, doc, term, json) {
  const q = term.toLowerCase();
  const has = (...vals) => vals.some((v) => String(v ?? "").toLowerCase().includes(q));
  const hits = {
    catalog: doc.cat.filter((r) => has(r.need, r.use)),
    blocks: doc.blocks.filter((b) => has(b.name, b.madeOf, b.definedIn)),
    recipes: doc.recipes.filter((r) => has(r.name, r.stack)),
    sheets: doc.sheets.filter((s) => has(s.name, s.body)),
  };
  const n = Object.values(hits).reduce((a, v) => a + v.length, 0);
  if (json) { console.log(JSON.stringify({ query: term, matchCount: n, ...hits }, null, 2)); return; }
  console.log(`"${term}": ${n} resultado(s)\n`);
  for (const r of hits.catalog) console.log(`  [catálogo] ${r.need} → ${r.use}`);
  for (const b of hits.blocks) console.log(`  [bloco]    ${b.name} · ${b.definedIn} · ${b.madeOf} · estados: ${b.states}`);
  for (const r of hits.recipes) console.log(`  [receita]  ${r.name} → ${r.stack}`);
  for (const s of hits.sheets) console.log(`\n  [ficha]\n${s.body.split("\n").map((l) => "  " + l).join("\n")}`);
  if (!n) console.log(`  nada no catálogo, blocos, receitas ou fichas. Se a peça não existe: pare e pergunte antes de criar.`);
}

// ---------- documento: catálogo, seções, narração ----------
function checkDoc(ds) {
  const out = [];
  const sec = findSection(ds.text, /cat[aá]logo/i);
  if (!sec) { out.push({ file: ds.file, line: 1, rule: "doc-section", level: "error", message: "seção Catálogo não encontrada (título com a palavra Catálogo)" }); return out; }
  for (const m of sec.matchAll(/`([\w./-]+\/[\w./-]*|[\w-]+\.(?:tsx?|jsx?|css))`/g)) {
    const p = m[1];
    const ok = [path.join(ds.root, "src/components", p), path.join(ds.root, "src", p), path.join(ds.root, p)].some((c) => fs.existsSync(c));
    if (!ok) {
      const line = ds.text.slice(0, ds.text.indexOf(m[0])).split("\n").length;
      out.push({ file: ds.file, line, rule: "catalog-missing", level: "error", message: `caminho do Catálogo não existe: ${p}` });
    }
  }
  for (const name of ["Blocos", "Proibido", "A decidir"]) {
    if (!new RegExp(`^##+\\s*(\\d+(\\.\\d+)?\\.?\\s*)?[^\\n]*${name}`, "im").test(ds.text))
      out.push({ file: ds.file, line: 1, rule: "doc-section", level: "warn", message: `seção "${name}" não encontrada` });
  }
  // Narração: frase que conta a história em vez de descrever o sistema (fora das seções de histórico).
  const NARR = /\b(propomos|proponho|decidimos|foi decidido|ficou decidido|we decided|proposes?)\b|github\.com\/[^\s)]+\/(pull|issues)\/\d+/i;
  let offset = 0;
  for (const s of sections(ds.text)) {
    if (!HISTORY.test(s.title)) s.body.split("\n").forEach((l, i) => {
      if (NARR.test(l)) out.push({ file: ds.file, line: ds.text.slice(0, offset).split("\n").length + i, rule: "doc-narration", level: "warn", message: "frase de histórico no documento: descreva o estado atual ou mova pra Pendências / A decidir" });
    });
    offset += s.body.length;
  }
  return out;
}

// ---------- init / doctor ----------
const MARK_START = "<!-- ds:start -->", MARK_END = "<!-- ds:end -->";
const INIT_BLOCK = `${MARK_START}
**Qualquer tela, controle ou estilo aqui: invocar a skill \`ds\` antes de codar.** Ela lê o \`DESIGN.md\` desta pasta (fonte da verdade do visual; descreve o que está no código), monta a tela por blocos, para quando falta peça e roda o lint. Verificação: \`ds-lint\` da skill nos arquivos tocados (erro bloqueia; aviso se corrige ou se justifica em uma linha).
${MARK_END}`;
function init(ds) {
  const file = path.join(ds.root, "CLAUDE.md");
  let text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const re = new RegExp(`${MARK_START}[\\s\\S]*?${MARK_END}`);
  if (re.test(text)) text = text.replace(re, INIT_BLOCK);
  else text = text.trim() ? text.replace(/\r?\n/, `\n\n${INIT_BLOCK}\n`) : `# ${path.basename(ds.root)}\n\n${INIT_BLOCK}\n`;
  fs.writeFileSync(file, text);
  return file;
}
function doctor(ds, doc) {
  const checks = [];
  const add = (level, name, detail = "") => checks.push({ level, name, detail });
  add("pass", "DESIGN.md encontrado", path.relative(process.cwd(), ds.file));
  add(ds.colors.size ? "pass" : "fail", "frontmatter com colors", `${ds.colors.size} cores, ${ds.spacing.size - 1} degraus de spacing, ${ds.rounded.size - 1} raios`);
  add(ds.tokensFiles.length ? (ds.tokensFiles.every((f) => fs.existsSync(f)) ? "pass" : "fail") : "warn", "lint.tokens_files", ds.tokensFiles.length ? ds.tokensFiles.map((f) => path.relative(ds.root, f)).join(", ") : "não declarado: valor cru no arquivo de tema vai ser acusado");
  const findings = checkDoc(ds);
  const by = (rule) => findings.filter((f) => f.rule === rule);
  add(by("doc-section").some((f) => f.level === "error") ? "fail" : by("doc-section").length ? "warn" : "pass", "seções obrigatórias", by("doc-section").map((f) => f.message).join("; ") || "Catálogo, Blocos, Proibido, A decidir");
  add(by("catalog-missing").length ? "fail" : "pass", "caminhos do Catálogo", by("catalog-missing").length ? `${by("catalog-missing").length} inexistente(s)` : `${doc.cat.length} itens`);
  add(doc.blocks.length ? "pass" : "warn", "Blocos", `${doc.blocks.length} bloco(s)`);
  add(doc.recipes.length ? "pass" : "info", "Receitas", doc.recipes.length ? `${doc.recipes.length} receita(s)` : "sem receitas: tela nova nasce dos blocos");
  add(doc.sheets.length ? "pass" : "info", "Fichas", doc.sheets.length ? `${doc.sheets.length} em DESIGN.components.md` : "sem DESIGN.components.md");
  add(by("doc-narration").length ? "warn" : "pass", "narração no documento", by("doc-narration").length ? `${by("doc-narration").length} frase(s) de histórico fora de Pendências` : "ok");
  const claude = path.join(ds.root, "CLAUDE.md");
  const txt = fs.existsSync(claude) ? fs.readFileSync(claude, "utf8") : "";
  add(/skill `ds`|ds:ds|<!-- ds:start -->/.test(txt) ? "pass" : "warn", "CLAUDE.md invoca a skill", txt ? path.relative(process.cwd(), claude) : "sem CLAUDE.md: rode --init");
  const icon = { pass: "✔", warn: "!", fail: "✘", info: "·" };
  for (const c of checks) console.log(`${icon[c.level]} ${c.name}${c.detail ? `  — ${c.detail}` : ""}`);
  const n = (l) => checks.filter((c) => c.level === l).length;
  console.log(`\nds doctor · pass ${n("pass")} · warn ${n("warn")} · fail ${n("fail")} · info ${n("info")}`);
  return n("fail") ? 1 : 0;
}

// ---------- regras por arquivo ----------
const HEX = /#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})\b/gi;
const SPACING_PROP = /\b(margin|padding|gap|rowGap|columnGap|row-gap|column-gap)(?:[A-Z][a-zA-Z]*|-[a-z]+)*\s*:\s*(["'`]?)([^,;"'`}\n]+)\2/g;
const RADIUS_PROP = /\b(border-radius|borderRadius)\s*:\s*(["'`]?)([^,;"'`}\n]+)\2/g;
const FONT_PROP = /\b(font-family|fontFamily)\s*:\s*(["'`]?)([^;"'`}\n]+)\2/g;
const DURATION = /\b(\d+)ms\b/g;

function lintFile(file, ds) {
  const abs = path.resolve(file);
  const src = fs.readFileSync(abs, "utf8");
  if (src.includes("ds-lint-disable-file")) return [];
  if (ds.ignoreFiles.includes(abs)) return [];
  const isTokens = ds.tokensFiles.includes(abs);
  const lines = src.split(/\r?\n/);
  const out = [];
  const push = (idx, rule, level, message) => {
    if (idx > 0 && lines[idx - 1].includes("ds-lint-disable-next-line")) return;
    out.push({ file, line: idx + 1, rule, level, message });
  };
  const nums = (val) => [...val.matchAll(/(-?\d+(?:\.\d+)?)(px)?(?![\w%.-])/g)].map((m) => Number(m[1]));
  const isDynamic = (val) => /var\(|\$\{|calc\(|auto|inherit|%|em\b|rem\b|vh|vw|\?|&&|\|\|/.test(val);

  lines.forEach((line, idx) => {
    const code = line.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "");
    for (const b of ds.banned) { b.re.lastIndex = 0; if (b.re.test(code)) push(idx, "banned", "error", b.message); }
    if (/backdrop-?[fF]ilter/.test(code) && !ds.glassOnlyIn.includes(abs) && ds.glassOnlyIn.length)
      push(idx, "glass-outside", "error", "backdrop-filter fora dos arquivos de vidro: use a classe de vidro do DESIGN.md");
    if (isTokens) return;
    for (const m of code.matchAll(HEX)) {
      const h = m[0].toLowerCase();
      if (ds.allowHex.has(h)) continue;
      const tok = ds.colorByValue[h];
      push(idx, "hex-raw", "error", tok ? `cor crua ${m[0]}: use var(--${tok})` : `cor crua ${m[0]} fora da paleta: use um var(--token) de colors`);
    }
    for (const m of code.matchAll(FONT_PROP)) if (!/var\(|inherit/.test(m[3]) && !isDynamic(m[3])) push(idx, "font-raw", "error", `fonte crua "${m[3].trim()}": use var(--font-*)`);
    for (const m of code.matchAll(SPACING_PROP)) {
      if (isDynamic(m[3])) continue;
      const bad = nums(m[3]).filter((n) => !ds.spacing.has(Math.abs(n)));
      if (bad.length) push(idx, "spacing-off-scale", "warn", `${bad.join(", ")} fora da escala spacing (${[...ds.spacing].filter(Boolean).join(", ")}): use var(--space-*)`);
    }
    for (const m of code.matchAll(RADIUS_PROP)) {
      if (isDynamic(m[3])) continue;
      const bad = nums(m[3]).filter((n) => !ds.rounded.has(n));
      if (bad.length) push(idx, "radius-off-scale", "warn", `raio ${bad.join(", ")} fora de rounded: use var(--radius-*)`);
    }
    if (ds.durations.size > 1) for (const m of code.matchAll(DURATION)) if (!ds.durations.has(Number(m[1]))) push(idx, "duration-raw", "warn", `${m[0]} fora das durações do sistema (${[...ds.durations].filter(Boolean).join(", ")}ms)`);
  });
  return out;
}

function collect(paths) {
  const files = [];
  for (const p of paths) {
    const st = fs.statSync(p);
    if (st.isDirectory()) for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      files.push(...collect([path.join(p, e.name)]));
    } else if (EXTS.has(path.extname(p))) files.push(p);
  }
  return files;
}

function parseArgs(argv) {
  const a = { files: [], json: false };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === "--design") a.design = path.resolve(argv[++i]);
    else if (x === "--search") a.search = argv[++i] ?? "";
    else if (x === "--json") a.json = true;
    else if (x.startsWith("--")) a[x.slice(2)] = true;
    else a.files.push(x);
  }
  return a;
}

function run(argv) {
  const a = parseArgs(argv);
  const files = collect(a.files);
  const design = a.design ?? findDesign(files.length ? path.dirname(path.resolve(files[0])) : process.cwd());
  if (!design) throw new Error("DESIGN.md não encontrado subindo a partir dos arquivos; passe --design <caminho>");
  const ds = loadDesign(design);
  if (a.catalog || a.search !== undefined || a.doctor || a.init) {
    const doc = readDoc(ds);
    if (a.init) { console.log(`bloco da skill gravado em ${path.relative(process.cwd(), init(ds))}`); return { ds, findings: [], code: 0 }; }
    if (a.doctor) return { ds, findings: [], code: doctor(ds, doc) };
    if (a.search !== undefined) search(ds, doc, a.search, a.json); else printCatalog(ds, doc, a.json);
    return { ds, findings: [], code: 0 };
  }
  const findings = [...checkDoc(ds)];
  for (const f of files) findings.push(...lintFile(f, ds));
  return { ds, findings };
}

function report({ ds, findings, code }) {
  if (code !== undefined) return code;
  const errors = findings.filter((f) => f.level === "error").length;
  const warns = findings.length - errors;
  for (const f of findings) console.log(`${path.relative(process.cwd(), f.file)}:${f.line}  ${f.level === "error" ? "ERRO" : "aviso"}  ${f.rule}  ${f.message}`);
  console.log(`\nds-lint · ${path.relative(process.cwd(), ds.file)} · ${errors} erro(s), ${warns} aviso(s)`);
  return errors ? 1 : 0;
}

// ---------- self-test ----------
function selfTest() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ds-lint-"));
  fs.mkdirSync(path.join(dir, "src/components/shared"), { recursive: true });
  fs.writeFileSync(path.join(dir, "src/components/shared/TabBar.tsx"), "export function TabBar(){}\n");
  fs.writeFileSync(path.join(dir, "src/index.css"), ":root{--ink:#EDEDEF;--brand:#D93A36}\n.glass{backdrop-filter:blur(9px);box-shadow:0 0 16px #D93A36;transition:opacity 150ms}\n");
  fs.writeFileSync(path.join(dir, "DESIGN.components.md"), "# Fichas\n\n## `TabBar` (`shared/TabBar.tsx`)\n\n- **Quando usar:** abas no mesmo lugar.\n");
  fs.writeFileSync(path.join(dir, "DESIGN.md"), `---
name: T
colors:
  ink: "#EDEDEF"
  brand: "#D93A36"
typography:
  ui: { fontFamily: "Inter, sans-serif", fontSize: "13px" }
spacing: ["4px", "8px", "12px", "16px"]
rounded: { md: "6px", pill: "99px" }
lint:
  tokens_files: ["src/index.css"]
  allow_hex: ["#fff"]
  durations: [150, 200]
  glass_only_in: ["src/index.css"]
  banned:
    - pattern: '\\btitle='
      message: "title nativo"
---
## 2. Cor
Decidimos usar vermelho só na marca.
## 7. Catálogo
| Preciso de | Use |
|---|---|
| Abas | \`shared/TabBar.tsx\` |
| Sumiu | \`shared/Nope.tsx\` |
## 8. Blocos
| Bloco | Definido em | Feito de | Estados |
|---|---|---|---|
| Lista | 9.1 | \`.surface-glass\` | vazio: "—" |
## 10. Proibido
## 11. A decidir
- Decidimos: fica aqui sem aviso.
`);
  const bad = path.join(dir, "src/Bad.tsx");
  fs.writeFileSync(bad, [
    'const a = { color: "#D93A36" };',
    'const b = { color: "#123456" };',
    'const ok = { color: "#fff" };',
    'const c = { fontFamily: "Inter" };',
    'const d = { padding: "0 10px", gap: 8 };',
    'const e = { borderRadius: 3 };',
    'const f = { transition: "opacity 180ms" };',
    '<div title="x" style={{ backdropFilter: "blur(4px)" }} />',
    '// ds-lint-disable-next-line',
    'const g = { color: "#ABCDEF" };',
    'const h = { padding: "var(--space-2) 12px", margin: `${x}px`, fontFamily: value && mono ? "a" : "b" };',
  ].join("\n"));
  const good = path.join(dir, "src/Good.tsx");
  fs.writeFileSync(good, 'const s = { color: "var(--ink)", padding: 12, borderRadius: "var(--radius-md)", transition: "opacity 150ms", fontFamily: "inherit" };\n');

  const expect = (cond, msg, extra) => { if (!cond) { console.error("FALHOU:", msg); if (extra) console.error(extra); process.exit(1); } };
  const { findings } = run(["--design", path.join(dir, "DESIGN.md"), bad, good]);
  const count = (rule, file) => findings.filter((f) => f.rule === rule && (!file || f.file === file)).length;
  expect(count("catalog-missing") === 1, "catalog-missing = 1 (shared/Nope.tsx)", findings);
  expect(count("hex-raw", bad) === 2, "hex-raw = 2 em Bad.tsx", findings);
  expect(findings.some((f) => f.rule === "hex-raw" && f.message.includes("var(--brand)")), "hex na paleta sugere o token");
  expect(count("font-raw") === 1, "font-raw = 1 (Inter; inherit e ternário passam)", findings);
  expect(count("spacing-off-scale") === 1 && findings.find((f) => f.rule === "spacing-off-scale").message.startsWith("10 "), "spacing-off-scale = 1 (10)");
  expect(count("radius-off-scale") === 1, "radius-off-scale = 1");
  expect(count("duration-raw") === 1, "duration-raw = 1 (180ms)");
  expect(count("banned") === 1, "banned = 1 (title=)");
  expect(count("glass-outside") === 1, "glass-outside = 1");
  expect(count("doc-narration") === 1, "doc-narration = 1 (só fora de A decidir)", findings.filter((f) => f.rule === "doc-narration"));
  expect(findings.filter((f) => f.file === good).length === 0, "Good.tsx limpo");
  expect(findings.filter((f) => f.rule === "doc-section").length === 0, "seções do doc encontradas");

  const ds = loadDesign(path.join(dir, "DESIGN.md"));
  const doc = readDoc(ds);
  expect(doc.cat.length === 2 && doc.cat[0].need === "Abas", "catálogo lido (2 linhas)", doc.cat);
  expect(doc.blocks.length === 1 && doc.blocks[0].states === 'vazio: "—"', "blocos lidos", doc.blocks);
  expect(doc.sheets.length === 1 && doc.sheets[0].name === "TabBar" && doc.sheets[0].path === "shared/TabBar.tsx", "ficha lida", doc.sheets);
  const quiet = (fn) => { const log = console.log; const buf = []; console.log = (...a) => buf.push(a.join(" ")); try { fn(); } finally { console.log = log; } return buf.join("\n"); };
  expect(/\[catálogo\] Abas/.test(quiet(() => search(ds, doc, "abas", false))) && /\[ficha\]/.test(quiet(() => search(ds, doc, "tabbar", false))), "search acha catálogo e ficha");
  expect(/nada no catálogo/.test(quiet(() => search(ds, doc, "carrossel", false))), "search sem resultado manda parar e perguntar");
  init(ds); init(ds);
  const claude = fs.readFileSync(path.join(dir, "CLAUDE.md"), "utf8");
  expect(claude.split(MARK_START).length === 2, "init é idempotente (um bloco só)");
  expect(quiet(() => doctor(ds, doc)).includes("fail 1"), "doctor acusa o caminho inexistente como fail");
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`self-test ok (${findings.length} achados esperados + catálogo, search, init, doctor)`);
}

const argv = process.argv.slice(2);
if (argv.includes("--self-test")) selfTest();
else {
  try { process.exit(report(run(argv))); }
  catch (e) { console.error(e.message); process.exit(2); }
}
