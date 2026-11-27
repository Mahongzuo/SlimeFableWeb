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

关卡帮助：列出 F1 攻略的数据位置、当前目标、手机操作和易错步骤，变更玩法时同步更新。

验收：哪些命令通过；改了画面的，由 Codex 负责在 `qa/evidence/<卡名>.jpg` 提供一张浏览器截图，交用户试玩确认。

<!-- Grok 卡：一张卡只动一个文件，规格写死（接口、常量、算法都给出），不要留“自己设计”——单轮推理超过 150 s 会被杀掉且无法续上。
     Codex 卡：模型和强度每次运行都会被钉住；报告里会写实际模型和 token。 -->
<!-- 派发：node scripts/agent-run.mjs run tasks/cards/<卡>.md → verify … --commit。超时就再 run 一次，会续上原会话。 -->
