#!/usr/bin/env node
/**
 * Dispatch one task card to Grok (Cursor CLI) or Codex, then gate the result.
 *   node scripts/agent-run.mjs run    tasks/cards/<card>.md   # call the agent (≤150 s; resumes a timed-out session)
 *   node scripts/agent-run.mjs verify tasks/cards/<card>.md [--commit]   # scope guard + checks + report
 * Card front matter: agent (grok|codex), model, effort, files (comma list the agent may touch), checks (npm scripts).
 * Runs in the Linux shell linked to the user's computer, where `agent` and `codex` are installed.
 */
import {readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync} from 'node:fs';
import {execSync, spawnSync} from 'node:child_process';
import {basename, join} from 'node:path';
import {homedir} from 'node:os';
const [mode, cardPath, flag] = process.argv.slice(2);
if (!['run', 'verify'].includes(mode) || !cardPath) { console.error('usage: agent-run.mjs run|verify <card.md> [--commit]'); process.exit(2); }
const raw = readFileSync(cardPath, 'utf8'), m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
if (!m) { console.error('card needs --- front matter ---'); process.exit(2); }
const meta = Object.fromEntries(m[1].split('\n').filter(Boolean).map(l => { const i = l.indexOf(':'); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const body = m[2], name = basename(cardPath, '.md'), files = meta.files.split(',').map(s => s.trim()).filter(Boolean);
const checks = (meta.checks ?? 'check,test').split(',').map(s => s.trim()).filter(Boolean);
const stateDir = 'tasks/.runs'; mkdirSync(stateDir, {recursive: true}); mkdirSync('tasks/reports', {recursive: true});
const statePath = join(stateDir, name + '.json'), state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : {};
const sh = (cmd) => execSync(cmd, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
const changed = () => execSync('git status --porcelain --untracked-files=all', {encoding: 'utf8'}).split('\n').filter(Boolean).map(l => l.slice(3).replace(/^"|"$/g, '')).filter(f => !f.startsWith('tasks/'));
const save = () => writeFileSync(statePath, JSON.stringify(state, null, 2));
if (mode === 'run') {
  if (!state.started && changed().length) { console.error('working tree is dirty; commit or stash first:\n' + changed().join('\n')); process.exit(3); }
  const rules = readFileSync('AGENTS.md', 'utf8');
  const prompt = `${rules}\n\n# 本次任务卡：${name}\n只能修改或新建这些文件：${files.join('、')}。其他文件一律不许改；如果确实需要，停下并说明原因。\n完成前必须运行 ${checks.map(c => 'npm run ' + c).join('、')} 并全部通过。最后用中文一句话总结改了什么。\n\n${body}`;
  const resume = state.started && state.status === 'timeout';
  const env = {...process.env, PATH: `${homedir()}/.local/bin:${homedir()}/.npm-global/bin:${process.env.PATH}`};
  let args, bin;
  if (meta.agent === 'grok') {
    env.CURSOR_API_KEY = readFileSync(join(homedir(), '.cursor_api_key'), 'utf8').trim();
    bin = 'agent'; args = ['-p', '--model', meta.model ?? 'grok-4.7-medium-fast', '--force', '--trust', '--output-format', 'json'];
    if (resume && state.session) args.push('--resume', state.session);
    args.push(resume ? '上一轮被时间上限打断了。请继续完成同一张任务卡，完成后用一句中文总结。' : prompt);
  } else {
    // the model and effort must be pinned on every call: a bare `resume` silently falls back to the account's default model
    const pin = ['-c', `model="${meta.model ?? 'gpt-6-astra'}"`, '-c', `model_reasoning_effort="${meta.effort ?? 'low'}"`];
    bin = 'codex'; args = resume ? ['exec', 'resume', ...pin, '--last', '继续完成同一张任务卡，完成后用一句中文总结。'] : ['exec', ...pin, '--approve-for-me', '-o', join(stateDir, name + '.last.txt'), prompt];
  }
  const started = Date.now(), before = Date.now();
  // mark as resumable first: if this whole call is killed from outside, the next `run` resumes instead of refusing a dirty tree
  state.started = true; state.status = 'timeout'; save();
  const r = spawnSync(bin, args, {env, encoding: 'utf8', timeout: 150000, maxBuffer: 32 << 20});
  state.started = true; state.runs = (state.runs ?? 0) + 1; state.seconds = Math.round((Date.now() - started) / 1000);
  if (meta.agent === 'codex') { const u = codexUsage(before); if (u) { state.usage = state.usage ?? []; state.usage.push(u); if (u.models.some(m => m !== (meta.model ?? 'gpt-6-astra'))) console.warn(`WARNING: codex ran ${u.models.join(', ')}, card asked for ${meta.model}`); } }
  if (r.error?.code === 'ETIMEDOUT' || r.signal) {
    state.status = 'timeout';
    if (meta.agent === 'grok') { const root = join(homedir(), '.cursor/chats'); let newest = null; for (const p of existsSync(root) ? readdirSync(root) : []) for (const s of readdirSync(join(root, p))) { const t = statSync(join(root, p, s)).mtimeMs; if (t >= before - 5000 && (!newest || t > newest.t)) newest = {t, s}; } if (newest) state.session = newest.s; }
    save(); console.log(`TIMEOUT after ${state.seconds}s — run again to resume`); process.exit(4);
  }
  let summary = (r.stdout ?? '').trim();
  if (meta.agent === 'grok') { try { const j = JSON.parse(summary.split('\n').pop()); summary = j.result; state.session = j.session_id; } catch {} }
  else if (existsSync(join(stateDir, name + '.last.txt'))) summary = readFileSync(join(stateDir, name + '.last.txt'), 'utf8').trim();
  state.status = r.status === 0 ? 'ran' : 'failed'; state.summary = summary.slice(-1500); state.stderr = (r.stderr ?? '').slice(-800); save();
  console.log(`${state.status.toUpperCase()} in ${state.seconds}s\n${state.summary}`);
  process.exit(r.status === 0 ? 0 : 5);
}
/** Read what Codex really ran: models and tokens from the newest rollout files written since `since`. */
function codexUsage(since) {
  const root = join(homedir(), '.codex/sessions'), files = [];
  const walk = d => { for (const e of existsSync(d) ? readdirSync(d, {withFileTypes: true}) : []) { const p = join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.jsonl') && statSync(p).mtimeMs >= since - 5000) files.push(p); } };
  walk(root); if (!files.length) return null;
  const models = new Set(); let tokens = 0, output = 0, weekly = null;
  for (const f of files) { let last = null; for (const line of readFileSync(f, 'utf8').split('\n')) { let j; try { j = JSON.parse(line); } catch { continue; } const p = j?.payload; if (!p) continue; if (p.model && p.model !== 'codex-auto-review') models.add(p.model); if (p.type === 'token_count') { if (p.info) last = p.info.total_token_usage ?? last; if (p.rate_limits?.primary) weekly = p.rate_limits.primary.used_percent; } }
    if (last) { tokens += last.total_tokens ?? 0; output += last.output_tokens ?? 0; } }
  return {models: [...models], tokens, output, weeklyUsedPercent: weekly};
}
// ---- verify: scope guard, checks, report, optional commit
const touched = changed(), outside = touched.filter(f => !files.includes(f));
const results = [];
for (const c of checks) { const r = spawnSync('npm', ['run', c, '--silent'], {encoding: 'utf8', timeout: 120000}); const tail = ((r.stdout ?? '') + (r.stderr ?? '')).trim().split('\n').slice(-6).join('\n'); results.push({check: c, ok: r.status === 0, tail}); }
const diffstat = touched.length ? sh(`git diff --stat -- ${touched.filter(f => existsSync(f)).map(f => `'${f}'`).join(' ')} 2>/dev/null || true`) : '';
const ok = outside.length === 0 && touched.length > 0 && results.every(r => r.ok);
const report = `# ${name} · ${ok ? '通过' : '未通过'}\n\n- Agent：${meta.agent} · ${meta.model ?? ''} · 运行 ${state.runs ?? 0} 次，最近一次 ${state.seconds ?? '?'} 秒\n${state.usage?.length ? `- 实际模型：${[...new Set(state.usage.flatMap(u => u.models))].join('、')} · 累计 ${state.usage.at(-1).tokens} tokens（输出 ${state.usage.at(-1).output}）· 周额度已用 ${state.usage.at(-1).weeklyUsedPercent ?? '?'}%\n` : ''}- 允许改动：${files.join('、')}\n- 实际改动：${touched.join('、') || '（无）'}\n- 越界改动：${outside.join('、') || '无'}\n\n## 检查\n${results.map(r => `- ${r.ok ? '✓' : '✗'} npm run ${r.check}${r.ok ? '' : '\n\n```\n' + r.tail + '\n```'}`).join('\n')}\n\n## Agent 总结\n${state.summary ?? '（无）'}\n\n## 改动统计\n\`\`\`\n${diffstat}\n\`\`\`\n`;
writeFileSync(join('tasks/reports', name + '.md'), report);
console.log(report);
if (ok && flag === '--commit') {
  sh(`git add ${touched.map(f => `'${f}'`).join(' ')} tasks/cards/${name}.md tasks/reports/${name}.md`);
  sh(`git commit -q -m "card ${name}: ${meta.agent} (${meta.model ?? ''})" -m "Gated by scripts/agent-run.mjs verify: scope guard + ${checks.join(', ')}." -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01U9dPho8XeRAvH3QwgJ24HB"`);
  state.status = 'committed'; save(); console.log('committed');
}
process.exit(ok ? 0 : 6);
