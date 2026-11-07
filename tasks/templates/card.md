---
agent: grok            # grok | codex
model: grok-4.7-medium-fast   # codex: gpt-6-astra
effort: low            # codex only
files: content/levels/MMDD-YYYY.ts   # the ONLY files the agent may create or change, comma separated
checks: check,test     # npm scripts that must pass
---
# 标题（一句话说清产出）

目标：玩家会看到 / 得到什么。

做法：编号步骤，写清接口、文件、数据从哪来。

不许做：结构、字段、依赖、事实方面的禁区。

验收：哪些命令通过；改了画面的，`qa/evidence/<卡名>.jpg` 要有一张截图（由 Opus 在浏览器里补拍）。

<!-- 派发：node scripts/agent-run.mjs run tasks/cards/<卡>.md → verify … --commit。超时就再 run 一次，会续上原会话。 -->
