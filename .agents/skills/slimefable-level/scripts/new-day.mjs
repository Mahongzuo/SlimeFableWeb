#!/usr/bin/env node
/** node .agents/skills/slimefable-level/scripts/new-day.mjs 1113 → docs/days/1113.md design page skeleton (never overwrites). */
import {writeFileSync, existsSync, mkdirSync} from 'node:fs';
const day = process.argv[2]; if (!/^\d{4}$/.test(day ?? '')) { console.error('usage: new-day.mjs MMDD'); process.exit(2); }
mkdirSync('docs/days', {recursive: true}); const p = `docs/days/${day}.md`; if (existsSync(p)) { console.error(p + ' 已存在'); process.exit(3); }
writeFileSync(p, `# ${day.slice(0, 2)}/${day.slice(2)} 设计页

## 章节 ${day}-YYYY · 标题
### 事实卡
- 日期 / 地点 / 人物 / 发生了什么
- 来源：链接 1、链接 2
### 一句话体验
### 高光时刻
### 流程（开场 / 上手 / 展开 / 高光 / 收尾）
### 史莱姆能力 × 历史
### 年代细节（≥3）与三层场景
### 复玩
### 模板 / 套件 / 复用
### 机位（出生点 / 中段 / 高光）
`); console.log('写好了 ' + p);
