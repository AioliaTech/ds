#!/usr/bin/env node
// Conferência da skill ds a cada EVERY mensagens do usuário, só em sessão onde a ds foi usada.
// A sessão entra na contagem quando a skill é invocada: pelo agente (ferramenta Skill) ou pelo
// usuário digitando "/ds" (evento UserPromptExpansion; o texto digitado também chega no
// UserPromptSubmit). Daí em diante cada mensagem do usuário conta e, na de número EVERY, o
// pedido de conferência volta como contexto pro agente. Invocar a skill de novo zera a contagem.
// Qualquer erro termina em silêncio (exit 0): gancho quebrado não pode travar a conversa.
// ponytail: estado num arquivo por sessão no tmp, sem limpeza (poucos bytes cada). Se incomodar,
// apagar os mais velhos que N dias ao gravar.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const EVERY = 10;

export const CHECKIN = [
  "[ds] Conferência das 10 mensagens: esta sessão usou a skill ds.",
  'Antes de responder ao pedido, confira e diga ao usuário o resultado em UMA linha que começa com "ds:".',
  '1. Mexeu em tela, controle ou estilo de front desde a última conferência? Se não, diga "ds: nada de front desde a última conferência" e siga.',
  "2. Se mexeu: cada peça saiu do Catálogo ou dos Blocos do DESIGN.md (ou você parou e perguntou)? Entrou valor cru (hex, px fora da escala, ms)? Rodou o ds-lint nos arquivos tocados? A entrega fecha com a verificação (lint, checklist e a conferência que o documento pedir)?",
  "3. O que faltar, faça agora, antes de continuar. Não releia o DESIGN.md inteiro: `ds-lint --catalog` e a seção Proibido bastam.",
  "O que mais some em conversa longa: fechar com a verificação e fazer uma pergunta por vez.",
].join("\n");

const isDs = (name) => /^\/?(ds:)?ds$/.test(String(name ?? "").trim());
const isDsSlash = (prompt) => /^\s*\/(ds:)?ds(\s|$)/.test(String(prompt ?? ""));
// O UserPromptSubmit também dispara em retorno de subagente, tarefa agendada e mensagem de outra
// sessão. ponytail: heurística pelo começo do texto (essas chegam embrulhadas em tags); se o
// Claude Code passar a marcar a origem num campo, trocar por ele.
const isAutomatic = (prompt) => /^\s*</.test(String(prompt ?? ""));

// state: null (sessão sem ds) ou { n } (mensagens do usuário desde a última conferência).
export function step(state, ev) {
  const on = { state: { n: 0 }, say: null };
  const same = { state, say: null };
  if (ev.hook_event_name === "PostToolUse") return ev.tool_name === "Skill" && isDs(ev.tool_input?.skill) ? on : same;
  if (ev.hook_event_name === "UserPromptExpansion") return isDs(ev.command_name) ? on : same;
  if (ev.hook_event_name === "UserPromptSubmit") {
    if (isDsSlash(ev.prompt)) return on;
    if (!state || isAutomatic(ev.prompt)) return same;
    const n = state.n + 1;
    return n >= EVERY ? { state: { n: 0 }, say: CHECKIN } : { state: { n }, say: null };
  }
  return same;
}

function selfTest() {
  const assert = (ok, msg) => { if (!ok) { console.error("FALHOU: " + msg); process.exit(1); } };
  const prompt = (p = "oi") => ({ hook_event_name: "UserPromptSubmit", prompt: p });
  const prompts = (k, p) => Array.from({ length: k }, () => prompt(p));
  const skill = (s) => ({ hook_event_name: "PostToolUse", tool_name: "Skill", tool_input: { skill: s } });
  const slash = (c) => ({ hook_event_name: "UserPromptExpansion", expansion_type: "slash_command", command_name: c });
  const run = (events) => { let state = null; const said = []; events.forEach((ev, i) => { const r = step(state, ev); state = r.state; if (r.say) said.push(i); }); return { state, said }; };

  assert(run(prompts(35)).said.length === 0, "sessão sem ds nunca confere");
  assert(run([skill("ecc:plan"), ...prompts(15)]).said.length === 0, "outra skill não liga a contagem");
  const a = run([skill("ds:ds"), ...prompts(25)]);
  assert(a.said.join() === "10,20", "com ds confere na 10ª e na 20ª mensagem, veio " + a.said.join());
  assert(run([prompt("/ds revisa essa tela"), ...prompts(10)]).said.join() === "10", "/ds digitado liga a contagem");
  assert(run([slash("ds:ds"), ...prompts(10)]).said.join() === "10", "expansão de /ds:ds liga a contagem");
  assert(run([prompt("/dsx"), slash("dsx"), ...prompts(12)]).said.length === 0, "/dsx não é a ds");
  const b = run([skill("ds"), ...prompts(7), skill("ds:ds"), ...prompts(9)]);
  assert(b.said.length === 0 && b.state.n === 9, "invocar a ds de novo zera a contagem");
  const c = run([skill("ds:ds"), ...prompts(9), ...prompts(5, "<task-notification>fim</task-notification>")]);
  assert(c.said.length === 0 && c.state.n === 9, "mensagem automática não conta");
  assert(step({ n: 3 }, { hook_event_name: "PostToolUse", tool_name: "Edit", tool_input: {} }).state.n === 3, "outra ferramenta não mexe na contagem");
  console.log("self-test ok (9 casos)");
}

function main() {
  if (process.env.DS_CHECKIN === "off") return;
  let ev;
  try { ev = JSON.parse(readFileSync(0, "utf8")); } catch { return; }
  const id = String(ev.session_id ?? "").replace(/[^\w-]/g, "");
  if (!id) return;
  const dir = join(tmpdir(), "claude-ds-checkin");
  const file = join(dir, id + ".json");
  let state = null;
  try { state = JSON.parse(readFileSync(file, "utf8")); } catch { /* sessão ainda sem ds */ }
  const r = step(state, ev);
  if (r.state) { mkdirSync(dir, { recursive: true }); writeFileSync(file, JSON.stringify(r.state)); }
  if (r.say) process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: r.say } }));
}

try { process.argv.includes("--self-test") ? selfTest() : main(); } catch { /* silêncio */ }
