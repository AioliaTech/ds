#!/usr/bin/env node
// ds-lint: confere arquivos de front contra o DESIGN.md do projeto.
// Uso: node ds-lint.mjs [--design caminho/DESIGN.md] [--self-test] <arquivos ou pastas>
// Sem arquivos: só valida o documento (frontmatter + caminhos do Catálogo).
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
          // item que é um mapa: primeira chave na mesma linha, demais abaixo
          lines[i] = " ".repeat(ind + 2) + body;
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
  const fontFamilies = Object.values(meta.typography ?? {}).map((t) => t && t.fontFamily).filter(Boolean);
  const abs = (list) => toList(list).map((p) => path.resolve(root, String(p)));
  return {
    file, root, text, meta,
    colors: new Set(Object.values(meta.colors ?? {}).map((c) => String(c).toLowerCase())),
    colorByValue: Object.fromEntries(Object.entries(meta.colors ?? {}).map(([k, v]) => [String(v).toLowerCase(), k])),
    spacing: new Set([0, ...toList(meta.spacing).map(num)]),
    rounded: new Set([0, ...toList(meta.rounded).map(num)]),
    fontFamilies,
    tokensFiles: abs(lint.tokens_files),
    glassOnlyIn: abs(lint.glass_only_in),
    ignoreFiles: abs(lint.ignore_files),
    allowHex: new Set(toList(lint.allow_hex).map((h) => String(h).toLowerCase())),
    durations: new Set(toList(lint.durations).map(num)),
    banned: toList(lint.banned).map((b) => ({ re: new RegExp(b.pattern, "g"), message: b.message ?? `proibido: ${b.pattern}` })),
  };
}

// Caminhos em crase na seção Catálogo precisam existir.
function checkCatalog(ds) {
  const out = [];
  const sec = ds.text.split(/^##\s+/m).find((s) => /^[^\n]*cat[aá]logo/i.test(s));
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
  return out;
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

function run(argv) {
  const args = [...argv];
  let design = null;
  const di = args.indexOf("--design");
  if (di >= 0) { design = path.resolve(args[di + 1]); args.splice(di, 2); }
  const files = collect(args);
  if (!design) design = findDesign(files.length ? path.dirname(path.resolve(files[0])) : process.cwd());
  if (!design) throw new Error("DESIGN.md não encontrado subindo a partir dos arquivos; passe --design <caminho>");
  const ds = loadDesign(design);
  const findings = [...checkCatalog(ds)];
  for (const f of files) findings.push(...lintFile(f, ds));
  return { ds, findings };
}

function report({ ds, findings }) {
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
## 7. Catálogo
| Preciso de | Use |
|---|---|
| Abas | \`shared/TabBar.tsx\` |
| Sumiu | \`shared/Nope.tsx\` |
## 8. Blocos
## 10. Proibido
## 11. A decidir
`);
  const bad = path.join(dir, "src/Bad.tsx");
  fs.writeFileSync(bad, [
    'const a = { color: "#D93A36" };',                   // hex-raw (na paleta → sugere var(--brand))
    'const b = { color: "#123456" };',                   // hex-raw fora da paleta
    'const ok = { color: "#fff" };',                     // allow_hex → nada
    'const c = { fontFamily: "Inter" };',                // font-raw
    'const d = { padding: "0 10px", gap: 8 };',          // spacing-off-scale (10), 0 e 8 ok
    'const e = { borderRadius: 3 };',                    // radius-off-scale
    'const f = { transition: "opacity 180ms" };',        // duration-raw
    '<div title="x" style={{ backdropFilter: "blur(4px)" }} />', // banned + glass-outside
    '// ds-lint-disable-next-line',
    'const g = { color: "#ABCDEF" };',                   // desligado
    'const h = { padding: "var(--space-2) 12px", margin: `${x}px` };', // dinâmico/na escala → nada
  ].join("\n"));
  const good = path.join(dir, "src/Good.tsx");
  fs.writeFileSync(good, 'const s = { color: "var(--ink)", padding: 12, borderRadius: "var(--radius-md)", transition: "opacity 150ms" };\n');

  const { findings } = run(["--design", path.join(dir, "DESIGN.md"), bad, good]);
  const count = (rule, file) => findings.filter((f) => f.rule === rule && (!file || f.file === file)).length;
  const expect = (cond, msg) => { if (!cond) { console.error("FALHOU:", msg); console.error(findings); process.exit(1); } };
  expect(count("catalog-missing") === 1, "catalog-missing = 1 (shared/Nope.tsx)");
  expect(count("hex-raw", bad) === 2, "hex-raw = 2 em Bad.tsx");
  expect(findings.some((f) => f.rule === "hex-raw" && f.message.includes("var(--brand)")), "hex na paleta sugere o token");
  expect(count("font-raw") === 1, "font-raw = 1");
  expect(count("spacing-off-scale") === 1 && findings.find((f) => f.rule === "spacing-off-scale").message.startsWith("10 "), "spacing-off-scale = 1 (10)");
  expect(count("radius-off-scale") === 1, "radius-off-scale = 1");
  expect(count("duration-raw") === 1, "duration-raw = 1 (180ms)");
  expect(count("banned") === 1, "banned = 1 (title=)");
  expect(count("glass-outside") === 1, "glass-outside = 1");
  expect(findings.filter((f) => f.file === good).length === 0, "Good.tsx limpo");
  expect(findings.filter((f) => f.rule === "doc-section").length === 0, "seções do doc encontradas");
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`self-test ok (${findings.length} achados esperados)`);
}

const argv = process.argv.slice(2);
if (argv.includes("--self-test")) selfTest();
else {
  try { process.exit(report(run(argv))); }
  catch (e) { console.error(e.message); process.exit(2); }
}
