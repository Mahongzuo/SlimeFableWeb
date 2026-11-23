#!/usr/bin/env node
/** Content lint: kana, banned imagery, flags at Home, collision naming hints, per-chunk size budget. Exit 1 on errors. */
import {readFileSync, readdirSync, statSync, existsSync} from 'node:fs';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
const root = process.cwd(), errors = [], warns = [];
const walk = (d, out = []) => { for (const e of readdirSync(d)) { const p = join(d, e); statSync(p).isDirectory() ? walk(p, out) : /\.(ts|md)$/.test(e) && out.push(p); } return out; };
for (const f of [...walk(join(root, 'src')), ...walk(join(root, 'content'))]) {
  const s = readFileSync(f, 'utf8'), rel = f.slice(root.length + 1);
  if (/[぀-ヿ]/.test(s)) errors.push(`${rel}: 含日文假名`);
  if (/(毛泽东|毛主席|领袖)(像|肖像|画像)/.test(s) && !/不要画|不画|只画一个金色方框/.test(s)) errors.push(`${rel}: 疑似领导人肖像`);
  if (/^src\/(home|zones|world)\//.test(rel) && /(flag|国旗|旗帜)/i.test(s) && !/no flags|不挂|旗子不要/.test(s)) warns.push(`${rel}: Home 里出现 flag/旗 字样，确认没有挂旗`);
  if (/^src\/themes\//.test(rel) && /new THREE\.(Texture|TextureLoader)|\.png|\.jpg/.test(s)) errors.push(`${rel}: 主题套件不得加载贴图文件`);
}
const assets = join(root, 'dist/assets');
if (existsSync(assets)) for (const f of readdirSync(assets)) if (/\.js$/.test(f) && !/^three\.module-[\w-]+\.js$/.test(f) && !/^(level-ui|home|save|sim\.worker)/.test(f)) { const kb = gzipSync(readFileSync(join(assets, f))).length / 1024; if (kb > 60) errors.push(`dist/assets/${f}: 压缩后 ${kb.toFixed(1)} KB > 60 KB`); }
for (const w of warns) console.warn('⚠ ' + w);
for (const e of errors) console.error('✗ ' + e);
console.log(errors.length ? `lint: ${errors.length} 个问题` : 'lint: 通过'); process.exit(errors.length ? 1 : 0);
